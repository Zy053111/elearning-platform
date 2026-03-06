from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class AccountsModelTest(TestCase):
    def setUp(self):
        # Create a teacher and a student for testing
        self.teacher = User.objects.create_user(username='teacher1', password='password123', is_teacher=True)
        self.student = User.objects.create_user(username='student1', password='password123', is_student=True)

    def test_user_roles(self):
        """Test that user roles are assigned correctly"""
        self.assertTrue(self.teacher.is_teacher)
        self.assertFalse(self.teacher.is_student)
        self.assertTrue(self.student.is_student)
        self.assertFalse(self.student.is_teacher)

    def test_user_creation_hashing(self):
        """Ensure passwords are encrypted in the database"""
        user = User.objects.get(username='student1')
        self.assertNotEqual(user.password, 'password123')
        
class AccountsAPITest(APITestCase):
    """Validates the search API functionality and security"""
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher_user', 
            first_name='John', 
            last_name='Doe', 
            is_teacher=True
        )
        self.student = User.objects.create_user(
            username='student_user', 
            first_name='Jane', 
            last_name='Smith', 
            is_student=True
        )
        self.client.force_authenticate(user=self.teacher)

    def test_search_users_logic(self):
        """Teacher searching for students"""
        # Search by first name
        url = '/api/accounts/search/?q=Jane'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'student_user')

        # Search by username partial
        url = '/api/accounts/search/?q=student'
        response = self.client.get(url)
        self.assertTrue(any(item['username'] == 'student_user' for item in response.data))