from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseThreatProvider(ABC):
    """
    Abstract base class for all threat intelligence provider adapters.
    Ensures a standardized response contract across VirusTotal, AbuseIPDB, urlscan.io, etc.
    """
    name: str = "BaseProvider"

    @abstractmethod
    def scan(self, target: str, target_type: str) -> Dict[str, Any]:
        """
        Perform threat intelligence query for given target and target_type.

        Returns normalized dictionary:
        {
            "provider": "VirusTotal",
            "status": "SUCCESS" | "RATE_LIMITED" | "UNAUTHORIZED" | "NOT_FOUND" | "TIMEOUT" | "ERROR" | "NOT_APPLICABLE",
            "malicious": int,
            "suspicious": int,
            "harmless": int,
            "undetected": int,
            "raw_summary": dict,
            "error_message": str or None
        }
        """
        pass
