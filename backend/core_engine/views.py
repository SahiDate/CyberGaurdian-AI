from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from users.authentication import GracefulJWTAuthentication
from .ai_agent import run_autonomous_analysis, run_log_analysis_ai
from .log_parser import LogParser
from scanner.models import ScanResult, Report, ThreatIntelResult, FileAnalysis, Incident, AIActivity, SOCAnalysis
from users.models import User, Notification, AdminAuditLog
from users.views import resolve_request_user
from urllib.parse import urlparse
import hashlib
import os

MAX_SOC_LOG_FILE_SIZE_MB = 25

BINARY_EXTENSIONS = {
    '.exe', '.dll', '.apk', '.elf', '.zip', '.rar', '.iso', '.bin',
    '.msi', '.sys', '.dmg', '.tar', '.gz', '.7z', '.bz2', '.xz',
    '.so', '.dylib', '.class', '.jar', '.war', '.ear'
}

BINARY_MAGIC_BYTES = [
    (b'MZ', 'Windows PE Executable / DLL'),
    (b'\x7fELF', 'Linux ELF Binary'),
    (b'PK\x03\x04', 'ZIP / APK / Archive'),
    (b'Rar!\x1a\x07', 'RAR Archive'),
    (b'7z\xbc\xaf\x27\x1c', '7-Zip Archive'),
    (b'\x1f\x8b', 'GZIP Compressed File'),
    (b'\xfd7zXZ\x00', 'XZ Compressed File'),
    (b'BZh', 'BZIP2 Compressed File'),
    (b'\xca\xfe\xba\xbe', 'Mach-O / Java Class Binary'),
]


def detect_binary_file(filename, raw_bytes):
    """
    Safely inspects file extension, magic byte signatures, and null byte frequency
    to prevent binary files from being decoded or executed as log text.
    """
    _, ext = os.path.splitext(filename.lower())
    if ext in BINARY_EXTENSIONS:
        return True, f"File extension '{ext}' is a binary format."

    if len(raw_bytes) >= 2:
        for magic, desc in BINARY_MAGIC_BYTES:
            if raw_bytes.startswith(magic):
                return True, f"Detected binary file signature: {desc}."

    # Check for null bytes in initial sample (excluding UTF-16 BOMs)
    sample = raw_bytes[:2048]
    if sample.startswith(b'\xff\xfe') or sample.startswith(b'\xfe\xff'):
        # Valid UTF-16 Little/Big Endian text file
        return False, ""

    if b'\x00' in sample:
        null_count = sample.count(b'\x00')
        if null_count > 5:
            return True, "File contains binary null byte control sequences."

    return False, ""


def decode_log_bytes(raw_bytes):
    """Safely decodes raw bytes into text using common character sets."""
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'utf-16']
    for enc in encodings:
        try:
            return raw_bytes.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    # Ultimate fallback with replacement to avoid crash
    return raw_bytes.decode('utf-8', errors='replace')


