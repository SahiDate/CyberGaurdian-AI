"""
URL Security Scanner Service for CyberGuardian AI — Phase 6.
Performs safe, defensive static and network analysis of URLs.
Correlates findings with Phase 3 Threat Intelligence, Phase 5 SSL Scanner, and Phase 5 WHOIS Lookup.
Enforces strict multi-hop SSRF protection, response size caps, and deterministic risk scoring (0-100).
"""

import re
import socket
import ipaddress
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

from ..ssrf_protector import validate_target_ssrf, is_ip_restricted, SSRFBlockedError
from ..ssl_scanner.service import SSLScannerService
from ..whois_service.service import WhoisService
from ..threat_intel.service import ThreatIntelligenceService


# Configurable Limits
MAX_REDIRECTS = 5
MAX_URL_SCAN_RESPONSE_SIZE = 1024 * 1024  # 1 MB
DEFAULT_NETWORK_TIMEOUT = 10.0  # seconds

# Known URL shorteners
KNOWN_SHORTENERS = {
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
    'tiny.cc', 'rb.gy', 'cutt.ly', 'shorturl.at', 'bl.ink', 'v.gd', 'qr.ae'
}

# Suspicious keywords in path/query for credential harvesting / phishing
SUSPICIOUS_KEYWORDS = [
    'login', 'signin', 'verify', 'banking', 'paypal', 'wallet', 'account',
    'update', 'security', 'authenticate', 'webscr', 'password', 'credential',
    'confirm', 'secure', 'authorize', 'session', 'wp-login', 'admin'
]

# Supported Web Schemes
SUPPORTED_SCHEMES = {'http', 'https'}
REJECTED_SCHEMES = {'file', 'ftp', 'javascript', 'data', 'vbscript', 'blob', 'about', 'gopher', 'ldap', 'tftp'}


def extract_registrable_domain(hostname: str) -> str:
    """Extract registrable domain from hostname (e.g. 'sub.example.co.uk' -> 'example.co.uk')."""
    if not hostname:
        return ""
    hostname = hostname.lower().strip().strip('.')
    
    # If IP literal
    try:
        ipaddress.ip_address(hostname)
        return hostname
    except ValueError:
        pass

    parts = hostname.split('.')
    if len(parts) <= 2:
        return hostname

    # Common two-part TLDs
    two_part_tlds = {
        'co.uk', 'gov.uk', 'ac.uk', 'org.uk', 'com.au', 'net.au', 'org.au',
        'co.nz', 'co.jp', 'com.br', 'co.in', 'gov.in', 'ac.in', 'net.in',
        'com.sg', 'edu.sg', 'com.hk', 'com.mx', 'co.za'
    }
    if len(parts) >= 3:
        possible_tld = f"{parts[-2]}.{parts[-1]}"
        if possible_tld in two_part_tlds:
            return f"{parts[-3]}.{possible_tld}"

    return f"{parts[-2]}.{parts[-1]}"


def validate_and_normalize_url(raw_url: str) -> Dict[str, Any]:
    """
    Validates URL scheme, characters, and structure, and extracts normalized components.
    Raises ValueError if URL is empty, unsupported scheme, or malformed.
    """
    if not raw_url or not isinstance(raw_url, str) or not raw_url.strip():
        raise ValueError("URL cannot be empty.")

    clean_url = raw_url.strip()

    # Prepend https:// if user provided a plain domain or host
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*://', clean_url):
        clean_url = 'https://' + clean_url

    parsed = urllib.parse.urlsplit(clean_url)
    scheme = (parsed.scheme or '').lower()

    if scheme in REJECTED_SCHEMES or scheme not in SUPPORTED_SCHEMES:
        raise ValueError(f"Unsupported URL scheme '{scheme}:'. Only HTTP and HTTPS are permitted.")

    hostname = (parsed.hostname or '').lower().strip()
    if not hostname:
        raise ValueError("URL must include a valid hostname.")

    # Determine default port
    port = parsed.port
    if port is None:
        port = 443 if scheme == 'https' else 80

    domain = extract_registrable_domain(hostname)
    path = parsed.path or '/'
    query = parsed.query or ''
    fragment = parsed.fragment or ''
    userinfo = f"{parsed.username or ''}{':' + parsed.password if parsed.password else ''}"

    # Reconstruct normalized URL string without credentials
    netloc = hostname
    if (scheme == 'http' and port != 80) or (scheme == 'https' and port != 443):
        netloc = f"{hostname}:{port}"

    normalized_url = urllib.parse.urlunsplit((scheme, netloc, path, query, fragment))

    return {
        "original_url": raw_url.strip(),
        "normalized_url": normalized_url,
        "scheme": scheme,
        "hostname": hostname,
        "port": port,
        "domain": domain,
        "path": path,
        "query": query,
        "fragment": fragment,
        "userinfo": userinfo,
    }


