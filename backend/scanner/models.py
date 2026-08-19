from django.db import models
from django.conf import settings


class ScanResult(models.Model):
    """
    Stores a single website security scan result.
    Designed to be compatible with future AI Agent integrations (Phase 3+).
    """

    RISK_LEVELS = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
    ]

    # Ownership
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scan_results',
        null=True,
        blank=True
    )

    # Target info
    url = models.CharField(max_length=2048, help_text="Original user input")
    domain = models.CharField(max_length=512, help_text="Normalized domain extracted from URL")
    is_https = models.BooleanField(default=False)

    # Overall score
    security_score = models.IntegerField(default=0, help_text="0-100 composite security score")
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS, default='high')

    # Individual module reports (JSON blobs — queryable in future AI phases)
    ssl_data = models.JSONField(default=dict, blank=True)
    headers_data = models.JSONField(default=dict, blank=True)
    dns_data = models.JSONField(default=dict, blank=True)
    whois_data = models.JSONField(default=dict, blank=True)
    robots_data = models.JSONField(default=dict, blank=True)

    # Metadata
    scanned_at = models.DateTimeField(auto_now_add=True)
    scan_duration_ms = models.IntegerField(default=0, help_text="Total scan duration in milliseconds")

    class Meta:
        ordering = ['-scanned_at']
        indexes = [
            models.Index(fields=['user', '-scanned_at']),
            models.Index(fields=['domain']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"{self.domain} — {self.risk_level} ({self.security_score}/100) [{self.scanned_at}]"


class Report(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports'
    )
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, default='EXECUTIVE')
    summary = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, default='GENERATED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"Report: {self.title} ({self.user.username})"


class ThreatIntelResult(models.Model):
    TARGET_TYPES = [
        ('DOMAIN', 'Domain'),
        ('URL', 'URL'),
        ('IP', 'IP Address'),
        ('FILE_HASH', 'File Hash'),
    ]

    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('RATE_LIMITED', 'Rate Limited'),
        ('UNAUTHORIZED', 'Unauthorized'),
        ('NOT_FOUND', 'Not Found'),
        ('TIMEOUT', 'Timeout'),
        ('ERROR', 'Error'),
        ('PARTIAL_SUCCESS', 'Partial Success'),
        ('NOT_APPLICABLE', 'Not Applicable'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='threat_results'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='threat_results'
    )
    target = models.CharField(max_length=512)
    target_type = models.CharField(max_length=50, choices=TARGET_TYPES, default='DOMAIN')
    provider = models.CharField(max_length=100, default='Multi-Provider')
    query_type = models.CharField(max_length=50, default='REPUTATION')
    threat_score = models.IntegerField(default=0, help_text="0-100 deterministic risk score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=0, help_text="0-100 evidence confidence percentage")
    
    # Standard detection breakdown counts
    malicious_count = models.IntegerField(default=0)
    suspicious_count = models.IntegerField(default=0)
    harmless_count = models.IntegerField(default=0)
    undetected_count = models.IntegerField(default=0)
    
    # Detailed summaries and responses
    detection_summary = models.JSONField(default=dict, blank=True)
    normalized_result = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SUCCESS')
    error_message = models.TextField(blank=True, null=True)

    # Legacy compatibility fields
    threat_type = models.CharField(max_length=100, default='REPUTATION')
    indicator_count = models.IntegerField(default=0)
    raw_data = models.JSONField(default=dict, blank=True)
    
    detected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['user', '-detected_at']),
            models.Index(fields=['target']),
            models.Index(fields=['target_type']),
            models.Index(fields=['provider']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"ThreatIntel [{self.target_type}]: {self.target} ({self.severity} - {self.threat_score}/100) [{self.user.username}]"


class FileAnalysis(models.Model):
    DETECTED_TYPES = [
        ('PE', 'Windows Executable'),
        ('ELF', 'Linux Executable'),
        ('SCRIPT', 'Script File'),
        ('DOCUMENT', 'Document File'),
        ('ARCHIVE', 'Archive File'),
        ('MOBILE', 'Mobile Package'),
        ('GENERIC', 'Generic Binary'),
    ]

    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    ANALYSIS_STATUSES = [
        ('QUEUED', 'Queued'),
        ('ANALYZING', 'Analyzing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='file_analyses'
    )

    # Identifiers & Storage
    original_filename = models.CharField(max_length=255, default='')
    stored_filename = models.CharField(max_length=255, default='')
    file_size = models.BigIntegerField(default=0)
    
    # Types & Extensions
    detected_type = models.CharField(max_length=50, choices=DETECTED_TYPES, default='GENERIC')
    mime_type = models.CharField(max_length=100, default='application/octet-stream')
    extension = models.CharField(max_length=50, blank=True, default='')

    # Hashes
    sha256 = models.CharField(max_length=64, db_index=True, blank=True, default='')
    sha1 = models.CharField(max_length=40, blank=True, default='')
    md5 = models.CharField(max_length=32, blank=True, default='')

    # Static Analysis Indicators
    entropy = models.FloatField(default=0.0, help_text="Shannon entropy (0.0 to 8.0)")
    entropy_category = models.CharField(max_length=20, default='LOW')
    signature_status = models.CharField(max_length=30, default='NOT_PRESENT')
    yara_status = models.CharField(max_length=30, default='NO_MATCH')
    yara_matches = models.JSONField(default=list, blank=True)

    # Third Party Reputation Lookup (Phase 3 Integration — SHA256 only)
    virustotal_status = models.CharField(max_length=30, default='NOT_FOUND')
    virustotal_detections = models.JSONField(default=dict, blank=True)

    # Risk Scoring & Severity
    threat_score = models.IntegerField(default=0, help_text="0-100 deterministic threat score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=0, help_text="0-100 evidence confidence percentage")
    
    # Status & Structured Evidence Payload for Phase 8 SOC Engine
    analysis_status = models.CharField(max_length=30, choices=ANALYSIS_STATUSES, default='COMPLETED')
    error_message = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    normalized_evidence = models.JSONField(default=dict, blank=True)

    # Legacy Compatibility Fields
    filename = models.CharField(max_length=255, blank=True, default='')
    file_hash = models.CharField(max_length=64, blank=True, default='')
    file_type = models.CharField(max_length=100, blank=True, default='')
    analysis_result = models.JSONField(default=dict, blank=True)
    risk_level = models.CharField(max_length=20, default='low')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['sha256']),
            models.Index(fields=['detected_type']),
            models.Index(fields=['severity']),
            models.Index(fields=['analysis_status']),
        ]

    def save(self, *args, **kwargs):
        # Sync legacy fields for backward compatibility
        if not self.filename and self.original_filename:
            self.filename = self.original_filename
        if not self.file_hash and self.sha256:
            self.file_hash = self.sha256
        if not self.file_type and self.detected_type:
            self.file_type = self.detected_type
        if not self.risk_level and self.severity:
            self.risk_level = self.severity.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        name = self.original_filename or self.filename or f"File #{self.id}"
        return f"FileAnalysis [{self.detected_type}]: {name} ({self.severity} - {self.threat_score}/100) [{self.user.username}]"


class Incident(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='incidents'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='incidents'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=20, default='MEDIUM')
    status = models.CharField(max_length=20, default='OPEN')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_incidents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return f"Incident: {self.title} ({self.status}) [{self.user.username}]"


class AIActivity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_activities'
    )
    request_text = models.TextField()
    target = models.CharField(max_length=512, blank=True)
    tools_selected = models.JSONField(default=list, blank=True)
    execution_status = models.CharField(max_length=30, default='COMPLETED')
    result_summary = models.TextField(blank=True)
    risk_score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"AI Activity: {self.target or self.request_text[:30]} [{self.user.username}]"


class SSLScanResult(models.Model):
    CERT_STATUSES = [
        ('VALID', 'Valid'),
        ('EXPIRING_SOON', 'Expiring Soon'),
        ('EXPIRED', 'Expired'),
        ('NOT_YET_VALID', 'Not Yet Valid'),
        ('HOSTNAME_MISMATCH', 'Hostname Mismatch'),
        ('INVALID', 'Invalid'),
        ('UNAVAILABLE', 'Unavailable'),
    ]

    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('TIMEOUT', 'Timeout'),
        ('SSRF_BLOCKED', 'SSRF Blocked'),
        ('INVALID_INPUT', 'Invalid Input'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ssl_scans'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='ssl_scans'
    )
    target = models.CharField(max_length=512)
    domain = models.CharField(max_length=512)
    port = models.IntegerField(default=443)

    # Certificate details
    certificate_status = models.CharField(max_length=50, choices=CERT_STATUSES, default='VALID')
    issuer_cn = models.CharField(max_length=255, blank=True, default='')
    subject_cn = models.CharField(max_length=255, blank=True, default='')
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    days_remaining = models.IntegerField(null=True, blank=True)

    # TLS & Cipher parameters
    tls_version = models.CharField(max_length=50, default='UNKNOWN')
    cipher_name = models.CharField(max_length=100, default='UNKNOWN')
    cipher_bits = models.IntegerField(default=0)
    hostname_valid = models.BooleanField(default=True)
    san_list = models.JSONField(default=list, blank=True)
    security_issues = models.JSONField(default=list, blank=True)

    # Deterministic Scoring
    threat_score = models.IntegerField(default=0, help_text="0-100 deterministic risk score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=90)

    # Operational status
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SUCCESS')
    error_message = models.TextField(blank=True, null=True)
    structured_evidence = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['domain']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['certificate_status']),
        ]

    def __str__(self):
        return f"SSLScan: {self.domain}:{self.port} ({self.certificate_status} - {self.threat_score}/100) [{self.user.username}]"


