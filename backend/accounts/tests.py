from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

class AuthTests(APITestCase):
    def test_register_and_login(self):
        r = self.client.post("/api/auth/register/", {
            "username": "alice", "email": "alice@example.com", "password": "password123"
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        r = self.client.post("/api/auth/login/", {
            "username": "alice", "password": "password123"
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)

    def test_me_requires_auth(self):
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user(self):
        User.objects.create_user(username="bob", password="password123")
        r = self.client.post("/api/auth/login/", {
            "username": "bob", "password": "password123"
        }, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["username"], "bob")
