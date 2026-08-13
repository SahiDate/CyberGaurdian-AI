import datetime
from django.utils import timezone
from typing import Dict, Any, Optional

from scanner.models import ThreatIntelResult
from scanner.validators import validate_target_format, ValidationError
from users.models import AdminAuditLog
from .virustotal import VirusTotalProvider
from .abuseipdb import AbuseIPDBProvider
from .urlscan import URLScanProvider
from .scoring import calculate_threat_score_and_severity


class ThreatIntelligenceService:
    """
    Production Threat Intelligence Service.
    Orchestrates target validation, provider query adapters, evidence correlation,
    deterministic threat scoring, user-owned DB persistence, and caching.
    """

    CACHE_WINDOW_MINUTES = 60

    def __init__(self, providers=None):
        if providers is None:
            self.providers = [
                VirusTotalProvider(),
                AbuseIPDBProvider(),
                URLScanProvider(),
            ]
        else:
            self.providers = providers

    def execute_scan(self, target: str, target_type: Optional[str], user: Any, bypass_cache: bool = False) -> ThreatIntelResult:
        """
        Execute full Threat Intelligence scan workflow for given target and user.
        
        Steps:
        1. Validate target format.
        2. Check for fresh cached ThreatIntelResult for user & target (within 60 mins).
        3. Query threat intelligence providers.
        4. Correlate findings & calculate threat score + severity.
        5. Persist user-owned ThreatIntelResult in database.
        6. Log security audit record.
        """
        # 1. Target Format Validation
        validated = validate_target_format(target, target_type)
        norm_target = validated["target"]
        final_target_type = validated["target_type"]

        # 2. Cache Lookup (User level or Global freshness)
        if not bypass_cache:
            cutoff = timezone.now() - datetime.timedelta(minutes=self.CACHE_WINDOW_MINUTES)
            cached_result = ThreatIntelResult.objects.filter(
                user=user,
                target=norm_target,
                target_type=final_target_type,
                detected_at__gte=cutoff,
                status__in=['SUCCESS', 'PARTIAL_SUCCESS']
            ).order_by('-detected_at').first()

            if cached_result:
                return cached_result

        # 3. Query Providers
        provider_responses = []
        for provider in self.providers:
            try:
                res = provider.scan(norm_target, final_target_type)
                provider_responses.append(res)
            except Exception as e:
                provider_responses.append({
                    "provider": getattr(provider, "name", "UnknownProvider"),
                    "status": "ERROR",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": f"Unhandled provider exception: {str(e)}"
                })

        # 4. Evidence Correlation & Threat Scoring
        threat_score, severity, confidence, evidence_summary = calculate_threat_score_and_severity(provider_responses)

        # Aggregate overall status
        statuses = [r.get("status") for r in provider_responses]
        if all(s == "SUCCESS" for s in statuses):
            overall_status = "SUCCESS"
        elif any(s == "SUCCESS" for s in statuses):
            overall_status = "PARTIAL_SUCCESS"
        elif any(s == "RATE_LIMITED" for s in statuses):
            overall_status = "RATE_LIMITED"
        elif any(s == "UNAUTHORIZED" for s in statuses):
            overall_status = "UNAUTHORIZED"
        else:
            overall_status = "ERROR"

        # Determine primary provider string
        active_provider_names = [r.get("provider") for r in provider_responses if r.get("status") == "SUCCESS"]
        provider_str = ", ".join(active_provider_names) if active_provider_names else "Multi-Provider"

        # Construct normalized result dictionary
        normalized_payload = {
            "target": norm_target,
            "target_type": final_target_type,
            "provider": provider_str,
            "status": overall_status,
            "threat_score": threat_score,
            "severity": severity,
            "confidence": confidence,
            "malicious": evidence_summary["total_malicious"],
            "suspicious": evidence_summary["total_suspicious"],
            "harmless": evidence_summary["total_harmless"],
            "undetected": evidence_summary["total_undetected"],
            "provider_breakdown": provider_responses,
            "evidence_summary": evidence_summary,
            "timestamp": timezone.now().isoformat()
        }

        # 5. Persist DB Record (Strict user ownership)
        result_record = ThreatIntelResult.objects.create(
            user=user,
            target=norm_target,
            target_type=final_target_type,
            provider=provider_str,
            query_type="REPUTATION",
            threat_score=threat_score,
            severity=severity,
            confidence=confidence,
            malicious_count=evidence_summary["total_malicious"],
            suspicious_count=evidence_summary["total_suspicious"],
            harmless_count=evidence_summary["total_harmless"],
            undetected_count=evidence_summary["total_undetected"],
            detection_summary=evidence_summary,
            normalized_result=normalized_payload,
            status=overall_status,
            threat_type="THREAT_INTEL",
            indicator_count=evidence_summary["total_malicious"] + evidence_summary["total_suspicious"],
            raw_data={"provider_responses": provider_responses}
        )

        return result_record
