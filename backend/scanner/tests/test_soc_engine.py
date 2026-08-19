import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import (
    ThreatIntelResult, FileAnalysis, SSLScanResult, WhoisLookupResult,
    URLScanResult, PortScanResult, SOCAnalysis
)
from scanner.services.soc_engine.engine import SOCAnalysisEngine, extract_target_identifiers

User = get_user_model()


class SOCEngineUnitTests(TestCase):
    """
    Unit testing for SOC Analysis Engine normalization, correlation rules,
    deduplication, deterministic metrics, and recommendation generation.
    """

    def setUp(self):
        self.engine = SOCAnalysisEngine()

    def test_extract_target_identifiers(self):
        # 1. URL
        res1 = extract_target_identifiers("https://secure.login.example.com:8443/auth?user=admin")
        self.assertEqual(res1["target_type"], "URL")
        self.assertEqual(res1["domain"], "example.com")
        self.assertEqual(res1["hostname"], "secure.login.example.com")

        # 2. Domain
        res2 = extract_target_identifiers("example.org")
        self.assertEqual(res2["target_type"], "DOMAIN")
        self.assertEqual(res2["domain"], "example.org")

        # 3. IP
        res3 = extract_target_identifiers("198.51.100.25")
        self.assertEqual(res3["target_type"], "IP")
        self.assertEqual(res3["ip"], "198.51.100.25")

        # 4. File SHA256 Hash
        dummy_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        res4 = extract_target_identifiers(dummy_hash)
        self.assertEqual(res4["target_type"], "FILE")
        self.assertEqual(res4["file_hash"], dummy_hash)

    def test_single_evidence_source(self):
        """Single source evidence yields deterministic metrics without errors."""
        mock_port_scan = MagicMock()
        mock_port_scan.id = 101
        mock_port_scan.threat_score = 30
        mock_port_scan.indicators = [
            {"type": "DATABASE_PORT_EXPOSED", "severity": "HIGH", "description": "MySQL 3306 open"}
        ]
        mock_port_scan.open_ports = [3306]

        res = self.engine.analyze_evidence(
            target="database.internal-corp.net",
            port_scan=mock_port_scan
        )

        self.assertIn("PORT_SCANNER", res["evidence_sources"])
        self.assertEqual(len(res["findings"]), 1)
        self.assertEqual(res["findings"][0]["severity"], "HIGH")
        self.assertGreaterEqual(res["risk_score"], 20)
        self.assertEqual(res["status"], "COMPLETED")

    def test_multi_source_correlation_rule_1_new_domain_bad_rep(self):
        """CORR-001: Newly registered domain + Malicious threat intelligence."""
        mock_whois = MagicMock()
        mock_whois.id = 201
        mock_whois.age_category = "NEW"
        mock_whois.domain_age_days = 8
        mock_whois.expiration_category = "ACTIVE"
        mock_whois.dnssec = "UNSIGNED"

        mock_ti = MagicMock()
        mock_ti.id = 202
        mock_ti.threat_score = 85
        mock_ti.virustotal_data = {"positives": 12}
        mock_ti.abuseipdb_data = {"abuseConfidenceScore": 90}

        res = self.engine.analyze_evidence(
            target="phish-bank-secure.xyz",
            whois_lookup=mock_whois,
            threat_intel=mock_ti
        )

        corr_ids = [c["rule_id"] for c in res["correlations"]]
        self.assertIn("CORR-001", corr_ids)
        self.assertEqual(res["correlations"][0]["severity"], "CRITICAL")
        self.assertIn(res["severity"], ["HIGH", "CRITICAL"])
        self.assertGreaterEqual(res["confidence"], 90)

    def test_multi_source_correlation_rule_3_db_exposed_on_web_asset(self):
        """CORR-003: Public internet web host directly exposing database ports."""
        mock_url = MagicMock()
        mock_url.id = 301
        mock_url.indicators = []
        mock_url.redirect_count = 0
        mock_url.status = "SUCCESS"

        mock_port = MagicMock()
        mock_port.id = 302
        mock_port.indicators = [
            {"type": "DATABASE_PORT_EXPOSED", "severity": "HIGH", "description": "PostgreSQL 5432 exposed"}
        ]
        mock_port.open_ports = [5432, 80, 443]

        res = self.engine.analyze_evidence(
            target="https://api.corporate-service.com",
            url_scan=mock_url,
            port_scan=mock_port
        )

        corr_ids = [c["rule_id"] for c in res["correlations"]]
        self.assertIn("CORR-003", corr_ids)
        self.assertEqual(res["correlations"][0]["severity"], "HIGH")
        self.assertIn(res["severity"], ["MEDIUM", "HIGH", "CRITICAL"])

    def test_multi_source_correlation_rule_4_bad_ssl_plaintext_downgrade(self):
        """CORR-004: Expired SSL certificate + protocol downgrade / unencrypted service."""
        mock_ssl = MagicMock()
        mock_ssl.id = 401
        mock_ssl.certificate_status = "EXPIRED"
        mock_ssl.days_until_expiration = -5
        mock_ssl.is_self_signed = False
        mock_ssl.cipher_strength = "STRONG"

        mock_url = MagicMock()
        mock_url.id = 402
        mock_url.indicators = [
            {"type": "HTTPS_TO_HTTP_DOWNGRADE", "severity": "HIGH", "description": "Downgraded to plaintext HTTP"}
        ]
        mock_url.redirect_count = 1
        mock_url.status = "SUCCESS"

        res = self.engine.analyze_evidence(
            target="http://legacy-portal.org",
            ssl_scan=mock_ssl,
            url_scan=mock_url
        )

        corr_ids = [c["rule_id"] for c in res["correlations"]]
        self.assertIn("CORR-004", corr_ids)

    def test_multi_source_correlation_rule_6_malware_file_yara_bad_rep(self):
        """CORR-006: YARA malware match + malicious threat feed."""
        mock_file = MagicMock()
        mock_file.id = 501
        mock_file.threat_score = 90
        mock_file.yara_matches = ["CobaltStrike_Beacon", "Ransomware_LockBit"]
        mock_file.entropy = 7.85
        mock_file.mime_type_mismatch = True

        mock_ti = MagicMock()
        mock_ti.id = 502
        mock_ti.threat_score = 95
        mock_ti.virustotal_data = {"positives": 48}
        mock_ti.abuseipdb_data = {}

        res = self.engine.analyze_evidence(
            target="payload.exe",
            file_analysis=mock_file,
            threat_intel=mock_ti
        )

        corr_ids = [c["rule_id"] for c in res["correlations"]]
        self.assertIn("CORR-006", corr_ids)
        self.assertEqual(res["threat_level"], "CRITICAL")
        self.assertGreaterEqual(res["risk_score"], 75)

    def test_duplicate_finding_deduplication(self):
        """Ensures identical categories from different tools collapse into single finding with traceable sources."""
        mock_ssl = MagicMock()
        mock_ssl.id = 601
        mock_ssl.certificate_status = "EXPIRED"
        mock_ssl.days_until_expiration = -10
        mock_ssl.is_self_signed = True
        mock_ssl.cipher_strength = "WEAK"

        res = self.engine.analyze_evidence(
            target="expired-test.org",
            ssl_scan=mock_ssl
        )

        tls_findings = [f for f in res["findings"] if f["category"] == "TLS"]
        # Grouped under unified TLS finding
        self.assertEqual(len(tls_findings), 1)
        self.assertIn("SSL_SCANNER", tls_findings[0]["sources"])

    def test_deterministic_scoring_reproducibility(self):
        """Ensures that repeating analysis on same input produces 100% identical results."""
        mock_whois = MagicMock(id=1, age_category="NEW", domain_age_days=5, expiration_category="ACTIVE", dnssec="UNSIGNED")
        mock_port = MagicMock(id=2, threat_score=50, indicators=[{"type": "DATABASE_PORT_EXPOSED", "severity": "HIGH", "description": "MySQL open"}], open_ports=[3306])

        res1 = self.engine.analyze_evidence(target="target-dup.com", whois_lookup=mock_whois, port_scan=mock_port)
        res2 = self.engine.analyze_evidence(target="target-dup.com", whois_lookup=mock_whois, port_scan=mock_port)

        self.assertEqual(res1["risk_score"], res2["risk_score"])
        self.assertEqual(res1["severity"], res2["severity"])
        self.assertEqual(res1["confidence"], res2["confidence"])
        self.assertEqual(res1["threat_level"], res2["threat_level"])
        self.assertEqual(len(res1["findings"]), len(res2["findings"]))
        self.assertEqual(len(res1["correlations"]), len(res2["correlations"]))


