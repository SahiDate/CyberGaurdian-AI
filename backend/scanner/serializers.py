from rest_framework import serializers
from .models import ScanResult


class ScanResultSerializer(serializers.ModelSerializer):
    """Full scan result serializer — used for report detail view."""

    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)

    class Meta:
        model = ScanResult
        fields = [
            'id',
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

    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)

    class Meta:
        model = ScanResult
        fields = [
            'id',
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
