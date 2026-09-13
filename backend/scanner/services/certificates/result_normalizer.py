"""
Centralized Assessment Result Normalizer for CyberGuardian AI Certificates.
Normalizes heterogeneous scanner and SOC results into standardized states:
  - SAFE / NO_RISK (Eligible for certificate)
  - LOW_RISK / SUSPICIOUS / MALICIOUS / HIGH_RISK / CRITICAL_RISK (Not eligible)
  - ERROR / INCOMPLETE (Not eligible)

Strictly enforces:
Only assessments that completed with a POSITIVE / SAFE / NO-RISK result are eligible.
"""
from typing import Dict, Any, Optional, Tuple


# Master Registry of Eligible Assessment Types
ELIGIBLE_CERTIFICATE_ASSESSMENTS = [
    {
        "type": "WEBSITE_SCAN",
        "name": "Website Security Assessment",
        "code_prefix": "CG-WS",
        "description": "Perimeter web analysis, security headers, SSL status, and DNS hygiene."
    },
    {
        "type": "URL_SCAN",
        "name": "URL Security Assessment",
        "code_prefix": "CG-URL",
        "description": "Automated destination analysis, redirect chain validation, and reputation inspection."
    },
    {
        "type": "PORT_SCAN",
        "name": "IP & Port Security Assessment",
        "code_prefix": "CG-PORT",
        "description": "Network perimeter port telemetry and exposed service evaluation."
    },
    {
        "type": "SSL_SCAN",
        "name": "SSL/TLS Security Assessment",
        "code_prefix": "CG-SSL",
        "description": "Cryptographic certificate validation, cipher suite audit, and expiration telemetry."
    },
    {
        "type": "WHOIS_ANALYSIS",
        "name": "WHOIS Domain Security Assessment",
        "code_prefix": "CG-WHOIS",
        "description": "Domain registration verification, registrar telemetry, and age correlation."
    },
    {
        "type": "THREAT_INTELLIGENCE",
        "name": "Threat Intelligence Assessment",
        "code_prefix": "CG-TI",
        "description": "Multi-provider reputation lookup, malicious IOC correlation, and threat scoring."
    },
    {
        "type": "FILE_ANALYSIS",
        "name": "File & Malware Security Analysis",
        "code_prefix": "CG-FA",
        "description": "Static signature matching, entropy calculation, and YARA engine detection."
    },
    {
        "type": "SOC_ANALYSIS",
        "name": "SOC Security Analysis",
        "code_prefix": "CG-SOC",
        "description": "Deterministic correlation, event deduplication, and combined threat assessment."
    },
    {
        "type": "SECURITY_REPORT",
        "name": "Comprehensive Security Assessment",
        "code_prefix": "CG-RPT",
        "description": "Consolidated security assessment report synthesizing automated telemetry."
    },
]

ASSESSMENT_NAME_MAP = {item["type"]: item["name"] for item in ELIGIBLE_CERTIFICATE_ASSESSMENTS}
ASSESSMENT_PREFIX_MAP = {item["type"]: item["code_prefix"] for item in ELIGIBLE_CERTIFICATE_ASSESSMENTS}


