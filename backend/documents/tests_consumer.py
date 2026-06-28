from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from config.asgi import application
from documents.models import Document

User = get_user_model()
TEST_CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class DocumentConsumerTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass")
        self.doc = Document.objects.create(title="Test", owner=self.owner)
        self.path = f"/ws/documents/{self.doc.id}/"

    def _scope(self, user=None):
        return {"type": "websocket", "url_route": {"kwargs": {"document_id": str(self.doc.id)}}, "user": user or self.owner}

    async def test_relay_between_clients(self):
        scope = self._scope()
        a = WebsocketCommunicator(application, self.path)
        b = WebsocketCommunicator(application, self.path)
        a.scope.update(scope); b.scope.update(scope)
        await a.connect(); await b.connect()
        await a.send_to(bytes_data=b"\x00hello")
        received = await b.receive_from()
        self.assertEqual(received, b"\x00hello")
        await a.disconnect(); await b.disconnect()

    async def test_no_self_echo(self):
        scope = self._scope()
        a = WebsocketCommunicator(application, self.path)
        a.scope.update(scope)
        await a.connect()
        await a.send_to(bytes_data=b"\x00test")
        self.assertTrue(await a.receive_nothing(timeout=0.2))
        await a.disconnect()
