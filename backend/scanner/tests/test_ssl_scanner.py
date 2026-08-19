import os
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import SSLScanResult
from scanner.services.ssrf_protector import validate_target_ssrf, SSRFBlockedError
from scanner.services.ssl_scanner.service import (
    SSLScannerService, normalize_ssl_target, _match_hostname_pattern, _parse_cert_date
)

User = get_user_model()


class SSLScannerUnitTests(TestCase):
    """Unit tests for SSL Scanner normalization, certificate parsing, and scoring."""

    def test_target_normalization(self):
        # Plain domain
        host, port, disp = normalize_ssl_target("example.com")
        self.assertEqual(host, "example.com")
        self.assertEqual(port, 443)
        self.assertEqual(disp, "example.com")

        # HTTPS URL
        host, port, disp = normalize_ssl_target("https://secure.site.org/login")
        self.assertEqual(host, "secure.site.org")
        self.assertEqual(port, 443)

        # Custom port
        host, port, disp = normalize_ssl_target("https://api.internal.org:8443/v1")
        self.assertEqual(host, "api.internal.org")
        self.assertEqual(port, 8443)
        self.assertEqual(disp, "api.internal.org:8443")

    def test_hostname_wildcard_matching(self):
        self.assertTrue(_match_hostname_pattern("example.com", "example.com"))
        self.assertTrue(_match_hostname_pattern("*.example.com", "sub.example.com"))
        self.assertTrue(_match_hostname_pattern("*.example.com", "api.example.com"))
        self.assertFalse(_match_hostname_pattern("*.example.com", "deep.sub.example.com"))
        self.assertFalse(_match_hostname_pattern("*.example.com", "otherdomain.com"))

    def test_ssrf_blocking_restricted_ips(self):
        # Loopback
        with self.assertRaises(SSRFBlockedError):
            validate_target_ssrf("127.0.0.1")
        with self.assertRaises(SSRFBlockedError):
            validate_target_ssrf("localhost")

        # Private RFC1918
        with self.assertRaises(SSRFBlockedError):
            validate_target_ssrf("10.0.0.1")
        with self.assertRaises(SSRFBlockedError):
            validate_target_ssrf("192.168.1.1")
        with self.assertRaises(SSRFBlockedError):
            validate_target_ssrf("172.16.0.5")

        # Cloud Metadata
        with self.assertRaises(SSRFBlockedError):
            validate_target_ssrf("169.254.169.254")

    def test_ssl_service_ssrf_blocked_result(self):
        service = SSLScannerService(timeout=5)
        res = service.scan_target("127.0.0.1")
        self.assertEqual(res["status"], "SSRF_BLOCKED")
        self.assertIn("SSRF", res["error_message"])

    def test_cert_date_parsing_and_evaluation(self):
        now = datetime.now(timezone.utc)
        valid_until = now + timedelta(days=90)
        date_str = valid_until.strftime("%b %d %H:%M:%S %Y GMT")
        parsed_dt = _parse_cert_date(date_str)
        self.assertIsNotNone(parsed_dt)
        self.assertEqual(parsed_dt.year, valid_until.year)

    def test_deterministic_scoring(self):
        service = SSLScannerService()
        
        # Valid cert, modern TLS
        score, sev, conf = service._calculate_ssl_threat_score(
            "VALID", [], "TLSv1.3", {"name": "TLS_AES_256_GCM_SHA384", "bits": 256}
        )
        self.assertEqual(score, 0)
        self.assertEqual(sev, "LOW")
        self.assertGreaterEqual(conf, 80)

        # Expired cert + obsolete TLS
        issues = [
            {"type": "CERTIFICATE_EXPIRED", "severity": "CRITICAL"},
            {"type": "OBSOLETE_TLS_VERSION", "severity": "HIGH"}
        ]
        score, sev, conf = service._calculate_ssl_threat_score(
            "EXPIRED", issues, "TLSv1.0", {"name": "RC4-SHA", "bits": 128}
        )
        self.assertGreaterEqual(score, 75)
        self.assertEqual(sev, "CRITICAL")


class SSLScannerSecurityAndAPITests(TestCase):
    """Security, user data isolation, and API integration tests for SSL Scanner."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username='user_ssl_a', email='usera@ssl.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.user_b = User.objects.create_user(
            username='user_ssl_b', email='userb@ssl.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.admin_user = User.objects.create_user(
            username='admin_ssl', email='admin@ssl.test', password='Password123!', role='ADMIN', status='ACTIVE'
        )

    @patch.object(SSLScannerService, 'scan_target')
    def test_user_can_scan_and_owns_record(self, mock_scan):
        mock_scan.return_value = {
            "target": "example.com",
            "domain": "example.com",
            "port": 443,
            "status": "SUCCESS",
            "certificate_status": "VALID",
            "issuer_cn": "DigiCert Global Root CA",
            "subject_cn": "example.com",
            "valid_from": "2026-01-01T00:00:00+00:00",
            "valid_until": "2027-01-01T00:00:00+00:00",
            "days_remaining": 300,
            "tls_version": "TLSv1.3",
            "cipher_name": "TLS_AES_256_GCM_SHA384",
            "cipher_bits": 256,
            "hostname_valid": True,
            "san_list": ["example.com", "www.example.com"],
            "security_issues": [],
            "threat_score": 0,
            "severity": "LOW",
            "confidence": 95,
            "error_message": None,
            "structured_evidence": {"source": "SSL_SCANNER"}
        }

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/ssl-scanner/scan/', {"target": "example.com"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["domain"], "example.com")
        self.assertEqual(response.data["certificate_status"], "VALID")

        # Verify database record belongs strictly to User A
        record = SSLScanResult.objects.get(id=response.data["id"])
        self.assertEqual(record.user, self.user_a)

    def test_user_data_isolation(self):
        # User A creates a record
        rec_a = SSLScanResult.objects.create(
            user=self.user_a,
            target="usera-site.org",
            domain="usera-site.org",
            port=443,
            certificate_status="VALID",
            threat_score=10,
            severity="LOW"
        )

        # User B creates a record
        rec_b = SSLScanResult.objects.create(
            user=self.user_b,
            target="userb-site.org",
            domain="userb-site.org",
            port=443,
            certificate_status="EXPIRED",
            threat_score=80,
            severity="CRITICAL"
        )

        # User A requests their history
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.get('/api/ssl-scanner/history/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        domains_a = [item["domain"] for item in res_a.data]
        self.assertIn("usera-site.org", domains_a)
        self.assertNotIn("userb-site.org", domains_a)

        # User A attempts to request User B's detail endpoint
        res_forbidden = self.client.get(f'/api/ssl-scanner/{rec_b.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_user_denied_admin_endpoint(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/admin/ssl-scanner/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_platform_wide_records(self):
        SSLScanResult.objects.create(user=self.user_a, target="a.com", domain="a.com", port=443)
        SSLScanResult.objects.create(user=self.user_b, target="b.com", domain="b.com", port=443)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/ssl-scanner/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        domains = [item["domain"] for item in response.data]
        self.assertIn("a.com", domains)
        self.assertIn("b.com", domains)
