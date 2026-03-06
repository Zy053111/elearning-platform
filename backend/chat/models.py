from django.db import models
from django.conf import settings
from courses.models import Course 

class Message(models.Model):
    """Stores group discussion messages for a specific course"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensures a logical conversation flow with the newest messages at the bottom
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.sender.username}: {self.content[:20]}'
    
class DirectMessage(models.Model):
    """Handles one-on-one private communication between any two users"""
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_messages', on_delete=models.CASCADE)
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_messages', on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username}"
    
class Notification(models.Model):
    """Centrally manages alerts for enrollments and new materials"""
    NOTIFICATION_TYPES = (
        ('enrollment', 'New Enrollment'),
        ('material', 'New Course Material'),
        ('message', 'New Private Message'),
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_notifications',
        null=True, blank=True
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    course_id = models.IntegerField(null=True, blank=True) 
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']