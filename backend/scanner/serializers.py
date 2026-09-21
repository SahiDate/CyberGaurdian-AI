from rest_framework import serializers
from .models import (
    ScanResult, Report, ThreatIntelResult, FileAnalysis, Incident, AIActivity,
    SSLScanResult, WhoisLookupResult, URLScanResult, PortScanResult, SOCAnalysis,
    AgentSession, AgentStep, AgentToolExecution, SecurityReport,
    Certificate, CertificateAuditLog
)


class ScanResultSerializer(serializers.ModelSerializer):
    """Full scan result serializer — used for report detail view."""

    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)

    class Meta:
        model = ScanResult
        fields = [
            'id',
            'user_id',
            'username',
            'url',
            'domain',
            'is_https',
            'security_score',
            'risk_level',
            'risk_level_display',
            'ssl_data',
            'headers_data',
            'dns_data',
            'whois_data',
            'robots_data',
            'scan_duration_ms',
            'scanned_at',
        ]
        read_only_fields = fields


class ScanResultListSerializer(serializers.ModelSerializer):
    """Lightweight serializer — used for history list view."""

    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)

    class Meta:
        model = ScanResult
        fields = [
            'id',
            'user_id',
            'username',
            'url',
            'domain',
            'is_https',
            'security_score',
            'risk_level',
            'risk_level_display',
            'scanned_at',
        ]
        read_only_fields = fields


class ScanRequestSerializer(serializers.Serializer):
    """Incoming scan request payload validator."""
    url = serializers.CharField(
        max_length=2048,
        required=True,
        error_messages={
            'required': 'A URL or domain is required.',
            'blank': 'URL cannot be blank.',
        }
    )


class ReportSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Report
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'title',
            'report_type',
            'summary',
            'details',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at']


class ThreatIntelResultSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = ThreatIntelResult
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'target',
            'target_type',
            'provider',
            'query_type',
            'threat_score',
            'severity',
            'confidence',
            'malicious_count',
            'suspicious_count',
            'harmless_count',
            'undetected_count',
            'detection_summary',
            'normalized_result',
            'status',
            'error_message',
            'threat_type',
            'indicator_count',
            'raw_data',
            'detected_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'detected_at', 'updated_at']


class ThreatIntelScanRequestSerializer(serializers.Serializer):
    target = serializers.CharField(
        max_length=512,
        required=True,
        error_messages={
            'required': 'Target is required (URL, Domain, IP, or File Hash).',
            'blank': 'Target cannot be blank.',
        }
    )
    target_type = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True
    )



class FileAnalysisSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = FileAnalysis
        fields = [
            'id',
            'user_id',
            'username',
            'original_filename',
            'stored_filename',
            'file_size',
            'detected_type',
            'mime_type',
            'extension',
            'sha256',
            'sha1',
            'md5',
            'entropy',
            'entropy_category',
            'signature_status',
            'yara_status',
            'yara_matches',
            'virustotal_status',
            'virustotal_detections',
            'threat_score',
            'severity',
            'confidence',
            'analysis_status',
            'error_message',
            'metadata',
            'normalized_evidence',
            # Legacy compatibility fields
            'filename',
            'file_hash',
            'file_type',
            'analysis_result',
            'risk_level',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField(
        required=True,
        error_messages={
            'required': 'A file is required for analysis.',
            'empty': 'Uploaded file is empty.'
        }
    )


class IncidentSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    assigned_to_username = serializers.ReadOnlyField(source='assigned_to.username')

    class Meta:
        model = Incident
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'title',
            'description',
            'severity',
            'status',
            'assigned_to',
            'assigned_to_username',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class AIActivitySerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = AIActivity
        fields = [
            'id',
            'user_id',
            'username',
            'request_text',
            'target',
            'tools_selected',
            'execution_status',
            'result_summary',
            'risk_score',
            'created_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at']


class SSLScanRequestSerializer(serializers.Serializer):
    target = serializers.CharField(
        max_length=512,
        required=True,
        error_messages={
            'required': 'Target domain or URL is required for SSL scanning.',
            'blank': 'Target cannot be blank.'
        }
    )
    port = serializers.IntegerField(
        required=False,
        default=443,
        min_value=1,
        max_value=65535,
        error_messages={
            'invalid': 'Port must be a valid integer between 1 and 65535.'
        }
    )


class SSLScanSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = SSLScanResult
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'target',
            'domain',
            'port',
            'certificate_status',
            'issuer_cn',
            'subject_cn',
            'valid_from',
            'valid_until',
            'days_remaining',
            'tls_version',
            'cipher_name',
            'cipher_bits',
            'hostname_valid',
            'san_list',
            'security_issues',
            'threat_score',
            'severity',
            'confidence',
            'status',
            'error_message',
            'structured_evidence',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class WhoisRequestSerializer(serializers.Serializer):
    domain = serializers.CharField(
        max_length=512,
        required=True,
        error_messages={
            'required': 'Domain name is required for WHOIS lookup.',
            'blank': 'Domain cannot be blank.'
        }
    )


class WhoisLookupSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = WhoisLookupResult
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'domain',
            'registrar',
            'registry_domain_id',
            'created_date',
            'updated_date',
            'expires_date',
            'domain_age_days',
            'days_until_expiration',
            'age_category',
            'expiration_category',
            'nameservers',
            'domain_status',
            'registrant_org',
            'registrant_country',
            'dnssec',
            'security_indicators',
            'threat_score',
            'severity',
            'confidence',
            'status',
            'error_message',
            'structured_evidence',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class URLScanRequestSerializer(serializers.Serializer):
    url = serializers.CharField(
        max_length=2048,
        required=True,
        error_messages={
            'required': 'A URL is required for scanning.',
            'blank': 'URL cannot be blank.'
        }
    )


class URLScanSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = URLScanResult
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'original_url',
            'normalized_url',
            'final_url',
            'hostname',
            'domain',
            'scheme',
            'port',
            'primary_ip',
            'http_status',
            'content_type',
            'server',
            'redirect_count',
            'redirect_chain',
            'ssl_result',
            'whois_result',
            'threat_intel_result',
            'indicators',
            'recommendations',
            'threat_score',
            'severity',
            'confidence',
            'status',
            'error_message',
            'structured_evidence',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class PortScanRequestSerializer(serializers.Serializer):
    target = serializers.CharField(
        max_length=512,
        required=True,
        error_messages={
            'required': 'A target host or IP address is required for scanning.',
            'blank': 'Target cannot be blank.'
        }
    )
    profile = serializers.ChoiceField(
        choices=['COMMON', 'WEB', 'DATABASE', 'ADMIN_REMOTE', 'CUSTOM'],
        default='COMMON',
        required=False
    )
    ports = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=65535),
        required=False,
        default=list
    )


class PortScanSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = PortScanResult
        fields = [
            'id',
            'user_id',
            'username',
            'scan',
            'target',
            'target_type',
            'resolved_ips',
            'primary_ip',
            'scan_profile',
            'requested_ports',
            'results',
            'open_ports',
            'closed_ports',
            'filtered_ports',
            'indicators',
            'recommendations',
            'threat_score',
            'severity',
            'confidence',
            'status',
            'error_message',
            'structured_evidence',
            'scan_duration',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class SOCAnalysisRequestSerializer(serializers.Serializer):
    target = serializers.CharField(
        max_length=1024,
        required=False,
        allow_blank=True,
        default=""
    )
    analysis_type = serializers.CharField(
        max_length=50,
        required=False,
        default="COMPOSITE"
    )
    raw_logs = serializers.CharField(
        required=False,
        allow_blank=True,
        default=""
    )
    log_text = serializers.CharField(
        required=False,
        allow_blank=True,
        default=""
    )
    source = serializers.CharField(
        max_length=50,
        required=False,
        default=""
    )
    source_scan_ids = serializers.DictField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=dict
    )
    auto_correlate = serializers.BooleanField(
        required=False,
        default=True
    )

    def validate(self, data):
        target = data.get('target', '').strip()
        analysis_type = data.get('analysis_type', '').lower()
        has_log = bool(data.get('raw_logs') or data.get('log_text') or analysis_type in ['log', 'log_file', 'log_analysis'])

        request = self.context.get('request')
        has_file = bool(request and (request.FILES.get('file') or request.FILES.get('log_file')))

        if not target and not has_log and not has_file:
            raise serializers.ValidationError({
                'target': 'Target (domain, URL, IP, or file hash) or log content/file is required for SOC analysis.'
            })
        return data


class SOCAnalysisSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = SOCAnalysis
        fields = [
            'id',
            'user_id',
            'username',
            'target',
            'analysis_type',
            'target_identifiers',
            'risk_score',
            'severity',
            'confidence',
            'threat_level',
            'summary',
            'findings',
            'correlations',
            'recommendations',
            'evidence_sources',
            'source_records',
            'status',
            'error_message',
            'analysis_duration',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


# ==============================================================================
# PHASE 9: AUTONOMOUS AI SECURITY AGENT SERIALIZERS
# ==============================================================================

class AgentAnalyzeRequestSerializer(serializers.Serializer):
    target = serializers.CharField(
        max_length=512,
        required=True,
        error_messages={
            'required': 'Target (domain, URL, IP, or file hash) is required for AI Agent analysis.',
            'blank': 'Target cannot be blank.'
        }
    )
    analysis_mode = serializers.CharField(
        max_length=50,
        required=False,
        default='SECURITY_ASSESSMENT'
    )
    max_steps = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=10,
        default=5
    )


class AgentStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentStep
        fields = [
            'id',
            'step_number',
            'action',
            'tool_name',
            'status',
            'reasoning_summary',
            'input_summary',
            'output_summary',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class AgentToolExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentToolExecution
        fields = [
            'id',
            'tool_name',
            'status',
            'duration_seconds',
            'error_message',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class AgentSessionSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = AgentSession
        fields = [
            'id',
            'user_id',
            'username',
            'target',
            'analysis_mode',
            'status',
            'risk_score',
            'severity',
            'confidence',
            'threat_level',
            'summary',
            'findings',
            'recommendations',
            'evidence_sources',
            'tools_used',
            'steps_completed',
            'soc_analysis_id',
            'error_message',
            'duration_seconds',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class AgentSessionDetailSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    steps = AgentStepSerializer(many=True, read_only=True)
    tool_executions = AgentToolExecutionSerializer(many=True, read_only=True)

    class Meta:
        model = AgentSession
        fields = [
            'id',
            'user_id',
            'username',
            'target',
            'analysis_mode',
            'status',
            'risk_score',
            'severity',
            'confidence',
            'threat_level',
            'summary',
            'findings',
            'recommendations',
            'evidence_sources',
            'tools_used',
            'steps_completed',
            'soc_analysis_id',
            'error_message',
            'duration_seconds',
            'steps',
            'tool_executions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']


class SecurityReportGenerateRequestSerializer(serializers.Serializer):
    target = serializers.CharField(max_length=512, required=True)
    soc_analysis_id = serializers.IntegerField(required=False, allow_null=True)
    agent_session_id = serializers.IntegerField(required=False, allow_null=True)
    report_type = serializers.ChoiceField(
        choices=['COMPREHENSIVE', 'SOC_ASSESSMENT', 'AI_SECURITY_ASSESSMENT', 'MODULE_SPECIFIC'],
        default='COMPREHENSIVE'
    )


class SecurityReportSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    soc_analysis_id = serializers.ReadOnlyField(source='soc_analysis.id')
    agent_session_id = serializers.ReadOnlyField(source='agent_session.id')
    pdf_url = serializers.SerializerMethodField()

    certificate_id = serializers.SerializerMethodField()
    certificate_status = serializers.SerializerMethodField()

    class Meta:
        model = SecurityReport
        fields = [
            'id',
            'report_id',
            'user_id',
            'username',
            'target',
            'title',
            'report_type',
            'status',
            'risk_score',
            'severity',
            'confidence',
            'threat_level',
            'summary',
            'soc_analysis_id',
            'agent_session_id',
            'pdf_url',
            'certificate_id',
            'certificate_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'report_id', 'user_id', 'username', 'created_at', 'updated_at']

    def get_pdf_url(self, obj):
        if obj.id:
            return f"/api/reports/{obj.id}/pdf/"
        return None

    def get_certificate_id(self, obj):
        try:
            cert = obj.certificates.filter(status='VALID').first()
            return cert.certificate_id if cert else None
        except Exception:
            return None

    def get_certificate_status(self, obj):
        try:
            cert = obj.certificates.filter(status='VALID').first()
            return cert.status if cert else None
        except Exception:
            return None


class SecurityReportDetailSerializer(SecurityReportSerializer):
    class Meta(SecurityReportSerializer.Meta):
        fields = SecurityReportSerializer.Meta.fields + ['structured_data']


# ==============================================================================
# Certificate Serializers
# ==============================================================================

class CertificateSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    download_url = serializers.SerializerMethodField()
    verify_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id',
            'certificate_id',
            'user_id',
            'username',
            'target',
            'recipient_name',
            'certificate_type',
            'title',
            'assessment_type',
            'assessment_id',
            'result_status',
            'risk_level',
            'risk_score',
            'issue_date',
            'status',
            'verification_url',
            'download_url',
            'verify_url',
            'soc_analysis_id',
            'report_id',
            'generated_at',
            'revoked_at',
            'revocation_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'certificate_id', 'user_id', 'username',
            'created_at', 'updated_at', 'generated_at'
        ]

    def get_download_url(self, obj):
        return f"/api/certificates/{obj.certificate_id}/download/"

    def get_verify_url(self, obj):
        return f"/api/certificates/{obj.certificate_id}/verify/"


class CertificateDetailSerializer(CertificateSerializer):
    class Meta(CertificateSerializer.Meta):
        fields = CertificateSerializer.Meta.fields + ['metadata', 'verification_token']


class PublicCertificateVerificationSerializer(serializers.ModelSerializer):
    """
    Public safe serializer — never leaks sensitive tokens, internal database IDs, passwords, or scan secrets.
    """
    class Meta:
        model = Certificate
        fields = [
            'certificate_id',
            'status',
            'recipient_name',
            'target',
            'certificate_type',
            'title',
            'assessment_type',
            'assessment_id',
            'result_status',
            'risk_level',
            'issue_date',
            'generated_at',
            'revoked_at',
            'revocation_reason',
        ]
        read_only_fields = fields


class CertificateRevocationSerializer(serializers.Serializer):
    revocation_reason = serializers.CharField(
        min_length=5,
        max_length=1000,
        required=True,
        help_text="Mandatory audit justification for revoking the certificate."
    )


class CertificateAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateAuditLog
        fields = [
            'id',
            'cert_id',
            'assessment_id',
            'event_type',
            'actor_username',
            'actor_type',
            'status',
            'ip_address',
            'endpoint',
            'failure_reason',
            'details',
            'timestamp',
        ]
        read_only_fields = fields







