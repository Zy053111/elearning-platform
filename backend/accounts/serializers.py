from rest_framework import serializers
from .models import CustomUser

class UserRegistrationSerializer(serializers.ModelSerializer):
    # The CharField is marked 'write_only' to ensure passwords are never 
    # included in API responses for security
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'is_student', 'is_teacher', 'photo')

    # Override the create method to ensure the password is encrypted
    def create(self, validated_data):
        # create_user is a Django helper that hashes the plain-text password
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            is_student=validated_data.get('is_student', False),
            is_teacher=validated_data.get('is_teacher', False),
            photo=validated_data.get('photo', None)
        )
        return user
    
class UserSerializer(serializers.ModelSerializer):
    # This serializer is used for reading user data (e.g., profiles and search)
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_teacher', 'is_student', 'photo', 'date_joined']