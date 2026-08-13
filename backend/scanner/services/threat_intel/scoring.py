from typing import List, Dict, Any, Tuple


def calculate_threat_score_and_severity(provider_results: List[Dict[str, Any]]) -> Tuple[int, str, int, Dict[str, Any]]:
    """
    Deterministic threat scoring & evidence correlation engine.

    Algorithm:
    1. Collect evidence signals across all active providers.
       - VirusTotal malicious count: +15 points each (max 80)
       - VirusTotal suspicious count: +5 points each (max 30)
       - AbuseIPDB abuseConfidenceScore: score * 0.8 points (max 80)
       - urlscan.io malicious verdict count: +25 points each (max 50)
       - urlscan.io suspicious verdict count: +10 points each (max 20)

    2. Calculate raw combined score bounded strictly between 0 and 100.

    3. Determine Severity Thresholds:
       - 0 – 24  => LOW
       - 25 – 49 => MEDIUM
       - 50 – 74 => HIGH
       - 75 – 100 => CRITICAL

    4. Calculate Confidence Score (0–100%):
       - Based on number of successful responding providers and consensus.
       - 0 successful providers (unconfigured/failed) => 30% baseline
       - 1 successful provider => 70%
       - 2 successful providers => 85%
       - 3+ successful providers => 95% (if consensus match +5%)

    Returns:
        (threat_score, severity, confidence, evidence_summary)
    """
    total_malicious = 0
    total_suspicious = 0
    total_harmless = 0
    total_undetected = 0

    successful_providers = 0
    calculated_points = 0
    signals = []

    for res in provider_results:
        status = res.get("status")
        provider_name = res.get("provider")

        if status == "SUCCESS":
            successful_providers += 1
            m = res.get("malicious", 0)
            s = res.get("suspicious", 0)
            h = res.get("harmless", 0)
            u = res.get("undetected", 0)

            total_malicious += m
            total_suspicious += s
            total_harmless += h
            total_undetected += u

            if provider_name == "VirusTotal":
                vt_pts = min(80, (m * 15) + (s * 5))
                calculated_points = max(calculated_points, vt_pts)
                if m > 0 or s > 0:
                    signals.append(f"VirusTotal: Flagged by {m} engine(s) as malicious and {s} as suspicious.")
                else:
                    signals.append("VirusTotal: No malicious security engine detections.")

            elif provider_name == "AbuseIPDB":
                raw_sum = res.get("raw_summary", {})
                abuse_score = raw_sum.get("abuseConfidenceScore", 0)
                abuse_pts = int(abuse_score * 0.85)
                calculated_points = max(calculated_points, abuse_pts)
                if abuse_score > 0:
                    signals.append(f"AbuseIPDB: Abuse confidence score is {abuse_score}% ({raw_sum.get('totalReports', 0)} report(s)).")
                else:
                    signals.append("AbuseIPDB: No abuse reports logged.")

            elif provider_name == "urlscan.io":
                us_pts = min(60, (m * 25) + (s * 10))
                calculated_points = max(calculated_points, us_pts)
                if m > 0 or s > 0:
                    signals.append(f"urlscan.io: {m} malicious scan verdict(s) and {s} suspicious verdict(s).")
                else:
                    signals.append("urlscan.io: Clean scan history.")
        else:
            signals.append(f"{provider_name}: Provider status '{status}' ({res.get('error_message', 'No details')}).")

    # If overall malicious detections exist across providers, boost score appropriately
    if total_malicious > 0:
        boost = min(20, total_malicious * 5)
        calculated_points = min(100, calculated_points + boost)

    # Final bounded Threat Score (0–100)
    threat_score = max(0, min(100, calculated_points))

    # Severity Threshold Mapping
    if threat_score >= 75:
        severity = "CRITICAL"
    elif threat_score >= 50:
        severity = "HIGH"
    elif threat_score >= 25:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # Confidence calculation
    if successful_providers == 0:
        confidence = 30
    elif successful_providers == 1:
        confidence = 70
    elif successful_providers == 2:
        confidence = 85
    else:
        confidence = 95

    # Bonus confidence if provider signals agree
    if total_malicious > 0 and successful_providers >= 2:
        confidence = min(99, confidence + 4)

    evidence_summary = {
        "signals": signals,
        "total_malicious": total_malicious,
        "total_suspicious": total_suspicious,
        "total_harmless": total_harmless,
        "total_undetected": total_undetected,
        "successful_providers_count": successful_providers,
        "scoring_methodology": "CyberGuardian Multi-Provider Deterministic Scoring Algorithm v1.0"
    }

    return threat_score, severity, confidence, evidence_summary
