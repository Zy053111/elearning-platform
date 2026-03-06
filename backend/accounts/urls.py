from django.urls import path
from .views import UserRegistrationView, CurrentUserView
from . import views

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('user/<int:user_id>/', views.get_user_profile, name='user-profile'),
    path('search/', views.search_users, name='search_users'),
    path('user-detail/<int:user_id>/', views.get_public_user_detail, name='user_detail'),
]