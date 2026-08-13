import os
import requests
from typing import Dict, Any
from .base import BaseThreatProvider


class AbuseIPDBProvider(BaseThreatProvider):
    name = "AbuseIPDB"
    BASE_URL = "https://api.abuseipdb.com/api/v2/check"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("ABUSEIPDB_API_KEY", "").strip()

    def scan(self, target: str, target_type: str) -> Dict[str, Any]:
        """
        Query AbuseIPDB API v2 for IP reputation.
        Returns NOT_APPLICABLE if target_type is not IP.
        """
        if target_type.upper() != "IP":
            return {
                "provider": self.name,
                "status": "NOT_APPLICABLE",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": f"AbuseIPDB is an IP-only reputation service. Target type is '{target_type}'."
            }

        if not self.api_key:
            return {
                "provider": self.name,
                "status": "UNAUTHORIZED",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": "ABUSEIPDB_API_KEY is not configured in backend environment variables."
            }

        headers = {
            "Key": self.api_key,
            "Accept": "application/json"
        }

        params = {
            "ipAddress": target,
            "maxAgeInDays": 90,
            "verbose": True
        }

        try:
            response = requests.get(self.BASE_URL, headers=headers, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json().get("data", {})
                score = data.get("abuseConfidenceScore", 0)
                reports = data.get("totalReports", 0)
                country = data.get("countryCode", "Unknown")
                isp = data.get("isp", "Unknown")
                domain = data.get("domain", "")
                last_reported = data.get("lastReportedAt", None)

                # Map confidence score to indicators
                if score >= 50:
                    malicious = 1
                    suspicious = 0
                    harmless = 0
                elif score >= 20:
                    malicious = 0
                    suspicious = 1
                    harmless = 0
                else:
                    malicious = 0
                    suspicious = 0
                    harmless = 1

                return {
                    "provider": self.name,
                    "status": "SUCCESS",
                    "malicious": malicious,
                    "suspicious": suspicious,
                    "harmless": harmless,
                    "undetected": 0,
                    "raw_summary": {
                        "abuseConfidenceScore": score,
                        "totalReports": reports,
                        "countryCode": country,
                        "isp": isp,
                        "domain": domain,
                        "lastReportedAt": last_reported,
                        "isWhitelisted": data.get("isWhitelisted", False),
                    },
                    "error_message": None
                }
            elif response.status_code == 429:
                return {
                    "provider": self.name,
                    "status": "RATE_LIMITED",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": "AbuseIPDB API rate limit reached."
                }
            elif response.status_code in (401, 403):
                return {
                    "provider": self.name,
                    "status": "UNAUTHORIZED",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": "Invalid AbuseIPDB API key."
                }
            elif response.status_code == 422:
                return {
                    "provider": self.name,
                    "status": "NOT_FOUND",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": "Invalid or unroutable IP address provided to AbuseIPDB."
                }
            else:
                return {
                    "provider": self.name,
                    "status": "ERROR",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": f"AbuseIPDB returned HTTP status {response.status_code}"
                }

        except requests.exceptions.Timeout:
            return {
                "provider": self.name,
                "status": "TIMEOUT",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": "Connection to AbuseIPDB API timed out."
            }
        except requests.exceptions.RequestException as e:
            return {
                "provider": self.name,
                "status": "ERROR",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": f"AbuseIPDB request failure: {str(e)}"
            }
