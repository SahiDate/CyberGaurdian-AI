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
    threat_type = models.CharField(max_length=100, default='VULNERABILITY')
    severity = models.CharField(max_length=20, default='MEDIUM')
    indicator_count = models.IntegerField(default=0)
    raw_data = models.JSONField(default=dict, blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['user', '-detected_at']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return f"Threat: {self.target} ({self.severity}) [{self.user.username}]"


class FileAnalysis(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='file_analyses'
    )
    filename = models.CharField(max_length=255)
    file_hash = models.CharField(max_length=64, blank=True)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=100, blank=True)
    analysis_result = models.JSONField(default=dict, blank=True)
    risk_level = models.CharField(max_length=20, default='clean')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"File: {self.filename} ({self.risk_level}) [{self.user.username}]"


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
