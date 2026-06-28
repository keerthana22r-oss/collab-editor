from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Document, DocumentCollaborator
from .serializers import (
    CollaboratorSerializer, DocumentDetailSerializer,
    DocumentListSerializer, InviteSerializer,
)

User = get_user_model()

def get_role(document, user):
    """Return the user's role on a document, or None if they have no access."""
    if document.owner == user:
        return "owner"
    collab = document.collaborators.filter(user=user).first()
    return collab.role if collab else None

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        owned = Document.objects.filter(owner=user)
        shared = Document.objects.filter(collaborators__user=user)
        return (owned | shared).distinct()

    def get_serializer_class(self):
        return DocumentListSerializer if self.action == "list" else DocumentDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        doc = self.get_object()
        role = get_role(doc, request.user)
        if role == "viewer":
            return Response({"detail": "Viewers cannot edit."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        doc = self.get_object()
        if doc.owner != request.user:
            return Response({"detail": "Only the owner can delete."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def collaborators(self, request, pk=None):
        doc = self.get_object()
        collabs = doc.collaborators.select_related("user")
        return Response(CollaboratorSerializer(collabs, many=True).data)

    @action(detail=True, methods=["post"])
    def invite(self, request, pk=None):
        doc = self.get_object()
        if doc.owner != request.user:
            return Response({"detail": "Only the owner can invite."}, status=status.HTTP_403_FORBIDDEN)

        ser = InviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"]
        role = ser.validated_data["role"]

        invited_user = User.objects.filter(email=email).first()
        if invited_user:
            collab, created = DocumentCollaborator.objects.get_or_create(
                document=doc, user=invited_user, defaults={"role": role, "invited_email": email}
            )
            if not created:
                collab.role = role
                collab.save()
        else:
            # Store pending invite by email; resolved when that email signs up.
            DocumentCollaborator.objects.update_or_create(
                document=doc, invited_email=email, user=None,
                defaults={"role": role}
            )

        return Response({"detail": f"Invited {email} as {role}."})

    @action(detail=True, methods=["delete"], url_path="collaborators/(?P<collab_id>[0-9]+)")
    def remove_collaborator(self, request, pk=None, collab_id=None):
        doc = self.get_object()
        if doc.owner != request.user:
            return Response({"detail": "Only the owner can remove collaborators."}, status=status.HTTP_403_FORBIDDEN)
        DocumentCollaborator.objects.filter(id=collab_id, document=doc).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