class WhoisLookupResult(models.Model):
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('NOT_FOUND', 'Not Found'),
        ('TIMEOUT', 'Timeout'),
        ('ERROR', 'Error'),
        ('SSRF_BLOCKED', 'SSRF Blocked'),
        ('NOT_APPLICABLE', 'Not Applicable'),
        ('INVALID_INPUT', 'Invalid Input'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='whois_lookups'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='whois_lookups'
    )
    domain = models.CharField(max_length=512)
    registrar = models.CharField(max_length=255, default='NOT_AVAILABLE')
    registry_domain_id = models.CharField(max_length=255, default='NOT_AVAILABLE')

    # Timestamps & Lifecycles
    created_date = models.DateTimeField(null=True, blank=True)
    updated_date = models.DateTimeField(null=True, blank=True)
    expires_date = models.DateTimeField(null=True, blank=True)
    domain_age_days = models.IntegerField(null=True, blank=True)
    days_until_expiration = models.IntegerField(null=True, blank=True)
    age_category = models.CharField(max_length=30, default='UNKNOWN')
    expiration_category = models.CharField(max_length=30, default='UNKNOWN')

    # DNS & Registration Data
    nameservers = models.JSONField(default=list, blank=True)
    domain_status = models.JSONField(default=list, blank=True)
    registrant_org = models.CharField(max_length=255, default='NOT_AVAILABLE')
    registrant_country = models.CharField(max_length=100, default='NOT_AVAILABLE')
    dnssec = models.CharField(max_length=30, default='UNSIGNED')
    security_indicators = models.JSONField(default=list, blank=True)

    # Deterministic Scoring
    threat_score = models.IntegerField(default=0, help_text="0-100 deterministic risk score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=85)

    # Operational status
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SUCCESS')
    error_message = models.TextField(blank=True, null=True)
    structured_evidence = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['domain']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['age_category']),
        ]

    def __str__(self):
        return f"WhoisLookup: {self.domain} ({self.registrar}) [{self.user.username}]"


