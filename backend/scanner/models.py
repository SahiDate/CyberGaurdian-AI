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
        related_name='scan_results'
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

    # FUTURE: AI Agent fields (Phase 3+)
    # ai_recommendations = models.JSONField(default=list, blank=True)
    # virustotal_data = models.JSONField(default=dict, blank=True)
    # urlscan_data = models.JSONField(default=dict, blank=True)
    # abuseipdb_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-scanned_at']
        indexes = [
            models.Index(fields=['user', '-scanned_at']),
            models.Index(fields=['domain']),
        ]

    def __str__(self):
        return f"{self.domain} — {self.risk_level} ({self.security_score}/100) [{self.scanned_at}]"
