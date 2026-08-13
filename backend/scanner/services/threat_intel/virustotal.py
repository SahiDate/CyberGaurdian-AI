import os
import base64
import requests
from typing import Dict, Any
from .base import BaseThreatProvider


class VirusTotalProvider(BaseThreatProvider):
    name = "VirusTotal"
    BASE_URL = "https://www.virustotal.com/api/v3"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("VIRUSTOTAL_API_KEY", "").strip()

    def scan(self, target: str, target_type: str) -> Dict[str, Any]:
        """
        Query VirusTotal API v3 for DOMAIN, URL, IP, or FILE_HASH.
        """
        if not self.api_key:
            return {
                "provider": self.name,
                "status": "UNAUTHORIZED",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": "VIRUSTOTAL_API_KEY is not configured in backend environment variables."
            }

        headers = {
            "x-apikey": self.api_key,
            "Accept": "application/json"
        }

        target_type_upper = target_type.upper()

        try:
            if target_type_upper == "DOMAIN":
                endpoint = f"{self.BASE_URL}/domains/{target}"
            elif target_type_upper == "IP":
                endpoint = f"{self.BASE_URL}/ip_addresses/{target}"
            elif target_type_upper == "FILE_HASH":
                endpoint = f"{self.BASE_URL}/files/{target}"
            elif target_type_upper == "URL":
                url_id = base64.urlsafe_b64encode(target.encode()).decode().strip("=")
                endpoint = f"{self.BASE_URL}/urls/{url_id}"
            else:
                return {
                    "provider": self.name,
                    "status": "NOT_APPLICABLE",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": f"Unsupported target type '{target_type}' for VirusTotal."
                }

            response = requests.get(endpoint, headers=headers, timeout=10)

            if response.status_code == 200:
                data = response.json().get("data", {})
                attributes = data.get("attributes", {})
                stats = attributes.get("last_analysis_stats", {})

                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                harmless = stats.get("harmless", 0)
                undetected = stats.get("undetected", 0)

                categories = attributes.get("categories", {})
                reputation = attributes.get("reputation", 0)

                return {
                    "provider": self.name,
                    "status": "SUCCESS",
                    "malicious": malicious,
                    "suspicious": suspicious,
                    "harmless": harmless,
                    "undetected": undetected,
                    "raw_summary": {
                        "reputation": reputation,
                        "categories": categories,
                        "last_analysis_stats": stats,
                        "tags": attributes.get("tags", [])[:10],
                    },
                    "error_message": None
                }
            elif response.status_code == 404:
                return {
                    "provider": self.name,
                    "status": "NOT_FOUND",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": "Target not found in VirusTotal database."
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
                    "error_message": "VirusTotal API rate limit exceeded."
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
                    "error_message": "Invalid VirusTotal API key."
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
                    "error_message": f"VirusTotal returned HTTP status {response.status_code}"
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
                "error_message": "Connection to VirusTotal API timed out."
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
                "error_message": f"VirusTotal request failure: {str(e)}"
            }
