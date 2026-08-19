"""
SSL/TLS Security Scanner Service for CyberGuardian AI.
Performs safe, defensive inspection of TLS/SSL certificate configurations and cryptographic parameters.
Does NOT perform aggressive exploits or brute force.
"""

import ssl
import socket
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from ..ssrf_protector import validate_target_ssrf, SSRFBlockedError


# Certificate Expiry Thresholds (Days)
EXPIRING_SOON_THRESHOLD_DAYS = 30
EXPIRING_CRITICAL_THRESHOLD_DAYS = 7


def _parse_cert_date(date_str: str) -> datetime | None:
    """Parse certificate date string format (e.g. 'May 15 12:00:00 2026 GMT')."""
    if not date_str:
        return None
    for fmt in [
        "%b %d %H:%M:%S %Y %Z",
        "%b  %d %H:%M:%S %Y %Z",
        "%Y%m%d%H%M%SZ",
    ]:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _match_hostname_pattern(pattern: str, hostname: str) -> bool:
    """Matches a certificate name pattern (including wildcards e.g. *.example.com) against hostname."""
    pattern = pattern.lower().strip()
    hostname = hostname.lower().strip()

    if pattern == hostname:
        return True

    if pattern.startswith('*.'):
        suffix = pattern[1:]  # e.g. .example.com
        if hostname.endswith(suffix):
            # Ensure the wildcard only covers a single domain level
            subdomain = hostname[:-len(suffix)]
            if '.' not in subdomain and len(subdomain) > 0:
                return True

    return False


def normalize_ssl_target(target: str, default_port: int = 443) -> tuple[str, int, str]:
    """
    Normalizes a user-supplied target string into (hostname, port, normalized_target_str).
    Accepts 'example.com', 'https://example.com', 'example.com:8443', 'https://example.com:8443/path'.
    """
    if not target or not target.strip():
        raise ValueError("Target domain or URL cannot be empty.")

    clean = target.strip()

    if '://' in clean:
        parsed = urlparse(clean)
        hostname = parsed.hostname or ''
        port = parsed.port or (443 if parsed.scheme.lower() == 'https' else 80)
    else:
        # Check if port is specified e.g. domain:8443
        if ':' in clean:
            parts = clean.split(':')
            hostname = parts[0]
            try:
                port = int(parts[1].split('/')[0])
            except ValueError:
                port = default_port
        else:
            hostname = clean.split('/')[0]
            port = default_port

    hostname = hostname.lower().strip()
    if not hostname:
        raise ValueError(f"Could not extract a valid hostname from target '{target}'.")

    # Basic RFC domain character check
    if not re.match(r'^[a-zA-Z0-9.\-_]+$', hostname):
        raise ValueError(f"Target hostname '{hostname}' contains invalid characters.")

    # Validate port range
    if not (1 <= port <= 65535):
        raise ValueError(f"Invalid port number: {port}. Must be between 1 and 65535.")

    normalized_str = f"{hostname}:{port}" if port != 443 else hostname
    return hostname, port, normalized_str