def analyze_url_structure_indicators(url_info: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Static analysis of URL syntactic patterns and obfuscation indicators."""
    indicators = []
    norm_url = url_info["normalized_url"]
    orig_url = url_info["original_url"]
    hostname = url_info["hostname"]
    path = url_info["path"]
    query = url_info["query"]
    userinfo = url_info.get("userinfo", "")

    # 1. IP address as host
    is_ip = False
    try:
        ipaddress.ip_address(hostname)
        is_ip = True
        indicators.append({
            "type": "IP_HOST_URL",
            "severity": "HIGH",
            "description": f"URL hostname '{hostname}' is a raw IP address instead of a domain name."
        })
    except ValueError:
        pass

    # 2. Punycode / Internationalized Domain Name (IDN)
    if 'xn--' in hostname:
        indicators.append({
            "type": "PUNYCODE_DOMAIN",
            "severity": "MEDIUM",
            "description": f"Hostname '{hostname}' uses Punycode encoding (potential homograph impersonation)."
        })

    # 3. Known URL shortener
    domain = url_info["domain"]
    if domain in KNOWN_SHORTENERS or hostname in KNOWN_SHORTENERS:
        indicators.append({
            "type": "URL_SHORTENER_DETECTED",
            "severity": "MEDIUM",
            "description": f"Target domain '{domain}' is a known URL shortening service, frequently used to mask final destinations."
        })

    # 4. Embedded credentials in userinfo
    if userinfo or '@' in orig_url.split('/')[2]:
        indicators.append({
            "type": "EMBEDDED_CREDENTIALS_USERINFO",
            "severity": "HIGH",
            "description": "URL contains embedded userinfo/credentials (@ syntax), often used to deceive users regarding the true host."
        })

    # 5. Excessive URL length
    if len(norm_url) > 255:
        indicators.append({
            "type": "EXCESSIVE_URL_LENGTH",
            "severity": "LOW",
            "description": f"URL length ({len(norm_url)} characters) exceeds 255 characters."
        })

    # 6. Excessive query parameters
    query_params = urllib.parse.parse_qs(query)
    if len(query_params) > 6:
        indicators.append({
            "type": "EXCESSIVE_QUERY_PARAMETERS",
            "severity": "LOW",
            "description": f"URL contains {len(query_params)} query parameters."
        })

    # 7. Excessive subdomains
    if not is_ip and hostname.count('.') > 3:
        indicators.append({
            "type": "EXCESSIVE_SUBDOMAINS",
            "severity": "MEDIUM",
            "description": f"Hostname '{hostname}' contains {hostname.count('.')} subdomain levels."
        })

    # 8. Double / Obfuscated Encoding
    if '%25' in orig_url or '%25' in query or '%25' in path:
        indicators.append({
            "type": "DOUBLE_URL_ENCODING",
            "severity": "HIGH",
            "description": "URL contains double-percent encoding (%25), commonly used in filter evasion and path traversal."
        })

    # 9. Suspicious keywords in path/query
    full_searchable = f"{path.lower()}?{query.lower()}"
    matched_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in full_searchable]
    if len(matched_keywords) >= 2:
        indicators.append({
            "type": "SUSPICIOUS_PHISHING_KEYWORDS",
            "severity": "MEDIUM",
            "description": f"URL path/query contains multiple authentication/financial keywords: {', '.join(matched_keywords)}."
        })

    # 10. Non-standard port
    port = url_info["port"]
    scheme = url_info["scheme"]
    if (scheme == 'http' and port not in (80, 8080)) or (scheme == 'https' and port not in (443, 8443)):
        indicators.append({
            "type": "NON_STANDARD_WEB_PORT",
            "severity": "LOW",
            "description": f"URL uses non-standard web port {port} for {scheme.upper()} protocol."
        })

    return indicators


class URLScannerService:
    """
    Production URL Scanner Service for CyberGuardian AI.
    Coordinates SSRF verification, safe HTTP execution, redirect chain tracing,
    Threat Intel correlation, SSL scanning, WHOIS correlation, and deterministic risk scoring.
    """

    def __init__(self, timeout: float = DEFAULT_NETWORK_TIMEOUT, max_redirects: int = MAX_REDIRECTS):
        self.timeout = timeout
        self.max_redirects = max_redirects

    def scan_url(self, raw_url: str, user: Any = None) -> Dict[str, Any]:
        """
        Main entrypoint to scan a URL.
        Returns complete structured analysis dictionary.
        """
        # Step 1: Validate and Normalize
        try:
            url_info = validate_and_normalize_url(raw_url)
        except ValueError as e:
            return {
                "target": raw_url,
                "status": "INVALID_INPUT",
                "error_message": str(e),
                "risk": {"score": 0, "severity": "LOW", "confidence": 100},
                "indicators": [],
                "structured_evidence": {}
            }

        hostname = url_info["hostname"]
        port = url_info["port"]
        norm_url = url_info["normalized_url"]

        # Step 2: SSRF Pre-flight Validation
        try:
            resolved_ips = validate_target_ssrf(hostname, port)
            primary_ip = resolved_ips[0] if resolved_ips else "UNKNOWN"
        except SSRFBlockedError as e:
            return {
                "target": raw_url,
                "normalized_url": norm_url,
                "hostname": hostname,
                "domain": url_info["domain"],
                "status": "SSRF_BLOCKED",
                "error_message": str(e),
                "indicators": [{
                    "type": "SSRF_ATTEMPT_BLOCKED",
                    "severity": "CRITICAL",
                    "description": str(e)
                }],
                "risk": {"score": 95, "severity": "CRITICAL", "confidence": 100},
                "structured_evidence": {"source": "URL_SCANNER", "error": str(e)}
            }

        # Step 3: URL Static Structure & Syntax Analysis
        structure_indicators = analyze_url_structure_indicators(url_info)

        # Step 4: Safe Network Request & Redirect Chain Analysis
        network_result = self._execute_safe_http_request(norm_url)

        # Merge network redirect / HTTP security indicators
        all_indicators = structure_indicators + network_result["indicators"]

        # Step 5: Correlate with SSL Scanner (if HTTPS)
        ssl_evidence = {}
        if url_info["scheme"] == 'https' or network_result.get("final_url", "").startswith("https://"):
            try:
                ssl_service = SSLScannerService(timeout=self.timeout)
                ssl_evidence = ssl_service.scan_target(network_result.get("final_hostname", hostname), custom_port=port)
            except Exception as e:
                ssl_evidence = {"certificate_status": "ERROR", "error_message": str(e), "threat_score": 20}
        else:
            ssl_evidence = {"certificate_status": "NOT_APPLICABLE", "message": "Plain HTTP target"}

        # Step 6: Correlate with WHOIS Lookup
        whois_evidence = {}
        if url_info["domain"] and not is_ip_restricted(url_info["domain"])[0]:
            try:
                whois_service = WhoisService(timeout=self.timeout)
                whois_evidence = whois_service.lookup_domain(url_info["domain"])
            except Exception as e:
                whois_evidence = {"status": "UNAVAILABLE", "error_message": str(e), "threat_score": 0}
        else:
            whois_evidence = {"status": "NOT_APPLICABLE", "message": "IP or invalid domain"}

        # Step 7: Correlate with Threat Intelligence (Phase 3)
        threat_intel_evidence = {}
        if user is not None and url_info["domain"]:
            try:
                ti_service = ThreatIntelligenceService()
                # Run threat intel on registrable domain
                ti_record = ti_service.execute_scan(
                    target=url_info["domain"],
                    target_type="DOMAIN",
                    user=user,
                    bypass_cache=False
                )
                threat_intel_evidence = {
                    "threat_score": ti_record.threat_score,
                    "severity": ti_record.severity,
                    "confidence": ti_record.confidence,
                    "providers_queried": ti_record.providers_queried,
                    "vt_detections": ti_record.virustotal_detections,
                    "status": ti_record.status
                }
            except Exception as e:
                threat_intel_evidence = {"status": "UNAVAILABLE", "error_message": str(e), "threat_score": 0}
        else:
            threat_intel_evidence = {"status": "SKIPPED", "threat_score": 0}

        # Step 8: Deterministic Risk & Confidence Scoring
        risk_score, severity, confidence = self._calculate_composite_risk_score(
            structure_indicators=structure_indicators,
            network_result=network_result,
            ssl_evidence=ssl_evidence,
            whois_evidence=whois_evidence,
            threat_intel_evidence=threat_intel_evidence
        )

        # Step 9: Synthesize Recommendations
        recommendations = self._generate_recommendations(
            risk_score, severity, all_indicators, ssl_evidence, whois_evidence, threat_intel_evidence
        )

        # Step 10: Format Normalized Structured Evidence for SOC Pipeline
        structured_evidence = {
            "source": "URL_SCANNER",
            "target": raw_url,
            "normalized_url": norm_url,
            "final_url": network_result.get("final_url", norm_url),
            "primary_ip": primary_ip,
            "url_structure": {
                "scheme": url_info["scheme"],
                "hostname": url_info["hostname"],
                "port": url_info["port"],
                "domain": url_info["domain"],
                "path": url_info["path"],
                "query_length": len(url_info["query"])
            },
            "http": {
                "status_code": network_result.get("http_status"),
                "content_type": network_result.get("content_type"),
                "server": network_result.get("server"),
                "content_length": network_result.get("content_length"),
                "headers": network_result.get("security_headers", {})
            },
            "redirects": {
                "count": network_result.get("redirect_count", 0),
                "chain": network_result.get("redirect_chain", [])
            },
            "ssl": {
                "status": ssl_evidence.get("certificate_status", "NOT_APPLICABLE"),
                "issuer": ssl_evidence.get("issuer_cn", ""),
                "tls_version": ssl_evidence.get("tls_version", ""),
                "days_remaining": ssl_evidence.get("days_remaining")
            },
            "whois": {
                "registrar": whois_evidence.get("registrar", "NOT_AVAILABLE"),
                "domain_age_days": whois_evidence.get("domain_age_days"),
                "age_category": whois_evidence.get("age_category", "UNKNOWN"),
                "expiration_category": whois_evidence.get("expiration_category", "UNKNOWN")
            },
            "threat_intelligence": {
                "score": threat_intel_evidence.get("threat_score", 0),
                "vt_detections": threat_intel_evidence.get("vt_detections", {}),
                "status": threat_intel_evidence.get("status", "UNAVAILABLE")
            },
            "indicators": all_indicators,
            "risk": {
                "score": risk_score,
                "severity": severity,
                "confidence": confidence
            },
            "recommendations": recommendations,
            "scanned_at": datetime.now(timezone.utc).isoformat()
        }

        return {
            "original_url": raw_url,
            "normalized_url": norm_url,
            "final_url": network_result.get("final_url", norm_url),
            "hostname": hostname,
            "domain": url_info["domain"],
            "scheme": url_info["scheme"],
            "port": port,
            "primary_ip": primary_ip,
            "http_status": network_result.get("http_status"),
            "content_type": network_result.get("content_type", ""),
            "server": network_result.get("server", ""),
            "redirect_count": network_result.get("redirect_count", 0),
            "redirect_chain": network_result.get("redirect_chain", []),
            "ssl_result": ssl_evidence,
            "whois_result": whois_evidence,
            "threat_intel_result": threat_intel_evidence,
            "indicators": all_indicators,
            "threat_score": risk_score,
            "severity": severity,
            "confidence": confidence,
            "recommendations": recommendations,
            "status": network_result.get("status", "SUCCESS"),
            "error_message": network_result.get("error_message"),
            "structured_evidence": structured_evidence
        }

    def _execute_safe_http_request(self, start_url: str) -> Dict[str, Any]:
        """
        Safely traces HTTP requests and redirects hop-by-hop.
        Enforces SSRF check on every single redirect destination, enforces 1MB cap,
        and records header security configurations.
        """
        current_url = start_url
        redirect_chain = []
        indicators = []
        visited_urls = set()

        headers = {
            'User-Agent': 'CyberGuardian-DefensiveScanner/2.0 (+https://cyberguardian.ai/bot)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'close'
        }

        session = requests.Session()
        session.max_redirects = self.max_redirects

        final_resp = None
        current_status = "SUCCESS"
        error_msg = None

        for hop_index in range(self.max_redirects + 1):
            parsed = urllib.parse.urlsplit(current_url)
            hop_host = parsed.hostname or ''
            hop_scheme = (parsed.scheme or '').lower()
            hop_port = parsed.port or (443 if hop_scheme == 'https' else 80)

            # Scheme validation
            if hop_scheme not in SUPPORTED_SCHEMES:
                indicators.append({
                    "type": "UNSUPPORTED_REDIRECT_SCHEME",
                    "severity": "HIGH",
                    "description": f"Redirect hop {hop_index} attempted redirect to non-web scheme '{hop_scheme}:'."
                })
                current_status = "REDIRECT_ERROR"
                break

            # Multi-hop SSRF validation
            try:
                validate_target_ssrf(hop_host, hop_port)
            except SSRFBlockedError as e:
                indicators.append({
                    "type": "REDIRECT_TO_RESTRICTED_IP",
                    "severity": "CRITICAL",
                    "description": f"Redirect hop {hop_index} target '{hop_host}' resolved to restricted IP. Blocked by SSRF filter."
                })
                current_status = "SSRF_BLOCKED"
                error_msg = f"Redirect blocked by SSRF filter: {str(e)}"
                break

            # Check redirect loop
            if current_url in visited_urls:
                indicators.append({
                    "type": "REDIRECT_LOOP_DETECTED",
                    "severity": "MEDIUM",
                    "description": f"Circular redirect loop encountered at URL '{current_url}'."
                })
                current_status = "REDIRECT_LOOP"
                break
            visited_urls.add(current_url)

            # Execute single non-redirecting GET request with streaming
            try:
                resp = session.get(
                    current_url,
                    headers=headers,
                    timeout=self.timeout,
                    allow_redirects=False,
                    stream=True,
                    verify=True
                )
            except requests.exceptions.SSLError:
                # Retry with unverified TLS to capture HTTP status without exploding
                try:
                    resp = session.get(
                        current_url,
                        headers=headers,
                        timeout=self.timeout,
                        allow_redirects=False,
                        stream=True,
                        verify=False
                    )
                    indicators.append({
                        "type": "UNTRUSTED_TLS_HANDSHAKE",
                        "severity": "MEDIUM",
                        "description": f"HTTPS request to '{hop_host}' required non-verifying TLS context (self-signed/untrusted cert)."
                    })
                except Exception as inner_e:
                    current_status = "TLS_ERROR"
                    error_msg = f"TLS handshake failed: {str(inner_e)}"
                    break
            except requests.exceptions.Timeout:
                current_status = "TIMEOUT"
                error_msg = f"Connection timeout ({self.timeout}s) exceeded while requesting '{current_url}'."
                break
            except requests.exceptions.ConnectionError as e:
                current_status = "CONNECTION_REFUSED"
                error_msg = f"Connection failed to '{hop_host}': {str(e)}"
                break
            except Exception as e:
                current_status = "HTTP_ERROR"
                error_msg = f"HTTP request failed: {str(e)}"
                break

            # Read initial chunk under response size limit
            content_length = resp.headers.get('Content-Length')
            if content_length and int(content_length) > MAX_URL_SCAN_RESPONSE_SIZE:
                indicators.append({
                    "type": "OVERSIZED_RESPONSE_HEADER",
                    "severity": "LOW",
                    "description": f"Target declared Content-Length of {content_length} bytes (capped at 1MB)."
                })

            final_resp = resp

            # Check if this is a redirect response (3xx)
            if resp.is_redirect or resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get('Location')
                if not location:
                    break

                next_url = urllib.parse.urljoin(current_url, location)
                next_parsed = urllib.parse.urlsplit(next_url)
                next_host = (next_parsed.hostname or '').lower()
                next_scheme = (next_parsed.scheme or '').lower()

                # Check HTTPS -> HTTP downgrade
                if hop_scheme == 'https' and next_scheme == 'http':
                    indicators.append({
                        "type": "HTTPS_TO_HTTP_DOWNGRADE",
                        "severity": "HIGH",
                        "description": f"Insecure protocol downgrade detected: {current_url} redirected to plaintext HTTP {next_url}."
                    })

                # Check Cross-Domain Redirection
                curr_domain = extract_registrable_domain(hop_host)
                next_domain = extract_registrable_domain(next_host)
                if curr_domain and next_domain and curr_domain != next_domain:
                    indicators.append({
                        "type": "CROSS_DOMAIN_REDIRECT",
                        "severity": "MEDIUM",
                        "description": f"URL redirected across distinct domains: from '{curr_domain}' to '{next_domain}'."
                    })

                redirect_chain.append({
                    "hop": hop_index + 1,
                    "from_url": current_url,
                    "to_url": next_url,
                    "status_code": resp.status_code,
                    "from_domain": curr_domain,
                    "to_domain": next_domain
                })

                current_url = next_url
            else:
                # Final destination reached
                break

        # Check for excessive redirects
        if len(redirect_chain) >= self.max_redirects:
            indicators.append({
                "type": "EXCESSIVE_REDIRECTS",
                "severity": "MEDIUM",
                "description": f"URL chain exceeded maximum redirect threshold of {self.max_redirects} hops."
            })

        # Evaluate HTTP Security Headers on final response
        sec_headers = {}
        if final_resp is not None:
            raw_h = final_resp.headers

            # HSTS check
            if current_url.startswith('https://'):
                if 'Strict-Transport-Security' in raw_h:
                    sec_headers['Strict-Transport-Security'] = raw_h['Strict-Transport-Security']
                else:
                    indicators.append({
                        "type": "MISSING_HSTS_HEADER",
                        "severity": "LOW",
                        "description": "HTTPS service does not declare HTTP Strict-Transport-Security (HSTS)."
                    })

            # CSP check
            if 'Content-Security-Policy' in raw_h:
                sec_headers['Content-Security-Policy'] = raw_h['Content-Security-Policy'][:200]
            else:
                indicators.append({
                    "type": "MISSING_CSP_HEADER",
                    "severity": "LOW",
                    "description": "Response is missing Content-Security-Policy header."
                })

            # X-Content-Type-Options
            if 'X-Content-Type-Options' in raw_h:
                sec_headers['X-Content-Type-Options'] = raw_h['X-Content-Type-Options']
            else:
                indicators.append({
                    "type": "MISSING_X_CONTENT_TYPE_OPTIONS",
                    "severity": "LOW",
                    "description": "Response is missing X-Content-Type-Options: nosniff header."
                })

            return {
                "status": current_status,
                "error_message": error_msg,
                "final_url": current_url,
                "final_hostname": urllib.parse.urlsplit(current_url).hostname or "",
                "http_status": final_resp.status_code,
                "content_type": raw_h.get('Content-Type', '').split(';')[0],
                "server": raw_h.get('Server', ''),
                "content_length": raw_h.get('Content-Length'),
                "security_headers": sec_headers,
                "redirect_count": len(redirect_chain),
                "redirect_chain": redirect_chain,
                "indicators": indicators
            }

        return {
            "status": current_status or "ERROR",
            "error_message": error_msg or "Failed to establish HTTP communication.",
            "final_url": current_url,
            "final_hostname": urllib.parse.urlsplit(current_url).hostname or "",
            "http_status": None,
            "content_type": "",
            "server": "",
            "content_length": None,
            "security_headers": {},
            "redirect_count": len(redirect_chain),
            "redirect_chain": redirect_chain,
            "indicators": indicators
        }

    def _calculate_composite_risk_score(
        self,
        structure_indicators: List[Dict[str, Any]],
        network_result: Dict[str, Any],
        ssl_evidence: Dict[str, Any],
        whois_evidence: Dict[str, Any],
        threat_intel_evidence: Dict[str, Any]
    ) -> Tuple[int, str, int]:
        """
        Computes 100% deterministic risk score (0-100), severity, and confidence.
        """
        score = 0
        confidence_factors = []

        # 1. Threat Intelligence Detections (Weight: up to 80 points)
        ti_score = threat_intel_evidence.get("threat_score", 0)
        if ti_score > 0:
            score += int(ti_score * 0.8)
            confidence_factors.append(90)

        # 2. SSRF / Redirect to Restricted IP (Weight: 95 points)
        for ind in network_result.get("indicators", []):
            itype = ind.get("type", "")
            if itype == "REDIRECT_TO_RESTRICTED_IP" or itype == "SSRF_ATTEMPT_BLOCKED":
                score = max(score, 95)
                confidence_factors.append(98)
            elif itype == "HTTPS_TO_HTTP_DOWNGRADE":
                score += 35
                confidence_factors.append(85)
            elif itype == "CROSS_DOMAIN_REDIRECT":
                score += 15
                confidence_factors.append(75)
            elif itype == "EXCESSIVE_REDIRECTS":
                score += 15
                confidence_factors.append(70)

        # 3. URL Structure & Obfuscation (Weight: 10-35 points each)
        for ind in structure_indicators:
            itype = ind.get("type", "")
            if itype == "IP_HOST_URL":
                score += 30
                confidence_factors.append(90)
            elif itype == "DOUBLE_URL_ENCODING":
                score += 30
                confidence_factors.append(85)
            elif itype == "EMBEDDED_CREDENTIALS_USERINFO":
                score += 35
                confidence_factors.append(90)
            elif itype == "PUNYCODE_DOMAIN":
                score += 20
                confidence_factors.append(80)
            elif itype == "URL_SHORTENER_DETECTED":
                score += 15
                confidence_factors.append(80)
            elif itype == "SUSPICIOUS_PHISHING_KEYWORDS":
                score += 20
                confidence_factors.append(75)
            elif itype == "EXCESSIVE_SUBDOMAINS":
                score += 10
                confidence_factors.append(70)

        # 4. SSL Vulnerabilities
        ssl_status = ssl_evidence.get("certificate_status", "")
        if ssl_status == "EXPIRED":
            score += 40
            confidence_factors.append(90)
        elif ssl_status == "HOSTNAME_MISMATCH":
            score += 35
            confidence_factors.append(90)
        elif ssl_status == "EXPIRING_SOON":
            score += 15

        # 5. WHOIS Domain Age
        age_cat = whois_evidence.get("age_category", "")
        if age_cat == "NEW":
            score += 30
            confidence_factors.append(85)
        elif age_cat == "YOUNG":
            score += 10

        exp_cat = whois_evidence.get("expiration_category", "")
        if exp_cat == "EXPIRED":
            score += 35

        # Clamp score to 0 - 100
        final_score = min(100, max(0, score))

        # Determine Severity based on CyberGuardian Standards
        if final_score >= 75:
            severity = "CRITICAL"
        elif final_score >= 50:
            severity = "HIGH"
        elif final_score >= 25:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # Calculate Confidence (Base 70, average with gathered factors)
        if confidence_factors:
            avg_conf = sum(confidence_factors) / len(confidence_factors)
            final_confidence = min(98, max(60, int(avg_conf)))
        else:
            final_confidence = 75

        return final_score, severity, final_confidence

    def _generate_recommendations(
        self,
        risk_score: int,
        severity: str,
        indicators: List[Dict[str, Any]],
        ssl_evidence: Dict[str, Any],
        whois_evidence: Dict[str, Any],
        threat_intel: Dict[str, Any]
    ) -> List[str]:
        """Generates actionable security recommendations based on observed findings."""
        recs = []

        if severity in ("CRITICAL", "HIGH"):
            recs.append("⚠️ HIGH RISK: Exercise extreme caution before accessing this URL. Avoid entering credentials or downloading files.")

        types = {ind.get("type") for ind in indicators}

        if "REDIRECT_TO_RESTRICTED_IP" in types or "SSRF_ATTEMPT_BLOCKED" in types:
            recs.append("🛡️ SSRF Blocked: Target resolves to an internal or cloud metadata address. Ensure application firewalls block internal traversal.")

        if "HTTPS_TO_HTTP_DOWNGRADE" in types:
            recs.append("🔒 Insecure Downgrade: The target redirects traffic from encrypted HTTPS to plaintext HTTP. Discontinue transmitting sensitive data.")

        if "IP_HOST_URL" in types:
            recs.append("🌐 IP Hostname: Target uses a raw IP address instead of an authenticated domain name.")

        if "DOUBLE_URL_ENCODING" in types:
            recs.append("🔎 Obfuscation Detected: URL uses double-percent encoding. Verify intended endpoint parameters.")

        if ssl_evidence.get("certificate_status") == "EXPIRED":
            recs.append("📜 SSL Expired: The server certificate is expired. Communications may be susceptible to interception.")

        if whois_evidence.get("age_category") == "NEW":
            recs.append("🆕 Newly Registered Domain: This domain was registered within the past 90 days, a common pattern in active phishing campaigns.")

        if threat_intel.get("threat_score", 0) >= 50:
            recs.append("🚨 Threat Intelligence Flagged: Reputable security vendors have identified this target domain as malicious or suspicious.")

        if not recs:
            recs.append("✅ Low Risk: No severe security anomalies, cryptographic flaws, or malicious indicators were identified.")

        return recs
