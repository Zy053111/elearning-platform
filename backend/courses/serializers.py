from rest_framework import serializers
from .models import Course, CourseMaterial, Feedback

class CourseMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseMaterial
        fields = ['id', 'title', 'file', 'uploaded_at']

class FeedbackSerializer(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    student_name = serializers.ReadOnlyField(source='student.username')
    student_photo = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'student_name', 'student_first_name', 'student_last_name', 'student_photo', 'rating', 'comment', 'created_at']
    
    def get_student_photo(self, obj):
        # Safely return the URL if the photo exists
        if obj.student.photo:
            return obj.student.photo.url
        return None
        
class CourseSerializer(serializers.ModelSerializer):
    # This automatically includes all related materials in the course JSON response
    materials = CourseMaterialSerializer(many=True, read_only=True)
    feedbacks = FeedbackSerializer(many=True, read_only=True)
    teacher_name = serializers.ReadOnlyField(source='teacher.username')
    student_details = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher', 'teacher_name', 'materials', 'feedbacks', 'students', 'student_details', 'created_at', 'is_archived']
        # The frontend shouldn't be able to manually edit the teacher or student list directly here
        read_only_fields = ['teacher', 'students']
        
    def get_student_details(self, obj):
        return [
            {
                'id': student.id,
                'username': student.username,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'photo': student.photo.url if student.photo else None
            }
            for student in obj.students.all()
        ]