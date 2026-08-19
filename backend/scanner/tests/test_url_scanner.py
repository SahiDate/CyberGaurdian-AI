import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import URLScanResult
from scanner.services.url_scanner.service import (
    URLScannerService,
    validate_and_normalize_url,
    analyze_url_structure_indicators,
    extract_registrable_domain
)

User = get_user_model()


class URLScannerUnitTests(TestCase):
    """Unit tests for URL normalization, syntactic analysis, and SSRF handling."""

    def test_url_validation_and_normalization(self):
        # Plain domain
        res = validate_and_normalize_url("example.com")
        self.assertEqual(res["scheme"], "https")
        self.assertEqual(res["hostname"], "example.com")
        self.assertEqual(res["port"], 443)
        self.assertEqual(res["normalized_url"], "https://example.com/")

        # Full URL with query and port
        res = validate_and_normalize_url("http://api.domain.org:8080/v1/auth?token=xyz#section")
        self.assertEqual(res["scheme"], "http")
        self.assertEqual(res["hostname"], "api.domain.org")
        self.assertEqual(res["port"], 8080)
        self.assertEqual(res["domain"], "domain.org")
        self.assertEqual(res["path"], "/v1/auth")
        self.assertEqual(res["query"], "token=xyz")

        # Unsupported schemes rejected
        with self.assertRaises(ValueError):
            validate_and_normalize_url("file:///etc/passwd")
        with self.assertRaises(ValueError):
            validate_and_normalize_url("javascript:alert(1)")
        with self.assertRaises(ValueError):
            validate_and_normalize_url("ftp://server.com/file")
        with self.assertRaises(ValueError):
            validate_and_normalize_url("data:text/html,<script>")

    def test_registrable_domain_extraction(self):
        self.assertEqual(extract_registrable_domain("sub.example.com"), "example.com")
        self.assertEqual(extract_registrable_domain("portal.gov.uk"), "portal.gov.uk")
        self.assertEqual(extract_registrable_domain("login.service.co.uk"), "service.co.uk")
        self.assertEqual(extract_registrable_domain("github.com"), "github.com")

    def test_url_structure_indicators(self):
        # 1. IP as hostname
        url_info = validate_and_normalize_url("http://198.51.100.4/login")
        indicators = analyze_url_structure_indicators(url_info)
        types = [ind["type"] for ind in indicators]
        self.assertIn("IP_HOST_URL", types)

        # 2. Punycode
        url_info = validate_and_normalize_url("https://xn--pple-43d.com/verify")
        indicators = analyze_url_structure_indicators(url_info)
        types = [ind["type"] for ind in indicators]
        self.assertIn("PUNYCODE_DOMAIN", types)

        # 3. URL shortener
        url_info = validate_and_normalize_url("https://bit.ly/3xYzaBc")
        indicators = analyze_url_structure_indicators(url_info)
        types = [ind["type"] for ind in indicators]
        self.assertIn("URL_SHORTENER_DETECTED", types)

        # 4. Embedded credentials
        url_info = validate_and_normalize_url("https://admin:secret@bank.com/account")
        indicators = analyze_url_structure_indicators(url_info)
        types = [ind["type"] for ind in indicators]
        self.assertIn("EMBEDDED_CREDENTIALS_USERINFO", types)

        # 5. Double percent encoding
        url_info = validate_and_normalize_url("https://example.com/search?q=%252flogin")
        indicators = analyze_url_structure_indicators(url_info)
        types = [ind["type"] for ind in indicators]
        self.assertIn("DOUBLE_URL_ENCODING", types)

        # 6. Suspicious Phishing Keywords
        url_info = validate_and_normalize_url("https://secure-portal.com/login/verify?account=update")
        indicators = analyze_url_structure_indicators(url_info)
        types = [ind["type"] for ind in indicators]
        self.assertIn("SUSPICIOUS_PHISHING_KEYWORDS", types)

    def test_ssrf_blocking_restricted_destinations(self):
        service = URLScannerService(timeout=5)

        # Localhost
        res = service.scan_url("http://localhost/admin")
        self.assertEqual(res["status"], "SSRF_BLOCKED")
        self.assertIn("SSRF", res["error_message"])

        # IPv4 Loopback
        res = service.scan_url("http://127.0.0.1:8000/api")
        self.assertEqual(res["status"], "SSRF_BLOCKED")

        # Private RFC1918
        res = service.scan_url("http://192.168.1.1/router")
        self.assertEqual(res["status"], "SSRF_BLOCKED")
        res = service.scan_url("http://10.0.0.5/internal")
        self.assertEqual(res["status"], "SSRF_BLOCKED")

        # Cloud Metadata
        res = service.scan_url("http://169.254.169.254/latest/meta-data")
        self.assertEqual(res["status"], "SSRF_BLOCKED")

    def test_deterministic_scoring(self):
        service = URLScannerService()
        
        # Clean domain, valid SSL, established WHOIS
        score, sev, conf = service._calculate_composite_risk_score(
            structure_indicators=[],
            network_result={"indicators": []},
            ssl_evidence={"certificate_status": "VALID"},
            whois_evidence={"age_category": "ESTABLISHED"},
            threat_intel_evidence={"threat_score": 0}
        )
        self.assertEqual(score, 0)
        self.assertEqual(sev, "LOW")

        # Threat intel flagged + new domain + double encoding + expired SSL
        score, sev, conf = service._calculate_composite_risk_score(
            structure_indicators=[{"type": "DOUBLE_URL_ENCODING"}],
            network_result={"indicators": [{"type": "HTTPS_TO_HTTP_DOWNGRADE"}]},
            ssl_evidence={"certificate_status": "EXPIRED"},
            whois_evidence={"age_category": "NEW"},
            threat_intel_evidence={"threat_score": 75}
        )
        self.assertGreaterEqual(score, 75)
        self.assertEqual(sev, "CRITICAL")


