from channels.testing import WebsocketCommunicator
from django.test import TestCase, override_settings

from config.asgi import application

# Tests use the in-memory channel layer (ships with `channels`, no extra
# dependency) so `python manage.py test` doesn't require a running Redis
# instance -- only manual two-browser-tab testing and the real app need
# Redis.
TEST_CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class DocumentConsumerTests(TestCase):
    path = "/ws/documents/11111111-1111-1111-1111-111111111111/"

    async def test_update_relays_to_other_connected_client(self):
        client_a = WebsocketCommunicator(application, self.path)
        client_b = WebsocketCommunicator(application, self.path)

        connected_a, _ = await client_a.connect()
        connected_b, _ = await client_b.connect()
        self.assertTrue(connected_a)
        self.assertTrue(connected_b)

        await client_a.send_to(bytes_data=b"\x01\x02\x03")
        received = await client_b.receive_from()
        self.assertEqual(received, b"\x01\x02\x03")

        await client_a.disconnect()
        await client_b.disconnect()

    async def test_sender_does_not_receive_its_own_update(self):
        client_a = WebsocketCommunicator(application, self.path)
        await client_a.connect()

        await client_a.send_to(bytes_data=b"\x09\x09")
        self.assertTrue(await client_a.receive_nothing(timeout=0.2))

        await client_a.disconnect()

    async def test_clients_on_different_documents_do_not_see_each_others_updates(self):
        other_path = "/ws/documents/22222222-2222-2222-2222-222222222222/"
        client_a = WebsocketCommunicator(application, self.path)
        client_b = WebsocketCommunicator(application, other_path)

        await client_a.connect()
        await client_b.connect()

        await client_a.send_to(bytes_data=b"\xaa")
        self.assertTrue(await client_b.receive_nothing(timeout=0.2))

        await client_a.disconnect()
        await client_b.disconnect()
