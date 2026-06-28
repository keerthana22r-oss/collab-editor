import uuid
from django.conf import settings
from django.db import models

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled document")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_documents"
    )
    content = models.JSONField(default=dict, blank=True)
    yjs_state = models.BinaryField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title

class DocumentCollaborator(models.Model):
    ROLE_CHOICES = [("owner", "Owner"), ("editor", "Editor"), ("viewer", "Viewer")]

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="collaborators")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="collaborations",
        null=True, blank=True
    )
    invited_email = models.EmailField(blank=True, default="")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="editor")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("document", "user")]

    def __str__(self):
        return f"{self.document.title} – {self.user or self.invited_email} ({self.role})"
