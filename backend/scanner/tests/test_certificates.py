"""
CyberGuardian AI Certificate Generation, Eligibility & Verification Test Suite.
Verifies all 23 required test scenarios:
1. Website scan SAFE -> eligible.
2. Website scan HIGH RISK -> not eligible.
3. URL scan SAFE -> eligible.
4. URL scan MALICIOUS -> not eligible.
5. IP scan SAFE -> eligible.
6. SSL scan SAFE -> eligible.
7. File analysis SUSPICIOUS -> not eligible.
8. SOC analysis NO RISK -> eligible.
9. SOC analysis THREAT DETECTED -> not eligible.
10. Log analysis NO RISK -> eligible.
11. Incomplete scan -> not eligible.
12. Failed scan -> not eligible.
13. User does not need multiple scanners.
14. User does not need both scanner and SOC analysis.
15. One qualifying assessment can generate one certificate.
16. Multiple clicks cannot create duplicate certificates.
17. User cannot access another user's certificate.
18. User cannot manipulate result status through frontend.
19. Admin can revoke certificate.
20. Public QR verification works.
21. Revoked certificate shows REVOKED.
22. Audit logs are created.
23. Sensitive information is not exposed.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import (
    Certificate, CertificateAuditLog, SecurityReport, SOCAnalysis,
    ScanResult, URLScanResult, SSLScanResult, PortScanResult, FileAnalysis
)
from scanner.services.certificates import (
    CertificateEligibilityService, PDFCertificateGenerator, QRCodeGenerator
)

User = get_user_model()


class CertificateSystemTests(TestCase):
    def setUp(self):
        # User Alice
        self.user_a = User.objects.create_user(
            username='user_alice',
            first_name='Alice',
            last_name='Cyber',
            email='alice@cyberguardian.test',
            password='TestPassword123!',
            role='USER'
        )
        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        # User Bob
        self.user_b = User.objects.create_user(
            username='user_bob',
            first_name='Bob',
            last_name='Defender',
            email='bob@cyberguardian.test',
            password='TestPassword123!',
            role='USER'
        )
        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

        # Admin Charlie
        self.admin = User.objects.create_user(
            username='admin_charlie',
            email='admin@cyberguardian.test',
            password='TestPassword123!',
            role='ADMIN'
        )
        self.client_admin = APIClient()
        self.client_admin.force_authenticate(user=self.admin)

        # Anonymous Client
        self.anon_client = APIClient()

        self.target = 'secure-portal.cyberguardian.test'

    # Test 1: Website scan SAFE -> eligible
    def test_01_website_scan_safe_is_eligible(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://safe-site.test',
            domain='safe-site.test',
            risk_level='good',
            security_score=85
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, scan)
        self.assertTrue(res['eligible'])
        self.assertEqual(res['result'], 'SAFE')
        self.assertEqual(res['risk_level'], 'NO_RISK')

        # Generate certificate via API
        url = f"/api/assessments/{scan.id}/certificate/generate/?assessment_type=WEBSITE_SCAN"
        resp = self.client_a.post(url)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()['status'], 'VALID')

    # Test 2: Website scan HIGH RISK -> not eligible
    def test_02_website_scan_high_risk_not_eligible(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://vulnerable-site.test',
            domain='vulnerable-site.test',
            risk_level='high',
            security_score=35
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, scan)
        self.assertFalse(res['eligible'])
        self.assertEqual(res['risk_level'], 'HIGH')

        url = f"/api/assessments/{scan.id}/certificate/generate/?assessment_type=WEBSITE_SCAN"
        resp = self.client_a.post(url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # Test 3: URL scan SAFE -> eligible
    def test_03_url_scan_safe_is_eligible(self):
        url_scan = URLScanResult.objects.create(
            user=self.user_a,
            original_url='https://safe-domain.test',
            normalized_url='https://safe-domain.test',
            domain='safe-domain.test',
            status='SUCCESS',
            threat_score=5,
            severity='LOW'
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, url_scan)
        self.assertTrue(res['eligible'])
        self.assertEqual(res['result'], 'SAFE')

    # Test 4: URL scan MALICIOUS -> not eligible
    def test_04_url_scan_malicious_not_eligible(self):
        url_scan = URLScanResult.objects.create(
            user=self.user_a,
            original_url='https://phishing-site.test',
            normalized_url='https://phishing-site.test',
            domain='phishing-site.test',
            status='SUCCESS',
            threat_score=92,
            severity='CRITICAL',
            indicators=[{"title": "Malware signature match", "severity": "CRITICAL"}]
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, url_scan)
        self.assertFalse(res['eligible'])
        self.assertEqual(res['result'], 'MALICIOUS')

    # Test 5: IP/Port scan SAFE -> eligible
    def test_05_ip_port_scan_safe_is_eligible(self):
        port_scan = PortScanResult.objects.create(
            user=self.user_a,
            target='192.168.1.100',
            status='SUCCESS',
            severity='LOW',
            threat_score=5,
            open_ports=[{"port": 443, "service": "https", "state": "open"}]
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, port_scan)
        self.assertTrue(res['eligible'])
        self.assertEqual(res['result'], 'SAFE')

    # Test 6: SSL scan SAFE -> eligible
    def test_06_ssl_scan_safe_is_eligible(self):
        ssl_scan = SSLScanResult.objects.create(
            user=self.user_a,
            target='secure-domain.test',
            domain='secure-domain.test',
            status='SUCCESS',
            certificate_status='VALID',
            severity='LOW',
            threat_score=5,
            security_issues=[]
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, ssl_scan)
        self.assertTrue(res['eligible'])
        self.assertEqual(res['result'], 'SAFE')

    # Test 7: File analysis SUSPICIOUS -> not eligible
    def test_07_file_analysis_suspicious_not_eligible(self):
        file_scan = FileAnalysis.objects.create(
            user=self.user_a,
            original_filename='payload.exe',
            sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            analysis_status='COMPLETED',
            severity='HIGH',
            threat_score=85,
            yara_matches=['Trojan_Downloader']
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, file_scan)
        self.assertFalse(res['eligible'])
        self.assertEqual(res['result'], 'MALICIOUS')

    # Test 8: SOC analysis NO RISK -> eligible
    def test_08_soc_analysis_no_risk_is_eligible(self):
        soc = SOCAnalysis.objects.create(
            user=self.user_a,
            target='internal-server.test',
            status='COMPLETED',
            severity='LOW',
            threat_level='LOW',
            risk_score=10,
            summary='Automated SOC inspection completed with zero active threats.',
            findings=[]
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, soc)
        self.assertTrue(res['eligible'])
        self.assertEqual(res['result'], 'SAFE')
        self.assertEqual(res['risk_level'], 'NO_RISK')

    # Test 9: SOC analysis THREAT DETECTED -> not eligible
    def test_09_soc_analysis_threat_detected_not_eligible(self):
        soc = SOCAnalysis.objects.create(
            user=self.user_a,
            target='compromised-host.test',
            status='COMPLETED',
            severity='CRITICAL',
            threat_level='CRITICAL',
            risk_score=95,
            summary='Active command-and-control communication detected.',
            findings=[{"title": "C2 Beaconing Detected", "severity": "CRITICAL"}]
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, soc)
        self.assertFalse(res['eligible'])
        self.assertEqual(res['result'], 'MALICIOUS')

    # Test 10: Log analysis NO RISK -> eligible
    def test_10_log_analysis_no_risk_is_eligible(self):
        log_analysis = SOCAnalysis.objects.create(
            user=self.user_a,
            target='firewall.log',
            status='COMPLETED',
            severity='LOW',
            threat_level='LOW',
            risk_score=5,
            summary='Log parsed with normal operational traffic.',
            findings=[]
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, log_analysis)
        self.assertTrue(res['eligible'])
        self.assertEqual(res['result'], 'SAFE')

    # Test 11: Incomplete scan -> not eligible
    def test_11_incomplete_scan_not_eligible(self):
        pending_scan = SOCAnalysis.objects.create(
            user=self.user_a,
            target='pending.test',
            status='PENDING'
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, pending_scan)
        self.assertFalse(res['eligible'])
        self.assertEqual(res['result'], 'INCOMPLETE')

    # Test 12: Failed scan -> not eligible
    def test_12_failed_scan_not_eligible(self):
        failed_scan = URLScanResult.objects.create(
            user=self.user_a,
            original_url='https://unreachable.test',
            normalized_url='https://unreachable.test',
            domain='unreachable.test',
            status='ERROR'
        )
        res = CertificateEligibilityService.check_eligibility(self.user_a, failed_scan)
        self.assertFalse(res['eligible'])
        self.assertEqual(res['result'], 'ERROR')

    # Test 13 & 14: Single module standalone eligibility (No multiple scanners or SOC required)
    def test_13_and_14_user_does_not_need_multiple_scanners_or_both_scanner_and_soc(self):
        # A lone URL scan without any Website/IP/SSL/SOC scan produces a certificate
        lone_url = URLScanResult.objects.create(
            user=self.user_a,
            original_url='https://standalone-url.test',
            normalized_url='https://standalone-url.test',
            domain='standalone-url.test',
            status='SUCCESS',
            threat_score=0,
            severity='LOW'
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, lone_url)
        self.assertIsNotNone(cert)
        self.assertEqual(cert.status, 'VALID')
        self.assertEqual(cert.assessment_type, 'URL_SCAN')
        self.assertEqual(cert.result_status, 'SAFE')
        self.assertEqual(cert.risk_level, 'NO_RISK')

        # A lone SOC analysis without any website/url scan produces a certificate
        lone_soc = SOCAnalysis.objects.create(
            user=self.user_a,
            target='syslog-audit',
            status='COMPLETED',
            severity='LOW',
            threat_level='LOW',
            risk_score=0,
            findings=[]
        )
        cert_soc = CertificateEligibilityService.generate_certificate(self.user_a, lone_soc)
        self.assertIsNotNone(cert_soc)
        self.assertEqual(cert_soc.status, 'VALID')
        self.assertEqual(cert_soc.assessment_type, 'SOC_ANALYSIS')

    # Test 15: One qualifying assessment can generate one certificate
    def test_15_one_qualifying_assessment_generates_one_certificate(self):
        ssl_scan = SSLScanResult.objects.create(
            user=self.user_a,
            target='api.cyberguardian.test',
            domain='api.cyberguardian.test',
            status='SUCCESS',
            certificate_status='VALID',
            severity='LOW',
            threat_score=5,
            security_issues=[]
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, ssl_scan)
        self.assertEqual(cert.ssl_scan, ssl_scan)
        self.assertEqual(cert.assessment_type, 'SSL_SCAN')

    # Test 16: Multiple clicks cannot create duplicate certificates (Idempotent)
    def test_16_duplicate_clicks_prevented(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://idempotent-test.test',
            domain='idempotent-test.test',
            risk_level='good',
            security_score=90
        )
        url = f"/api/assessments/{scan.id}/certificate/generate/?assessment_type=WEBSITE_SCAN"
        res1 = self.client_a.post(url)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        cert_id_1 = res1.json()['certificate_id']

        res2 = self.client_a.post(url)
        self.assertIn(res2.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        cert_id_2 = res2.json()['certificate_id']

        self.assertEqual(cert_id_1, cert_id_2)
        self.assertEqual(Certificate.objects.filter(scan_result=scan).count(), 1)

    # Test 17: User cannot access another user's certificate (anti-IDOR)
    def test_17_anti_idor_protection(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://alice-private.test',
            domain='alice-private.test',
            risk_level='good',
            security_score=95
        )
        cert_a = CertificateEligibilityService.generate_certificate(self.user_a, scan)

        # User B cannot access Alice's certificate
        url = f"/api/certificates/{cert_a.certificate_id}/"
        res = self.client_b.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # User B cannot download Alice's certificate PDF
        download_url = f"/api/certificates/{cert_a.certificate_id}/download/"
        res_dl = self.client_b.get(download_url)
        self.assertEqual(res_dl.status_code, status.HTTP_403_FORBIDDEN)

    # Test 18: User cannot manipulate result status through frontend
    def test_18_user_cannot_manipulate_result_status(self):
        risky_scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://unsafe.test',
            domain='unsafe.test',
            risk_level='high',
            security_score=20
        )
        # Attempting to post fake payload trying to forge SAFE status
        url = f"/api/assessments/{risky_scan.id}/certificate/generate/?assessment_type=WEBSITE_SCAN"
        forged_payload = {
            "result": "SAFE",
            "risk_level": "NO_RISK",
            "security_score": 100
        }
        res = self.client_a.post(url, forged_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.json())

    # Test 19: Admin can revoke certificate
    def test_19_admin_can_revoke_certificate(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://to-revoke.test',
            domain='to-revoke.test',
            risk_level='good',
            security_score=90
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, scan)
        revoke_url = f"/api/certificates/{cert.certificate_id}/revoke/"
        reason = "Subsequent penetration test revealed zero-day exposure."
        res = self.client_admin.post(revoke_url, {"revocation_reason": reason})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        cert.refresh_from_db()
        self.assertEqual(cert.status, 'REVOKED')
        self.assertEqual(cert.revocation_reason, reason)
        self.assertIsNotNone(cert.revoked_at)

    # Test 20: Public QR verification works
    def test_20_public_qr_verification_works(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://verified-site.test',
            domain='verified-site.test',
            risk_level='good',
            security_score=90
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, scan)
        verify_url = f"/api/public/certificates/{cert.certificate_id}/verify/"
        res = self.anon_client.get(verify_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['certificate_id'], cert.certificate_id)
        self.assertEqual(data['status'], 'VALID')
        self.assertEqual(data['verification_result'], 'VALID')

    # Test 21: Revoked certificate shows REVOKED
    def test_21_revoked_certificate_shows_revoked(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://revoked-cert.test',
            domain='revoked-cert.test',
            risk_level='good',
            security_score=90
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, scan)
        cert.status = 'REVOKED'
        cert.revocation_reason = 'Certificate compliance revocation.'
        cert.save()

        verify_url = f"/api/public/certificates/{cert.certificate_id}/verify/"
        res = self.anon_client.get(verify_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['status'], 'REVOKED')
        self.assertEqual(data['verification_result'], 'REVOKED')
        self.assertFalse(data['is_valid'])

    # Test 22: Audit logs are created
    def test_22_audit_logs_are_created(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://audit-trail.test',
            domain='audit-trail.test',
            risk_level='good',
            security_score=90
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, scan)
        # Verify CERTIFICATE_GENERATED log exists
        log = CertificateAuditLog.objects.filter(
            cert_id=cert.certificate_id,
            event_type='CERTIFICATE_GENERATED'
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'SUCCESS')

    # Test 23: Sensitive information is not exposed
    def test_23_sensitive_info_not_exposed(self):
        scan = ScanResult.objects.create(
            user=self.user_a,
            url='https://privacy-test.test',
            domain='privacy-test.test',
            risk_level='good',
            security_score=90
        )
        cert = CertificateEligibilityService.generate_certificate(self.user_a, scan)
        verify_url = f"/api/public/certificates/{cert.certificate_id}/verify/"
        res = self.anon_client.get(verify_url)
        data = res.json()

        # Must not contain private tokens, passwords, raw logs, or internal database keys
        self.assertNotIn("verification_token", data)
        self.assertNotIn("password", data)
        self.assertNotIn("user_id", data)
        self.assertNotIn("raw_scan_data", data)
        self.assertNotIn("raw_logs", data)

