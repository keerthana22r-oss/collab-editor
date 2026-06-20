import uuid

from django.conf import settings
from django.db import models


class Document(models.Model):
    """
    A single editable document.

    `content` is the source of truth for Phase 1 (plain Tiptap JSON,
    overwritten on each save). From Phase 2 onward, `yjs_state` becomes
    the real source of truth -- the binary CRDT state that the WebSocket
    layer reads/writes -- and `content` is only kept as a denormalized,
    human-readable mirror for quick previews and search.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled document")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_documents",
    )

    # Phase 1 storage: a Tiptap JSON document, e.g. {"type": "doc", "content": [...]}.
    content = models.JSONField(default=dict, blank=True)

    # Used starting Phase 2: the latest persisted Yjs binary update.
    yjs_state = models.BinaryField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title