class SSLScannerService:
    """
    Orchestrates TLS/SSL certificate and connection parameters inspection.
    """

    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    def scan_target(self, target_input: str, custom_port: int = None) -> dict:
        """
        Executes a complete SSL security scan against the target.
        """
        try:
            hostname, port, target_display = normalize_ssl_target(
                target_input,
                default_port=custom_port or 443
            )
        except Exception as e:
            return {
                "target": target_input,
                "domain": target_input,
                "port": custom_port or 443,
                "status": "INVALID_INPUT",
                "error_message": str(e),
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 0,
                "structured_evidence": {},
            }

        # 1. SSRF Validation
        try:
            validate_target_ssrf(hostname, port)
        except SSRFBlockedError as e:
            return {
                "target": target_display,
                "domain": hostname,
                "port": port,
                "status": "SSRF_BLOCKED",
                "error_message": str(e),
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 100,
                "structured_evidence": {
                    "source": "SSL_SCANNER",
                    "error": "SSRF_BLOCKED",
                    "details": str(e)
                }
            }

        # 2. Establish TLS Connection & Inspect Certificate
        cert_data = None
        protocol_version = "UNKNOWN"
        cipher_info = {"name": "UNKNOWN", "bits": 0, "protocol": "UNKNOWN"}
        connection_error = None
        is_cert_valid = False

        try:
            # Create a standard verification context
            context = ssl.create_default_context()
            
            with socket.create_connection((hostname, port), timeout=self.timeout) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert_data = ssock.getpeercert()
                    protocol_version = ssock.version() or "UNKNOWN"
                    cipher_tuple = ssock.cipher()
                    if cipher_tuple:
                        cipher_info = {
                            "name": cipher_tuple[0],
                            "protocol": cipher_tuple[1],
                            "bits": cipher_tuple[2]
                        }
                    is_cert_valid = True

        except ssl.SSLCertVerificationError as e:
            connection_error = f"Certificate verification error: {e.verify_message or str(e)}"
            # Attempt to fetch the unverified peer cert in unverified mode to collect forensic metadata
            try:
                unverified_context = ssl._create_unverified_context()
                with socket.create_connection((hostname, port), timeout=self.timeout) as sock:
                    with unverified_context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        cert_data = ssock.getpeercert(binary_form=False)
                        protocol_version = ssock.version() or "UNKNOWN"
                        cipher_tuple = ssock.cipher()
                        if cipher_tuple:
                            cipher_info = {
                                "name": cipher_tuple[0],
                                "protocol": cipher_tuple[1],
                                "bits": cipher_tuple[2]
                            }
            except Exception:
                pass

        except ssl.SSLError as e:
            connection_error = f"TLS/SSL Error: {str(e)}"
        except socket.timeout:
            connection_error = f"Connection timed out after {self.timeout}s."
        except socket.gaierror as e:
            connection_error = f"DNS lookup failed: {str(e)}"
        except ConnectionRefusedError:
            connection_error = f"Connection refused on {hostname}:{port}."
        except Exception as e:
            connection_error = f"Connection failed: {str(e)}"

        if not cert_data and connection_error:
            return {
                "target": target_display,
                "domain": hostname,
                "port": port,
                "status": "ERROR",
                "error_message": connection_error,
                "certificate_status": "UNAVAILABLE",
                "threat_score": 50,
                "severity": "HIGH",
                "confidence": 85,
                "structured_evidence": {
                    "source": "SSL_SCANNER",
                    "error": connection_error
                }
            }

        # 3. Parse Certificate Details
        parsed_cert = self._parse_certificate_dict(cert_data or {}, hostname)
        
        # 4. Determine Certificate Validation Status
        cert_status = self._evaluate_cert_status(parsed_cert, is_cert_valid, connection_error)

        # 5. Generate Security Issues & Indicators
        issues = self._generate_security_issues(parsed_cert, cert_status, protocol_version, cipher_info, connection_error)

        # 6. Deterministic Threat Scoring & Confidence
        threat_score, severity, confidence = self._calculate_ssl_threat_score(cert_status, issues, protocol_version, cipher_info)

        # 7. Build Structured Evidence for SOC & Report Generator
        structured_evidence = {
            "source": "SSL_SCANNER",
            "target": target_display,
            "domain": hostname,
            "port": port,
            "certificate": {
                "subject": parsed_cert["subject"],
                "issuer": parsed_cert["issuer"],
                "valid_from": parsed_cert["valid_from"],
                "valid_until": parsed_cert["valid_until"],
                "days_remaining": parsed_cert["days_remaining"],
                "hostname_valid": parsed_cert["hostname_valid"],
                "status": cert_status,
                "serial_number": parsed_cert["serial_number"],
                "version": parsed_cert["version"],
                "san": parsed_cert["san_list"],
            },
            "tls": {
                "version": protocol_version,
                "cipher": cipher_info["name"],
                "cipher_bits": cipher_info["bits"],
                "is_obsolete": protocol_version in ("TLSv1.0", "TLSv1.1", "SSLv3", "SSLv2"),
            },
            "security": {
                "issues": issues,
                "issue_count": len(issues),
            },
            "risk": {
                "score": threat_score,
                "severity": severity,
                "confidence": confidence,
            }
        }

        return {
            "target": target_display,
            "domain": hostname,
            "port": port,
            "status": "SUCCESS" if is_cert_valid else "WARNING",
            "certificate_status": cert_status,
            "issuer_cn": parsed_cert["issuer"].get("common_name", "N/A"),
            "subject_cn": parsed_cert["subject"].get("common_name", "N/A"),
            "valid_from": parsed_cert["valid_from"],
            "valid_until": parsed_cert["valid_until"],
            "days_remaining": parsed_cert["days_remaining"],
            "tls_version": protocol_version,
            "cipher_name": cipher_info["name"],
            "cipher_bits": cipher_info["bits"],
            "hostname_valid": parsed_cert["hostname_valid"],
            "san_list": parsed_cert["san_list"],
            "security_issues": issues,
            "threat_score": threat_score,
            "severity": severity,
            "confidence": confidence,
            "error_message": connection_error,
            "structured_evidence": structured_evidence,
        }

    def _parse_certificate_dict(self, cert: dict, target_hostname: str) -> dict:
        """Extract structured fields from peer certificate dict."""
        subject = {}
        for item in cert.get('subject', []):
            if item:
                subject[item[0][0]] = item[0][1]

        issuer = {}
        for item in cert.get('issuer', []):
            if item:
                issuer[item[0][0]] = item[0][1]

        # Dates
        not_before_dt = _parse_cert_date(cert.get('notBefore', ''))
        not_after_dt = _parse_cert_date(cert.get('notAfter', ''))

        now = datetime.now(timezone.utc)
        days_remaining = None
        if not_after_dt:
            days_remaining = (not_after_dt - now).days

        # SANs
        san_list = []
        for san_type, san_val in cert.get('subjectAltName', []):
            if san_type in ('DNS', 'IP Address'):
                san_list.append(san_val)

        # Hostname Matching Check
        common_name = subject.get('commonName', '')
        all_candidates = san_list if san_list else ([common_name] if common_name else [])
        hostname_valid = any(_match_hostname_pattern(cand, target_hostname) for cand in all_candidates)

        return {
            "subject": {
                "common_name": common_name or "N/A",
                "organization": subject.get('organizationName', 'N/A'),
                "country": subject.get('countryName', 'N/A'),
                "organizational_unit": subject.get('organizationalUnitName', 'N/A'),
            },
            "issuer": {
                "common_name": issuer.get('commonName', 'N/A'),
                "organization": issuer.get('organizationName', 'N/A'),
                "country": issuer.get('countryName', 'N/A'),
            },
            "valid_from": not_before_dt.isoformat() if not_before_dt else None,
            "valid_until": not_after_dt.isoformat() if not_after_dt else None,
            "days_remaining": days_remaining,
            "san_list": san_list,
            "serial_number": str(cert.get('serialNumber', 'N/A')),
            "version": cert.get('version', 3),
            "hostname_valid": hostname_valid,
            "not_before_dt": not_before_dt,
            "not_after_dt": not_after_dt,
        }

    def _evaluate_cert_status(self, parsed_cert: dict, is_valid: bool, connection_error: str | None) -> str:
        """Determines the standard certificate status string."""
        now = datetime.now(timezone.utc)

        if parsed_cert["not_after_dt"] and parsed_cert["not_after_dt"] < now:
            return "EXPIRED"

        if parsed_cert["not_before_dt"] and parsed_cert["not_before_dt"] > now:
            return "NOT_YET_VALID"

        if not parsed_cert["hostname_valid"]:
            return "HOSTNAME_MISMATCH"

        if parsed_cert["days_remaining"] is not None and parsed_cert["days_remaining"] <= EXPIRING_SOON_THRESHOLD_DAYS:
            return "EXPIRING_SOON"

        if not is_valid:
            return "INVALID"

        return "VALID"

    def _generate_security_issues(self, parsed_cert: dict, cert_status: str, tls_version: str, cipher_info: dict, connection_error: str | None) -> list[dict]:
        """Identifies security misconfigurations and risks."""
        issues = []

        # 1. Expiration issues
        if cert_status == "EXPIRED":
            issues.append({
                "type": "CERTIFICATE_EXPIRED",
                "severity": "CRITICAL",
                "description": f"The SSL/TLS certificate expired on {parsed_cert['valid_until']}.",
                "evidence": {"days_remaining": parsed_cert["days_remaining"], "valid_until": parsed_cert["valid_until"]}
            })
        elif cert_status == "EXPIRING_SOON":
            sev = "HIGH" if (parsed_cert["days_remaining"] or 0) <= EXPIRING_CRITICAL_THRESHOLD_DAYS else "MEDIUM"
            issues.append({
                "type": "CERTIFICATE_EXPIRING_SOON",
                "severity": sev,
                "description": f"The SSL/TLS certificate will expire in {parsed_cert['days_remaining']} days.",
                "evidence": {"days_remaining": parsed_cert["days_remaining"], "valid_until": parsed_cert["valid_until"]}
            })
        elif cert_status == "NOT_YET_VALID":
            issues.append({
                "type": "CERTIFICATE_NOT_YET_VALID",
                "severity": "HIGH",
                "description": f"The SSL/TLS certificate is not yet valid (valid from {parsed_cert['valid_from']}).",
                "evidence": {"valid_from": parsed_cert["valid_from"]}
            })

        # 2. Hostname Mismatch
        if not parsed_cert["hostname_valid"]:
            issues.append({
                "type": "HOSTNAME_MISMATCH",
                "severity": "CRITICAL",
                "description": "Certificate Subject and SAN do not match the requested hostname.",
                "evidence": {
                    "subject_cn": parsed_cert["subject"]["common_name"],
                    "san": parsed_cert["san_list"]
                }
            })

        # 3. Obsolete TLS Version
        if tls_version in ("TLSv1.0", "TLSv1.1", "SSLv3", "SSLv2"):
            issues.append({
                "type": "OBSOLETE_TLS_VERSION",
                "severity": "HIGH",
                "description": f"Negotiated protocol '{tls_version}' is deprecated and vulnerable to cryptographic downgrade attacks.",
                "evidence": {"tls_version": tls_version}
            })

        # 4. Weak Cipher
        bits = cipher_info.get("bits", 0)
        if bits and bits < 128:
            issues.append({
                "type": "WEAK_CIPHER_SUITE",
                "severity": "HIGH",
                "description": f"Negotiated cipher '{cipher_info['name']}' uses weak key strength ({bits} bits < 128 bits).",
                "evidence": cipher_info
            })

        # 5. Self-Signed Check
        if parsed_cert["subject"]["common_name"] != "N/A" and parsed_cert["subject"]["common_name"] == parsed_cert["issuer"]["common_name"]:
            issues.append({
                "type": "SELF_SIGNED_CERTIFICATE",
                "severity": "MEDIUM",
                "description": "The certificate appears to be self-signed (Subject Common Name matches Issuer Common Name).",
                "evidence": {"common_name": parsed_cert["subject"]["common_name"]}
            })

        # 6. Verification Error
        if connection_error and "verification error" in connection_error.lower():
            issues.append({
                "type": "UNTRUSTED_ROOT_CHAIN",
                "severity": "HIGH",
                "description": f"Certificate trust chain could not be verified by standard trust store: {connection_error}",
                "evidence": {"error": connection_error}
            })

        return issues

    def _calculate_ssl_threat_score(self, cert_status: str, issues: list[dict], tls_version: str, cipher_info: dict) -> tuple[int, str, int]:
        """
        Deterministic SSL Risk Score (0-100), Severity, and Confidence.
        """
        score = 0

        # Status Weights
        if cert_status == "EXPIRED":
            score += 55
        elif cert_status == "HOSTNAME_MISMATCH":
            score += 50
        elif cert_status == "NOT_YET_VALID":
            score += 40
        elif cert_status == "EXPIRING_SOON":
            score += 20

        # Issues aggregation
        for issue in issues:
            sev = issue.get("severity", "LOW")
            if sev == "CRITICAL":
                score += 30
            elif sev == "HIGH":
                score += 20
            elif sev == "MEDIUM":
                score += 10
            elif sev == "LOW":
                score += 5

        # Normalize score
        final_score = min(100, max(0, score))

        # Severity Mapping
        if final_score >= 75:
            severity = "CRITICAL"
        elif final_score >= 50:
            severity = "HIGH"
        elif final_score >= 25:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # Confidence (High because TLS handshake is direct deterministic proof)
        confidence = 95 if cert_status in ("VALID", "EXPIRED", "EXPIRING_SOON", "HOSTNAME_MISMATCH") else 80

        return final_score, severity, confidence
