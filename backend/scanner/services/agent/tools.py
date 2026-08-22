"""
Controlled Security Tool Registry for CyberGuardian AI Agent.
Exposes strictly approved, defensive security inspection tools.
Zero arbitrary command execution or system access.
"""
from typing import Dict, Any, Callable, List, Optional
from datetime import datetime
from django.utils import timezone
from django.db.models import Q

from scanner.models import (
    ThreatIntelResult, FileAnalysis, SSLScanResult, WhoisLookupResult,
    URLScanResult, PortScanResult, ScanResult
)
from scanner.services.threat_intel.service import ThreatIntelligenceService
from scanner.services.ssl_scanner.service import SSLScannerService
from scanner.services.whois_service.service import WhoisService
from scanner.services.url_scanner.service import URLScannerService
from scanner.services.port_scanner.service import PortScannerService
from scanner.services.soc_engine.engine import SOCAnalysisEngine, extract_target_identifiers


class ToolExecutionResult:
    def __init__(self, status: str, evidence: Dict[str, Any], record_id: Optional[int] = None, error: Optional[str] = None):
        self.status = status
        self.evidence = evidence
        self.record_id = record_id
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "record_id": self.record_id,
            "evidence": self.evidence,
            "error": self.error
        }


# ──────────────────────────────────────────────────────────────────────────────
# Tool Implementations
# ──────────────────────────────────────────────────────────────────────────────

