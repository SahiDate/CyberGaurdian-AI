from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, VerifyRegistrationView, LoginInitiateView, VerifyLoginView,
    AdminLoginInitiateView, AdminVerifyLoginView, ForgotPasswordView, ResetPasswordView,
    UserProfileView, UserSettingsView, UserScansListView, UserScanDetailView,
    UserReportsListView, UserReportDetailView, UserThreatsListView, UserIncidentsListView,
    UserFileAnalysisListView, UserFileAnalysisDetailView, UserAIActivityListView, UserNotificationsListView,
    AdminUserListView, AdminUserDetailView, AdminSystemHealthView, AdminApiHealthView,
    AdminThreatAnalyticsView, AdminAuditLogsView, AdminSettingsView, AdminAllScansListView,
    AdminAllReportsListView, AdminAllThreatsListView, AdminAllIncidentsListView,
    AdminAllFileAnalysesListView, AdminAllAIActivitiesListView,
    AdminDashboardView, AdminIncidentUpdateView, AdminAnalyticsView
)

urlpatterns = [
    # JWT Token
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Auth
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    path('api/verify-registration/', VerifyRegistrationView.as_view(), name='verify_registration'),
    path('api/login/', LoginInitiateView.as_view(), name='login_initiate'),
    path('api/verify-login/', VerifyLoginView.as_view(), name='verify_login'),
    path('api/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('api/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    
    # Admin Auth
    path('api/admin/login/', AdminLoginInitiateView.as_view(), name='admin_login_initiate'),
    path('api/admin/verify-login/', AdminVerifyLoginView.as_view(), name='admin_verify_login'),
    
    # User Isolated Endpoints
    path('api/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/settings/', UserSettingsView.as_view(), name='user_settings'),
    path('api/scans/', UserScansListView.as_view(), name='scans_list'),
    path('api/scans/<int:pk>/', UserScanDetailView.as_view(), name='scan_detail'),
    path('api/user/scans/', UserScansListView.as_view(), name='user_scans'),
    path('api/reports/', UserReportsListView.as_view(), name='user_reports'),
    path('api/reports/<int:pk>/', UserReportDetailView.as_view(), name='user_report_detail'),
    path('api/threats/', UserThreatsListView.as_view(), name='user_threats'),
    path('api/history/', UserScansListView.as_view(), name='user_history'),
    path('api/incidents/', UserIncidentsListView.as_view(), name='user_incidents'),
    path('api/file-analysis/', UserFileAnalysisListView.as_view(), name='user_file_analyses'),
    path('api/file-analysis/<int:pk>/', UserFileAnalysisDetailView.as_view(), name='user_file_analysis_detail'),
    path('api/ai-activity/', UserAIActivityListView.as_view(), name='user_ai_activity'),
    path('api/notifications/', UserNotificationsListView.as_view(), name='user_notifications'),
    path('api/notifications/<int:pk>/', UserNotificationsListView.as_view(), name='user_notification_detail'),
    
    # Admin Platform-Wide Endpoints
    path('api/admin/users/', AdminUserListView.as_view(), name='admin_user_list'),
    path('api/admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('api/admin/system-health/', AdminSystemHealthView.as_view(), name='admin_system_health'),
    path('api/admin/api-health/', AdminApiHealthView.as_view(), name='admin_api_health'),
    path('api/admin/threats/', AdminThreatAnalyticsView.as_view(), name='admin_threats'),
    path('api/admin/logs/', AdminAuditLogsView.as_view(), name='admin_logs'),
    path('api/admin/settings/', AdminSettingsView.as_view(), name='admin_settings'),
    path('api/admin/scans/', AdminAllScansListView.as_view(), name='admin_scans'),
    path('api/admin/reports/', AdminAllReportsListView.as_view(), name='admin_all_reports'),
    path('api/admin/threats-list/', AdminAllThreatsListView.as_view(), name='admin_all_threats'),
    path('api/admin/incidents/', AdminAllIncidentsListView.as_view(), name='admin_all_incidents'),
    path('api/admin/file-analysis/', AdminAllFileAnalysesListView.as_view(), name='admin_all_file_analyses'),
    path('api/admin/ai-activity/', AdminAllAIActivitiesListView.as_view(), name='admin_all_ai_activities'),

    # New Admin Aggregated Endpoints
    path('api/admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('api/admin/incidents/<int:pk>/', AdminIncidentUpdateView.as_view(), name='admin_incident_detail'),
    path('api/admin/analytics/', AdminAnalyticsView.as_view(), name='admin_analytics'),
]
