import hashlib
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .ai_agent import run_autonomous_analysis, run_log_analysis_ai
from .log_parser import LogParser
from scanner.models import ScanResult, Report, ThreatIntelResult, FileAnalysis, Incident, AIActivity
from users.models import Notification
from urllib.parse import urlparse

class AnalyzeTargetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        target = request.data.get('target')
        if not target:
            return Response({"error": "Target is required"}, status=400)
            
        try:
            # Trigger the autonomous scan workflow
            results = run_autonomous_analysis(target)

            # Strict backend ownership — ignore any client-supplied user_id!
            if request.user and request.user.is_authenticated:
                user = request.user
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
                severity_val = 'HIGH' if risk_level in ['high', 'critical'] else ('MEDIUM' if risk_level == 'medium' else 'LOW')
                threat = ThreatIntelResult.objects.create(
                    user=user,
                    scan=scan,
                    target=domain,
                    target_type="DOMAIN",
                    provider="Multi-Provider",
                    query_type="REPUTATION",
                    threat_score=score,
                    severity=severity_val,
                    confidence=80,
                    detection_summary=results.get("security_headers", {}),
                    normalized_result=results.get("threat_intel", {}),
                    status="SUCCESS"
                )

                # 4. Create AIActivity (Concise operational info only — no chain-of-thought!)
                AIActivity.objects.create(
                    user=user,
                    request_text=f"Autonomous scan on target: {target}",
                    target=domain,
                    tools_selected=["security_headers", "ssl_analyzer", "port_scanner", "threat_intel"],
                    execution_status="COMPLETED",
                    result_summary=ai_analysis.get("summary", f"Analysis completed for {domain}"),
                    risk_score=score
                )

                # 5. Create Incident if high/critical risk
                if risk_level in ['high', 'critical']:
                    Incident.objects.create(
                        user=user,
                        scan=scan,
                        title=f"High Risk Finding: {domain}",
                        description=ai_analysis.get("summary", "Critical vulnerabilities detected during scan."),
                        severity="HIGH",
                        status="OPEN"
                    )

                # 6. Create Notification
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
            parser = LogParser(log_text)
            parsed_data = parser.parse()
            
            # Run AI synthesis
            ai_synthesis = run_log_analysis_ai(parsed_data)
            parsed_data["ai_analysis"] = ai_synthesis

            # Strict backend ownership — bind file analysis to request.user!
            if request.user and request.user.is_authenticated:
                user = request.user
                file_hash = hashlib.sha256(log_text.encode('utf-8')).hexdigest()
                ai_severity = ai_synthesis.get("severity", "Low").lower()

                file_analysis = FileAnalysis.objects.create(
                    user=user,
                    filename=filename,
                    file_hash=file_hash,
                    file_size=len(log_text),
                    file_type="LOG_FILE",
                    analysis_result=parsed_data,
                    risk_level=ai_severity
                )

                AIActivity.objects.create(
                    user=user,
                    request_text=f"Log analysis for file: {filename}",
                    target=filename,
                    tools_selected=["log_parser", "ai_synthesis"],
                    execution_status="COMPLETED",
                    result_summary=ai_synthesis.get("summary", "Log analysis complete"),
                    risk_score=75 if ai_severity == 'high' else 90
                )

                Notification.objects.create(
                    user=user,
                    title=f"File Analysis Completed: {filename}",
                    message=f"Analyzed {parsed_data.get('total_requests', 0)} log entries. Severity: {ai_severity.upper()}.",
                    notification_type="INFO"
                )

            return Response(parsed_data, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
