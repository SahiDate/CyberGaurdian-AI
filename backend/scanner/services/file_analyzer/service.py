import os
import uuid
import hashlib
from typing import Dict, Any
from django.conf import settings
from django.utils import timezone

from scanner.models import FileAnalysis
from scanner.services.threat_intel.virustotal import VirusTotalProvider
from users.models import AdminAuditLog

from .file_type_detector import detect_file_type
from .entropy_calculator import calculate_entropy
from .yara_engine import LocalYaraEngine
from .pe_analyzer import analyze_pe_header
from .script_analyzer import analyze_script
from .document_analyzer import analyze_document
from .archive_analyzer import analyze_archive
from .scoring import calculate_file_threat_score


class FileAnalyzerService:
    """
    Production Orchestrator Service for Static File Security Analysis.
    Analyzes uploaded files without executing them.
    """

    def __init__(self, vt_provider: VirusTotalProvider = None):
        self.vt_provider = vt_provider or VirusTotalProvider()
        self.yara_engine = LocalYaraEngine()

    def analyze_uploaded_file(self, file_obj, user) -> FileAnalysis:
        """
        Validate, safely store, statically analyze, score, and persist a file analysis record.
        """
        max_size = getattr(settings, 'MAX_FILE_ANALYSIS_SIZE', 25 * 1024 * 1024)
        if file_obj.size > max_size:
            raise ValueError(f"File size ({file_obj.size} bytes) exceeds maximum limit of {max_size} bytes.")

        # Sanitize original filename & generate safe UUID filename
        raw_name = os.path.basename(file_obj.name)
        ext = os.path.splitext(raw_name)[1].lower()[:20]
        stored_name = f"{uuid.uuid4().hex}{ext}"

        secure_dir = getattr(settings, 'SECURE_UPLOADS_DIR', settings.BASE_DIR / 'media' / 'secure_uploads')
        os.makedirs(secure_dir, exist_ok=True)
        file_path = os.path.join(secure_dir, stored_name)

        # 1. Save file to non-public secure storage & calculate hashes
        sha256_hash = hashlib.sha256()
        sha1_hash = hashlib.sha1()
        md5_hash = hashlib.md5()
        file_size = 0

        with open(file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
                sha256_hash.update(chunk)
                sha1_hash.update(chunk)
                md5_hash.update(chunk)
                file_size += len(chunk)

        sha256_val = sha256_hash.hexdigest()
        sha1_val = sha1_hash.hexdigest()
        md5_val = md5_hash.hexdigest()

        # 2. File Type Detection & Signature Inspection
        type_info = detect_file_type(file_path, raw_name)

        # 3. Shannon Entropy Analysis
        entropy_info = calculate_entropy(file_path)

        # 4. YARA Static Pattern Analysis
        yara_info = self.yara_engine.scan_file(file_path)

        # 5. Type-Specific Static Analysis
        detected_type = type_info.get("detected_type", "GENERIC")
        pe_info = {}
        script_info = {}
        doc_info = {}
        archive_info = {}

        if detected_type == "PE":
            pe_info = analyze_pe_header(file_path)
        elif detected_type == "SCRIPT":
            script_info = analyze_script(file_path)
        elif detected_type == "DOCUMENT":
            doc_info = analyze_document(file_path, ext)
        elif detected_type == "ARCHIVE" or detected_type == "MOBILE":
            archive_info = analyze_archive(file_path)

        # 6. Third Party VirusTotal Hash Lookup (PRIVACY RULE: SHA-256 string lookup ONLY)
        vt_info = {}
        try:
            res = self.vt_provider.scan(sha256_val, "FILE_HASH")
            if isinstance(res, dict):
                vt_info = res
            else:
                vt_info = {"provider": "VirusTotal", "status": "NOT_FOUND", "malicious": 0, "suspicious": 0}
        except Exception as e:
            vt_info = {"provider": "VirusTotal", "status": "ERROR", "error": str(e), "malicious": 0, "suspicious": 0}

        vt_status_str = str(vt_info.get("status", "NOT_FOUND"))

        # 7. Deterministic Threat Scoring & Evidence Correlation
        threat_score, severity, confidence, detection_summary = calculate_file_threat_score(
            type_info=type_info,
            entropy_info=entropy_info,
            yara_info=yara_info,
            pe_info=pe_info,
            script_info=script_info,
            doc_info=doc_info,
            archive_info=archive_info,
            vt_info=vt_info
        )

        # 8. Normalized Result Structure for Phase 8 SOC Analysis Engine Compatibility
        normalized_evidence = {
            "file": {
                "sha256": sha256_val,
                "sha1": sha1_val,
                "md5": md5_val,
                "original_filename": raw_name,
                "stored_filename": stored_name,
                "size": file_size,
                "detected_type": detected_type,
                "mime_type": type_info.get("mime_type"),
                "extension": ext
            },
            "evidence": {
                "entropy": entropy_info,
                "yara": yara_info,
                "pe_header": pe_info,
                "script": script_info,
                "document": doc_info,
                "archive": archive_info,
                "virustotal": vt_info,
                "mismatch_detected": type_info.get("mismatch_detected", False)
            },
            "risk": {
                "score": threat_score,
                "severity": severity,
                "confidence": confidence,
                "summary": detection_summary
            }
        }

        # 9. Create & Save Database Model
        record = FileAnalysis.objects.create(
            user=user,
            original_filename=raw_name,
            stored_filename=stored_name,
            file_size=file_size,
            detected_type=detected_type,
            mime_type=type_info.get("mime_type", "application/octet-stream"),
            extension=ext,
            sha256=sha256_val,
            sha1=sha1_val,
            md5=md5_val,
            entropy=entropy_info.get("entropy", 0.0),
            entropy_category=entropy_info.get("category", "LOW"),
            signature_status=str(pe_info.get("signature_status", "NOT_PRESENT")),
            yara_status=str(yara_info.get("status", "NO_MATCH")),
            yara_matches=yara_info.get("matches", []),
            virustotal_status=vt_status_str,
            virustotal_detections=vt_info,
            threat_score=threat_score,
            severity=severity,
            confidence=confidence,
            analysis_status="COMPLETED",
            metadata=detection_summary,
            normalized_evidence=normalized_evidence
        )

        # Audit Logging
        AdminAuditLog.objects.create(
            admin=user,
            action='FILE_ANALYSIS_COMPLETED',
            target_record=f"{raw_name} ({sha256_val[:12]}...)"
        )

        return record
