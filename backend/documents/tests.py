from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

def make_user(username="alice", password="password123"):
    return User.objects.create_user(username=username, password=password, email=f"{username}@example.com")

def auth(client, username, password="password123"):
    r = client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    return r.data

class DocumentAPITests(APITestCase):
    def setUp(self):
        self.user = make_user()
        auth(self.client, "alice")

    def test_create_and_list(self):
        r = self.client.post("/api/documents/", {"title": "Doc 1"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        r = self.client.get("/api/documents/")
        self.assertEqual(len(r.data), 1)

    def test_retrieve_content(self):
        r = self.client.post("/api/documents/", {"title": "Doc", "content": {"type": "doc"}}, format="json")
        r2 = self.client.get(f"/api/documents/{r.data['id']}/")
        self.assertEqual(r2.data["content"], {"type": "doc"})

    def test_rename(self):
        r = self.client.post("/api/documents/", {"title": "Old"}, format="json")
        r2 = self.client.patch(f"/api/documents/{r.data['id']}/", {"title": "New"}, format="json")
        self.assertEqual(r2.data["title"], "New")

    def test_delete(self):
        r = self.client.post("/api/documents/", {"title": "Temp"}, format="json")
        self.client.delete(f"/api/documents/{r.data['id']}/")
        r2 = self.client.get(f"/api/documents/{r.data['id']}/")
        self.assertEqual(r2.status_code, status.HTTP_404_NOT_FOUND)

    def test_viewer_cannot_edit(self):
        bob = make_user("bob")
        r = self.client.post("/api/documents/", {"title": "Alice doc"}, format="json")
        doc_id = r.data["id"]
        self.client.post(f"/api/documents/{doc_id}/invite/", {"email": "bob@example.com", "role": "viewer"}, format="json")
        auth(self.client, "bob")
        r2 = self.client.patch(f"/api/documents/{doc_id}/", {"title": "Hacked"}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_can_edit(self):
        make_user("carol")
        r = self.client.post("/api/documents/", {"title": "Alice doc"}, format="json")
        doc_id = r.data["id"]
        self.client.post(f"/api/documents/{doc_id}/invite/", {"email": "carol@example.com", "role": "editor"}, format="json")
        auth(self.client, "carol")
        r2 = self.client.patch(f"/api/documents/{doc_id}/", {"title": "Carol edit"}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_unauthenticated_denied(self):
        self.client.credentials()
        r = self.client.get("/api/documents/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
