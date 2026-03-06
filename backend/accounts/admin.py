from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    # This tells the admin panel to show your custom fields when looking at the list of users
    list_display = ('username', 'email', 'is_student', 'is_teacher', 'is_staff')
    
    # This adds your custom fields to the user editing screen
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Profile', {'fields': ('is_student', 'is_teacher', 'photo')}),
    )

# Register the model and the admin class
admin.site.register(CustomUser, CustomUserAdmin)