class ResultNormalizer:
    """
    Normalizes any supported assessment entity into a unified certificate eligibility payload.
    """

    @classmethod
    def normalize(cls, entity: Any) -> Dict[str, Any]:
        """
        Inspects entity type and normalizes its security result.
        Returns:
            {
                "assessment_type": str,
                "assessment_name": str,
                "assessment_id": str,
                "target": str,
                "normalized_result": str,   # SAFE, NO_RISK, LOW_RISK, SUSPICIOUS, MALICIOUS, HIGH_RISK, CRITICAL_RISK, ERROR, INCOMPLETE
                "risk_level": str,          # NO_RISK, LOW, MEDIUM, HIGH, CRITICAL, UNKNOWN
                "risk_score": int,          # 0-100
                "is_eligible": bool,        # True ONLY if SAFE / NO_RISK
                "is_completed": bool,
                "reason": str,
                "entity": Any
            }
        """
        if entity is None:
            return cls._make_result(
                assessment_type="UNKNOWN",
                assessment_name="Unknown Assessment",
                assessment_id="",
                target="",
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=0,
                is_eligible=False,
                is_completed=False,
                reason="No assessment record found.",
                entity=None
            )

        model_name = entity.__class__.__name__

        if model_name == 'ScanResult':
            return cls._normalize_scan_result(entity)
        elif model_name == 'URLScanResult':
            return cls._normalize_url_scan_result(entity)
        elif model_name == 'SSLScanResult':
            return cls._normalize_ssl_scan_result(entity)
        elif model_name == 'PortScanResult':
            return cls._normalize_port_scan_result(entity)
        elif model_name == 'WhoisLookupResult':
            return cls._normalize_whois_result(entity)
        elif model_name == 'ThreatIntelResult':
            return cls._normalize_threat_intel_result(entity)
        elif model_name == 'FileAnalysis':
            return cls._normalize_file_analysis(entity)
        elif model_name == 'SOCAnalysis':
            return cls._normalize_soc_analysis(entity)
        elif model_name == 'SecurityReport':
            return cls._normalize_security_report(entity)
        else:
            return cls._make_result(
                assessment_type=model_name.upper(),
                assessment_name=model_name,
                assessment_id=str(getattr(entity, 'id', '')),
                target=str(getattr(entity, 'target', getattr(entity, 'domain', ''))),
                normalized_result="ERROR",
                risk_level="UNKNOWN",
                risk_score=0,
                is_eligible=False,
                is_completed=False,
                reason=f"Assessment module type '{model_name}' is not recognized for certification.",
                entity=entity
            )

    @classmethod
    def _normalize_scan_result(cls, scan: Any) -> Dict[str, Any]:
        """
        ScanResult (Website Scanner):
        risk_level: 'excellent', 'good', 'medium', 'high'
        security_score: 0-100 (100 is best)
        """
        target = scan.domain or scan.url
        assessment_id = f"CG-WS-{scan.id:06d}" if scan.id else "CG-WS-000000"
        score = getattr(scan, 'security_score', 0)
        raw_risk = str(getattr(scan, 'risk_level', 'high')).lower()

        # SAFE criteria:
        # excellent -> SAFE / NO_RISK
        # good with score >= 75 -> SAFE / NO_RISK
        # medium or high -> NOT ELIGIBLE
        if raw_risk == 'excellent' or (raw_risk == 'good' and score >= 75):
            return cls._make_result(
                assessment_type="WEBSITE_SCAN",
                assessment_name="Website Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=score,
                is_eligible=True,
                is_completed=True,
                reason="Website scan completed successfully with verified safe perimeter security.",
                entity=scan
            )
        elif raw_risk == 'medium':
            return cls._make_result(
                assessment_type="WEBSITE_SCAN",
                assessment_name="Website Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="LOW_RISK",
                risk_level="MEDIUM",
                risk_score=score,
                is_eligible=False,
                is_completed=True,
                reason="Assessment detected moderate security vulnerabilities and does not meet the NO-RISK criteria.",
                entity=scan
            )
        else:
            return cls._make_result(
                assessment_type="WEBSITE_SCAN",
                assessment_name="Website Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="HIGH_RISK",
                risk_level="HIGH",
                risk_score=score,
                is_eligible=False,
                is_completed=True,
                reason="Assessment detected high security risks on the target domain.",
                entity=scan
            )

    @classmethod
    def _normalize_url_scan_result(cls, url_scan: Any) -> Dict[str, Any]:
        """
        URLScanResult:
        status: 'SUCCESS', 'WARNING', 'ERROR'
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        threat_score: 0-100 (0 is best)
        """
        target = url_scan.normalized_url or url_scan.original_url
        assessment_id = f"CG-URL-{url_scan.id:06d}" if url_scan.id else "CG-URL-000000"
        status_val = str(getattr(url_scan, 'status', 'SUCCESS')).upper()
        severity = str(getattr(url_scan, 'severity', 'LOW')).upper()
        threat_score = getattr(url_scan, 'threat_score', 0)
        indicators = getattr(url_scan, 'indicators', []) or []

        if status_val != 'SUCCESS':
            return cls._make_result(
                assessment_type="URL_SCAN",
                assessment_name="URL Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE" if status_val in ('TIMEOUT', 'WARNING') else "ERROR",
                risk_level="UNKNOWN",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=False,
                reason=f"URL assessment did not complete successfully (Status: {status_val}).",
                entity=url_scan
            )

        if severity == 'LOW' and threat_score <= 15 and len(indicators) == 0:
            return cls._make_result(
                assessment_type="URL_SCAN",
                assessment_name="URL Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=threat_score,
                is_eligible=True,
                is_completed=True,
                reason="URL assessment completed with zero threat detections or malicious indicators.",
                entity=url_scan
            )
        elif severity in ('HIGH', 'CRITICAL') or threat_score >= 50:
            return cls._make_result(
                assessment_type="URL_SCAN",
                assessment_name="URL Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="MALICIOUS",
                risk_level="HIGH",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="Certificate cannot be issued because the URL assessment detected malicious activity.",
                entity=url_scan
            )
        else:
            return cls._make_result(
                assessment_type="URL_SCAN",
                assessment_name="URL Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SUSPICIOUS",
                risk_level="MEDIUM",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="URL assessment detected suspicious redirect or security indicators.",
                entity=url_scan
            )

    @classmethod
    def _normalize_ssl_scan_result(cls, ssl_scan: Any) -> Dict[str, Any]:
        """
        SSLScanResult:
        certificate_status: 'VALID', 'EXPIRED', 'SELF_SIGNED', 'REVOKED'
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        threat_score: 0-100 (0 is best)
        """
        target = ssl_scan.domain or ssl_scan.target
        assessment_id = f"CG-SSL-{ssl_scan.id:06d}" if ssl_scan.id else "CG-SSL-000000"
        status_val = str(getattr(ssl_scan, 'status', 'SUCCESS')).upper()
        cert_status = str(getattr(ssl_scan, 'certificate_status', 'VALID')).upper()
        severity = str(getattr(ssl_scan, 'severity', 'LOW')).upper()
        threat_score = getattr(ssl_scan, 'threat_score', 0)
        issues = getattr(ssl_scan, 'security_issues', []) or []

        if status_val != 'SUCCESS':
            return cls._make_result(
                assessment_type="SSL_SCAN",
                assessment_name="SSL/TLS Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=False,
                reason=f"SSL scan did not complete cleanly (Status: {status_val}).",
                entity=ssl_scan
            )

        if cert_status == 'VALID' and severity == 'LOW' and threat_score <= 15 and len(issues) == 0:
            return cls._make_result(
                assessment_type="SSL_SCAN",
                assessment_name="SSL/TLS Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=threat_score,
                is_eligible=True,
                is_completed=True,
                reason="TLS certificate is valid, properly configured, and met all cryptographic security criteria.",
                entity=ssl_scan
            )
        else:
            return cls._make_result(
                assessment_type="SSL_SCAN",
                assessment_name="SSL/TLS Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SUSPICIOUS" if cert_status != 'VALID' else "HIGH_RISK",
                risk_level=severity if severity in ('MEDIUM', 'HIGH', 'CRITICAL') else "HIGH",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason=f"Certificate cannot be issued: SSL analysis detected issues (Certificate Status: {cert_status}).",
                entity=ssl_scan
            )

    @classmethod
    def _normalize_port_scan_result(cls, port_scan: Any) -> Dict[str, Any]:
        """
        PortScanResult:
        status: 'SUCCESS'
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        threat_score: 0-100 (0 is best)
        """
        target = port_scan.target
        assessment_id = f"CG-PORT-{port_scan.id:06d}" if port_scan.id else "CG-PORT-000000"
        status_val = str(getattr(port_scan, 'status', 'SUCCESS')).upper()
        severity = str(getattr(port_scan, 'severity', 'LOW')).upper()
        threat_score = getattr(port_scan, 'threat_score', 0)
        open_ports = getattr(port_scan, 'open_ports', []) or []

        if status_val != 'SUCCESS':
            return cls._make_result(
                assessment_type="PORT_SCAN",
                assessment_name="IP & Port Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=False,
                reason=f"Port scan did not complete cleanly (Status: {status_val}).",
                entity=port_scan
            )

        # Risky open administrative or legacy ports
        risky_ports = {21, 23, 445, 1433, 1521, 2375, 3306, 3389, 5432, 6379, 27017}
        port_numbers = []
        for p in open_ports:
            if isinstance(p, dict):
                port_num = p.get('port') or p.get('port_number')
                if port_num is not None:
                    try:
                        port_numbers.append(int(port_num))
                    except (ValueError, TypeError):
                        pass
            elif isinstance(p, (int, str)):
                try:
                    port_numbers.append(int(p))
                except (ValueError, TypeError):
                    pass
        detected_risky = any(p in risky_ports for p in port_numbers)

        if severity == 'LOW' and threat_score <= 15 and not detected_risky:
            return cls._make_result(
                assessment_type="PORT_SCAN",
                assessment_name="IP & Port Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=threat_score,
                is_eligible=True,
                is_completed=True,
                reason="Port and network scan completed cleanly with no unauthorized exposed services.",
                entity=port_scan
            )
        else:
            return cls._make_result(
                assessment_type="PORT_SCAN",
                assessment_name="IP & Port Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="HIGH_RISK",
                risk_level=severity if severity in ('MEDIUM', 'HIGH', 'CRITICAL') else "HIGH",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="Network scan detected exposed sensitive ports or security risks.",
                entity=port_scan
            )

    @classmethod
    def _normalize_whois_result(cls, whois_res: Any) -> Dict[str, Any]:
        """
        WhoisLookupResult:
        status: 'SUCCESS'
        severity: 'LOW', 'MEDIUM', 'HIGH'
        threat_score: 0-100
        """
        target = whois_res.domain
        assessment_id = f"CG-WHOIS-{whois_res.id:06d}" if whois_res.id else "CG-WHOIS-000000"
        status_val = str(getattr(whois_res, 'status', 'SUCCESS')).upper()
        severity = str(getattr(whois_res, 'severity', 'LOW')).upper()
        threat_score = getattr(whois_res, 'threat_score', 0)

        if status_val != 'SUCCESS':
            return cls._make_result(
                assessment_type="WHOIS_ANALYSIS",
                assessment_name="WHOIS Domain Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=False,
                reason="WHOIS lookup failed or timed out.",
                entity=whois_res
            )

        if severity == 'LOW' and threat_score <= 15:
            return cls._make_result(
                assessment_type="WHOIS_ANALYSIS",
                assessment_name="WHOIS Domain Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=threat_score,
                is_eligible=True,
                is_completed=True,
                reason="Domain registration history and posture verified safe.",
                entity=whois_res
            )
        else:
            return cls._make_result(
                assessment_type="WHOIS_ANALYSIS",
                assessment_name="WHOIS Domain Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SUSPICIOUS",
                risk_level="MEDIUM",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="Domain WHOIS records indicate recent registration or suspicious ownership indicators.",
                entity=whois_res
            )

    @classmethod
    def _normalize_threat_intel_result(cls, threat: Any) -> Dict[str, Any]:
        """
        ThreatIntelResult:
        malicious_count, suspicious_count, threat_score, severity
        """
        target = threat.target
        assessment_id = f"CG-TI-{threat.id:06d}" if threat.id else "CG-TI-000000"
        status_val = str(getattr(threat, 'status', 'SUCCESS')).upper()
        severity = str(getattr(threat, 'severity', 'LOW')).upper()
        threat_score = getattr(threat, 'threat_score', 0)
        mal_count = getattr(threat, 'malicious_count', 0)
        susp_count = getattr(threat, 'suspicious_count', 0)

        if status_val != 'SUCCESS':
            return cls._make_result(
                assessment_type="THREAT_INTELLIGENCE",
                assessment_name="Threat Intelligence Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=False,
                reason=f"Threat intelligence lookup was not completed successfully (Status: {status_val}).",
                entity=threat
            )

        if mal_count == 0 and susp_count == 0 and severity == 'LOW' and threat_score <= 15:
            return cls._make_result(
                assessment_type="THREAT_INTELLIGENCE",
                assessment_name="Threat Intelligence Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=threat_score,
                is_eligible=True,
                is_completed=True,
                reason="Target has clean global reputation across all threat intelligence feeds.",
                entity=threat
            )
        elif mal_count > 0 or severity in ('HIGH', 'CRITICAL'):
            return cls._make_result(
                assessment_type="THREAT_INTELLIGENCE",
                assessment_name="Threat Intelligence Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="MALICIOUS",
                risk_level="HIGH",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="Threat intelligence feeds detected confirmed malicious indicators.",
                entity=threat
            )
        else:
            return cls._make_result(
                assessment_type="THREAT_INTELLIGENCE",
                assessment_name="Threat Intelligence Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SUSPICIOUS",
                risk_level="MEDIUM",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="Threat intelligence feeds flagged suspicious or low-reputation indicators.",
                entity=threat
            )

    @classmethod
    def _normalize_file_analysis(cls, fa: Any) -> Dict[str, Any]:
        """
        FileAnalysis:
        analysis_status: 'COMPLETED'
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        threat_score: 0-100
        yara_matches: list
        """
        target = fa.original_filename or fa.sha256[:16]
        assessment_id = f"CG-FA-{fa.id:06d}" if fa.id else "CG-FA-000000"
        status_val = str(getattr(fa, 'analysis_status', 'COMPLETED')).upper()
        severity = str(getattr(fa, 'severity', 'LOW')).upper()
        threat_score = getattr(fa, 'threat_score', 0)
        yara_matches = getattr(fa, 'yara_matches', []) or []

        if status_val != 'COMPLETED':
            return cls._make_result(
                assessment_type="FILE_ANALYSIS",
                assessment_name="File & Malware Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=False,
                reason=f"File analysis is incomplete (Status: {status_val}).",
                entity=fa
            )

        if severity == 'LOW' and threat_score <= 15 and len(yara_matches) == 0:
            return cls._make_result(
                assessment_type="FILE_ANALYSIS",
                assessment_name="File & Malware Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=threat_score,
                is_eligible=True,
                is_completed=True,
                reason="File analysis verified benign; zero malware signatures or anomalous entropy patterns detected.",
                entity=fa
            )
        elif severity in ('HIGH', 'CRITICAL') or len(yara_matches) > 0:
            return cls._make_result(
                assessment_type="FILE_ANALYSIS",
                assessment_name="File & Malware Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="MALICIOUS",
                risk_level="HIGH",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="File matches known malware signatures or high-risk executable characteristics.",
                entity=fa
            )
        else:
            return cls._make_result(
                assessment_type="FILE_ANALYSIS",
                assessment_name="File & Malware Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SUSPICIOUS",
                risk_level="MEDIUM",
                risk_score=threat_score,
                is_eligible=False,
                is_completed=True,
                reason="File analysis detected elevated entropy or suspicious script characteristics.",
                entity=fa
            )

    @classmethod
    def _normalize_soc_analysis(cls, soc: Any) -> Dict[str, Any]:
        """
        SOCAnalysis:
        status: 'COMPLETED'
        threat_level: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'REVIEW_REQUIRED'
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        risk_score: 0-100 (0 is best)
        """
        target = soc.target
        assessment_id = f"CG-SOC-{soc.id:06d}" if soc.id else "CG-SOC-000000"
        status_val = str(getattr(soc, 'status', 'COMPLETED')).upper()
        severity = str(getattr(soc, 'severity', 'LOW')).upper()
        threat_level = str(getattr(soc, 'threat_level', 'LOW')).upper()
        risk_score = getattr(soc, 'risk_score', 0)
        correlations = getattr(soc, 'correlations', []) or []
        findings = getattr(soc, 'findings', []) or []

        if status_val != 'COMPLETED':
            return cls._make_result(
                assessment_type="SOC_ANALYSIS",
                assessment_name="SOC Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=risk_score,
                is_eligible=False,
                is_completed=False,
                reason=f"SOC Analysis has not completed (Status: {status_val}).",
                entity=soc
            )

        # SAFE criteria for SOC Analysis:
        # threat_level == 'LOW' and severity == 'LOW' and risk_score <= 20 and no critical correlations
        has_critical_finding = any(f.get("severity") in ('HIGH', 'CRITICAL') for f in findings if isinstance(f, dict))
        if threat_level == 'LOW' and severity == 'LOW' and risk_score <= 20 and len(correlations) == 0 and not has_critical_finding:
            return cls._make_result(
                assessment_type="SOC_ANALYSIS",
                assessment_name="SOC Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=risk_score,
                is_eligible=True,
                is_completed=True,
                reason="Automated SOC Analysis confirmed no detected threats or malicious correlations.",
                entity=soc
            )
        elif threat_level in ('HIGH', 'CRITICAL', 'REVIEW_REQUIRED') or severity in ('HIGH', 'CRITICAL'):
            return cls._make_result(
                assessment_type="SOC_ANALYSIS",
                assessment_name="SOC Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="MALICIOUS" if threat_level == 'CRITICAL' else "HIGH_RISK",
                risk_level="HIGH",
                risk_score=risk_score,
                is_eligible=False,
                is_completed=True,
                reason="SOC correlation engine detected active security threats.",
                entity=soc
            )
        else:
            return cls._make_result(
                assessment_type="SOC_ANALYSIS",
                assessment_name="SOC Security Analysis",
                assessment_id=assessment_id,
                target=target,
                normalized_result="LOW_RISK",
                risk_level="MEDIUM",
                risk_score=risk_score,
                is_eligible=False,
                is_completed=True,
                reason="SOC analysis identified findings requiring security review before certification.",
                entity=soc
            )

    @classmethod
    def _normalize_security_report(cls, report: Any) -> Dict[str, Any]:
        """
        SecurityReport:
        status: 'COMPLETED'
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        threat_level: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        risk_score: 0-100
        """
        target = report.target
        assessment_id = report.report_id
        status_val = str(getattr(report, 'status', 'COMPLETED')).upper()
        severity = str(getattr(report, 'severity', 'LOW')).upper()
        threat_level = str(getattr(report, 'threat_level', 'LOW')).upper()
        risk_score = getattr(report, 'risk_score', 0)

        if status_val not in ('COMPLETED', 'PARTIAL'):
            return cls._make_result(
                assessment_type="SECURITY_REPORT",
                assessment_name="Comprehensive Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="INCOMPLETE",
                risk_level="UNKNOWN",
                risk_score=risk_score,
                is_eligible=False,
                is_completed=False,
                reason=f"Security report is not completed (Status: {status_val}).",
                entity=report
            )

        # In SecurityReport:
        # If severity == 'LOW' and threat_level == 'LOW' and risk_score <= 20
        # or if report structured data findings are empty/clean
        structured = getattr(report, 'structured_data', {}) or {}
        findings = structured.get('findings', []) or []
        has_high_findings = any(f.get('severity') in ('HIGH', 'CRITICAL') for f in findings if isinstance(f, dict))

        if severity == 'LOW' and threat_level == 'LOW' and risk_score <= 20 and not has_high_findings:
            return cls._make_result(
                assessment_type="SECURITY_REPORT",
                assessment_name="Comprehensive Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="SAFE",
                risk_level="NO_RISK",
                risk_score=risk_score,
                is_eligible=True,
                is_completed=True,
                reason="Assessment report verified clean perimeter and zero high-risk findings.",
                entity=report
            )
        elif severity in ('HIGH', 'CRITICAL') or threat_level in ('HIGH', 'CRITICAL') or risk_score >= 50:
            return cls._make_result(
                assessment_type="SECURITY_REPORT",
                assessment_name="Comprehensive Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="HIGH_RISK",
                risk_level="HIGH",
                risk_score=risk_score,
                is_eligible=False,
                is_completed=True,
                reason="Security report contains high-risk vulnerabilities and is not eligible for certification.",
                entity=report
            )
        else:
            return cls._make_result(
                assessment_type="SECURITY_REPORT",
                assessment_name="Comprehensive Security Assessment",
                assessment_id=assessment_id,
                target=target,
                normalized_result="LOW_RISK",
                risk_level="MEDIUM",
                risk_score=risk_score,
                is_eligible=False,
                is_completed=True,
                reason="Security report detected moderate findings requiring remediation.",
                entity=report
            )

    @classmethod
    def _make_result(
        cls,
        assessment_type: str,
        assessment_name: str,
        assessment_id: str,
        target: str,
        normalized_result: str,
        risk_level: str,
        risk_score: int,
        is_eligible: bool,
        is_completed: bool,
        reason: str,
        entity: Any
    ) -> Dict[str, Any]:
        return {
            "assessment_type": assessment_type,
            "assessment_name": assessment_name,
            "assessment_id": assessment_id,
            "target": target,
            "normalized_result": normalized_result,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "is_eligible": is_eligible,
            "is_completed": is_completed,
            "reason": reason,
            "entity": entity,
        }
