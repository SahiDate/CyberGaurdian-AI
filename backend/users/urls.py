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
    AdminDashboardView, AdminIncidentUpdateView, AdminAnalyticsView,
    ThreatIntelScanView, ThreatIntelUserHistoryView, ThreatIntelUserDetailView,
    ThreatIntelAdminListView, ThreatIntelAdminDetailView, ThreatIntelAdminAnalyticsView,
    FileAnalysisUploadView, FileAnalysisUserHistoryView, FileAnalysisUserDetailView,
    FileAnalysisAdminListView, FileAnalysisAdminDetailView, FileAnalysisAdminAnalyticsView,
    SSLScanCreateView, SSLScanUserHistoryView, SSLScanUserDetailView,
    SSLScanAdminListView, SSLScanAdminDetailView, SSLScanAdminAnalyticsView,
    WhoisLookupCreateView, WhoisUserHistoryView, WhoisUserDetailView,
    WhoisAdminListView, WhoisAdminDetailView, WhoisAdminAnalyticsView,
    URLScanCreateView, URLScanUserHistoryView, URLScanUserDetailView,
    URLScanAdminListView, URLScanAdminDetailView, URLScanAdminAnalyticsView,
    PortScanCreateView, PortScanUserHistoryView, PortScanUserDetailView,
    PortScanAdminListView, PortScanAdminDetailView, PortScanAdminAnalyticsView,
    SOCAnalyzeView, SOCCorrelateTargetView, SOCUserHistoryView, SOCUserDetailView,
    SOCAdminListView, SOCAdminDetailView, SOCAdminAnalyticsView
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

    # Phase 3 User Threat Intelligence Endpoints
    path('api/threat-intelligence/scan/', ThreatIntelScanView.as_view(), name='threat_intel_scan'),
    path('api/threat-intelligence/history/', ThreatIntelUserHistoryView.as_view(), name='threat_intel_history'),
    path('api/threat-intelligence/<int:pk>/', ThreatIntelUserDetailView.as_view(), name='threat_intel_detail'),

    # Phase 4 User File Analysis Endpoints
    path('api/file-analysis/analyze/', FileAnalysisUploadView.as_view(), name='file_analysis_upload'),
    path('api/file-analysis/history/', FileAnalysisUserHistoryView.as_view(), name='file_analysis_history'),
    path('api/file-analysis/<int:pk>/', FileAnalysisUserDetailView.as_view(), name='file_analysis_detail_explicit'),

    # Phase 5 User SSL Scanner Endpoints
    path('api/ssl-scanner/scan/', SSLScanCreateView.as_view(), name='ssl_scan_create'),
    path('api/ssl-scanner/history/', SSLScanUserHistoryView.as_view(), name='ssl_scan_history'),
    path('api/ssl-scanner/<int:pk>/', SSLScanUserDetailView.as_view(), name='ssl_scan_detail'),

    # Phase 5 User WHOIS Lookup Endpoints
    path('api/whois/lookup/', WhoisLookupCreateView.as_view(), name='whois_lookup_create'),
    path('api/whois/history/', WhoisUserHistoryView.as_view(), name='whois_lookup_history'),
    path('api/whois/<int:pk>/', WhoisUserDetailView.as_view(), name='whois_lookup_detail'),

    # Phase 6 User URL Scanner Endpoints
    path('api/url-scanner/scan/', URLScanCreateView.as_view(), name='url_scan_create'),
    path('api/url-scanner/history/', URLScanUserHistoryView.as_view(), name='url_scan_history'),
    path('api/url-scanner/<int:pk>/', URLScanUserDetailView.as_view(), name='url_scan_detail'),

    # Phase 7 User Port Scanner Endpoints
    path('api/port-scanner/scan/', PortScanCreateView.as_view(), name='port_scan_create'),
    path('api/port-scanner/history/', PortScanUserHistoryView.as_view(), name='port_scan_history'),
    path('api/port-scanner/<int:pk>/', PortScanUserDetailView.as_view(), name='port_scan_detail'),

    # Phase 8 User SOC Analysis Endpoints
    path('api/soc/analyze/', SOCAnalyzeView.as_view(), name='soc_analyze'),
    path('api/soc/correlate-target/', SOCCorrelateTargetView.as_view(), name='soc_correlate_target'),
    path('api/soc/history/', SOCUserHistoryView.as_view(), name='soc_history'),
    path('api/soc/<int:pk>/', SOCUserDetailView.as_view(), name='soc_detail'),
    
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
    path('api/admin/file-analysis/', FileAnalysisAdminListView.as_view(), name='admin_file_analysis_list'),
    path('api/admin/file-analysis/analytics/', FileAnalysisAdminAnalyticsView.as_view(), name='admin_file_analysis_analytics'),
    path('api/admin/file-analysis/<int:pk>/', FileAnalysisAdminDetailView.as_view(), name='admin_file_analysis_detail'),
    path('api/admin/ai-activity/', AdminAllAIActivitiesListView.as_view(), name='admin_all_ai_activities'),

    # Phase 5 Admin SSL Scanner Endpoints
    path('api/admin/ssl-scanner/', SSLScanAdminListView.as_view(), name='admin_ssl_scanner_list'),
    path('api/admin/ssl-scanner/analytics/', SSLScanAdminAnalyticsView.as_view(), name='admin_ssl_scanner_analytics'),
    path('api/admin/ssl-scanner/<int:pk>/', SSLScanAdminDetailView.as_view(), name='admin_ssl_scanner_detail'),

    # Phase 5 Admin WHOIS Lookup Endpoints
    path('api/admin/whois/', WhoisAdminListView.as_view(), name='admin_whois_list'),
    path('api/admin/whois/analytics/', WhoisAdminAnalyticsView.as_view(), name='admin_whois_analytics'),
    path('api/admin/whois/<int:pk>/', WhoisAdminDetailView.as_view(), name='admin_whois_detail'),

    # Phase 6 Admin URL Scanner Endpoints
    path('api/admin/url-scanner/', URLScanAdminListView.as_view(), name='admin_url_scanner_list'),
    path('api/admin/url-scanner/analytics/', URLScanAdminAnalyticsView.as_view(), name='admin_url_scanner_analytics'),
    path('api/admin/url-scanner/<int:pk>/', URLScanAdminDetailView.as_view(), name='admin_url_scanner_detail'),

    # Phase 7 Admin Port Scanner Endpoints
    path('api/admin/port-scanner/', PortScanAdminListView.as_view(), name='admin_port_scanner_list'),
    path('api/admin/port-scanner/analytics/', PortScanAdminAnalyticsView.as_view(), name='admin_port_scanner_analytics'),
    path('api/admin/port-scanner/<int:pk>/', PortScanAdminDetailView.as_view(), name='admin_port_scanner_detail'),

    # Phase 8 Admin SOC Analysis Endpoints
    path('api/admin/soc/', SOCAdminListView.as_view(), name='admin_soc_list'),
    path('api/admin/soc/analytics/', SOCAdminAnalyticsView.as_view(), name='admin_soc_analytics'),
    path('api/admin/soc/<int:pk>/', SOCAdminDetailView.as_view(), name='admin_soc_detail'),

    # Admin Aggregated & Analytics Endpoints
    path('api/admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('api/admin/incidents/<int:pk>/', AdminIncidentUpdateView.as_view(), name='admin_incident_detail'),
    path('api/admin/analytics/', AdminAnalyticsView.as_view(), name='admin_analytics'),

    # Phase 3 Admin Threat Intelligence Endpoints
    path('api/admin/threat-intelligence/', ThreatIntelAdminListView.as_view(), name='admin_threat_intel_list'),
    path('api/admin/threat-intelligence/analytics/', ThreatIntelAdminAnalyticsView.as_view(), name='admin_threat_intel_analytics'),
    path('api/admin/threat-intelligence/<int:pk>/', ThreatIntelAdminDetailView.as_view(), name='admin_threat_intel_detail'),
]

