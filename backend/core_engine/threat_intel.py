import random

# Mock functions for Threat Intelligence to avoid requiring API keys immediately.

def check_virustotal(target):
    """Fast VirusTotal Threat Intelligence Evaluator"""
    # Deterministic or randomized evaluation without artificial sleeping
    target_clean = str(target).lower()
    is_suspicious = any(kw in target_clean for kw in ['phish', 'malware', 'hack', 'evil', 'attack', 'trojan', 'exploit'])
    if is_suspicious:
        return {
            "source": "VirusTotal",
            "positives": 12,
            "total": 90,
            "status": "Malicious",
            "details": "Flagged by multiple security vendors as phishing or malicious indicator."
        }
    return {
        "source": "VirusTotal",
        "positives": 0,
        "total": 90,
        "status": "Clean",
        "details": "No security vendors flagged this target."
    }

def check_abuseipdb(ip_address):
    """Fast AbuseIPDB Analysis for IPs"""
    ip_str = str(ip_address)
    # Check if private IP
    if ip_str.startswith(('127.', '10.', '192.168.', '172.16.')):
        return {
            "source": "AbuseIPDB",
            "abuse_confidence_score": 0,
            "status": "Internal / Clean"
        }
    return {
        "source": "AbuseIPDB",
        "abuse_confidence_score": 0,
        "status": "Clean"
    }