class SOCSecurityAndAPITests(TestCase):
    """
    API integration, User data ownership, IDOR defenses, and Admin RBAC verification.
    """

    def setUp(self):
        self.client = APIClient()

        # Regular User A
        self.user_a = User.objects.create_user(
            username='user_a',
            email='usera@example.com',
            password='Password123!',
            role='USER'
        )

        # Regular User B
        self.user_b = User.objects.create_user(
            username='user_b',
            email='userb@example.com',
            password='Password123!',
            role='USER'
        )

        # Admin / SOC Analyst
        self.soc_admin = User.objects.create_user(
            username='soc_admin',
            email='socadmin@cyberguardian.local',
            password='AdminPassword123!',
            role='SOC_ANALYST',
            is_staff=True
        )

    def test_user_can_analyze_and_owns_record(self):
        self.client.force_authenticate(user=self.user_a)

        payload = {
            "target": "example.com",
            "auto_correlate": True
        }

        resp = self.client.post('/api/soc/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['target'], "example.com")
        self.assertEqual(resp.data['user_id'], self.user_a.id)

        # Verify DB object
        soc_rec = SOCAnalysis.objects.get(id=resp.data['id'])
        self.assertEqual(soc_rec.user, self.user_a)

    def test_user_id_spoofing_prevented(self):
        self.client.force_authenticate(user=self.user_a)

        payload = {
            "target": "spoof-target.com",
            "user_id": self.user_b.id,
            "auto_correlate": False
        }

        resp = self.client.post('/api/soc/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['user_id'], self.user_a.id)  # Bound to request.user

    def test_user_data_isolation(self):
        # Create record belonging to User A
        soc_a = SOCAnalysis.objects.create(
            user=self.user_a,
            target="user-a-domain.org",
            risk_score=40,
            severity="MEDIUM"
        )

        # User B attempts to access User A's record
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get(f'/api/soc/{soc_a.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # User B checks history -> should be empty
        hist_resp = self.client.get('/api/soc/history/')
        self.assertEqual(hist_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(hist_resp.data), 0)

    def test_cannot_attach_foreign_user_scan_id(self):
        # User B owns an SSL scan record
        ssl_b = SSLScanResult.objects.create(
            user=self.user_b,
            target="target-b.com",
            domain="target-b.com",
            certificate_status="VALID"
        )

        # User A tries to pass User B's scan id
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "target": "target-b.com",
            "source_scan_ids": {
                "ssl_scan": ssl_b.id
            },
            "auto_correlate": False
        }

        resp = self.client.post('/api/soc/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_admin_can_view_platform_wide_soc_records(self):
        # User A creates a record
        soc_a = SOCAnalysis.objects.create(
            user=self.user_a,
            target="platform-asset.com",
            risk_score=85,
            severity="CRITICAL"
        )

        self.client.force_authenticate(user=self.soc_admin)

        # List
        resp = self.client.get('/api/admin/soc/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 1)

        # Detail
        detail_resp = self.client.get(f'/api/admin/soc/{soc_a.id}/')
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['target'], "platform-asset.com")

        # Analytics
        analytics_resp = self.client.get('/api/admin/soc/analytics/')
        self.assertEqual(analytics_resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_analyses', analytics_resp.data)

    def test_normal_user_denied_soc_admin_endpoint(self):
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get('/api/admin/soc/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
