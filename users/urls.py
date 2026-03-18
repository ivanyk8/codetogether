from django.urls import path, include
from django.contrib.auth import views as auth_views
from . import views
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('', views.dashboard, name='home'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('editor/', views.editor_view, name='editor'),
    path('editor/<int:project_id>/', views.editor_view, name='editor_project'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    path('settings/', views.settings_view, name='settings'),
    
    # Session Management
    path('api/projects/', views.ProjectListCreateView.as_view(), name='api_projects'),
    path('api/projects/<int:pk>/', views.ProjectDetailView.as_view(), name='api_project_detail'),
    path('api/projects/join/', views.ProjectJoinView.as_view(), name='api_projects_join'),
    path('api/projects/<int:project_id>/members/', views.ProjectMembersView.as_view(), name='api_project_members'),
    
    # Password Reset
    path('password_reset/', auth_views.PasswordResetView.as_view(
        template_name='users/password_reset_form.html',
        email_template_name='registration/password_reset_email.html',
        subject_template_name='registration/password_reset_subject.txt'
    ), name='password_reset'),
    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='users/password_reset_done.html'
    ), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='users/password_reset_confirm.html'
    ), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='users/password_reset_complete.html'
    ), name='password_reset_complete'),

    # API Endpoints
    path('api/register/', views.RegisterAPIView.as_view(), name='api_register'),
    path('api/password_reset/', views.PasswordResetRequestAPIView.as_view(), name='api_password_reset'),
    path('api/password_reset_confirm/', views.PasswordResetConfirmAPIView.as_view(), name='api_password_reset_confirm'),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # File Operations API
    path('api/projects/<int:project_id>/files/', views.ProjectFilesView.as_view(), name='project_files'),
    path('api/projects/<int:project_id>/upload/', views.FileUploadView.as_view(), name='file_upload_api'),
    path('api/projects/<int:project_id>/download/', views.DownloadZipView.as_view(), name='project_download_zip'),
    path('api/projects/<int:project_id>/create-folder/', views.CreateFolderView.as_view(), name='create_folder'),
    path('api/projects/<int:project_id>/create-file/', views.CreateFileView.as_view(), name='create_file'),
    path('api/files/<int:pk>/', views.FileOperationView.as_view(), name='file_operation'),
    path('api/files/<int:pk>/content/', views.FileContentView.as_view(), name='file_content'),
    path('api/files/<int:pk>/revisions/', views.FileRevisionsView.as_view(), name='file_revisions'),
    path('api/files/<int:pk>/rollback/', views.FileRollbackView.as_view(), name='file_rollback'),
]
