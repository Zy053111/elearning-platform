import os
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import pre_save
from django.dispatch import receiver

# Extending AbstractUser allows us to keep Django's built-in auth logic
# while adding custom fields like roles and profile photos
class CustomUser(AbstractUser):
    # Boolean flags are used for high-speed role-based permission checks
    is_student = models.BooleanField(default=False)
    is_teacher = models.BooleanField(default=False)
    
    # ImageField handles file validation and saves the path in the database
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)

    def __str__(self):
        return self.username

# This signal receiver automates storage management by deleting orphaned files
# It triggers every time a user profile is updated
@receiver(pre_save, sender=CustomUser)
def delete_old_avatar(sender, instance, **kwargs):
    # Exit if this is a new user creation; there is no old photo to delete
    if not instance.pk:
        return

    try:
        # Retrieve the current database state before it is overwritten
        old_user = CustomUser.objects.get(pk=instance.pk)
        old_photo = old_user.photo
    except CustomUser.DoesNotExist:
        return

    # Compare the current photo in the DB with the new incoming file
    new_photo = instance.photo
    
    # If the user is uploading a new photo, remove the physical file of the old one
    # This prevents the server from filling up with unused images
    if old_photo and old_photo != new_photo:
        if os.path.isfile(old_photo.path):
            os.remove(old_photo.path)