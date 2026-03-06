from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Course, CourseMaterial
from .serializers import CourseSerializer, CourseMaterialSerializer, FeedbackSerializer
from chat.models import Message, Notification
from chat.serializers import MessageSerializer
from .tasks import send_welcome_email_task
from accounts.models import CustomUser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class CourseViewSet(viewsets.ModelViewSet):
    """Main controller for all course-related API endpoints"""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)
        
    def _send_ws_notification(self, user_id):
        try:
            # Import inside the function to prevent circular import errors
            from chat.models import Notification, DirectMessage 
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            
            # Calculate separate counts for the red dots
            unread_notifs = Notification.objects.filter(recipient_id=user_id, is_read=False).count()
            unread_chats = DirectMessage.objects.filter(receiver_id=user_id, is_read=False).count()
            
            async_to_sync(channel_layer.group_send)(
                f"user_notifications_{user_id}",
                {
                    "type": "new_notification",
                    "unread_notif_count": unread_notifs,
                    "unread_chat_count": unread_chats
                }
            )
        except Exception as e:
            # This will show you the EXACT error in your terminal
            print(f"WebSocket Notification Error: {e}")

    # This creates a custom endpoint: /api/courses/{id}/enrol/
    @action(detail=True, methods=['post'])
    def enrol(self, request, pk=None):
        course = self.get_object()
        user = request.user
        
        if user.is_student:
            if user in course.students.all():
                return Response({'error': 'Already enrolled'}, status=400)
                
            course.students.add(user)
            
            # Create Notification for the Teacher
            Notification.objects.create(
                recipient=course.teacher,
                sender=user,
                notification_type='enrollment',
                message=f"Student {user.username} has enrolled in your course: {course.title}",
                course_id=course.id
            )
            
            # Trigger Real-time Alert
            self._send_ws_notification(course.teacher.id)

            if user.email:
                send_welcome_email_task.delay(user.id, course.id)
                
            return Response({'status': 'Successfully enrolled in course'}, status=status.HTTP_200_OK)
        
        return Response({'error': 'Only students can enrol in courses'}, status=status.HTTP_403_FORBIDDEN)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_material(self, request, pk=None):
        course = self.get_object()
        
        if course.teacher != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CourseMaterialSerializer(data=request.data)
        if serializer.is_valid():
            material = serializer.save(course=course)

            # Notify all enrolled students
            students = course.students.all()
            for student in students:
                Notification.objects.create(
                    recipient=student,
                    sender=request.user,
                    notification_type='material',
                    message=f"New material '{material.title}' added to {course.title}",
                    course_id=course.id
                )
                # Send WebSocket ping to each student
                self._send_ws_notification(student.id)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        course = self.get_object()
        user = request.user
        
        # Security: Only allow the teacher of the course or enrolled students to read the chat
        if course.teacher != user and user not in course.students.all():
            return Response({'error': 'Not authorized to view this chat'}, status=status.HTTP_403_FORBIDDEN)
            
        # Fetch all messages tied to this course, ordered by timestamp
        messages = course.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def leave_feedback(self, request, pk=None):
        course = self.get_object()
        user = request.user
        
        # Security: Only enrolled students can leave a review
        if user not in course.students.all():
            return Response({'error': 'You must be enrolled to leave feedback.'}, status=status.HTTP_403_FORBIDDEN)
            
        # Prevent multiple reviews from the same student
        if course.feedbacks.filter(student=user).exists():
            return Response({'error': 'You have already reviewed this course.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FeedbackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(course=course, student=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        if course.teacher != request.user:
            return Response({'error': 'You can only delete your own courses.'}, status=403)
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        course = self.get_object()
        if course.teacher != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        
        course.is_archived = not course.is_archived
        course.save()
        return Response({'status': 'Course updated', 'is_archived': course.is_archived})
    
    @action(detail=True, methods=['post'])
    def remove_student(self, request, pk=None):
        """Teacher-only functionality to manage enrollment"""
        course = self.get_object()
        
        # Only the teacher of this course can remove students
        if course.teacher != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
            
        student_id = request.data.get('student_id')
        
        try:
            # Use get_object_or_404 or a try-except to prevent 500 crashes
            student = CustomUser.objects.get(id=student_id)
            
            # Remove the relationship in the ManyToMany field
            course.students.remove(student)
            
            return Response({'status': 'Student removed successfully'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        except Exception as e:
            # This will print the actual error to your terminal so you can see why it crashed
            print(f"Error removing student: {e}")
            return Response({'error': str(e)}, status=500)
    
class CourseMaterialViewSet(viewsets.ModelViewSet):
    queryset = CourseMaterial.objects.all()
    serializer_class = CourseMaterialSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        material = self.get_object()
        # Security: Only the teacher of the course can delete materials
        if material.course.teacher != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        return super().destroy(request, *args, **kwargs)