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
