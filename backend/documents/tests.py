from rest_framework import status
from rest_framework.test import APITestCase


class DocumentAPITests(APITestCase):
    def test_create_and_list_document(self):
        response = self.client.post(
            "/api/documents/", {"title": "My first doc", "content": {}}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        doc_id = response.data["id"]

        list_response = self.client.get("/api/documents/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        titles = [doc["title"] for doc in list_response.data]
        self.assertIn("My first doc", titles)
        self.assertTrue(doc_id)

    def test_retrieve_document_returns_content(self):
        create = self.client.post(
            "/api/documents/",
            {"title": "Has content", "content": {"type": "doc", "content": []}},
            format="json",
        )
        doc_id = create.data["id"]

        detail = self.client.get(f"/api/documents/{doc_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["content"], {"type": "doc", "content": []})

    def test_rename_document(self):
        create = self.client.post("/api/documents/", {"title": "Old title"}, format="json")
        doc_id = create.data["id"]

        rename = self.client.patch(
            f"/api/documents/{doc_id}/", {"title": "New title"}, format="json"
        )
        self.assertEqual(rename.status_code, status.HTTP_200_OK)
        self.assertEqual(rename.data["title"], "New title")

    def test_save_content_does_not_clobber_title(self):
        create = self.client.post("/api/documents/", {"title": "Keep me"}, format="json")
        doc_id = create.data["id"]

        self.client.patch(
            f"/api/documents/{doc_id}/",
            {"content": {"type": "doc", "content": [{"type": "paragraph"}]}},
            format="json",
        )

        detail = self.client.get(f"/api/documents/{doc_id}/")
        self.assertEqual(detail.data["title"], "Keep me")

    def test_delete_document(self):
        create = self.client.post("/api/documents/", {"title": "Temporary"}, format="json")
        doc_id = create.data["id"]

        delete = self.client.delete(f"/api/documents/{doc_id}/")
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)

        detail = self.client.get(f"/api/documents/{doc_id}/")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)
