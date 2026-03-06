from django.contrib import admin
from .models import Course, CourseMaterial

class CourseMaterialInline(admin.TabularInline):
    model = CourseMaterial
    extra = 1

class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'created_at')
    # This allows you to upload materials on the exact same page you create the course!
    inlines = [CourseMaterialInline] 
    filter_horizontal = ('students',) # Makes selecting multiple students look much nicer

admin.site.register(Course, CourseAdmin)
admin.site.register(CourseMaterial)