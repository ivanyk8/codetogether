from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
import os

class Project(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    password = models.CharField(max_length=128, null=True, blank=True) # Хешированный пароль сессии
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def set_session_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_session_password(self, raw_password):
        if not self.password:
            return True
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.name

class ProjectMember(models.Model):
    PERMISSION_CHOICES = (
        ('read', 'Только чтение'),
        ('edit', 'Редактирование'),
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='read')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

class Folder(models.Model):
    name = models.CharField(max_length=255)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='folders')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

from django.db.models.signals import post_save
from django.dispatch import receiver

class File(models.Model):
    name = models.CharField(max_length=255)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='project_files/')
    mime_type = models.CharField(max_length=100, blank=True)
    size = models.BigIntegerField(default=0)
    version = models.BigIntegerField(default=0) # Поле для OT/версионности
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class FileRevision(models.Model):
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='revisions')
    version = models.BigIntegerField()
    content = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    background_image = models.ImageField(upload_to='user_backgrounds/', null=True, blank=True)
    theme = models.CharField(max_length=20, default='default') # default, ocean, forest, sunset, midnight
    
    def __str__(self):
        return f"Profile of {self.user.username}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if not hasattr(instance, 'profile'):
        Profile.objects.create(user=instance)
    instance.profile.save()
