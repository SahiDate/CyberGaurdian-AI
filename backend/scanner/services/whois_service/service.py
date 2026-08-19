"""
WHOIS / RDAP Domain Intelligence Service for CyberGuardian AI.
Performs safe, defensive domain registration lookup using RDAP (HTTPS) and port 43 WHOIS fallback.
Does NOT execute shell commands or deanonymize privacy-protected records.
"""

import socket
import re
import requests
from datetime import datetime, timezone
from urllib.parse import urlparse

from ..ssrf_protector import validate_target_ssrf, SSRFBlockedError


# Privacy protection keywords
PRIVACY_KEYWORDS = [
    "privacy", "redacted", "proxy", "whoisguard", "withheld", "protected",
    "contact privacy", "gdpr", "not disclosed", "data protected", "private"
]

# Risk Thresholds (Days)
NEW_DOMAIN_THRESHOLD_DAYS = 30
RECENTLY_UPDATED_THRESHOLD_DAYS = 7
EXPIRING_SOON_THRESHOLD_DAYS = 30


def _parse_iso_or_date(date_str: str) -> datetime | None:
    """Safely parse various RDAP and WHOIS date formats into UTC datetime."""
    if not date_str or not isinstance(date_str, str):
        return None

    date_str = date_str.strip()

    formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%b-%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.split('.')[0].rstrip('Z'), fmt.split('.')[0].rstrip('Z'))
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

    # Try ISO from isoformat if supported
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    return None


def normalize_domain_for_whois(target: str) -> str:
    """
    Normalizes a URL or target string into a clean base registered domain.
    Strips schemes, paths, query parameters, and port numbers.
    """
    if not target or not target.strip():
        raise ValueError("Domain target cannot be empty.")

    clean = target.strip().lower()

    if '://' in clean:
        parsed = urlparse(clean)
        clean = parsed.hostname or clean
    
    # Strip paths / query
    clean = clean.split('/')[0].split('?')[0].split('#')[0]

    # Strip port if present
    if ':' in clean:
        clean = clean.split(':')[0]

    clean = clean.strip('.')
    
    if not clean:
        raise ValueError("Could not extract a valid domain from target.")

    # Check for IP address format
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', clean) or ':' in clean:
        raise ValueError(f"Target '{clean}' is an IP address. WHOIS module supports domain names only.")

    return clean


