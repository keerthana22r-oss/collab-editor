from django.contrib.auth import get_user_model
from rest_framework import viewsets

from .models import Document
from .serializers import DocumentDetailSerializer, DocumentListSerializer

User = get_user_model()


def get_demo_user():
    """
    Phase 1 has no authentication yet. Every document is owned by a single
    demo user so the data model (owner = FK to the user table) is already
    shaped correctly for Phase 4, when real JWT auth replaces this with
    `request.user`.
    """
    user, _ = User.objects.get_or_create(
        username="demo",
        defaults={"email": "demo@example.com"},
    )
    return user


class DocumentViewSet(viewsets.ModelViewSet):
    """
    list   -> GET    /api/documents/
    create -> POST   /api/documents/
    read   -> GET    /api/documents/{id}/
    update -> PATCH  /api/documents/{id}/   (rename and/or save content)
    delete -> DELETE /api/documents/{id}/
    """

    def get_queryset(self):
        # Once auth lands, swap get_demo_user() for self.request.user and
        # widen this to documents the user owns OR has been shared on.
        return Document.objects.filter(owner=get_demo_user())

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        return DocumentDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=get_demo_user())
