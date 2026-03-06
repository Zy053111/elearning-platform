from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, CourseMaterialViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'course-materials', CourseMaterialViewSet)

urlpatterns = [
    path('', include(router.urls)),
]