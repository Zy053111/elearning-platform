from rest_framework import serializers
from .models import Message, DirectMessage, Notification

class MessageSerializer(serializers.ModelSerializer):
    # Grab the actual username string, not just the user ID number
    username = serializers.ReadOnlyField(source='sender.username')
    # Map the database field 'content' to 'message' to perfectly match your React frontend
    message = serializers.CharField(source='content')

    class Meta:
        model = Message
        fields = ['username', 'message', 'timestamp']
        
class DirectMessageSerializer(serializers.ModelSerializer):
    # This must point to the 'sender' field in your DirectMessage model
    sender_id = serializers.ReadOnlyField(source='sender.id') 
    username = serializers.ReadOnlyField(source='sender.username')

    class Meta:
        model = DirectMessage
        fields = ['id', 'sender_id', 'username', 'message', 'timestamp', 'is_read']
        
class NotificationSerializer(serializers.ModelSerializer):
    # Format the date to be more readable in the dropdown
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 
            'notification_type', 
            'message', 
            'course_id', 
            'is_read', 
            'created_at'
        ]