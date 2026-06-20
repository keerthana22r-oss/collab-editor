from channels.generic.websocket import AsyncWebsocketConsumer


class DocumentConsumer(AsyncWebsocketConsumer):
    """
    A deliberately "dumb" relay for Yjs CRDT updates.

    This consumer never parses the Yjs binary format. It just rebroadcasts
    every binary message it receives to every *other* client connected to
    the same document, unmodified.

    Why a dumb relay is enough: Yjs updates are CRDT operations -- applying
    them in any order, even with overlap, converges to the same document
    state (see y-doc.on('update', ...) on the frontend). The server doesn't
    need to understand *what* changed, only that every connected client
    needs to eventually see every update. That's a much smaller, easier to
    reason about contract than reimplementing Yjs's full sync protocol
    server-side.

    What this trades away: a brand-new client that joins mid-session gets
    nothing from this socket until someone else types. Bootstrapping a
    joining client with the document's *existing* content is handled
    separately, over the REST API (see useCollaborativeDoc.js on the
    frontend, which loads persisted state via GET before opening this
    socket). Production systems like Hocuspocus or the reference
    y-websocket server instead keep a live, merged Y.Doc in server memory
    so they can answer "what's the current state" directly over the socket
    -- that needs a Yjs runtime on the server (e.g. the y-py bindings),
    which this project deliberately avoids to keep the backend pure Python/
    Django. Worth bringing up as a "how would you scale this further"
    answer.
    """

    async def connect(self):
        self.document_id = self.scope["url_route"]["kwargs"]["document_id"]
        self.group_name = f"document_{self.document_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data is None:
            return
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "relay.update",
                "data": bytes_data,
                "sender_channel": self.channel_name,
            },
        )

    async def relay_update(self, event):
        # Don't echo a client's own update back to itself -- it already
        # has this change locally, since it's the one that made it.
        if event["sender_channel"] == self.channel_name:
            return
        await self.send(bytes_data=event["data"])
