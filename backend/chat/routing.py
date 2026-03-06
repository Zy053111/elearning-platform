from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/chat/<int:course_id>/", consumers.ChatConsumer.as_asgi()),
    path("ws/pc/chat/<str:room_name>/", consumers.PrivateChatConsumer.as_asgi()),
    path("ws/notifications/", consumers.NotificationConsumer.as_asgi()),
]