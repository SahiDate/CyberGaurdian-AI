import os
import requests
from typing import Dict, Any
from .base import BaseThreatProvider


class URLScanProvider(BaseThreatProvider):
    name = "urlscan.io"
    SEARCH_URL = "https://urlscan.io/api/v1/search/"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("URLSCAN_API_KEY", "").strip()

    def scan(self, target: str, target_type: str) -> Dict[str, Any]:
        """
        Query urlscan.io Search API for URL or DOMAIN target types.
        """
        target_type_upper = target_type.upper()
        if target_type_upper not in ("URL", "DOMAIN"):
            return {
                "provider": self.name,
                "status": "NOT_APPLICABLE",
                "malicious": 0,
                "suspicious": 0,
                "harmless": 0,
                "undetected": 0,
                "raw_summary": {},
                "error_message": f"urlscan.io search is configured for URL and DOMAIN targets. Target type is '{target_type}'."
            }

        headers = {
            "Accept": "application/json"
        }
        if self.api_key:
            headers["API-Key"] = self.api_key

        if target_type_upper == "DOMAIN":
            query = f"domain:{target}"
        else:
            query = f'page.url:"{target}"'

        params = {
            "q": query,
            "size": 5
        }

        try:
            response = requests.get(self.SEARCH_URL, headers=headers, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])

                if not results:
                    return {
                        "provider": self.name,
                        "status": "NOT_FOUND",
                        "malicious": 0,
                        "suspicious": 0,
                        "harmless": 0,
                        "undetected": 0,
                        "raw_summary": {"total": 0, "scans": []},
                        "error_message": "No scan history found on urlscan.io for this target."
                    }

                malicious_count = 0
                suspicious_count = 0
                harmless_count = 0
                contacted_ips = set()
                contacted_domains = set()
                latest_screenshot = None

                for r in results:
                    page = r.get("page", {})
                    stats = r.get("stats", {})
                    verdicts = r.get("verdicts", {}).get("overall", {})

                    if verdicts.get("malicious"):
                        malicious_count += 1
                    elif verdicts.get("score", 0) > 0:
                        suspicious_count += 1
                    else:
                        harmless_count += 1

                    if page.get("ip"):
                        contacted_ips.add(page.get("ip"))
                    if page.get("domain"):
                        contacted_domains.add(page.get("domain"))

                    if not latest_screenshot and r.get("screenshot"):
                        latest_screenshot = r.get("screenshot")

                return {
                    "provider": self.name,
                    "status": "SUCCESS",
                    "malicious": malicious_count,
                    "suspicious": suspicious_count,
                    "harmless": harmless_count,
                    "undetected": 0,
                    "raw_summary": {
                        "total_scans_found": len(results),
                        "contacted_ips": list(contacted_ips)[:5],
                        "contacted_domains": list(contacted_domains)[:5],
                        "latest_screenshot": latest_screenshot,
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
                    "error_message": "urlscan.io API rate limit exceeded."
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
                    "error_message": "Invalid urlscan.io API key."
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
                    "error_message": f"urlscan.io returned HTTP status {response.status_code}"
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
                "error_message": "Connection to urlscan.io API timed out."
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
                "error_message": f"urlscan.io request failure: {str(e)}"
            }
