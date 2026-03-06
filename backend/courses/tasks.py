from celery import shared_task
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from .models import Course

User = get_user_model()

@shared_task
def send_welcome_email_task(user_id, course_id):
    """
    Handles email delivery in a background worker process.
    This prevents the user's browser from 'spinning' while waiting for the mail server.
    """
    try:
        # Retrieve fresh data from the DB to ensure accuracy
        user = User.objects.get(id=user_id)
        course = Course.objects.get(id=course_id)
        
        subject = f"Welcome to {course.title}!"
        message = f"Hi {user.username},\n\nYou have successfully enrolled in {course.title}. We are excited to have you!\n\nInstructor: {course.teacher.username}"
        
        # Send the email
        send_mail(
            subject,
            message,
            'noreply@elearning.com',
            [user.email],
            fail_silently=False,
        )
        return f"Email sent successfully to {user.email}"
    except Exception as e:
        return f"Failed to send email: {str(e)}"