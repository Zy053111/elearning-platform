from django.db.models import Max, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import DirectMessage, Notification
from .serializers import DirectMessageSerializer, NotificationSerializer
from accounts.models import CustomUser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_direct_messages(request, target_user_id):
    current_user = request.user
    
    # Get messages where (Me -> Them) OR (Them -> Me)
    messages = DirectMessage.objects.filter(
        (Q(sender=current_user) & Q(receiver_id=target_user_id)) |
        (Q(sender_id=target_user_id) & Q(receiver=current_user))
    )
    
    serializer = DirectMessageSerializer(messages, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_chats(request):
    user = request.user
    
    # Find all users who have exchanged messages with current user
    sent_to = DirectMessage.objects.filter(sender=user).values_list('receiver', flat=True)
    received_from = DirectMessage.objects.filter(receiver=user).values_list('sender', flat=True)
    
    chat_user_ids = set(list(sent_to) + list(received_from))
    
    recent_chats = []
    for uid in chat_user_ids:
        other_user = CustomUser.objects.get(id=uid)
        # Get the very last message for the preview text
        last_msg = DirectMessage.objects.filter(
            (Q(sender=user) & Q(receiver=other_user)) | 
            (Q(sender=other_user) & Q(receiver=user))
        ).latest('timestamp')
        
        recent_chats.append({
            'id': other_user.id,
            'username': other_user.username,
            'first_name': other_user.first_name,
            'last_name': other_user.last_name,
            'last_message': last_msg.message[:30] + "..." if len(last_msg.message) > 30 else last_msg.message,
            'timestamp': last_msg.timestamp
        })

    # Sort by most recent message first
    recent_chats.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return Response(recent_chats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_counts(request):
    unread_notifs = Notification.objects.filter(recipient=request.user, is_read=False).count()
    unread_chats = DirectMessage.objects.filter(receiver=request.user, is_read=False).count()
    
    return Response({
        "unread_notif_count": unread_notifs,
        "unread_chat_count": unread_chats
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_as_read(request, sender_id):
    """Updates database and broadcasts new unread counts via WebSocket [cite: 101, 184]"""
    # Update the database for this specific conversation
    DirectMessage.objects.filter(
        sender_id=sender_id,
        receiver=request.user,
        is_read=False
    ).update(is_read=True)

    new_chat_count = DirectMessage.objects.filter(receiver=request.user, is_read=False).count()
    current_notif_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_notifications_{request.user.id}",
        {
            "type": "new_notification",
            "unread_notif_count": current_notif_count,
            "unread_chat_count": new_chat_count
        }
    )

    return Response({
        'status': 'marked as read', 
        'unread_chat_count': new_chat_count,
        'unread_notif_count': current_notif_count
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    # Update all unread notifications for the user to 'read'
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)

    # Recalculate both counts to keep the Navbar in sync
    unread_notifs = 0 
    unread_chats = DirectMessage.objects.filter(receiver=request.user, is_read=False).count()

    # Broadcast the new counts via WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_notifications_{request.user.id}",
        {
            "type": "new_notification",
            "unread_notif_count": unread_notifs,
            "unread_chat_count": unread_chats
        }
    )

    return Response({'status': 'notifications marked as read'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = Notification.objects.filter(recipient=request.user)[:20]
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)