class URLScannerSecurityAndAPITests(TestCase):
    """Security, user data isolation, and API integration tests for URL Scanner."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username='user_url_a', email='usera@url.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.user_b = User.objects.create_user(
            username='user_url_b', email='userb@url.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.admin_user = User.objects.create_user(
            username='admin_url', email='admin@url.test', password='Password123!', role='ADMIN', status='ACTIVE'
        )

    @patch.object(URLScannerService, 'scan_url')
    def test_user_can_scan_url_and_owns_record(self, mock_scan):
        mock_scan.return_value = {
            "original_url": "https://github.com/torvalds",
            "normalized_url": "https://github.com/torvalds",
            "final_url": "https://github.com/torvalds",
            "hostname": "github.com",
            "domain": "github.com",
            "scheme": "https",
            "port": 443,
            "primary_ip": "140.82.121.4",
            "http_status": 200,
            "content_type": "text/html",
            "server": "GitHub.com",
            "redirect_count": 0,
            "redirect_chain": [],
            "ssl_result": {"certificate_status": "VALID"},
            "whois_result": {"registrar": "MarkMonitor Inc."},
            "threat_intel_result": {"threat_score": 0},
            "indicators": [],
            "threat_score": 0,
            "severity": "LOW",
            "confidence": 92,
            "recommendations": ["Low Risk"],
            "status": "SUCCESS",
            "error_message": None,
            "structured_evidence": {"source": "URL_SCANNER"}
        }

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/url-scanner/scan/', {"url": "https://github.com/torvalds"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["hostname"], "github.com")
        self.assertEqual(response.data["threat_score"], 0)

        # Verify database record belongs strictly to User A
        record = URLScanResult.objects.get(id=response.data["id"])
        self.assertEqual(record.user, self.user_a)

    def test_url_user_data_isolation(self):
        rec_a = URLScanResult.objects.create(
            user=self.user_a,
            original_url="https://usera-site.com/dashboard",
            normalized_url="https://usera-site.com/dashboard",
            hostname="usera-site.com",
            domain="usera-site.com",
            threat_score=10,
            severity="LOW"
        )
        rec_b = URLScanResult.objects.create(
            user=self.user_b,
            original_url="https://userb-site.com/admin",
            normalized_url="https://userb-site.com/admin",
            hostname="userb-site.com",
            domain="userb-site.com",
            threat_score=85,
            severity="CRITICAL"
        )

        # User A requests history
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.get('/api/url-scanner/history/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        urls_a = [item["normalized_url"] for item in res_a.data]
        self.assertIn("https://usera-site.com/dashboard", urls_a)
        self.assertNotIn("https://userb-site.com/admin", urls_a)

        # User A attempts to request User B's detail endpoint
        res_forbidden = self.client.get(f'/api/url-scanner/{rec_b.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_user_denied_url_admin_endpoint(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/admin/url-scanner/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_platform_wide_url_records(self):
        URLScanResult.objects.create(user=self.user_a, original_url="https://a.com", normalized_url="https://a.com", hostname="a.com", domain="a.com")
        URLScanResult.objects.create(user=self.user_b, original_url="https://b.com", normalized_url="https://b.com", hostname="b.com", domain="b.com")

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/url-scanner/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hosts = [item["hostname"] for item in response.data]
        self.assertIn("a.com", hosts)
        self.assertIn("b.com", hosts)
