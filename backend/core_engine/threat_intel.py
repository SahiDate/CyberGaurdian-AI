import time
import random

# Mock functions for Threat Intelligence to avoid requiring API keys immediately.

def check_virustotal(target):
    """Mock VirusTotal Analysis"""
    time.sleep(1) # Simulate API latency
    is_malicious = random.choice([True, False, False, False]) # 25% chance malicious for testing
    if is_malicious:
        return {
            "source": "VirusTotal",
            "positives": random.randint(1, 15),
            "total": 90,
            "status": "Malicious",
            "details": "Flagged by multiple security vendors as phishing or malware."
        }
    return {
        "source": "VirusTotal",
        "positives": 0,
        "total": 90,
        "status": "Clean",
        "details": "No security vendors flagged this target."
    }

def check_abuseipdb(ip_address):
    """Mock AbuseIPDB Analysis for IPs"""
    time.sleep(0.5)
    score = random.randint(0, 100)
    return {
        "source": "AbuseIPDB",
        "abuse_confidence_score": score,
        "status": "Suspicious" if score > 50 else "Clean"
    }
