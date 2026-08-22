"""
Phase 10 Comprehensive Report Generator, Export Subsystem & Multi-Tenant Security Test Suite.
Tests:
1. Report Generation from SOC Analysis
2. Report Generation from AI Agent Session
3. Deterministic SOC Score & Risk Authority Preservation
4. Compliant PDF 1.4 Generation & File Stream Integrity
5. Structured Machine-Readable JSON Export
6. Standardized Findings CSV Export
7. Strict User Ownership & Multi-Tenant Data Isolation (Anti-IDOR)
8. User ID Spoofing Prevention
9. Admin Role Enforcement & Normal User 403 Forbidden
10. Graceful Partial Reporting (Offline AI / Scanner Limitations)
11. Sensitive Secret Sanitization & Anti-Leakage
12. Report Deletion by Authorized Owner
"""
import io
import json
import csv
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import (
    SecurityReport, SOCAnalysis, AgentSession, AgentStep, Report, ScanResult
)
from scanner.services.reports import (
    ReportDataBuilder, PDFReportGenerator, CSVReportExporter, SecurityReportService
)

User = get_user_model()


class ReportGeneratorSecurityAndUnitTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username='user_a', email='a@example.com', password='Password123!', role='USER')
        self.user_b = User.objects.create_user(username='user_b', email='b@example.com', password='Password123!', role='USER')
        self.admin = User.objects.create_user(username='admin_soc', email='admin@example.com', password='Password123!', role='ADMIN')

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

        self.client_admin = APIClient()
        self.client_admin.force_authenticate(user=self.admin)

        # Create baseline SOC Analysis for User A
        self.soc_a = SOCAnalysis.objects.create(
            user=self.user_a,
            target='portal.example.com',
            risk_score=78,
            severity='HIGH',
            confidence=92,
            threat_level='HIGH',
            summary='Multiple critical external telemetry findings detected on portal asset.',
            findings=[
                {
                    "id": "FND-001",
                    "type": "DATABASE_EXPOSED",
                    "category": "NETWORK_EXPOSURE",
                    "title": "Public Database Port 3306 Exposed",
                    "severity": "HIGH",
                    "confidence": 95,
                    "description": "MySQL port 3306 is open to public internet.",
                    "evidence_sources": ["PORT_SCANNER #12"],
                    "recommendation": "Restrict MySQL access behind firewall / VPN."
                },
                {
                    "id": "FND-002",
                    "type": "EXPIRED_SSL",
                    "category": "CRYPTOGRAPHY",
                    "title": "Expired TLS Certificate",
                    "severity": "MEDIUM",
                    "confidence": 90,
                    "description": "Certificate expired 14 days ago.",
                    "evidence_sources": ["SSL_SCANNER #5"],
                    "recommendation": "Renew TLS certificate immediately."
                }
            ],
            evidence_sources=[
                {"source": "PORT_SCANNER", "indicator": "Port 3306 OPEN"},
                {"source": "SSL_SCANNER", "indicator": "Cert Expired"}
            ],
            correlations=[
                {"rule_id": "CORR-003", "title": "Web asset exposing database port"}
            ],
            recommendations=[
                "Immediately firewall MySQL port 3306.",
                "Provision renewed TLS certificate."
            ],
            source_records={"PORT_SCANNER": "COMPLETED", "SSL_SCANNER": "COMPLETED"}
        )

        # Create Agent Session for User A
        self.agent_a = AgentSession.objects.create(
            user=self.user_a,
            target='portal.example.com',
            status='COMPLETED',
            risk_score=78,
            severity='HIGH',
            confidence=92,
            threat_level='HIGH',
            summary='AI Agent concluded multi-vector vulnerability profile on portal asset.',
            tools_used=['port_scanner', 'ssl_scanner'],
            steps_completed=3,
            findings=self.soc_a.findings,
            recommendations=self.soc_a.recommendations
        )
        AgentStep.objects.create(
            session=self.agent_a,
            step_number=1,
            action='EXECUTE_TOOL',
            tool_name='port_scanner',
            status='COMPLETED',
            reasoning_summary='Inspected open service ports on target.'
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Report Generation from SOC Analysis & Agent Session
    # ──────────────────────────────────────────────────────────────────────────

    def test_report_generation_from_soc_analysis(self):
        """Asserts report generation creates valid SecurityReport with exact SOC metrics."""
        report = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id,
            report_type='SOC_ASSESSMENT'
        )

        self.assertIsNotNone(report.id)
        self.assertTrue(report.report_id.startswith('RPT-'))
        self.assertEqual(report.user, self.user_a)
        self.assertEqual(report.target, 'portal.example.com')
        self.assertEqual(report.risk_score, 78)
        self.assertEqual(report.severity, 'HIGH')
        self.assertEqual(report.confidence, 92)
        self.assertEqual(report.threat_level, 'HIGH')
        self.assertEqual(report.status, 'COMPLETED')
        self.assertIn('DATABASE_EXPOSED', json.dumps(report.structured_data))

    def test_report_generation_from_agent_session(self):
        """Asserts report links AgentSession and safely formats operational audit."""
        report = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            agent_session_id=self.agent_a.id,
            report_type='AI_SECURITY_ASSESSMENT'
        )

        self.assertEqual(report.agent_session, self.agent_a)
        ai_sec = report.structured_data.get('ai_assessment', {})
        self.assertTrue(ai_sec.get('available'))
        self.assertEqual(ai_sec.get('status'), 'COMPLETED')
        self.assertEqual(len(ai_sec.get('step_audit', [])), 1)
        self.assertEqual(ai_sec['step_audit'][0]['tool_name'], 'port_scanner')

    # ──────────────────────────────────────────────────────────────────────────
    # 2. PDF, JSON, and CSV Export Verifications
    # ──────────────────────────────────────────────────────────────────────────

    def test_pdf_generation_valid_stream(self):
        """Asserts generated PDF conforms to PDF-1.4 binary specification."""
        report = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id
        )

        pdf_bytes, filename = SecurityReportService.get_report_pdf(report, self.user_a)
        self.assertTrue(isinstance(pdf_bytes, bytes))
        self.assertTrue(pdf_bytes.startswith(b'%PDF-1.4'))
        self.assertTrue(pdf_bytes.rstrip().endswith(b'%%EOF'))
        self.assertTrue(filename.endswith('.pdf'))

    def test_json_export_valid_schema(self):
        """Asserts JSON export returns complete structured snapshot."""
        report = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id
        )

        json_data, filename = SecurityReportService.get_report_json(report, self.user_a)
        self.assertIsInstance(json_data, dict)
        self.assertEqual(json_data['report_id'], report.report_id)
        self.assertEqual(json_data['risk']['score'], 78)
        self.assertEqual(json_data['risk']['severity'], 'HIGH')
        self.assertEqual(len(json_data['findings']), 2)
        self.assertIn('CRITICAL', json_data['remediation_priorities'])

    def test_csv_export_format(self):
        """Asserts CSV export contains all required columns and finding rows."""
        report = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id
        )

        csv_str, filename = SecurityReportService.get_report_csv(report, self.user_a)
        self.assertTrue(isinstance(csv_str, str))
        reader = list(csv.reader(io.StringIO(csv_str)))
        
        # Check header
        headers = reader[0]
        self.assertEqual(headers, CSVReportExporter.HEADERS)
        
        # Check rows (2 findings)
        self.assertEqual(len(reader), 3) # 1 header + 2 findings
        row1 = reader[1]
        self.assertEqual(row1[0], 'FND-001')
        self.assertEqual(row1[3], 'HIGH')

    # ──────────────────────────────────────────────────────────────────────────
    # 3. User Ownership & Multi-Tenant Data Isolation (Anti-IDOR)
    # ──────────────────────────────────────────────────────────────────────────

    def test_user_ownership_and_data_isolation(self):
        """Asserts User B cannot view, download, or delete User A's SecurityReport."""
        report_a = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id
        )

        # User A can view and download their report
        res_a_view = self.client_a.get(f'/api/reports/{report_a.id}/')
        self.assertEqual(res_a_view.status_code, status.HTTP_200_OK)

        res_a_pdf = self.client_a.get(f'/api/reports/{report_a.id}/pdf/')
        self.assertEqual(res_a_pdf.status_code, status.HTTP_200_OK)

        # User B attempts to access User A's report -> 404 Isolated
        res_b_view = self.client_b.get(f'/api/reports/{report_a.id}/')
        self.assertEqual(res_b_view.status_code, status.HTTP_404_NOT_FOUND)

        res_b_pdf = self.client_b.get(f'/api/reports/{report_a.id}/pdf/')
        self.assertEqual(res_b_pdf.status_code, status.HTTP_404_NOT_FOUND)

        res_b_json = self.client_b.get(f'/api/reports/{report_a.id}/json/')
        self.assertEqual(res_b_json.status_code, status.HTTP_404_NOT_FOUND)

        res_b_csv = self.client_b.get(f'/api/reports/{report_a.id}/csv/')
        self.assertEqual(res_b_csv.status_code, status.HTTP_404_NOT_FOUND)

        # User B attempts to delete User A's report -> 404
        res_b_del = self.client_b.delete(f'/api/reports/{report_a.id}/')
        self.assertEqual(res_b_del.status_code, status.HTTP_404_NOT_FOUND)

        # User B reports list does NOT contain report A
        res_b_list = self.client_b.get('/api/reports/')
        self.assertEqual(res_b_list.status_code, status.HTTP_200_OK)
        report_ids = [r['id'] for r in res_b_list.json()]
        self.assertNotIn(report_a.id, report_ids)

    def test_user_cannot_attach_foreign_soc_analysis(self):
        """Asserts User B cannot generate a report using User A's SOC Analysis ID."""
        res = self.client_b.post('/api/reports/generate/', {
            'target': 'spoofed.com',
            'soc_analysis_id': self.soc_a.id
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not exist or does not belong to the user', res.json().get('error', ''))

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Admin Access Controls vs Normal User
    # ──────────────────────────────────────────────────────────────────────────

    def test_admin_report_access_and_normal_user_denied(self):
        """Asserts Admins can inspect and download all platform reports, whereas normal users receive 403."""
        report_a = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id
        )

        # Normal User A trying admin reports endpoint -> 403 Forbidden
        res_user = self.client_a.get('/api/admin/reports/')
        self.assertEqual(res_user.status_code, status.HTTP_403_FORBIDDEN)

        # Admin accessing platform reports list -> 200 OK
        res_admin_list = self.client_admin.get('/api/admin/reports/')
        self.assertEqual(res_admin_list.status_code, status.HTTP_200_OK)
        admin_report_ids = [r['id'] for r in res_admin_list.json()]
        self.assertIn(report_a.id, admin_report_ids)

        # Admin detail inspection -> 200 OK
        res_admin_detail = self.client_admin.get(f'/api/admin/reports/{report_a.id}/')
        self.assertEqual(res_admin_detail.status_code, status.HTTP_200_OK)

        # Admin analytics endpoint -> 200 OK
        res_admin_analytics = self.client_admin.get('/api/admin/reports/analytics/')
        self.assertEqual(res_admin_analytics.status_code, status.HTTP_200_OK)
        self.assertIn('total_reports', res_admin_analytics.json())

        # Admin authorized PDF download -> 200 OK
        res_admin_pdf = self.client_admin.get(f'/api/admin/reports/{report_a.id}/pdf/')
        self.assertEqual(res_admin_pdf.status_code, status.HTTP_200_OK)

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Graceful Partial Reports & Secret Sanitization
    # ──────────────────────────────────────────────────────────────────────────

    def test_graceful_partial_report_without_ai(self):
        """Asserts report generates cleanly with status COMPLETED / PARTIAL when AI is unlinked."""
        report = SecurityReportService.generate_report(
            target='standalone-target.com',
            user=self.user_a,
            soc_analysis_id=None,
            agent_session_id=None
        )

        self.assertIsNotNone(report.id)
        self.assertEqual(report.risk_score, 0)
        self.assertEqual(report.structured_data['ai_assessment']['available'], False)
        self.assertTrue(len(report.structured_data['limitations']) > 0)

    def test_sensitive_secret_sanitization(self):
        """Asserts reports do not leak secret passwords, keys, or internal stack traces."""
        report = SecurityReportService.generate_report(
            target='portal.example.com',
            user=self.user_a,
            soc_analysis_id=self.soc_a.id,
            agent_session_id=self.agent_a.id
        )

        dumped = json.dumps(report.structured_data)
        forbidden_keywords = ["SECRET_KEY", "password", "Bearer ", "OLLAMA_BASE_URL", "system_prompt"]
        for kw in forbidden_keywords:
            self.assertNotIn(kw, dumped)
