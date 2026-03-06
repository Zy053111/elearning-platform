from django.urls import path
from . import views

urlpatterns = [
    path('messages/<int:target_user_id>/', views.get_direct_messages, name='direct-messages'),
    path('recent-chats/', views.get_recent_chats, name='recent-chats'),
    path('mark-read/<int:sender_id>/', views.mark_messages_as_read, name='mark_read'),
    path('notifications/', views.get_notifications, name='get_notifications'),
    path('unread-counts/', views.get_unread_counts),
    path('notifications/mark-read/', views.mark_notifications_read, name='mark_notifications_read'),
]