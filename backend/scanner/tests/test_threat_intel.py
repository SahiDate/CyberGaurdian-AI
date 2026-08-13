import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import ThreatIntelResult
from scanner.validators import validate_target_format, detect_target_type, ValidationError
from scanner.services.threat_intel.virustotal import VirusTotalProvider
from scanner.services.threat_intel.abuseipdb import AbuseIPDBProvider
from scanner.services.threat_intel.urlscan import URLScanProvider
from scanner.services.threat_intel.scoring import calculate_threat_score_and_severity
from scanner.services.threat_intel.service import ThreatIntelligenceService

User = get_user_model()


class ThreatIntelValidationTests(TestCase):
    """Test target format validation and auto-detection (Step 4 & Step 24)."""

    def test_valid_domain_validation(self):
        res = validate_target_format("example.com", "DOMAIN")
        self.assertEqual(res["target"], "example.com")
        self.assertEqual(res["target_type"], "DOMAIN")

    def test_valid_url_validation(self):
        res = validate_target_format("https://example.com/login?query=1", "URL")
        self.assertEqual(res["target"], "https://example.com/login?query=1")
        self.assertEqual(res["target_type"], "URL")

    def test_valid_ipv4_validation(self):
        res = validate_target_format("8.8.8.8", "IP")
        self.assertEqual(res["target"], "8.8.8.8")
        self.assertEqual(res["target_type"], "IP")

    def test_valid_ipv6_validation(self):
        res = validate_target_format("2001:4860:4860::8888", "IP")
        self.assertEqual(res["target"], "2001:4860:4860::8888")
        self.assertEqual(res["target_type"], "IP")

    def test_valid_sha256_hash_validation(self):
        sha256_sample = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        res = validate_target_format(sha256_sample, "FILE_HASH")
        self.assertEqual(res["target"], sha256_sample)
        self.assertEqual(res["target_type"], "FILE_HASH")

    def test_invalid_domain_fails(self):
        with self.assertRaises(ValidationError):
            validate_target_format("invalid_domain_spec!#@", "DOMAIN")

    def test_invalid_ip_fails(self):
        with self.assertRaises(ValidationError):
            validate_target_format("999.999.999.999", "IP")

    def test_invalid_hash_fails(self):
        with self.assertRaises(ValidationError):
            validate_target_format("short_hash_123", "FILE_HASH")

    def test_auto_detection(self):
        self.assertEqual(detect_target_type("https://test.org"), "URL")
        self.assertEqual(detect_target_type("1.1.1.1"), "IP")
        self.assertEqual(detect_target_type("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"), "FILE_HASH")
        self.assertEqual(detect_target_type("google.com"), "DOMAIN")


class ProviderAdapterTests(TestCase):
    """Test external threat intelligence provider adapters (Steps 5, 6, 7, 24)."""

    @patch("requests.get")
    def test_virustotal_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": {
                "attributes": {
                    "last_analysis_stats": {"malicious": 3, "suspicious": 1, "harmless": 80, "undetected": 5},
                    "reputation": 10
                }
            }
        }
        mock_get.return_value = mock_resp

        vt = VirusTotalProvider(api_key="mock_vt_key")
        res = vt.scan("example.com", "DOMAIN")

        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["malicious"], 3)
        self.assertEqual(res["suspicious"], 1)

    @patch("requests.get")
    def test_abuseipdb_non_ip_input(self, mock_get):
        abuse = AbuseIPDBProvider(api_key="mock_abuse_key")
        res = abuse.scan("example.com", "DOMAIN")
        self.assertEqual(res["status"], "NOT_APPLICABLE")

    @patch("requests.get")
    def test_abuseipdb_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": {
                "abuseConfidenceScore": 85,
                "totalReports": 42,
                "countryCode": "US",
                "isp": "Google LLC"
            }
        }
        mock_get.return_value = mock_resp

        abuse = AbuseIPDBProvider(api_key="mock_abuse_key")
        res = abuse.scan("8.8.8.8", "IP")

        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["raw_summary"]["abuseConfidenceScore"], 85)
        self.assertEqual(res["malicious"], 1)


