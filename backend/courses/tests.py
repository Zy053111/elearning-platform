from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Course

User = get_user_model()

class CourseAPITest(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='profe', password='pass', is_teacher=True)
        self.student = User.objects.create_user(username='alumno', password='pass', is_student=True)
        self.course = Course.objects.create(title="IoT Node 1", description="Physical Computing", teacher=self.teacher)
        
        # Authenticate the student for API calls
        self.client.force_authenticate(user=self.student)

    def test_student_enrollment(self):
        """Test the custom enrollment endpoint"""
        url = reverse('course-enrol', args=[self.course.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.course.students.count(), 1)
        self.assertIn(self.student, self.course.students.all())

    def test_enrollment_restriction(self):
        """Ensure teachers cannot enroll as students"""
        self.client.force_authenticate(user=self.teacher)
        url = reverse('course-enrol', args=[self.course.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)