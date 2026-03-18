from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Project, Folder, File, ProjectMember

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'name', 'file', 'size', 'mime_type', 'folder', 'created_at']

class FolderSerializer(serializers.ModelSerializer):
    files = FileSerializer(many=True, read_only=True)
    subfolders = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'files', 'subfolders', 'created_at']

    def get_subfolders(self, obj):
        return FolderSerializer(obj.subfolders.all(), many=True).data

class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'permission', 'joined_at']

class ProjectSerializer(serializers.ModelSerializer):
    members_count = serializers.IntegerField(source='members.count', read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'owner', 'owner_name', 'is_public', 'members_count', 'created_at']

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    token = serializers.CharField()
    uidb64 = serializers.CharField()
