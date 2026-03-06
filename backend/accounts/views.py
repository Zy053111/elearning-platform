from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import CustomUser
from .serializers import UserRegistrationSerializer, UserSerializer
from courses.models import Course
from django.db.models import Q

# CreateAPIView provides a standard POST endpoint for registration
class UserRegistrationView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
# RetrieveUpdateAPIView allows a user to see and edit their own profile
class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] 
    
    # MultiPartParser allows the view to process incoming image/file data
    parser_classes = [MultiPartParser, FormParser] 

    def get_object(self):
        # Automatically returns the user associated with the JWT token
        return self.request.user
        

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['GET'])    
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Search logic
    Filters by username or name while excluding the requester
    """
    query = request.query_params.get('q', '')
    if len(query) < 2:
        return Response([])

    # Filter users by username or names, excluding the current user
    users = CustomUser.objects.filter(
        Q(username__icontains=query) | 
        Q(first_name__icontains=query) | 
        Q(last_name__icontains=query)
    ).exclude(id=request.user.id)[:10]

    results = []
    for user in users:
        # Get courses based on whether they are a teacher or student
        if user.is_teacher:
            user_courses = Course.objects.filter(teacher=user)
        else:
            user_courses = Course.objects.filter(students=user)

        results.append({
            'id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'is_teacher': user.is_teacher,
            'photo': user.photo.url if user.photo else None,
            'courses': [{'id': c.id, 'title': c.title} for c in user_courses]
        })

    return Response(results)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_public_user_detail(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        
        # Get courses based on role
        if user.is_teacher:
            user_courses = Course.objects.filter(teacher=user)
        else:
            user_courses = Course.objects.filter(students=user)

        return Response({
            'id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'is_teacher': user.is_teacher,
            'photo': user.photo.url if user.photo else None,
            'courses': [{'id': c.id, 'title': c.title} for c in user_courses]
        })
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)