def process_soc_log_analysis(request, raw_logs=None, uploaded_file=None, source="user_upload"):
    """
    Unified high-performance SOC Log Analysis processor.
    Coordinates: File Validation -> Decoding -> Log Parsing -> Threat Detection
    -> AI Synthesis -> Audit Logging -> Report Generation -> Certificate Eligibility.
    """
    user = resolve_request_user(request)
    ip_addr = request.META.get('REMOTE_ADDR', '')

    # 1. Audit Log: Upload / Analysis Started
    if user and getattr(user, 'pk', None):
        try:
            AdminAuditLog.objects.create(
                admin=user,
                action='SOC_LOG_UPLOAD_STARTED',
                target_user=user,
                target_record=f"Source: {source}",
                ip_address=ip_addr
            )
        except Exception:
            pass

    filename = "pasted_log.txt"
    log_text = ""

    # 2. File Ingestion & Validation
    if uploaded_file:
        filename = getattr(uploaded_file, 'name', 'uploaded_log.log')
        file_size = getattr(uploaded_file, 'size', 0)

        # Enforce maximum file size
        max_bytes = MAX_SOC_LOG_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            if user and getattr(user, 'pk', None):
                try:
                    AdminAuditLog.objects.create(
                        admin=user,
                        action='SOC_LOG_UPLOAD_FAILED',
                        target_user=user,
                        target_record=f"File {filename} exceeded size limit ({file_size} bytes)",
                        ip_address=ip_addr
                    )
                except Exception:
                    pass
            return Response({
                "success": False,
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"File is too large for SOC Log Analysis. Maximum allowed size is {MAX_SOC_LOG_FILE_SIZE_MB} MB."
                }
            }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        try:
            raw_bytes = uploaded_file.read()
        except Exception as e:
            return Response({
                "success": False,
                "error": {
                    "code": "FILE_READ_ERROR",
                    "message": f"Could not read uploaded file: {str(e)}"
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check for binary files
        is_binary, binary_reason = detect_binary_file(filename, raw_bytes)
        if is_binary:
            if user and getattr(user, 'pk', None):
                try:
                    AdminAuditLog.objects.create(
                        admin=user,
                        action='SOC_LOG_UPLOAD_FAILED',
                        target_user=user,
                        target_record=f"Binary file rejected: {filename} ({binary_reason})",
                        ip_address=ip_addr
                    )
                except Exception:
                    pass
            return Response({
                "success": False,
                "error": {
                    "code": "BINARY_FILE_DETECTED",
                    "message": "This file appears to be a binary/non-log file. Please use the File Analyzer module for malware/file analysis."
                },
                "file_type": "BINARY",
                "suggest_file_analyzer": True
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        log_text = decode_log_bytes(raw_bytes)

        if user and getattr(user, 'pk', None):
            try:
                AdminAuditLog.objects.create(
                    admin=user,
                    action='SOC_LOG_UPLOAD_COMPLETED',
                    target_user=user,
                    target_record=f"File: {filename} ({len(log_text)} chars)",
                    ip_address=ip_addr
                )
            except Exception:
                pass
    else:
        log_text = str(raw_logs or '')
        filename = "pasted_raw_logs.txt"

    if not log_text or not log_text.strip():
        return Response({
            "success": False,
            "error": {
                "code": "EMPTY_LOG_CONTENT",
                "message": "Please upload a supported log file or paste log content before starting analysis."
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    # 3. SOC Log Parsing (Static only, never executed)
    try:
        if user and getattr(user, 'pk', None):
            try:
                AdminAuditLog.objects.create(
                    admin=user,
                    action='SOC_ANALYSIS_STARTED',
                    target_user=user,
                    target_record=f"Target: {filename}",
                    ip_address=ip_addr
                )
            except Exception:
                pass

        parser = LogParser(log_text, filename=filename)
        parsed_data = parser.parse()

        # 4. Multi-Level Threat Detection & Rule Evaluation
        has_threats = bool(
            parsed_data.get("brute_force_ips") or
            parsed_data.get("directory_scans") or
            parsed_data.get("suspicious_commands") or
            parsed_data.get("error_rate", 0) > 15.0 or
            any(entry.get("is_threat") for entry in parsed_data.get("parsed_logs", []))
        )

        total_reqs = parsed_data.get("total_requests", 0)
        uniq_ips = parsed_data.get("unique_ips_count", 0)
        log_fmt = parsed_data.get("log_format", "generic")

        if has_threats:
            ai_synthesis = run_log_analysis_ai(parsed_data)
            ai_severity = str(ai_synthesis.get("severity", "High")).upper()
            if parsed_data.get("brute_force_ips") or parsed_data.get("directory_scans") or parsed_data.get("suspicious_commands"):
                if ai_severity not in ['CRITICAL']:
                    ai_severity = 'HIGH'
            severity_val = ai_severity if ai_severity in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] else 'HIGH'
            result_status = "THREAT_DETECTED"
            risk_level = severity_val
            risk_score = 87 if severity_val in ['HIGH', 'CRITICAL'] else 55
            confidence = 94
            certificate_eligible = False
        else:
            # Deterministic Synthesis for clean logs (Instant 0ms latency)
            ai_synthesis = {
                "severity": "Low",
                "summary": f"Analyzed {total_reqs} security log entries from {uniq_ips} unique hosts ({log_fmt} format). All traffic matches benign operational baselines with zero anomalous indicators.",
                "recommendations": [
                    "Continue regular perimeter log aggregation and baseline monitoring",
                    "Maintain current firewall access rules and SSL configurations",
                    "Perform scheduled periodic SOC correlation reviews"
                ]
            }
            severity_val = "LOW"
            result_status = "SAFE"
            risk_level = "NO_RISK"
            risk_score = 0
            confidence = 96
            certificate_eligible = True

        parsed_data["ai_analysis"] = ai_synthesis

        # 5. Database Persistence
        soc_record = None
        report_id = None

        if user:
            file_hash = hashlib.sha256(log_text.encode('utf-8', errors='ignore')).hexdigest()

            # Create FileAnalysis record
            try:
                FileAnalysis.objects.create(
                    user=user,
                    original_filename=filename,
                    filename=filename,
                    sha256=file_hash,
                    file_hash=file_hash,
                    file_size=len(log_text),
                    file_type="LOG_FILE",
                    detected_type="DOCUMENT",
                    analysis_result=parsed_data,
                    risk_level=risk_level.lower(),
                    severity=risk_level.upper()
                )
            except Exception:
                pass

            # Create SOCAnalysis record with strictly correct deterministic risk_score
            findings_list = (
                (parsed_data.get("brute_force_ips") or []) +
                (parsed_data.get("directory_scans") or []) +
                (parsed_data.get("suspicious_commands") or [])
            )

            soc_record = SOCAnalysis.objects.create(
                user=user,
                target=filename,
                analysis_type="LOG_FILE",
                risk_score=risk_score,
                severity=severity_val,
                threat_level=severity_val,
                confidence=confidence,
                summary=ai_synthesis.get("summary", f"Log analysis complete for {filename}"),
                findings=findings_list,
                recommendations=ai_synthesis.get("recommendations", []) or [],
                status="COMPLETED",
                source_records={
                    "total_requests": total_reqs,
                    "error_rate": parsed_data.get("error_rate", 0),
                    "unique_ips_count": uniq_ips,
                    "log_format": log_fmt,
                    "indicators_detected": len(parsed_data.get("extracted_indicators", [])) + len(parsed_data.get("suspicious_commands", []))
                }
            )

            # Generate formal SecurityReport
            try:
                from scanner.services.reports.service import SecurityReportService
                sec_report = SecurityReportService.generate_report(
                    target=filename,
                    user=user,
                    soc_analysis_id=soc_record.id,
                    report_type="LOG_ANALYSIS"
                )
                if sec_report:
                    report_id = sec_report.report_id
            except Exception as rpt_err:
                print("Report generation error:", rpt_err)

            # Verify certificate eligibility via CertificateEligibilityService
            try:
                from scanner.services.certificates import CertificateEligibilityService
                eligibility_info = CertificateEligibilityService.check_eligibility(user, soc_record)
                certificate_eligible = bool(eligibility_info.get("eligible", False) or eligibility_info.get("is_eligible", False))
            except Exception as cert_err:
                print("Certificate eligibility check error:", cert_err)

            # Create Incident if critical threats flagged
            if severity_val in ['HIGH', 'CRITICAL'] or parsed_data.get("brute_force_ips") or parsed_data.get("suspicious_commands"):
                try:
                    Incident.objects.create(
                        user=user,
                        title=f"Flagged Threat in {filename}",
                        description=ai_synthesis.get("summary", "Suspicious attack patterns detected in log entries."),
                        severity="CRITICAL" if severity_val == 'CRITICAL' else 'HIGH',
                        status="OPEN"
                    )
                except Exception:
                    pass

            # Create AIActivity record
            try:
                AIActivity.objects.create(
                    user=user,
                    request_text=f"SOC Log analysis for: {filename}",
                    target=filename,
                    tools_selected=["log_parser", "soc_engine", "ai_synthesis"],
                    execution_status="COMPLETED",
                    result_summary=ai_synthesis.get("summary", "SOC Log analysis complete"),
                    risk_score=risk_score
                )
            except Exception:
                pass

            # Create Admin Audit Log: Completed
            try:
                AdminAuditLog.objects.create(
                    admin=user,
                    action='SOC_ANALYSIS_COMPLETED',
                    target_user=user,
                    target_record=f"SOC Log: {filename} [{result_status} - Risk: {risk_score}]",
                    ip_address=ip_addr
                )
                if report_id:
                    AdminAuditLog.objects.create(
                        admin=user,
                        action='SOC_REPORT_GENERATED',
                        target_user=user,
                        target_record=f"Report ID: {report_id}",
                        ip_address=ip_addr
                    )
                if certificate_eligible:
                    AdminAuditLog.objects.create(
                        admin=user,
                        action='SOC_CERTIFICATE_ELIGIBLE',
                        target_user=user,
                        target_record=f"Assessment: CG-SOC-{soc_record.id:06d}",
                        ip_address=ip_addr
                    )
            except Exception:
                pass

            # User Notification
            try:
                Notification.objects.create(
                    user=user,
                    title=f"SOC Log Analysis Completed: {filename}",
                    message=f"Analyzed {total_reqs} log entries. Result: {result_status} ({risk_level} Risk).",
                    notification_type="SECURITY" if has_threats else "INFO"
                )
            except Exception:
                pass

        # 6. Build Normalized Output Structure
        analysis_num = soc_record.id if soc_record else 1
        analysis_id = f"SOC-2026-{analysis_num:06d}"
        assessment_id = f"CG-SOC-{analysis_num:06d}"

        indicators_count = (
            len(parsed_data.get("extracted_indicators", [])) +
            len(parsed_data.get("suspicious_commands", [])) +
            len(parsed_data.get("brute_force_ips", [])) +
            len(parsed_data.get("directory_scans", []))
        )

        response_payload = {
            "success": True,
            "analysis_id": analysis_id,
            "assessment_id": assessment_id,
            "analysis_type": "LOG_ANALYSIS",
            "status": "COMPLETED",
            "result": result_status,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "confidence": confidence,
            "summary": ai_synthesis.get("summary", ""),
            "events_analyzed": total_reqs,
            "indicators_detected": indicators_count,
            "recommendations": ai_synthesis.get("recommendations", []),
            "report_id": report_id or "",
            "certificate_eligible": certificate_eligible,
            # Backward-compatible frontend fields
            "total_requests": total_reqs,
            "unique_ips_count": uniq_ips,
            "error_rate": parsed_data.get("error_rate", 0),
            "log_format": log_fmt,
            "brute_force_ips": parsed_data.get("brute_force_ips", []),
            "directory_scans": parsed_data.get("directory_scans", []),
            "suspicious_commands": parsed_data.get("suspicious_commands", []),
            "scanned_urls": parsed_data.get("scanned_urls", []),
            "parsed_logs": parsed_data.get("parsed_logs", []),
            "extracted_indicators": parsed_data.get("extracted_indicators", []),
            "ai_analysis": ai_synthesis,
            "performance_metrics": parsed_data.get("performance_metrics", {}),
            "input_source": filename
        }

        return Response(response_payload, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        if user and getattr(user, 'pk', None):
            try:
                AdminAuditLog.objects.create(
                    admin=user,
                    action='SOC_ANALYSIS_FAILED',
                    target_user=user,
                    target_record=f"Error in {filename}: {str(e)[:100]}",
                    ip_address=ip_addr
                )
            except Exception:
                pass
        return Response({
            "success": False,
            "error": {
                "code": "SOC_ANALYSIS_FAILED",
                "message": f"Log analysis encountered an internal error: {str(e)}"
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyzeTargetView(APIView):
    authentication_classes = [GracefulJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        target = request.data.get('target')
        if not target:
            return Response({"error": "Target is required"}, status=400)

        try:
            results = run_autonomous_analysis(target)
            user = resolve_request_user(request)

            if user:
                parsed_url = urlparse(target if target.startswith(('http://', 'https://')) else f"http://{target}")
                domain = parsed_url.netloc or parsed_url.path

                ai_analysis = results.get("ai_analysis", {})
                ai_severity = ai_analysis.get("severity", "Low").lower()
                risk_map = {"critical": "high", "high": "high", "medium": "medium", "low": "excellent"}
                risk_level = risk_map.get(ai_severity, "medium")
                score = 85 if risk_level != 'high' else 35

                scan = ScanResult.objects.create(
                    user=user,
                    url=target,
                    domain=domain,
                    is_https=target.startswith('https://'),
                    security_score=score,
                    risk_level=risk_level,
                    ssl_data=results.get("ssl", {}),
                    headers_data=results.get("security_headers", {}),
                    whois_data=results.get("threat_intel", {})
                )

                Report.objects.create(
                    user=user,
                    scan=scan,
                    title=f"Autonomous AI Security Report - {domain}",
                    summary=ai_analysis.get("summary", "Complete security audit finished.")
                )

                if ai_severity in ['high', 'critical']:
                    Incident.objects.create(
                        user=user,
                        title=f"Critical Security Alert: {domain}",
                        description=f"Autonomous scan found high-risk vectors. AI Summary: {ai_analysis.get('summary')}",
                        severity="HIGH" if ai_severity == 'high' else 'CRITICAL',
                        status="OPEN"
                    )

                AIActivity.objects.create(
                    user=user,
                    request_text=f"Autonomous scan for: {target}",
                    target=domain,
                    tools_selected=["ssl_analyzer", "header_analyzer", "threat_intel", "ai_synthesis"],
                    execution_status="COMPLETED",
                    result_summary=ai_analysis.get("summary", "Autonomous scan complete"),
                    risk_score=score
                )

                Notification.objects.create(
                    user=user,
                    title=f"Autonomous Scan Finished: {domain}",
                    message=f"Security Score: {score}/100 with severity {ai_severity.upper()}.",
                    notification_type="SECURITY"
                )

            return Response(results)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class LogAnalysisView(APIView):
    """
    SOC Log Analysis View for uploaded log files and pasted raw logs.
    POST /api/analyze-logs/
    Supports multipart/form-data and application/json.
    """
    authentication_classes = [GracefulJWTAuthentication]
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request):
        uploaded_file = request.FILES.get('file') or request.FILES.get('log_file')
        raw_logs = request.data.get('raw_logs') or request.data.get('log_text')
        source = request.data.get('source', 'user_upload' if uploaded_file else 'manual_input')

        return process_soc_log_analysis(
            request=request,
            raw_logs=raw_logs,
            uploaded_file=uploaded_file,
            source=source
        )
