from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_role(document_id, user):
    """Return the user's role string, or None if they have no access."""
    if isinstance(user, AnonymousUser) or not user.is_authenticated:
        return None
    from documents.models import Document, DocumentCollaborator
    try:
        doc = Document.objects.get(pk=document_id)
    except Document.DoesNotExist:
        return None
    if doc.owner == user:
        return "owner"
    collab = DocumentCollaborator.objects.filter(document=doc, user=user).first()
    return collab.role if collab else None


class DocumentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.document_id = self.scope["url_route"]["kwargs"]["document_id"]
        self.group_name = f"document_{self.document_id}"
        user = self.scope.get("user", AnonymousUser())

        # Viewers CAN connect (read-only); the write check is in receive().
        role = await get_role(self.document_id, user)
        if role is None:
            await self.close()
            return

        self.role = role
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data is None:
            return

        MSG_DOC = 0
        MSG_AWARENESS = 1
        msg_type = bytes_data[0]

        # Block doc edits from viewers; allow awareness (cursor) messages through.
        if msg_type == MSG_DOC and self.role == "viewer":
            return

        await self.channel_layer.group_send(
            self.group_name,
            {"type": "relay.update", "data": bytes_data, "sender": self.channel_name},
        )

    async def relay_update(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send(bytes_data=event["data"])
