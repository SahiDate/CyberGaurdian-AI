from rest_framework import serializers
from .models import ScanResult, Report, ThreatIntelResult, FileAnalysis, Incident, AIActivity


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
            'threat_type',
            'severity',
            'indicator_count',
            'raw_data',
            'detected_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'detected_at']


class FileAnalysisSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = FileAnalysis
        fields = [
            'id',
            'user_id',
            'username',
            'filename',
            'file_hash',
            'file_size',
            'file_type',
            'analysis_result',
            'risk_level',
            'created_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at']


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
