from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.forms import PasswordChangeForm
import logging
import zipfile
import io
import os
import mimetypes

# API imports
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .authentication import CsrfExemptSessionAuthentication
from .serializers import (
    UserSerializer, 
    PasswordResetRequestSerializer, 
    PasswordResetConfirmSerializer,
    ProjectSerializer, 
    FolderSerializer, 
    FileSerializer, 
    ProjectMemberSerializer
)
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.core.files.base import ContentFile
import django.core.files

from .models import Project, Folder, File, ProjectMember, Profile, FileRevision

# Setup logging
logger = logging.getLogger(__name__)

@login_required
def dashboard(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    return render(request, 'users/dashboard.html', {'profile': profile})

@login_required
def settings_view(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        # Смена темы
        if 'theme' in request.POST:
            theme = request.POST.get('theme')
            if theme in ['default', 'ocean', 'forest', 'sunset', 'midnight']:
                profile.theme = theme
                profile.save()
                messages.success(request, f'Тема успешно изменена!')
                return redirect('settings')
        
        # Смена пароля (встроено в эту же страницу)
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, 'Пароль успешно изменен!')
            return redirect('settings')
        else:
            for error in form.errors.values():
                messages.error(request, error)
    else:
        form = PasswordChangeForm(request.user)
        
    return render(request, 'users/settings.html', {
        'profile': profile,
        'password_form': form
    })

@login_required
def update_profile_view(request):
    # Этот эндпоинт теперь можно оставить только для API смены темы
    if request.method == 'POST':
        profile, created = Profile.objects.get_or_create(user=request.user)
        if 'theme' in request.POST:
            theme = request.POST.get('theme')
            if theme in ['default', 'ocean', 'forest', 'sunset', 'midnight']:
                profile.theme = theme
                profile.save()
                return redirect('settings')
    return redirect('dashboard')

@login_required
def editor_view(request, project_id=None):
    # Если project_id не передан, пробуем найти первый проект пользователя или создать его
    if not project_id:
        project = Project.objects.filter(owner=request.user).first()
        if not project:
            project = Project.objects.create(name="Мой проект", owner=request.user)
        return redirect('editor_project', project_id=project.id)
    
    # Проверяем существование проекта (любой авторизованный пользователь может зайти по ID)
    try:
        project = Project.objects.get(id=project_id)
        profile, _ = Profile.objects.get_or_create(user=request.user)
    except Project.DoesNotExist:
        messages.error(request, "Проект не найден")
        return redirect('dashboard')

    if project.owner != request.user:
        member, created = ProjectMember.objects.get_or_create(
            project=project,
            user=request.user,
            defaults={'permission': 'edit'}
        )
        if not created and member.permission != 'edit':
            member.permission = 'edit'
            member.save()
        
    return render(request, 'users/editor.html', {'project_id': project_id, 'project': project, 'profile': profile})

def login_view(request):
    if request.method == "POST":
        login_input = request.POST.get("username")  # Это может быть username или email
        password = request.POST.get("password")
        
        # Сначала пробуем аутентификацию по username
        user = authenticate(request, username=login_input, password=password)
        
        # Если не вышло, пробуем найти пользователя по email и войти через его username
        if not user and login_input and '@' in login_input:
            try:
                user_obj = User.objects.get(email=login_input)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
                
        if user:
            login(request, user)
            logger.info(f"User {user.username} logged in successfully")
            return redirect('dashboard')
        else:
            messages.error(request, "Неверный логин (email) или пароль")
            logger.warning(f"Failed login attempt for input: {login_input}")
    return render(request, 'users/auth.html', {'form_type': 'login'})

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password1 = request.POST.get("password1")
        password2 = request.POST.get("password2")
        
        # Server-side validation
        try:
            validate_email(email)
        except ValidationError:
            messages.error(request, "Введите корректный email адрес")
            return render(request, 'users/auth.html', {'form_type': 'register'})

        if password1 != password2:
            messages.error(request, "Пароли не совпадают")
        elif User.objects.filter(username=username).exists():
            messages.error(request, "Пользователь с таким именем уже существует")
        elif User.objects.filter(email=email).exists():
            messages.error(request, "Пользователь с таким email уже существует")
        elif len(password1) < 8:
            messages.error(request, "Пароль должен содержать минимум 8 символов")
        else:
            user = User.objects.create_user(username=username, email=email, password=password1)
            messages.success(request, "Аккаунт успешно создан! Теперь вы можете войти.")
            logger.info(f"New user registered: {username} ({email})")
            return redirect('login')
            
    return render(request, 'users/auth.html', {'form_type': 'register'})

@login_required
def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def password_change_view(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # Не выкидывать из системы
            messages.success(request, 'Пароль успешно изменен!')
            logger.info(f"Password changed for user {request.user.username}")
            return redirect('dashboard')
        else:
            for error in form.errors.values():
                messages.error(request, error)
            logger.warning(f"Password change failed for user {request.user.username}")
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'users/password_change.html', {'form': form})

# === SESSION MANAGEMENT API ===

class ProjectListCreateView(APIView):
    permission_classes = [AllowAny] # In production, use IsAuthenticated
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        # Проекты, где пользователь владелец или участник
        owned_projects = Project.objects.filter(owner=request.user)
        joined_projects = Project.objects.filter(members__user=request.user)
        projects = (owned_projects | joined_projects).distinct()
        return Response(ProjectSerializer(projects, many=True).data)

    def post(self, request):
        name = request.data.get('name', 'Новая сессия')
        password = request.data.get('password')
        is_public = request.data.get('is_public', False)
        
        project = Project.objects.create(
            name=name, 
            owner=request.user,
            is_public=is_public
        )
        if password:
            project.set_session_password(password)
            project.save()
            
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)

class ProjectDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def delete(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
            if project.owner != request.user:
                return Response({"error": "Только владелец может удалить проект"}, status=status.HTTP_403_FORBIDDEN)
            project.delete()
            return Response({"status": "deleted"}, status=status.HTTP_204_NO_CONTENT)
        except Project.DoesNotExist:
            return Response({"error": "Проект не найден"}, status=status.HTTP_404_NOT_FOUND)

class ProjectJoinView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        project_name = request.data.get('project_name')
        password = request.data.get('password')
        
        if not project_name:
            return Response({"error": "Имя сессии обязательно"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Поиск по имени вместо ID
            project = Project.objects.get(name=project_name)
            
            # Если пользователь владелец - пускаем сразу
            if project.owner == request.user:
                return Response({"status": "ok", "project_id": project.id, "role": "owner"})

            # Проверка пароля
            if not project.is_public and not project.check_session_password(password):
                return Response({"error": "Неверный пароль сессии"}, status=status.HTTP_403_FORBIDDEN)
            
            # Добавляем в участники
            member, created = ProjectMember.objects.get_or_create(
                project=project,
                user=request.user,
                defaults={'permission': 'edit'}
            )

            if not created and member.permission != 'edit':
                member.permission = 'edit'
                member.save()
            
            logger.info(f"User {request.user.username} joined session '{project_name}'")
            return Response({
                "status": "ok", 
                "project_id": project.id, 
                "role": member.permission,
                "project_name": project.name
            })
            
        except Project.DoesNotExist:
            return Response({"error": f"Сессия с именем '{project_name}' не найдена"}, status=status.HTTP_404_NOT_FOUND)
        except Project.MultipleObjectsReturned:
            return Response({"error": "Найдено несколько сессий с таким именем. Пожалуйста, используйте уникальное имя или обратитесь к владельцу."}, status=status.HTTP_400_BAD_REQUEST)

class ProjectMembersView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request, project_id):
        members = ProjectMember.objects.filter(project_id=project_id)
        return Response(ProjectMemberSerializer(members, many=True).data)

    def delete(self, request, project_id):
        user_id = request.data.get('user_id')
        project = Project.objects.get(id=project_id)
        
        if project.owner != request.user:
            return Response({"error": "Только владелец может удалять участников"}, status=status.HTTP_403_FORBIDDEN)
            
        ProjectMember.objects.filter(project=project, user_id=user_id).delete()
        return Response({"status": "removed"})

# === FILE OPERATIONS VIEWS ===

class ProjectFilesView(APIView):
    permission_classes = [AllowAny] # In production, use IsAuthenticated
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Проект не найден"}, status=status.HTTP_404_NOT_FOUND)
            
        root_folders = Folder.objects.filter(project=project, parent=None)
        root_files = File.objects.filter(project=project, folder=None)
        
        return Response({
            "project": ProjectSerializer(project).data,
            "folders": FolderSerializer(root_folders, many=True).data,
            "files": FileSerializer(root_files, many=True).data
        })

class FileUploadView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Проект не найден"}, status=status.HTTP_404_NOT_FOUND)
            
        files = request.FILES.getlist('files')
        paths = request.data.getlist('paths') # e.g., "folder1/subfolder/file.txt"

        uploaded_files = []
        for i, file_obj in enumerate(files):
            path = paths[i] if i < len(paths) else file_obj.name
            parts = path.split('/')
            
            current_folder = None
            # Create folders recursively
            for folder_name in parts[:-1]:
                current_folder, _ = Folder.objects.get_or_create(
                    name=folder_name,
                    project=project,
                    parent=current_folder
                )
            
            # Save file
            new_file = File.objects.create(
                name=parts[-1],
                folder=current_folder,
                project=project,
                file=file_obj,
                size=file_obj.size,
                mime_type=file_obj.content_type
            )
            uploaded_files.append(FileSerializer(new_file).data)
            logger.info(f"File uploaded: {path} in project {project_id}")

        return Response(uploaded_files, status=status.HTTP_201_CREATED)

class DownloadZipView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Проект не найден"}, status=status.HTTP_404_NOT_FOUND)
            
        files = File.objects.filter(project=project)
        
        if not files.exists():
            return Response({"error": "В проекте нет файлов для скачивания"}, status=status.HTTP_400_BAD_REQUEST)

        buffer = io.BytesIO()
        try:
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for file_obj in files:
                    if not file_obj.file or not os.path.exists(file_obj.file.path):
                        logger.warning(f"File not found on disk: {file_obj.name} (ID: {file_obj.id})")
                        continue

                    # Build relative path
                    path_parts = []
                    curr = file_obj.folder
                    while curr:
                        path_parts.insert(0, curr.name)
                        curr = curr.parent
                    path_parts.append(file_obj.name)
                    
                    zip_path = "/".join(path_parts)
                    zip_file.write(file_obj.file.path, zip_path)
            
            # Standard way to get BytesIO content
            response = HttpResponse(buffer.getvalue(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{project.name}.zip"'
            return response
        except Exception as e:
            import traceback
            logger.error(f"Error creating ZIP: {str(e)}\n{traceback.format_exc()}")
            return Response({"error": f"Ошибка при создании архива: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateFolderView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, project_id):
        project = Project.objects.get(id=project_id)
        name = request.data.get('name')
        parent_id = request.data.get('parent')
        
        parent = Folder.objects.get(id=parent_id) if parent_id else None
        folder = Folder.objects.create(name=name, project=project, parent=parent)
        
        return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED)

class CreateFileView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, project_id):
        project = Project.objects.get(id=project_id)
        name = request.data.get('name')
        parent_id = request.data.get('parent')
        
        parent = Folder.objects.get(id=parent_id) if parent_id else None
        # Create empty file
        content = io.BytesIO(b"")
        new_file = File.objects.create(
            name=name,
            folder=parent,
            project=project,
            file=django.core.files.File(content, name=name),
            size=0,
            mime_type='text/plain'
        )
        return Response(FileSerializer(new_file).data, status=status.HTTP_201_CREATED)

class FileOperationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def patch(self, request, pk):
        file_obj = File.objects.filter(pk=pk).first()
        obj = file_obj or Folder.objects.get(pk=pk)
        
        name = request.data.get('name')
        parent_id = request.data.get('parent')
        
        if name:
            obj.name = name
        
        if parent_id is not None:
            # parent_id can be null for root
            parent = Folder.objects.get(id=parent_id) if parent_id else None
            obj.parent = parent
            
        obj.save()
        return Response({"status": "updated"})

    def delete(self, request, pk):
        file_obj = File.objects.filter(pk=pk).first()
        obj = file_obj or Folder.objects.get(pk=pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class FileContentView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request, pk):
        try:
            file_obj = File.objects.get(pk=pk)
            
            # Проверка прав доступа (владелец или участник с правами)
            project = file_obj.project
            is_member = ProjectMember.objects.filter(project=project, user=request.user).exists()
            
            if project.owner != request.user and not is_member and not project.is_public:
                return Response({"error": "У вас нет прав для чтения этого файла"}, status=status.HTTP_403_FORBIDDEN)

            if not os.path.exists(file_obj.file.path):
                logger.error(f"File not found on disk: {file_obj.file.path}")
                return Response({"error": "Файл отсутствует на диске"}, status=status.HTTP_404_NOT_FOUND)

            with open(file_obj.file.path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            logger.info(f"User {request.user.username} read file: {file_obj.name} (ID: {pk})")
            return Response({
                "content": content, 
                "name": file_obj.name,
                "version": file_obj.version,
                "last_modified_by": file_obj.last_modified_by.username if file_obj.last_modified_by else None
            })
        except Exception as e:
            logger.error(f"Error reading file {pk}: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, pk):
        try:
            file_obj = File.objects.get(pk=pk)
            
            # Проверка прав на редактирование
            project = file_obj.project
            member = ProjectMember.objects.filter(project=project, user=request.user).first()
            can_edit = project.owner == request.user or (member and member.permission == 'edit') or (project.is_public and request.user.is_authenticated)
            
            if not can_edit:
                logger.warning(f"User {request.user.username} denied edit access to file {pk}")
                return Response({"error": "У вас нет прав для редактирования этого файла"}, status=status.HTTP_403_FORBIDDEN)

            client_version = request.data.get('version')
            content = request.data.get('content', '')
            
            # Проверка конфликта версий
            if client_version is not None and int(client_version) < file_obj.version:
                with open(file_obj.file.path, 'r', encoding='utf-8', errors='ignore') as f:
                    current_content = f.read()
                return Response({
                    "error": "conflict", 
                    "current_version": file_obj.version,
                    "content": current_content
                }, status=status.HTTP_409_CONFLICT)

            # Сохраняем контент
            try:
                os.makedirs(os.path.dirname(file_obj.file.path), exist_ok=True)
                with open(file_obj.file.path, 'w', encoding='utf-8') as f:
                    f.write(content)
            except IOError as e:
                logger.error(f"IOError writing file {pk}: {str(e)}")
                return Response({"error": "Ошибка записи на диск"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Инкремент версии
            file_obj.version += 1
            file_obj.size = len(content.encode('utf-8'))
            if request.user.is_authenticated:
                file_obj.last_modified_by = request.user
            file_obj.save()

            if file_obj.version % 20 == 0:
                FileRevision.objects.create(
                    file=file_obj,
                    version=file_obj.version,
                    content=content,
                    created_by=request.user if request.user.is_authenticated else None,
                )
            
            logger.info(f"User {request.user.username} saved file: {file_obj.name} (ID: {pk}, Version: {file_obj.version})")
            return Response({
                "status": "saved", 
                "version": file_obj.version,
                "size": file_obj.size
            })
        except Exception as e:
            logger.error(f"Unexpected error saving file {pk}: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FileRevisionsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request, pk):
        try:
            file_obj = File.objects.select_related("project").get(pk=pk)
            project = file_obj.project
            is_member = ProjectMember.objects.filter(project=project, user=request.user).exists()
            if project.owner != request.user and not is_member and not project.is_public:
                return Response({"error": "У вас нет прав для чтения этого файла"}, status=status.HTTP_403_FORBIDDEN)

            revisions = FileRevision.objects.filter(file=file_obj).select_related("created_by").order_by("-created_at")[:50]
            return Response({
                "file_id": file_obj.id,
                "revisions": [
                    {
                        "id": r.id,
                        "version": r.version,
                        "created_at": r.created_at.isoformat(),
                        "created_by": r.created_by.username if r.created_by else None,
                    }
                    for r in revisions
                ],
            })
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)


class FileRollbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, pk):
        revision_id = request.data.get("revision_id")
        if not revision_id:
            return Response({"error": "revision_id_required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_obj = File.objects.select_related("project").get(pk=pk)
            project = file_obj.project
            member = ProjectMember.objects.filter(project=project, user=request.user).first()
            can_edit = project.owner == request.user or (member and member.permission == "edit") or (project.is_public and request.user.is_authenticated)
            if not can_edit:
                return Response({"error": "У вас нет прав для редактирования этого файла"}, status=status.HTTP_403_FORBIDDEN)

            revision = FileRevision.objects.get(pk=revision_id, file=file_obj)
            content = revision.content or ""

            os.makedirs(os.path.dirname(file_obj.file.path), exist_ok=True)
            with open(file_obj.file.path, "w", encoding="utf-8") as f:
                f.write(content)

            file_obj.version += 1
            file_obj.size = len(content.encode("utf-8"))
            file_obj.last_modified_by = request.user if request.user.is_authenticated else None
            file_obj.save()

            FileRevision.objects.create(
                file=file_obj,
                version=file_obj.version,
                content=content,
                created_by=request.user if request.user.is_authenticated else None,
            )

            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            from .collab_state import ensure_doc

            ensure_doc(project_id=project.id, file_id=file_obj.id, content=content, rev=file_obj.version)

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"editor_{project.id}",
                {
                    "type": "broadcast_resync",
                    "file_id": file_obj.id,
                    "content": content,
                    "rev": file_obj.version,
                    "reason": "rollback",
                },
            )

            return Response({"status": "rolled_back", "version": file_obj.version})
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)
        except FileRevision.DoesNotExist:
            return Response({"error": "Версия не найдена"}, status=status.HTTP_404_NOT_FOUND)

# === REST API VIEWS ===

class RegisterAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            logger.info(f"API: New user registered: {serializer.validated_data['username']}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email).first()
            if user:
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Подготовка контекста для шаблона письма
                protocol = 'https' if request.is_secure() else 'http'
                domain = request.get_host()
                context = {
                    'email': user.email,
                    'domain': domain,
                    'site_name': 'CodeTogether',
                    'uid': uid,
                    'user': user,
                    'token': token,
                    'protocol': protocol,
                }
                
                # Рендеринг темы и тела письма (используем существующие шаблоны)
                subject = render_to_string('registration/password_reset_subject.txt', context).strip()
                email_body = render_to_string('registration/password_reset_email.html', context)
                
                try:
                    # Отправка письма через настроенный бэкенд
                    send_mail(
                        subject, 
                        email_body, 
                        settings.DEFAULT_FROM_EMAIL, 
                        [email], 
                        fail_silently=False
                    )
                    logger.info(f"API: Password reset email sent for {email}")
                    return Response({"message": "Письмо для сброса пароля отправлено"}, status=status.HTTP_200_OK)
                except Exception as e:
                    logger.error(f"Error sending email: {str(e)}")
                    # Если бэкенд - console, мы все равно увидим письмо в консоли терминала
                    return Response({"error": f"Ошибка при отправке письма: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            return Response({"error": "Пользователь с таким email не найден"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            uidb64 = serializer.validated_data['uidb64']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None

            if user is not None and default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                logger.info(f"API: Password reset successful for user {user.username}")
                return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)
            return Response({"error": "Invalid token or user ID"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