class URLScanResult(models.Model):
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('TIMEOUT', 'Timeout'),
        ('TLS_ERROR', 'TLS Error'),
        ('CONNECTION_REFUSED', 'Connection Refused'),
        ('REDIRECT_ERROR', 'Redirect Error'),
        ('REDIRECT_LOOP', 'Redirect Loop'),
        ('SSRF_BLOCKED', 'SSRF Blocked'),
        ('INVALID_INPUT', 'Invalid Input'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='url_scans'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='url_scans'
    )

    # URL Identifiers
    original_url = models.CharField(max_length=2048)
    normalized_url = models.CharField(max_length=2048)
    final_url = models.CharField(max_length=2048, blank=True, default='')
    hostname = models.CharField(max_length=512)
    domain = models.CharField(max_length=512)
    scheme = models.CharField(max_length=20, default='https')
    port = models.IntegerField(default=443)
    primary_ip = models.CharField(max_length=100, blank=True, default='')

    # HTTP & Network Telemetry
    http_status = models.IntegerField(null=True, blank=True)
    content_type = models.CharField(max_length=150, blank=True, default='')
    server = models.CharField(max_length=150, blank=True, default='')
    redirect_count = models.IntegerField(default=0)
    redirect_chain = models.JSONField(default=list, blank=True)

    # Correlated Subsystem Evidences
    ssl_result = models.JSONField(default=dict, blank=True)
    whois_result = models.JSONField(default=dict, blank=True)
    threat_intel_result = models.JSONField(default=dict, blank=True)
    indicators = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)

    # Deterministic Scoring
    threat_score = models.IntegerField(default=0, help_text="0-100 deterministic risk score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=80)

    # Operational status
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SUCCESS')
    error_message = models.TextField(blank=True, null=True)
    structured_evidence = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['domain']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['http_status']),
        ]

    def __str__(self):
        return f"URLScan: {self.normalized_url[:40]} ({self.threat_score}/100 - {self.severity}) [{self.user.username}]"


