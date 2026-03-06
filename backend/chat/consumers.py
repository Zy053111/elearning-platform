import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message, DirectMessage
from courses.models import Course
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.course_id = self.scope['url_route']['kwargs']['course_id']
        self.room_group_name = f'chat_{self.course_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        user_id = data['user_id']
        username = data['username']

        await self.save_message(user_id, self.course_id, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat_message', 'message': message, 'username': username}
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username']
        }))

    @database_sync_to_async
    def save_message(self, user_id, course_id, message):
        user = User.objects.get(id=user_id)
        course = Course.objects.get(id=course_id)
        Message.objects.create(sender=user, course=course, content=message)

class PrivateChatConsumer(AsyncWebsocketConsumer):
    """Manages the real-time lifecycle of a private message"""
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        sender_id = data['sender_id']
        receiver_id = data['receiver_id']
        username = data['username']

        # Save to DB
        await self.save_direct_message(sender_id, receiver_id, message)

        # Send message to the active chat room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': username,
                'sender_id': sender_id
            }
        )

        # Notify the receiver's global notification group with SPLIT counts
        counts = await self.get_all_unread_counts(receiver_id)
        await self.channel_layer.group_send(
            f"user_notifications_{receiver_id}",
            {
                'type': 'new_notification',
                'unread_notif_count': counts['unread_notif_count'],
                'unread_chat_count': counts['unread_chat_count']
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username'],
            'sender_id': event['sender_id']
        }))

    @database_sync_to_async
    def save_direct_message(self, sender_id, receiver_id, message):
        sender = User.objects.get(id=sender_id) 
        receiver = User.objects.get(id=receiver_id)
        DirectMessage.objects.create(sender=sender, receiver=receiver, message=message)

    @database_sync_to_async
    def get_all_unread_counts(self, user_id):
        # Import inside to prevent circular dependency crashes
        from chat.models import Notification, DirectMessage
        unread_notifs = Notification.objects.filter(recipient_id=user_id, is_read=False).count()
        unread_chats = DirectMessage.objects.filter(receiver_id=user_id, is_read=False).count()
        return {
            'unread_notif_count': unread_notifs,
            'unread_chat_count': unread_chats
        }

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept() 
        
        if self.scope["user"].is_anonymous:
            print("DEBUG: User is anonymous. Check your JWT Middleware.")
        else:
            self.user_id = self.scope["user"].id
            self.room_group_name = f"user_notifications_{self.user_id}"
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            
            # Send both counts immediately on connection
            counts = await self.get_all_unread_counts(self.user_id)
            await self.send(text_data=json.dumps(counts))

    async def disconnect(self, close_code):
        if not self.scope["user"].is_anonymous:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def new_notification(self, event):
        # Forward the specific counts to the React Navbar
        await self.send(text_data=json.dumps({
            'unread_notif_count': event.get('unread_notif_count'),
            'unread_chat_count': event.get('unread_chat_count')
        }))

    @database_sync_to_async
    def get_all_unread_counts(self, user_id):
        from chat.models import Notification, DirectMessage
        unread_notifs = Notification.objects.filter(recipient_id=user_id, is_read=False).count()
        unread_chats = DirectMessage.objects.filter(receiver_id=user_id, is_read=False).count()
        return {
            'unread_notif_count': unread_notifs,
            'unread_chat_count': unread_chats
        }