def execute_threat_intelligence(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Executes Threat Intelligence analysis for given target."""
    try:
        service = ThreatIntelligenceService()
        record = service.execute_scan(target=target, target_type=None, user=user)
        return ToolExecutionResult(
            status=record.status or "SUCCESS",
            record_id=record.id,
            evidence={
                "source": "THREAT_INTELLIGENCE",
                "target": record.target,
                "threat_score": record.threat_score,
                "severity": record.severity,
                "summary": f"Threat score: {record.threat_score}/100 ({record.severity})"
            }
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_file_analyzer(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Looks up user-authorized file analysis record by hash or filename."""
    try:
        cleaned = target.strip()
        record = FileAnalysis.objects.filter(
            Q(user=user) & (Q(sha256__iexact=cleaned) | Q(file_name__icontains=cleaned) | Q(md5__iexact=cleaned))
        ).first()

        if record:
            return ToolExecutionResult(
                status=record.status or "SUCCESS",
                record_id=record.id,
                evidence={
                    "source": "FILE_ANALYZER",
                    "file_name": record.file_name,
                    "sha256": record.sha256,
                    "file_type": record.detected_file_type,
                    "threat_score": record.threat_score,
                    "severity": record.severity,
                    "summary": f"File '{record.file_name}' threat score: {record.threat_score}/100 ({record.severity})"
                }
            )
        return ToolExecutionResult(
            status="NOT_FOUND",
            evidence={"source": "FILE_ANALYZER", "message": f"No existing file analysis record found for '{target}'."},
            error=None
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_ssl_scanner(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Performs defensive SSL/TLS configuration and certificate inspection."""
    try:
        service = SSLScannerService(timeout=10)
        out = service.scan_target(target)

        # Parse cert dates
        not_before_dt = None
        not_after_dt = None
        if out.get("not_before"):
            try:
                not_before_dt = datetime.fromisoformat(out["not_before"].replace('Z', '+00:00'))
            except Exception:
                pass
        if out.get("not_after"):
            try:
                not_after_dt = datetime.fromisoformat(out["not_after"].replace('Z', '+00:00'))
            except Exception:
                pass

        record = SSLScanResult.objects.create(
            user=user,
            target=out.get("target", target),
            domain=out.get("domain", target),
            port=out.get("port", 443),
            subject_common_name=out.get("subject_common_name", "N/A"),
            subject_alternative_names=out.get("subject_alternative_names", []),
            issuer_organization=out.get("issuer_organization", "N/A"),
            issuer_common_name=out.get("issuer_common_name", "N/A"),
            not_before=not_before_dt,
            not_after=not_after_dt,
            days_until_expiration=out.get("days_until_expiration"),
            cert_status=out.get("cert_status", "UNAVAILABLE"),
            tls_version=out.get("tls_version", "UNKNOWN"),
            cipher_suite=out.get("cipher_suite", "UNKNOWN"),
            cipher_bits=out.get("cipher_bits", 0),
            chain_status=out.get("chain_status", "UNKNOWN"),
            issues=out.get("issues", []),
            threat_score=out.get("threat_score", 0),
            severity=out.get("severity", "LOW"),
            confidence=out.get("confidence", 80),
            status=out.get("status", "SUCCESS"),
            error_message=out.get("error_message"),
            structured_evidence=out.get("structured_evidence", {})
        )

        return ToolExecutionResult(
            status=record.status or "SUCCESS",
            record_id=record.id,
            evidence={
                "source": "SSL_SCANNER",
                "domain": record.domain,
                "cert_status": record.cert_status,
                "tls_version": record.tls_version,
                "threat_score": record.threat_score,
                "severity": record.severity,
                "summary": f"SSL status: {record.cert_status}, TLS: {record.tls_version}, Risk: {record.threat_score}/100"
            }
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_whois_lookup(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Performs defensive WHOIS / RDAP domain metadata inspection."""
    try:
        service = WhoisService(timeout=10)
        out = service.lookup_domain(target)

        created_dt = None
        updated_dt = None
        expires_dt = None
        if out.get("created_date"):
            try:
                created_dt = datetime.fromisoformat(out["created_date"].replace('Z', '+00:00'))
            except Exception:
                pass
        if out.get("updated_date"):
            try:
                updated_dt = datetime.fromisoformat(out["updated_date"].replace('Z', '+00:00'))
            except Exception:
                pass
        if out.get("expires_date"):
            try:
                expires_dt = datetime.fromisoformat(out["expires_date"].replace('Z', '+00:00'))
            except Exception:
                pass

        record = WhoisLookupResult.objects.create(
            user=user,
            domain=out.get("domain", target),
            registrar=out.get("registrar", "NOT_AVAILABLE"),
            registry_domain_id=out.get("registry_domain_id", "NOT_AVAILABLE"),
            created_date=created_dt,
            updated_date=updated_dt,
            expires_date=expires_dt,
            domain_age_days=out.get("domain_age_days"),
            days_until_expiration=out.get("days_until_expiration"),
            age_category=out.get("age_category", "UNKNOWN"),
            expiration_category=out.get("expiration_category", "UNKNOWN"),
            nameservers=out.get("nameservers", []),
            domain_status=out.get("domain_status", []),
            registrant_org=out.get("registrant_org", "NOT_AVAILABLE"),
            registrant_country=out.get("registrant_country", "NOT_AVAILABLE"),
            dnssec=out.get("dnssec", "UNSIGNED"),
            security_indicators=out.get("security_indicators", []),
            threat_score=out.get("threat_score", 0),
            severity=out.get("severity", "LOW"),
            confidence=out.get("confidence", 85),
            status=out.get("status", "SUCCESS"),
            error_message=out.get("error_message"),
            structured_evidence=out.get("structured_evidence", {})
        )

        return ToolExecutionResult(
            status=record.status or "SUCCESS",
            record_id=record.id,
            evidence={
                "source": "WHOIS",
                "domain": record.domain,
                "registrar": record.registrar,
                "age_category": record.age_category,
                "domain_age_days": record.domain_age_days,
                "threat_score": record.threat_score,
                "severity": record.severity,
                "summary": f"WHOIS: {record.domain}, Age: {record.domain_age_days or 0} days ({record.age_category}), Registrar: {record.registrar}"
            }
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_url_scanner(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Performs defensive URL structure, redirect, and header inspection."""
    try:
        service = URLScannerService(timeout=10)
        out = service.scan_url(target)

        record = URLScanResult.objects.create(
            user=user,
            original_url=out.get("original_url", target),
            normalized_url=out.get("normalized_url", target),
            final_url=out.get("final_url", ""),
            hostname=out.get("hostname", target),
            domain=out.get("domain", target),
            scheme=out.get("scheme", "https"),
            port=out.get("port", 443),
            primary_ip=out.get("primary_ip", ""),
            http_status=out.get("http_status"),
            content_type=out.get("content_type", ""),
            server=out.get("server", ""),
            redirect_count=out.get("redirect_count", 0),
            redirect_chain=out.get("redirect_chain", []),
            ssl_result=out.get("ssl_result", {}),
            whois_result=out.get("whois_result", {}),
            threat_intel_result=out.get("threat_intel_result", {}),
            indicators=out.get("indicators", []),
            recommendations=out.get("recommendations", []),
            threat_score=out.get("threat_score", 0),
            severity=out.get("severity", "LOW"),
            confidence=out.get("confidence", 80),
            status=out.get("status", "SUCCESS"),
            error_message=out.get("error_message"),
            structured_evidence=out.get("structured_evidence", {})
        )

        return ToolExecutionResult(
            status=record.status or "SUCCESS",
            record_id=record.id,
            evidence={
                "source": "URL_SCANNER",
                "url": record.normalized_url,
                "http_status": record.http_status,
                "threat_score": record.threat_score,
                "severity": record.severity,
                "summary": f"URL scan: {record.normalized_url}, HTTP {record.http_status}, Threat score: {record.threat_score}/100"
            }
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_port_scanner(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Performs defensive port scanner inspection against common service ports."""
    try:
        profile = params.get("scan_profile", "COMMON")
        service = PortScannerService(timeout=3)
        out = service.scan_target(target=target, profile=profile)

        record = PortScanResult.objects.create(
            user=user,
            target=out.get("target", target),
            target_type=out.get("target_type", "HOSTNAME"),
            resolved_ips=out.get("resolved_ips", []),
            primary_ip=out.get("primary_ip", ""),
            scan_profile=out.get("scan_profile", profile),
            requested_ports=out.get("requested_ports", []),
            results=out.get("results", []),
            open_ports=out.get("open_ports", []),
            closed_ports=out.get("closed_ports", []),
            filtered_ports=out.get("filtered_ports", []),
            indicators=out.get("indicators", []),
            recommendations=out.get("recommendations", []),
            threat_score=out.get("threat_score", 0),
            severity=out.get("severity", "LOW"),
            confidence=out.get("confidence", 85),
            status=out.get("status", "SUCCESS"),
            error_message=out.get("error_message"),
            structured_evidence=out.get("structured_evidence", {}),
            scan_duration=out.get("scan_duration", 0.0)
        )

        return ToolExecutionResult(
            status=record.status or "SUCCESS",
            record_id=record.id,
            evidence={
                "source": "PORT_SCANNER",
                "target": record.target,
                "open_ports": record.open_ports,
                "threat_score": record.threat_score,
                "severity": record.severity,
                "summary": f"Port scan: {len(record.open_ports)} open ports found ({', '.join([str(p.get('port')) for p in record.open_ports[:4]])})"
            }
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_soc_analysis(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Executes deterministic multi-module SOC engine correlation for the user."""
    try:
        engine = SOCAnalysisEngine()
        identifiers = extract_target_identifiers(target)
        target_domain = identifiers.get('domain', '')
        target_hostname = identifiers.get('hostname', '')
        target_ip = identifiers.get('ip', '')
        target_hash = identifiers.get('file_hash', '')

        # Auto-match user's most recent scan records
        threat_intel = ThreatIntelResult.objects.filter(
            Q(user=user) & (Q(target__icontains=target_domain) | Q(target__icontains=target_hostname) | Q(target__iexact=target_ip) | Q(target__iexact=target_hash))
        ).order_by('-detected_at').first() if (target_domain or target_hostname or target_ip or target_hash) else None

        file_analysis = FileAnalysis.objects.filter(
            user=user, sha256__iexact=target_hash
        ).order_by('-created_at').first() if target_hash else None

        ssl_scan = SSLScanResult.objects.filter(
            Q(user=user) & (Q(domain__iexact=target_domain) | Q(target__icontains=target_hostname))
        ).order_by('-created_at').first() if (target_domain or target_hostname) else None

        whois_lookup = WhoisLookupResult.objects.filter(
            user=user, domain__iexact=target_domain
        ).order_by('-created_at').first() if target_domain else None

        url_scan = URLScanResult.objects.filter(
            Q(user=user) & (Q(domain__iexact=target_domain) | Q(hostname__iexact=target_hostname) | Q(normalized_url__icontains=target))
        ).order_by('-created_at').first() if (target_domain or target_hostname) else None

        port_scan = PortScanResult.objects.filter(
            Q(user=user) & (Q(target__iexact=target) | Q(target__iexact=target_hostname) | Q(target__iexact=target_ip))
        ).order_by('-created_at').first() if (target or target_hostname or target_ip) else None

        analysis_dict = engine.analyze_evidence(
            target=target,
            threat_intel=threat_intel,
            file_analysis=file_analysis,
            ssl_scan=ssl_scan,
            whois_lookup=whois_lookup,
            url_scan=url_scan,
            port_scan=port_scan
        )

        return ToolExecutionResult(
            status="SUCCESS",
            evidence=analysis_dict,
            record_id=None
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


def execute_get_scan_result(target: str, user: Any, params: Dict[str, Any]) -> ToolExecutionResult:
    """Retrieves user's existing website scan records for target."""
    try:
        scan = ScanResult.objects.filter(
            Q(user=user) & (Q(domain__icontains=target) | Q(url__icontains=target))
        ).order_by('-scanned_at').first()

        if scan:
            return ToolExecutionResult(
                status="SUCCESS",
                record_id=scan.id,
                evidence={
                    "source": "WEBSITE_SCANNER",
                    "domain": scan.domain,
                    "security_score": scan.security_score,
                    "risk_level": scan.risk_level,
                    "summary": f"Previous scan for {scan.domain}: score {scan.security_score}/100 ({scan.risk_level})"
                }
            )
        return ToolExecutionResult(
            status="NOT_FOUND",
            evidence={"source": "WEBSITE_SCANNER", "message": f"No previous website scan found for '{target}'."}
        )
    except Exception as e:
        return ToolExecutionResult(status="ERROR", evidence={}, error=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# Controlled Tool Registry Mapping
# ──────────────────────────────────────────────────────────────────────────────

TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "threat_intelligence": {
        "name": "threat_intelligence",
        "description": "Checks domain, IP, URL, or file hash reputation in threat intelligence feeds (VirusTotal, AbuseIPDB, URLScan).",
        "executor": execute_threat_intelligence,
        "timeout": 15,
        "input_schema": {"target": "string"}
    },
    "file_analyzer": {
        "name": "file_analyzer",
        "description": "Inspects file hash characteristics, YARA signature matches, and static properties.",
        "executor": execute_file_analyzer,
        "timeout": 10,
        "input_schema": {"target": "string (sha256 hash or filename)"}
    },
    "ssl_scanner": {
        "name": "ssl_scanner",
        "description": "Inspects SSL/TLS certificate validity, expiry, issuer chain, cipher suites, and protocol version.",
        "executor": execute_ssl_scanner,
        "timeout": 12,
        "input_schema": {"target": "string (domain or URL)"}
    },
    "whois_lookup": {
        "name": "whois_lookup",
        "description": "Retrieves domain registration age, registrar, expiration, DNSSEC, and ownership metadata.",
        "executor": execute_whois_lookup,
        "timeout": 12,
        "input_schema": {"target": "string (domain)"}
    },
    "url_scanner": {
        "name": "url_scanner",
        "description": "Inspects HTTP response headers, redirect chains, content structure, and security indicators.",
        "executor": execute_url_scanner,
        "timeout": 12,
        "input_schema": {"target": "string (URL)"}
    },
    "port_scanner": {
        "name": "port_scanner",
        "description": "Scans common network ports on the target host to discover exposed service attack surfaces.",
        "executor": execute_port_scanner,
        "timeout": 15,
        "input_schema": {"target": "string (hostname or IP)", "scan_profile": "COMMON"}
    },
    "soc_analysis": {
        "name": "soc_analysis",
        "description": "Recalculates multi-module telemetry through the deterministic Phase 8 SOC Analysis Engine.",
        "executor": execute_soc_analysis,
        "timeout": 10,
        "input_schema": {"target": "string"}
    },
    "get_scan_result": {
        "name": "get_scan_result",
        "description": "Retrieves existing historical scan records for the target from the database.",
        "executor": execute_get_scan_result,
        "timeout": 5,
        "input_schema": {"target": "string"}
    }
}


def get_available_tools_for_target(target: str) -> List[str]:
    """Returns list of applicable tools based on target type."""
    identifiers = extract_target_identifiers(target)
    target_type = identifiers.get("target_type", "DOMAIN")

    if target_type == "FILE":
        return ["file_analyzer", "threat_intelligence", "soc_analysis", "get_scan_result"]
    elif target_type == "IP":
        return ["threat_intelligence", "port_scanner", "soc_analysis", "get_scan_result"]
    else:  # DOMAIN or URL
        return [
            "threat_intelligence",
            "ssl_scanner",
            "whois_lookup",
            "url_scanner",
            "port_scanner",
            "soc_analysis",
            "get_scan_result"
        ]