class WhoisService:
    """
    Orchestrates defensive domain registration lookups using RDAP and WHOIS protocols.
    """

    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    def lookup_domain(self, target_input: str) -> dict:
        """
        Executes a domain intelligence lookup against the target.
        """
        # 1. Normalize domain
        try:
            domain = normalize_domain_for_whois(target_input)
        except ValueError as e:
            err_msg = str(e)
            is_ip = "IP address" in err_msg
            return {
                "domain": target_input,
                "status": "NOT_APPLICABLE" if is_ip else "INVALID_INPUT",
                "error_message": err_msg,
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 0,
                "structured_evidence": {},
            }

        # 2. SSRF Validation on domain
        try:
            validate_target_ssrf(domain)
        except SSRFBlockedError as e:
            return {
                "domain": domain,
                "status": "SSRF_BLOCKED",
                "error_message": str(e),
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 100,
                "structured_evidence": {
                    "source": "WHOIS_SERVICE",
                    "error": "SSRF_BLOCKED",
                    "details": str(e)
                }
            }

        # 3. Query RDAP (Registration Data Access Protocol - modern standard)
        rdap_data, rdap_error = self._query_rdap(domain)

        # 4. If RDAP was insufficient, attempt safe TCP WHOIS fallback
        whois_data = None
        if not rdap_data:
            whois_data, whois_error = self._query_tcp_whois(domain)

        if not rdap_data and not whois_data:
            err_msg = rdap_error or whois_error or "WHOIS lookup service unavailable."
            return {
                "domain": domain,
                "status": "NOT_FOUND" if "not found" in err_msg.lower() or "404" in err_msg else "ERROR",
                "error_message": err_msg,
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 50,
                "structured_evidence": {
                    "source": "WHOIS_SERVICE",
                    "error": err_msg
                }
            }

        # 5. Extract and normalize fields
        parsed = self._normalize_record(domain, rdap_data, whois_data)

        # 6. Generate security indicators
        indicators = self._generate_indicators(parsed)

        # 7. Deterministic threat scoring
        threat_score, severity, confidence = self._calculate_whois_threat_score(parsed, indicators)

        # 8. Build structured evidence
        structured_evidence = {
            "source": "WHOIS_SERVICE",
            "domain": domain,
            "registrar": parsed["registrar"],
            "creation_date": parsed["created_date"],
            "updated_date": parsed["updated_date"],
            "expiration_date": parsed["expires_date"],
            "domain_age_days": parsed["domain_age_days"],
            "days_until_expiration": parsed["days_until_expiration"],
            "age_category": parsed["age_category"],
            "expiration_category": parsed["expiration_category"],
            "nameservers": parsed["nameservers"],
            "domain_status": parsed["domain_status"],
            "registrant": {
                "organization": parsed["registrant_org"],
                "country": parsed["registrant_country"],
                "is_privacy_protected": parsed["is_privacy_protected"],
            },
            "dnssec": parsed["dnssec"],
            "security": {
                "indicators": indicators,
                "indicator_count": len(indicators),
            },
            "risk": {
                "score": threat_score,
                "severity": severity,
                "confidence": confidence,
            }
        }

        return {
            "domain": domain,
            "status": "SUCCESS",
            "registrar": parsed["registrar"],
            "registry_domain_id": parsed["registry_domain_id"],
            "created_date": parsed["created_date"],
            "updated_date": parsed["updated_date"],
            "expires_date": parsed["expires_date"],
            "domain_age_days": parsed["domain_age_days"],
            "days_until_expiration": parsed["days_until_expiration"],
            "age_category": parsed["age_category"],
            "expiration_category": parsed["expiration_category"],
            "nameservers": parsed["nameservers"],
            "domain_status": parsed["domain_status"],
            "registrant_org": parsed["registrant_org"],
            "registrant_country": parsed["registrant_country"],
            "dnssec": parsed["dnssec"],
            "security_indicators": indicators,
            "threat_score": threat_score,
            "severity": severity,
            "confidence": confidence,
            "error_message": None,
            "structured_evidence": structured_evidence,
        }

    def _query_rdap(self, domain: str) -> tuple[dict | None, str | None]:
        """Queries ICANN / IANA RDAP endpoints for standard JSON registration data."""
        # Query public bootstrap RDAP router
        rdap_url = f"https://rdap.org/domain/{domain}"
        try:
            headers = {"User-Agent": "CyberGuardian-AI/1.0 (Defensive Security Scanner)"}
            resp = requests.get(rdap_url, headers=headers, timeout=self.timeout, allow_redirects=True)
            if resp.status_code == 200:
                return resp.json(), None
            elif resp.status_code == 404:
                return None, "Domain registration not found in RDAP database (404)."
            else:
                return None, f"RDAP lookup returned HTTP {resp.status_code}."
        except requests.Timeout:
            return None, f"RDAP query timed out after {self.timeout}s."
        except Exception as e:
            return None, f"RDAP query failed: {str(e)}"

    def _query_tcp_whois(self, domain: str) -> tuple[str | None, str | None]:
        """Queries IANA port 43 WHOIS server as fallback."""
        try:
            # 1. Ask whois.iana.org for the authoritative WHOIS server
            tld = domain.split('.')[-1]
            server = "whois.iana.org"
            
            with socket.create_connection((server, 43), timeout=self.timeout) as s:
                s.sendall(f"{domain}\r\n".encode("utf-8"))
                response = b""
                while True:
                    chunk = s.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                iana_text = response.decode("utf-8", errors="ignore")

            # Extract refer server if provided
            refer_match = re.search(r'refer:\s*([^\s]+)', iana_text, re.IGNORECASE) or re.search(r'whois:\s*([^\s]+)', iana_text, re.IGNORECASE)
            auth_server = refer_match.group(1).strip() if refer_match else f"whois.nic.{tld}"

            # Validate auth server against SSRF
            try:
                validate_target_ssrf(auth_server, 43)
            except Exception:
                return iana_text, None

            # 2. Query authoritative WHOIS server
            with socket.create_connection((auth_server, 43), timeout=self.timeout) as s:
                s.sendall(f"{domain}\r\n".encode("utf-8"))
                raw_resp = b""
                while True:
                    chunk = s.recv(4096)
                    if not chunk:
                        break
                    raw_resp += chunk
                return raw_resp.decode("utf-8", errors="ignore"), None

        except socket.timeout:
            return None, f"WHOIS port 43 query timed out after {self.timeout}s."
        except Exception as e:
            return None, f"WHOIS socket query error: {str(e)}"

    def _normalize_record(self, domain: str, rdap: dict | None, whois_raw: str | None) -> dict:
        """Parses and normalizes RDAP JSON or raw WHOIS text into a standard dict."""
        registrar = "NOT_AVAILABLE"
        registry_id = "NOT_AVAILABLE"
        created_str = None
        updated_str = None
        expires_str = None
        nameservers = []
        status_list = []
        registrant_org = "NOT_AVAILABLE"
        registrant_country = "NOT_AVAILABLE"
        dnssec = "UNSIGNED"

        if rdap:
            # Domain Status
            status_list = rdap.get('status', [])
            registry_id = rdap.get('handle', 'NOT_AVAILABLE')

            # Entities (Registrar, Registrant)
            for entity in rdap.get('entities', []):
                roles = entity.get('roles', [])
                vcard = entity.get('vcardArray', [])
                name = "NOT_AVAILABLE"
                org = "NOT_AVAILABLE"
                country = "NOT_AVAILABLE"

                if len(vcard) > 1:
                    for entry in vcard[1]:
                        if entry[0] == 'fn':
                            name = entry[3]
                        elif entry[0] == 'org':
                            org = entry[3] if isinstance(entry[3], str) else (entry[3][0] if entry[3] else "NOT_AVAILABLE")
                        elif entry[0] == 'adr' and len(entry) > 3 and isinstance(entry[3], list) and len(entry[3]) > 6:
                            country = entry[3][6]

                if 'registrar' in roles:
                    registrar = name if name != "NOT_AVAILABLE" else (org if org != "NOT_AVAILABLE" else entity.get('handle', 'NOT_AVAILABLE'))
                if 'registrant' in roles:
                    registrant_org = org if org != "NOT_AVAILABLE" else name
                    registrant_country = country

            # Events (Dates)
            for event in rdap.get('events', []):
                action = event.get('eventAction')
                date_val = event.get('eventDate')
                if action == 'registration':
                    created_str = date_val
                elif action == 'last changed' or action == 'last update':
                    updated_str = date_val
                elif action == 'expiration':
                    expires_str = date_val

            # Nameservers
            for ns in rdap.get('nameservers', []):
                ldh_name = ns.get('ldhName')
                if ldh_name:
                    nameservers.append(ldh_name.lower())

            # DNSSEC
            sec_dns = rdap.get('secureDNS', {})
            if sec_dns.get('delegationSigned') or sec_dns.get('zoneSigned'):
                dnssec = "SIGNED"

        elif whois_raw:
            # Fallback regex parsing on raw WHOIS text
            reg_match = re.search(r'Registrar:\s*(.+)', whois_raw, re.IGNORECASE)
            if reg_match:
                registrar = reg_match.group(1).strip()

            c_match = re.search(r'(Creation Date|Created|Registration Time):\s*(.+)', whois_raw, re.IGNORECASE)
            if c_match:
                created_str = c_match.group(2).strip()

            u_match = re.search(r'(Updated Date|Last Updated|Modified):\s*(.+)', whois_raw, re.IGNORECASE)
            if u_match:
                updated_str = u_match.group(2).strip()

            e_match = re.search(r'(Registry Expiry Date|Expiration Date|Expires):\s*(.+)', whois_raw, re.IGNORECASE)
            if e_match:
                expires_str = e_match.group(2).strip()

            ns_matches = re.findall(r'Name Server:\s*([^\s]+)', whois_raw, re.IGNORECASE)
            nameservers = [ns.lower() for ns in ns_matches]

            status_matches = re.findall(r'Domain Status:\s*([^\s]+)', whois_raw, re.IGNORECASE)
            status_list = list(set(status_matches))

            org_match = re.search(r'Registrant Organization:\s*(.+)', whois_raw, re.IGNORECASE)
            if org_match:
                registrant_org = org_match.group(1).strip()

            country_match = re.search(r'Registrant Country:\s*(.+)', whois_raw, re.IGNORECASE)
            if country_match:
                registrant_country = country_match.group(1).strip()

            dnssec_match = re.search(r'DNSSEC:\s*(.+)', whois_raw, re.IGNORECASE)
            if dnssec_match:
                val = dnssec_match.group(1).lower()
                dnssec = "SIGNED" if "signed" in val and "unsigned" not in val else "UNSIGNED"

        # Check privacy protection
        is_privacy = False
        for kw in PRIVACY_KEYWORDS:
            if kw in registrant_org.lower() or kw in registrar.lower():
                is_privacy = True
                registrant_org = "REDACTED_FOR_PRIVACY"
                break

        # Calculate Dates, Age, and Expiration
        created_dt = _parse_iso_or_date(created_str)
        updated_dt = _parse_iso_or_date(updated_str)
        expires_dt = _parse_iso_or_date(expires_str)

        now = datetime.now(timezone.utc)
        domain_age_days = None
        days_until_exp = None

        if created_dt:
            domain_age_days = max(0, (now - created_dt).days)
            age_category = "NEW" if domain_age_days < NEW_DOMAIN_THRESHOLD_DAYS else "ESTABLISHED"
        else:
            age_category = "UNKNOWN"

        if expires_dt:
            days_until_exp = (expires_dt - now).days
            if days_until_exp <= 0:
                exp_category = "EXPIRED"
            elif days_until_exp <= EXPIRING_SOON_THRESHOLD_DAYS:
                exp_category = "EXPIRING_SOON"
            else:
                exp_category = "ACTIVE"
        else:
            exp_category = "UNKNOWN"

        return {
            "registrar": registrar,
            "registry_domain_id": registry_id,
            "created_date": created_dt.isoformat() if created_dt else None,
            "updated_date": updated_dt.isoformat() if updated_dt else None,
            "expires_date": expires_dt.isoformat() if expires_dt else None,
            "domain_age_days": domain_age_days,
            "days_until_expiration": days_until_exp,
            "age_category": age_category,
            "expiration_category": exp_category,
            "nameservers": nameservers,
            "domain_status": status_list,
            "registrant_org": registrant_org,
            "registrant_country": registrant_country,
            "is_privacy_protected": is_privacy,
            "dnssec": dnssec,
            "created_dt": created_dt,
            "updated_dt": updated_dt,
            "expires_dt": expires_dt,
        }

    def _generate_indicators(self, parsed: dict) -> list[dict]:
        """Generates structured WHOIS risk indicators."""
        indicators = []
        now = datetime.now(timezone.utc)

        # 1. Newly registered domain (frequent vector for phishing & throwaway C2)
        if parsed["age_category"] == "NEW":
            indicators.append({
                "type": "NEWLY_REGISTERED_DOMAIN",
                "severity": "MEDIUM",
                "description": f"Domain was registered recently ({parsed['domain_age_days']} days ago < 30 days).",
                "evidence": {"age_days": parsed["domain_age_days"], "created_date": parsed["created_date"]}
            })

        # 2. Expired Domain
        if parsed["expiration_category"] == "EXPIRED":
            indicators.append({
                "type": "EXPIRED_DOMAIN",
                "severity": "HIGH",
                "description": f"Domain registration expired {abs(parsed['days_until_expiration'] or 0)} days ago.",
                "evidence": {"days_until_expiration": parsed["days_until_expiration"], "expires_date": parsed["expires_date"]}
            })
        elif parsed["expiration_category"] == "EXPIRING_SOON":
            indicators.append({
                "type": "EXPIRING_SOON",
                "severity": "LOW",
                "description": f"Domain registration expires soon in {parsed['days_until_expiration']} days.",
                "evidence": {"days_until_expiration": parsed["days_until_expiration"], "expires_date": parsed["expires_date"]}
            })

        # 3. Recently updated domain
        if parsed["updated_dt"]:
            update_age_days = (now - parsed["updated_dt"]).days
            if 0 <= update_age_days <= RECENTLY_UPDATED_THRESHOLD_DAYS:
                indicators.append({
                    "type": "RECENTLY_UPDATED_REGISTRATION",
                    "severity": "LOW",
                    "description": f"Domain registration was updated within the last {update_age_days} days.",
                    "evidence": {"updated_days_ago": update_age_days, "updated_date": parsed["updated_date"]}
                })

        # 4. Missing nameservers
        if not parsed["nameservers"]:
            indicators.append({
                "type": "MISSING_NAMESERVERS",
                "severity": "MEDIUM",
                "description": "No authoritative nameservers listed for this domain registration.",
                "evidence": {"nameservers": []}
            })

        # 5. DNSSEC not enabled
        if parsed["dnssec"] == "UNSIGNED":
            indicators.append({
                "type": "DNSSEC_NOT_CONFIGURED",
                "severity": "LOW",
                "description": "DNSSEC is not configured or active for this domain.",
                "evidence": {"dnssec": "UNSIGNED"}
            })

        return indicators

    def _calculate_whois_threat_score(self, parsed: dict, indicators: list[dict]) -> tuple[int, str, int]:
        """
        Deterministic WHOIS Risk Score (0-100), Severity, and Confidence.
        """
        score = 0

        # Domain age scoring (New domains carry initial baseline risk)
        if parsed["age_category"] == "NEW":
            score += 30
        elif parsed["age_category"] == "UNKNOWN":
            score += 10

        # Expired domain
        if parsed["expiration_category"] == "EXPIRED":
            score += 40

        # Aggregate indicators
        for ind in indicators:
            sev = ind.get("severity", "LOW")
            if sev == "CRITICAL":
                score += 35
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

        # Confidence
        confidence = 90 if parsed["created_date"] and parsed["registrar"] != "NOT_AVAILABLE" else 65

        return final_score, severity, confidence
