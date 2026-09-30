import os
import requests
from typing import Dict, Any
from .base import BaseThreatProvider


class PhishTankProvider(BaseThreatProvider):
    """
    PhishTank Threat Intelligence Provider.
    Queries PhishTank API (https://checkurl.phishtank.com/checkurl/) to verify
    whether URLs, IP addresses, or domain names are cataloged as active phishing infrastructure.
    """
    name = "PhishTank"
    API_ENDPOINT = "https://checkurl.phishtank.com/checkurl/"

    def __init__(self, api_key: str = None):
        self.api_key = api_key if api_key is not None else os.environ.get("PHISHTANK_API_KEY", "").strip()

    def _format_target_url(self, target: str, target_type: str) -> str:
        """
        Normalize target into a URL format required by the PhishTank checkurl API.
        PhishTank expects a full URL (including scheme) for verification.
        """
        target_str = str(target).strip()
        t_type = target_type.upper()

        if t_type == "URL":
            if not target_str.startswith(('http://', 'https://')):
                return f"https://{target_str}"
            return target_str
        elif t_type in ("DOMAIN", "IP"):
            if target_str.startswith(('http://', 'https://')):
                return target_str
            return f"http://{target_str}"
        return target_str

    def scan(self, target: str, target_type: str) -> Dict[str, Any]:
        """
        Query PhishTank checkurl API for URL, DOMAIN, or IP address targets.
        Conforms strictly to the BaseThreatProvider normalized dictionary schema.
        """
        target_type_upper = target_type.upper()

        if target_type_upper not in ("URL", "DOMAIN", "IP"):
            return {
                "provider": self.name,
                "status": "NOT_APPLICABLE",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": f"PhishTank scanner supports URL, DOMAIN, and IP targets. Provided target type is '{target_type}'."
            }

        url_to_check = self._format_target_url(target, target_type)

        payload = {
            "format": "json",
            "url": url_to_check
        }
        if self.api_key:
            payload["app_key"] = self.api_key

        headers = {
            "User-Agent": "phishtank/CyberGuardian-AI",
            "Accept": "application/json"
        }

        try:
            response = requests.post(self.API_ENDPOINT, data=payload, headers=headers, timeout=10)

            if response.status_code == 200:
                try:
                    data = response.json()
                except Exception as json_err:
                    return {
                        "provider": self.name,
                        "status": "ERROR",
                        "malicious": 0,
                        "suspicious": 0,
                        "harmless": 0,
                        "undetected": 0,
                        "raw_summary": {},
                        "error_message": f"Failed to parse PhishTank JSON response: {str(json_err)}"
                    }

                # Check for explicit error message from PhishTank
                if "errortext" in data:
                    return {
                        "provider": self.name,
                        "status": "ERROR",
                        "malicious": 0,
                        "suspicious": 0,
                        "harmless": 0,
                        "undetected": 0,
                        "raw_summary": {"errortext": data.get("errortext")},
                        "error_message": data.get("errortext")
                    }

                results = data.get("results", {})
                in_database = bool(results.get("in_database", False))
                verified = bool(results.get("verified", False))
                valid = bool(results.get("valid", False))
                phish_id = results.get("phish_id")
                phish_detail_page = results.get("phish_detail_page")
                verified_at = results.get("verified_at")
                submitted_at = results.get("submitted_at")

                if in_database and verified:
                    malicious = 1
                    suspicious = 0
                    harmless = 0
                    undetected = 0
                elif in_database and not verified:
                    malicious = 0
                    suspicious = 1
                    harmless = 0
                    undetected = 0
                else:
                    malicious = 0
                    suspicious = 0
                    harmless = 1
                    undetected = 0

                return {
                    "provider": self.name,
                    "status": "SUCCESS",
                    "malicious": malicious,
                    "suspicious": suspicious,
                    "harmless": harmless,
                    "undetected": undetected,
                    "raw_summary": {
                        "in_database": in_database,
                        "verified": verified,
                        "valid": valid,
                        "phish_id": phish_id,
                        "phish_detail_page": phish_detail_page,
                        "verified_at": verified_at,
                        "submitted_at": submitted_at,
                        "checked_url": url_to_check,
                    },
                    "error_message": None
                }

            elif response.status_code in (429, 509):
                return {
                    "provider": self.name,
                    "status": "RATE_LIMITED",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "raw_summary": {},
                    "error_message": "PhishTank API rate limit reached. Consider configuring PHISHTANK_API_KEY."
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
                    "error_message": "Invalid PhishTank API key or access forbidden."
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
                    "error_message": f"PhishTank returned HTTP status {response.status_code}"
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
                "error_message": "Connection to PhishTank API timed out."
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
                "error_message": f"PhishTank request failure: {str(e)}"
            }
