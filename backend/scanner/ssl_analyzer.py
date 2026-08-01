"""
SSL Certificate Analyzer — Phase 2
Inspects SSL/TLS certificate details for a given domain using Python stdlib.
No external dependencies required beyond the standard library.

FUTURE (Phase 3+): Integrate AI-based SSL vulnerability pattern analysis.
"""

import ssl
import socket
from datetime import datetime, timezone


# Score weight: 25 points maximum from SSL analysis
MAX_SSL_SCORE = 25


def analyze_ssl(domain: str) -> dict:
    """
    Connect to domain:443 and inspect the TLS certificate.

    Returns a structured dict with:
        - valid: bool
        - score: int (0-25)
        - risk_level: str
        - certificate info (issuer, subject, expiry, etc.)
        - recommendations: list[str]
        - error: str (if connection failed)
    """
    result = {
        "valid": False,
        "score": 0,
        "risk_level": "high",
        "issuer": {},
        "subject": {},
        "not_before": None,
        "not_after": None,
        "days_remaining": None,
        "serial_number": None,
        "version": None,
        "san": [],
        "recommendations": [],
        "error": None,
    }

    try:
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                protocol = ssock.version()

        # --- Parse certificate fields ---
        result["valid"] = True
        result["version"] = protocol

        # Subject
        subject = dict(x[0] for x in cert.get('subject', []))
        result["subject"] = {
            "common_name": subject.get('commonName', 'N/A'),
            "organization": subject.get('organizationName', 'N/A'),
            "country": subject.get('countryName', 'N/A'),
        }

        # Issuer
        issuer = dict(x[0] for x in cert.get('issuer', []))
        result["issuer"] = {
            "common_name": issuer.get('commonName', 'N/A'),
            "organization": issuer.get('organizationName', 'N/A'),
            "country": issuer.get('countryName', 'N/A'),
        }

        # Dates
        not_before_str = cert.get('notBefore', '')
        not_after_str = cert.get('notAfter', '')

        not_before = _parse_cert_date(not_before_str)
        not_after = _parse_cert_date(not_after_str)

        result["not_before"] = not_before.isoformat() if not_before else None
        result["not_after"] = not_after.isoformat() if not_after else None

        now = datetime.now(timezone.utc)
        if not_after:
            days_remaining = (not_after - now).days
            result["days_remaining"] = days_remaining
        else:
            days_remaining = -1

        # Subject Alternative Names
        san_list = []
        for san_type, san_value in cert.get('subjectAltName', []):
            if san_type == 'DNS':
                san_list.append(san_value)
        result["san"] = san_list

        # Serial Number
        result["serial_number"] = str(cert.get('serialNumber', 'N/A'))

        # --- Score calculation ---
        score = 0
        recommendations = []

        if result["valid"]:
            score += 10  # Basic valid cert

        if days_remaining is not None and days_remaining > 30:
            score += 8
        elif days_remaining is not None and 7 < days_remaining <= 30:
            score += 4
            recommendations.append(
                f"⚠️ SSL certificate expires in {days_remaining} days. Renew it soon."
            )
        elif days_remaining is not None and days_remaining <= 7:
            score += 0
            recommendations.append(
                f"🚨 SSL certificate expires in {days_remaining} days! Immediate renewal required."
            )
        else:
            recommendations.append("⚠️ Could not determine certificate expiry date.")

        if protocol and protocol in ('TLSv1.3', 'TLSv1.2'):
            score += 7
        else:
            recommendations.append(
                "⚠️ Server is using an outdated TLS version. Upgrade to TLS 1.2 or 1.3."
            )

        if san_list:
            score += 0  # Expected — no penalty
        else:
            recommendations.append(
                "ℹ️ No Subject Alternative Names (SANs) found in certificate."
            )

        # Risk level based on score
        result["score"] = min(score, MAX_SSL_SCORE)
        result["risk_level"] = _score_to_risk(result["score"], MAX_SSL_SCORE)
        result["recommendations"] = recommendations

    except ssl.SSLCertVerificationError as e:
        result["error"] = f"SSL Certificate verification failed: {str(e)}"
        result["recommendations"] = [
            "🚨 SSL certificate is invalid or self-signed.",
            "Install a trusted certificate from a recognized CA (e.g. Let's Encrypt).",
        ]
    except ssl.SSLError as e:
        result["error"] = f"SSL error: {str(e)}"
        result["recommendations"] = ["Check SSL/TLS configuration on the server."]
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        result["error"] = f"Could not connect to {domain}:443 — {str(e)}"
        result["recommendations"] = [
            "⚠️ HTTPS is not available on this domain.",
            "Enable HTTPS with a valid SSL certificate.",
        ]

    return result


def _parse_cert_date(date_str: str):
    """Parse certificate date string into a timezone-aware datetime."""
    for fmt in ('%b %d %H:%M:%S %Y %Z', '%b  %d %H:%M:%S %Y %Z'):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _score_to_risk(score: int, max_score: int) -> str:
    pct = (score / max_score) * 100 if max_score else 0
    if pct >= 90:
        return 'excellent'
    elif pct >= 75:
        return 'good'
    elif pct >= 50:
        return 'medium'
    return 'high'
