import base64
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Document, DocumentCollaborator

User = get_user_model()

class Base64BinaryField(serializers.Field):
    def to_representation(self, value):
        return base64.b64encode(bytes(value)).decode("ascii") if value else None
    def to_internal_value(self, data):
        return base64.b64decode(data) if data else None

class DocumentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "title", "created_at", "updated_at"]

class DocumentDetailSerializer(serializers.ModelSerializer):
    yjs_state = Base64BinaryField(required=False, allow_null=True)

    class Meta:
        model = Document
        fields = ["id", "title", "content", "yjs_state", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class CollaboratorSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = DocumentCollaborator
        fields = ["id", "username", "email", "invited_email", "role", "created_at"]
        read_only_fields = ["id", "created_at", "username", "email"]

class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["editor", "viewer"])