class ScoringAndServiceTests(TestCase):
    """Test deterministic threat scoring & service execution (Steps 9, 10, 11)."""

    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="Password123!", role="USER", status="ACTIVE", is_active=True)

    def test_deterministic_scoring(self):
        provider_data = [
            {"provider": "VirusTotal", "status": "SUCCESS", "malicious": 5, "suspicious": 1, "harmless": 75, "undetected": 2, "raw_summary": {}},
            {"provider": "AbuseIPDB", "status": "SUCCESS", "malicious": 1, "suspicious": 0, "harmless": 0, "undetected": 0, "raw_summary": {"abuseConfidenceScore": 80}},
        ]
        score, severity, confidence, summary = calculate_threat_score_and_severity(provider_data)

        self.assertGreaterEqual(score, 75)
        self.assertEqual(severity, "CRITICAL")
        self.assertGreaterEqual(confidence, 85)

    @patch.object(VirusTotalProvider, "scan")
    @patch.object(AbuseIPDBProvider, "scan")
    @patch.object(URLScanProvider, "scan")
    def test_threat_intel_service_persists(self, mock_urlscan, mock_abuse, mock_vt):
        mock_vt.return_value = {"provider": "VirusTotal", "status": "SUCCESS", "malicious": 0, "suspicious": 0, "harmless": 80, "undetected": 0, "raw_summary": {}}
        mock_abuse.return_value = {"provider": "AbuseIPDB", "status": "NOT_APPLICABLE", "malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0, "raw_summary": {}}
        mock_urlscan.return_value = {"provider": "urlscan.io", "status": "SUCCESS", "malicious": 0, "suspicious": 0, "harmless": 2, "undetected": 0, "raw_summary": {}}

        service = ThreatIntelligenceService(providers=[VirusTotalProvider(), AbuseIPDBProvider(), URLScanProvider()])
        record = service.execute_scan(target="safe-domain.org", target_type="DOMAIN", user=self.user, bypass_cache=True)

        self.assertEqual(record.user, self.user)
        self.assertEqual(record.target, "safe-domain.org")
        self.assertEqual(record.severity, "LOW")
        self.assertIn(record.status, ["SUCCESS", "PARTIAL_SUCCESS"])


class SecurityAndIsolationAPITests(TestCase):
    """Test RBAC, User Isolation, user_id spoofing prevention (Steps 12, 16, 24, 25)."""

    def setUp(self):
        self.user_a = User.objects.create_user(username="usera", password="Password123!", role="USER", status="ACTIVE", is_active=True)
        self.user_b = User.objects.create_user(username="userb", password="Password123!", role="USER", status="ACTIVE", is_active=True)
        self.admin = User.objects.create_user(username="adminuser", password="Password123!", role="ADMIN", status="ACTIVE", is_active=True, is_staff=True)

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

        self.client_admin = APIClient()
        self.client_admin.force_authenticate(user=self.admin)

        # Create records owned by User A
        self.record_a = ThreatIntelResult.objects.create(
            user=self.user_a,
            target="malicious-site.com",
            target_type="DOMAIN",
            threat_score=85,
            severity="CRITICAL",
            confidence=90,
            status="SUCCESS"
        )

    def test_user_a_can_view_own_record(self):
        response = self.client_a.get(f"/api/threat-intelligence/{self.record_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target"], "malicious-site.com")

    def test_user_b_cannot_access_user_a_record(self):
        response = self.client_b.get(f"/api/threat-intelligence/{self.record_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_id_spoofing_ignored_in_scan(self):
        """Verify user_id supplied in POST request is completely ignored by backend."""
        with patch.object(VirusTotalProvider, "scan") as mock_vt:
            mock_vt.return_value = {"provider": "VirusTotal", "status": "SUCCESS", "malicious": 0, "suspicious": 0, "harmless": 10, "undetected": 0, "raw_summary": {}}
            
            payload = {
                "user_id": self.user_b.id, # Attempted spoofing!
                "target": "spoof-test.com",
                "target_type": "DOMAIN"
            }
            response = self.client_a.post("/api/threat-intelligence/scan/", payload, format="json")

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Verify saved record belongs to authenticated user_a, NOT user_b!
            saved_record = ThreatIntelResult.objects.get(target="spoof-test.com")
            self.assertEqual(saved_record.user, self.user_a)

    def test_normal_user_denied_admin_endpoint(self):
        response = self.client_a.get("/api/admin/threat-intelligence/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_platform_wide_records(self):
        response = self.client_admin.get("/api/admin/threat-intelligence/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["target"], "malicious-site.com")
