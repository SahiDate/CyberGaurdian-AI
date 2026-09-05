from rest_framework.views import APIView
from rest_framework.response import Response
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

class AnalyzeTargetView(APIView):
    authentication_classes = [GracefulJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        target = request.data.get('target')
        if not target:
            return Response({"error": "Target is required"}, status=400)
            
        try:
            # Trigger the autonomous scan workflow
            results = run_autonomous_analysis(target)

            # Determine user (authenticated user or fallback to guest_user)
            user = resolve_request_user(request)

            if user:
                parsed_url = urlparse(target if target.startswith(('http://', 'https://')) else f"http://{target}")
                domain = parsed_url.netloc or parsed_url.path
                
                ai_analysis = results.get("ai_analysis", {})
                ai_severity = ai_analysis.get("severity", "Low").lower()
                risk_map = {"critical": "high", "high": "high", "medium": "medium", "low": "excellent"}
                risk_level = risk_map.get(ai_severity, "medium")
                score = 85 if risk_level != 'high' else 35

                # 1. Create ScanResult
                scan = ScanResult.objects.create(
                    user=user,
                    url=target,
                    domain=domain,
                    is_https=target.startswith('https://'),
                    security_score=score,
                    risk_level=risk_level,
                    ssl_data=results.get("ssl", {}),
                    headers_data=results.get("security_headers", {}),
                    whois_data=results.get("threat_intel", {}),
                    scan_duration_ms=450
                )

                # 2. Create Report
                report = Report.objects.create(
                    user=user,
                    scan=scan,
                    title=f"Security Audit Report — {domain}",
                    report_type="EXECUTIVE",
                    summary=ai_analysis.get("summary", f"Scan completed for {domain} with security score {score}/100."),
                    details=results,
                    status="GENERATED"
                )

                # 3. Create ThreatIntelResult
                severity_val = 'CRITICAL' if ai_severity == 'critical' else ('HIGH' if risk_level in ['high', 'critical'] else ('MEDIUM' if risk_level == 'medium' else 'LOW'))
                threat = ThreatIntelResult.objects.create(
                    user=user,
                    scan=scan,
                    target=domain,
                    target_type="DOMAIN",
                    provider="Multi-Provider",
                    query_type="REPUTATION",
                    threat_score=score,
                    severity=severity_val,
                    confidence=85,
                    detection_summary=results.get("security_headers", {}),
                    normalized_result=results.get("threat_intel", {}),
                    status="SUCCESS"
                )

                # 4. Create SOCAnalysis record so it updates Admin SOC & Threat analytics
                soc_record = SOCAnalysis.objects.create(
                    user=user,
                    target=domain,
                    analysis_type="DOMAIN_SCAN",
                    risk_score=score,
                    severity=severity_val,
                    threat_level=severity_val,
                    summary=ai_analysis.get("summary", f"Autonomous security scan completed for {domain}"),
                    findings=results.get("open_ports", []) or [],
                    recommendations=ai_analysis.get("recommendations", []) or [],
                    status="COMPLETED",
                    source_records=results
                )

                # 4b. Automatically generate platform SecurityReport for Admin Report Section
                try:
                    from scanner.services.reports.service import SecurityReportService
                    SecurityReportService.generate_report(
                        target=domain,
                        user=user,
                        soc_analysis_id=soc_record.id,
                        report_type="COMPREHENSIVE"
                    )
                except Exception:
                    pass


                # 5. Create AIActivity
                AIActivity.objects.create(
                    user=user,
                    request_text=f"Autonomous scan on target: {target}",
                    target=domain,
                    tools_selected=["security_headers", "ssl_analyzer", "port_scanner", "threat_intel"],
                    execution_status="COMPLETED",
                    result_summary=ai_analysis.get("summary", f"Analysis completed for {domain}"),
                    risk_score=score
                )

                # 6. Create Incident if high/critical risk
                if risk_level in ['high', 'critical']:
                    Incident.objects.create(
                        user=user,
                        scan=scan,
                        title=f"High Risk Finding: {domain}",
                        description=ai_analysis.get("summary", "Critical vulnerabilities detected during scan."),
                        severity="HIGH" if ai_severity != 'critical' else 'CRITICAL',
                        status="OPEN"
                    )

                # 7. Create AdminAuditLog entry
                if user and getattr(user, 'pk', None):
                    try:
                        AdminAuditLog.objects.create(
                            admin=user,
                            action='USER_SCAN_EXECUTED',
                            target_user=user,
                            target_record=f"Scan: {domain} [{severity_val}]",
                            ip_address=request.META.get('REMOTE_ADDR', '')
                        )
                    except Exception:
                        pass

                # 8. Create Notification
                Notification.objects.create(
                    user=user,
                    title=f"Scan Completed: {domain}",
                    message=f"Scan finished. Security score: {score}/100 ({risk_level.upper()}).",
                    notification_type="SECURITY"
                )

            return Response(results)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class LogAnalysisView(APIView):
    authentication_classes = [GracefulJWTAuthentication]
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request):
        log_text = request.data.get('log_text')
        log_file = request.FILES.get('log_file')
        filename = log_file.name if log_file else "pasted_log.txt"

        if not log_text and not log_file:
            return Response({"error": "Either log_text or log_file is required."}, status=400)

        if log_file:
            try:
                log_text = log_file.read().decode('utf-8', errors='ignore')
            except Exception as e:
                return Response({"error": f"Failed to read file: {str(e)}"}, status=400)

        if not log_text or not log_text.strip():
            return Response({"error": "Log content is empty."}, status=400)

        try:
            # Level 1: Fast Streaming Parse & Deduplication
            parser = LogParser(log_text)
            parsed_data = parser.parse()
            
            # Level 2 & 3: Multi-Level Threat Detection & Selective AI Synthesis
            has_threats = bool(parsed_data.get("brute_force_ips") or parsed_data.get("directory_scans") or parsed_data.get("error_rate", 0) > 15.0)
            
            if has_threats:
                # Run AI synthesis on suspicious/threat logs
                ai_synthesis = run_log_analysis_ai(parsed_data)
            else:
                # Fast Deterministic Synthesis for clean logs (Instant 0ms latency)
                total_reqs = parsed_data.get("total_requests", 0)
                uniq_ips = parsed_data.get("unique_ips_count", 0)
                ai_synthesis = {
                    "severity": "Low",
                    "summary": f"Analyzed {total_reqs} security log entries from {uniq_ips} unique hosts. All traffic matches benign operational baselines with zero anomalous indicators.",
                    "recommendations": [
                        "Continue regular perimeter log aggregation and baseline monitoring",
                        "Maintain current firewall access rules and SSL configurations",
                        "Perform scheduled periodic SOC correlation reviews"
                    ]
                }

            parsed_data["ai_analysis"] = ai_synthesis

            # Determine user (authenticated user or fallback to guest_user)
            user = resolve_request_user(request)

            if user:
                file_hash = hashlib.sha256(log_text.encode('utf-8')).hexdigest()
                ai_severity = ai_synthesis.get("severity", "Low").lower()
                severity_val = ai_severity.upper() if ai_severity.upper() in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] else 'LOW'

                # 1. Create FileAnalysis
                file_analysis = FileAnalysis.objects.create(
                    user=user,
                    filename=filename,
                    file_hash=file_hash,
                    file_size=len(log_text),
                    file_type="LOG_FILE",
                    analysis_result=parsed_data,
                    risk_level=ai_severity
                )

                # 2. Create SOCAnalysis record so it updates Admin SOC & Threat analytics
                soc_record = SOCAnalysis.objects.create(
                    user=user,
                    target=filename,
                    analysis_type="LOG_FILE",
                    risk_score=75 if ai_severity in ['high', 'critical'] else (45 if ai_severity == 'medium' else 90),
                    severity=severity_val,
                    threat_level=severity_val,
                    summary=ai_synthesis.get("summary", f"Log analysis complete for {filename}"),
                    findings=(parsed_data.get("brute_force_ips") or []) + (parsed_data.get("directory_scans") or []),
                    recommendations=ai_synthesis.get("recommendations", []) or [],
                    status="COMPLETED",
                    source_records={
                        "total_requests": parsed_data.get("total_requests", 0),
                        "error_rate": parsed_data.get("error_rate", 0),
                        "unique_ips_count": parsed_data.get("unique_ips_count", 0)
                    }
                )

                # 2b. Automatically generate platform SecurityReport for Admin Report Section
                try:
                    from scanner.services.reports.service import SecurityReportService
                    SecurityReportService.generate_report(
                        target=filename,
                        user=user,
                        soc_analysis_id=soc_record.id,
                        report_type="LOG_ANALYSIS"
                    )
                except Exception:
                    pass


                # 3. Create Incident if threats detected
                if ai_severity in ['high', 'critical'] or parsed_data.get("brute_force_ips") or parsed_data.get("directory_scans"):
                    Incident.objects.create(
                        user=user,
                        title=f"Flagged Threat in {filename}",
                        description=ai_synthesis.get("summary", "Brute-force or suspicious directory traversal attempts detected in log entries."),
                        severity="CRITICAL" if ai_severity == 'critical' else 'HIGH',
                        status="OPEN"
                    )

                # 4. Create AIActivity
                AIActivity.objects.create(
                    user=user,
                    request_text=f"SOC Log analysis for: {filename}",
                    target=filename,
                    tools_selected=["log_parser", "soc_engine", "ai_synthesis"],
                    execution_status="COMPLETED",
                    result_summary=ai_synthesis.get("summary", "SOC Log analysis complete"),
                    risk_score=75 if ai_severity in ['high', 'critical'] else 90
                )

                # 5. Create AdminAuditLog
                if user and getattr(user, 'pk', None):
                    try:
                        AdminAuditLog.objects.create(
                            admin=user,
                            action='USER_LOG_ANALYZED',
                            target_user=user,
                            target_record=f"SOC Log File: {filename} [{severity_val}]",
                            ip_address=request.META.get('REMOTE_ADDR', '')
                        )
                    except Exception:
                        pass

                # 6. Create Notification
                Notification.objects.create(
                    user=user,
                    title=f"SOC Log Analysis Completed: {filename}",
                    message=f"Analyzed {parsed_data.get('total_requests', 0)} log entries. Severity: {severity_val}.",
                    notification_type="INFO"
                )

            return Response(parsed_data, status=200)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