class PortScanResult(models.Model):
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('TIMEOUT', 'Timeout'),
        ('DNS_ERROR', 'DNS Error'),
        ('SSRF_BLOCKED', 'SSRF Blocked'),
        ('INVALID_INPUT', 'Invalid Input'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='port_scans'
    )
    scan = models.ForeignKey(
        ScanResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='port_scans'
    )

    # Target Metadata
    target = models.CharField(max_length=512)
    target_type = models.CharField(max_length=50, default='HOSTNAME')
    resolved_ips = models.JSONField(default=list, blank=True)
    primary_ip = models.CharField(max_length=100, blank=True, default='')

    # Profile & Port Configuration
    scan_profile = models.CharField(max_length=50, default='COMMON')
    requested_ports = models.JSONField(default=list, blank=True)

    # Telemetry Findings
    results = models.JSONField(default=list, blank=True)
    open_ports = models.JSONField(default=list, blank=True)
    closed_ports = models.JSONField(default=list, blank=True)
    filtered_ports = models.JSONField(default=list, blank=True)

    # Evidence & Security Findings
    indicators = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)

    # Deterministic Scoring
    threat_score = models.IntegerField(default=0, help_text="0-100 deterministic risk score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=85)

    # Operational status & telemetry
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SUCCESS')
    error_message = models.TextField(blank=True, null=True)
    structured_evidence = models.JSONField(default=dict, blank=True)
    scan_duration = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['target']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['scan_profile']),
        ]

    def __str__(self):
        return f"PortScan: {self.target} ({len(self.open_ports)} open) [{self.user.username}]"


class SOCAnalysis(models.Model):
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ANALYZING', 'Analyzing'),
        ('COMPLETED', 'Completed'),
        ('PARTIAL', 'Partial'),
        ('FAILED', 'Failed'),
    ]

    THREAT_LEVEL_CHOICES = [
        ('LOW', 'Low Threat'),
        ('MEDIUM', 'Medium Threat'),
        ('HIGH', 'High Threat'),
        ('CRITICAL', 'Critical Threat'),
        ('REVIEW_REQUIRED', 'Review Required'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='soc_analyses'
    )

    # Target & Scope
    target = models.CharField(max_length=255)
    analysis_type = models.CharField(max_length=50, default='COMPOSITE')
    target_identifiers = models.JSONField(default=dict, blank=True)

    # Deterministic Assessment Scores
    risk_score = models.IntegerField(default=0, help_text="0-100 deterministic combined risk score")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='LOW')
    confidence = models.IntegerField(default=75)
    threat_level = models.CharField(max_length=30, choices=THREAT_LEVEL_CHOICES, default='LOW')
    summary = models.TextField(blank=True, default='')

    # Normalized Findings & Correlations
    findings = models.JSONField(default=list, blank=True)
    correlations = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)

    # Evidence Ingestion Traceability
    evidence_sources = models.JSONField(default=list, blank=True)
    source_records = models.JSONField(default=dict, blank=True)

    # Operational status
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='COMPLETED')
    error_message = models.TextField(blank=True, null=True)
    analysis_duration = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['target']),
            models.Index(fields=['severity']),
            models.Index(fields=['threat_level']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"SOCAnalysis #{self.id}: {self.target} ({self.risk_score}/100 - {self.severity}) [{self.user.username}]"




