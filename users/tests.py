from django.test import TestCase, Client
from django.test import override_settings
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.base import ContentFile
import tempfile
import shutil

from .models import Project, File, FileRevision

class AuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.api_register_url = reverse('api_register')

    def test_registration_view(self):
        response = self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'test@example.com',
            'password1': 'StrongPass123!',
            'password2': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, 302) # Redirect to login
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_registration_email_required(self):
        response = self.client.post(self.register_url, {
            'username': 'testuser2',
            'password1': 'StrongPass123!',
            'password2': 'StrongPass123!'
        })
        # Should fail as email is empty or invalid
        self.assertFalse(User.objects.filter(username='testuser2').exists())

    def test_api_registration(self):
        data = {
            "username": "apiuser",
            "email": "api@example.com",
            "password": "ApiPassword123!"
        }
        response = self.api_client.post(self.api_register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

    def test_login_view(self):
        User.objects.create_user(username='loginuser', password='password123')
        response = self.client.post(self.login_url, {
            'username': 'loginuser',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 302) # Redirect to dashboard


class FileRevisionTests(TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self._settings = override_settings(MEDIA_ROOT=self.tmpdir)
        self._settings.enable()
        self.api = APIClient()
        self.user = User.objects.create_user(username="owner", password="pass123456", email="o@example.com")
        self.api.force_authenticate(user=self.user)
        self.project = Project.objects.create(name="p", owner=self.user, is_public=True)
        self.file = File.objects.create(
            name="test.py",
            project=self.project,
            file=ContentFile(b"print('v0')\n", name="test.py"),
            mime_type="text/plain",
            size=0,
        )

    def tearDown(self):
        self._settings.disable()
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_revisions_and_rollback(self):
        FileRevision.objects.create(file=self.file, version=self.file.version, content="print('old')\n", created_by=self.user)
        rev = FileRevision.objects.create(file=self.file, version=self.file.version + 1, content="print('rollback')\n", created_by=self.user)

        revisions_url = reverse("file_revisions", kwargs={"pk": self.file.id})
        res = self.api.get(revisions_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(r["id"] == rev.id for r in res.data["revisions"]))

        rollback_url = reverse("file_rollback", kwargs={"pk": self.file.id})
        res2 = self.api.post(rollback_url, {"revision_id": rev.id}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        self.file.refresh_from_db()
        self.assertGreater(self.file.version, 0)


class PublicProjectEditTests(TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self._settings = override_settings(MEDIA_ROOT=self.tmpdir)
        self._settings.enable()

        self.owner = User.objects.create_user(username="owner2", password="pass123456", email="owner2@example.com")
        self.other = User.objects.create_user(username="other", password="pass123456", email="other@example.com")

        self.project = Project.objects.create(name="pub", owner=self.owner, is_public=True)
        self.file = File.objects.create(
            name="a.txt",
            project=self.project,
            file=ContentFile(b"old\n", name="a.txt"),
            mime_type="text/plain",
            size=0,
        )

        self.api = APIClient()
        self.api.force_authenticate(user=self.other)

    def tearDown(self):
        self._settings.disable()
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_public_project_allows_authenticated_edit(self):
        url = reverse("file_content", kwargs={"pk": self.file.id})
        res = self.api.post(url, {"content": "new\n", "version": 0}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
