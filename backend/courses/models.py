from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class Course(models.Model):
    """The central entity representing an academic subject"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # One-to-Many: A teacher can create many courses, but a course has one creator
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'is_teacher': True},
        related_name='courses_taught'
    )
    
    # Many-to-Many: Students can join multiple courses, and courses have multiple students
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        blank=True, 
        limit_choices_to={'is_student': True},
        related_name='enrolled_courses'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_archived = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class CourseMaterial(models.Model):
    """Stores educational files linked to a specific course"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=200)
    # FileField handles the storage of PDFs and images on the server
    file = models.FileField(upload_to='course_materials/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.course.title}"
    
class Feedback(models.Model):
    """Enforces the 'One Review Per Student' logic"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='feedbacks')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Restrict the rating to be a number from 1 to 5
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating}/5 by {self.student.username} for {self.course.title}"