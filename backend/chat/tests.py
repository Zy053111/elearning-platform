from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Notification, DirectMessage
from courses.models import Course
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class ChatModelTest(TestCase):
    def setUp(self):
        # Setup data for testing requirements R1(g) and R1(k)
        self.sender = User.objects.create_user(username='sender', password='pass', is_student=True)
        self.receiver = User.objects.create_user(username='receiver', password='pass', is_teacher=True)
        self.course = Course.objects.create(title="IoT Test", teacher=self.receiver)

    def test_notification_creation(self):
        """Test that enrollment notifications are created correctly"""
        notif = Notification.objects.create(
            recipient=self.receiver,
            sender=self.sender,
            notification_type='enrollment',
            message="New student enrolled",
            course_id=self.course.id
        )
        self.assertEqual(notif.recipient, self.receiver)
        self.assertFalse(notif.is_read)

    def test_direct_message_ordering(self):
        """Verify messages are ordered by timestamp"""
        msg1 = DirectMessage.objects.create(sender=self.sender, receiver=self.receiver, message="Hello")
        msg2 = DirectMessage.objects.create(sender=self.sender, receiver=self.receiver, message="World")
        
        messages = DirectMessage.objects.all()
        self.assertEqual(messages[0].message, "Hello")
        self.assertEqual(messages[1].message, "World")

class ChatAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='pass')
        self.other = User.objects.create_user(username='other', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_get_unread_counts(self):
        """Test the unread-counts endpoint used by Navbar.jsx"""
        # Create one unread message
        DirectMessage.objects.create(sender=self.other, receiver=self.user, message="Ping")
        
        url = '/api/chat/unread-counts/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_chat_count'], 1)

    def test_mark_notifications_read(self):
        """Test marking all notifications as read"""
        Notification.objects.create(recipient=self.user, message="Test Notif")
        
        url = '/api/chat/notifications/mark-read/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)