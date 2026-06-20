import base64

from rest_framework import serializers

from .models import Document


class Base64BinaryField(serializers.Field):
    """Lets a BinaryField travel over JSON as a base64 string."""

    def to_representation(self, value):
        if not value:
            return None
        return base64.b64encode(bytes(value)).decode("ascii")

    def to_internal_value(self, data):
        if not data:
            return None
        return base64.b64decode(data)


class DocumentListSerializer(serializers.ModelSerializer):
    """Lightweight shape for the document list view -- no content payload."""

    class Meta:
        model = Document
        fields = ["id", "title", "created_at", "updated_at"]


class DocumentDetailSerializer(serializers.ModelSerializer):
    """
    Full shape for reading/writing a single document.

    `content` is a leftover from Phase 1 and is now effectively vestigial
    -- `yjs_state` is the real source of truth once a document has been
    opened in the Phase 2 editor. A future enhancement would derive a
    plain-text preview from `yjs_state` server-side (e.g. via the `y-py`
    Python bindings) for search/listing; out of scope here.
    """

    yjs_state = Base64BinaryField(required=False, allow_null=True)

    class Meta:
        model = Document
        fields = ["id", "title", "content", "yjs_state", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
