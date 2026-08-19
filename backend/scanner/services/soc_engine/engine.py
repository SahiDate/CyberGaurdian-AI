import re
import ipaddress
import time
from urllib.parse import urlparse
from typing import Dict, List, Any, Optional, Tuple


def extract_registrable_domain(hostname: str) -> str:
    """Extract registrable domain from hostname (e.g. 'sub.example.co.uk' -> 'example.co.uk')."""
    if not hostname:
        return ""
    hostname = hostname.lower().strip().strip('.')

    try:
        ipaddress.ip_address(hostname)
        return hostname
    except ValueError:
        pass

    parts = hostname.split('.')
    if len(parts) <= 2:
        return hostname

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


def extract_target_identifiers(target: str) -> Dict[str, Any]:
    """
    Extracts normalized identifiers (domain, hostname, IP, file hash) from a raw target string.
    """
    if not target or not isinstance(target, str):
        return {"target": "", "target_type": "UNKNOWN", "domain": "", "hostname": "", "ip": "", "file_hash": ""}

    cleaned = target.strip()

    # Check if target is a 64-char SHA256 hex hash
    if re.match(r'^[a-fA-F0-9]{64}$', cleaned):
        return {
            "target": cleaned.lower(),
            "target_type": "FILE",
            "domain": "",
            "hostname": "",
            "ip": "",
            "file_hash": cleaned.lower()
        }

    # Check if target is an IP address
    try:
        ip_obj = ipaddress.ip_address(cleaned)
        return {
            "target": str(ip_obj),
            "target_type": "IP",
            "domain": "",
            "hostname": str(ip_obj),
            "ip": str(ip_obj),
            "file_hash": ""
        }
    except ValueError:
        pass

    # Target is a URL or Hostname/Domain
    is_url = "://" in cleaned or cleaned.startswith("//") or "/" in cleaned
    hostname = cleaned

    if "://" in cleaned or cleaned.startswith("//"):
        parsed = urlparse(cleaned if "://" in cleaned else f"http://{cleaned}")
        hostname = parsed.hostname or cleaned
    elif "/" in cleaned:
        hostname = cleaned.split('/')[0]

    # Strip port if present
    if ':' in hostname and not hostname.count(':') > 1:
        hostname = hostname.split(':')[0]

    hostname = hostname.strip().lower()
    domain = extract_registrable_domain(hostname)

    return {
        "target": cleaned,
        "target_type": "URL" if is_url else "DOMAIN",
        "domain": domain.lower(),
        "hostname": hostname.lower(),
        "ip": "",
        "file_hash": ""
    }


class SOCAnalysisEngine:
    """
    Deterministic SOC Analysis Engine for CyberGuardian AI.
    Normalizes multi-module telemetry, correlates findings across target entities,
    deduplicates observations, and calculates 100% deterministic risk scores, severity,
    confidence, threat levels, and actionable recommendations without an LLM.
    """

    def __init__(self):
        pass

    def analyze_evidence(
        self,
        target: str,
        threat_intel: Optional[Any] = None,
        file_analysis: Optional[Any] = None,
        ssl_scan: Optional[Any] = None,
        whois_lookup: Optional[Any] = None,
        url_scan: Optional[Any] = None,
        port_scan: Optional[Any] = None,
        website_scan: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Executes deterministic correlation and assessment across provided scan artifacts.
        """
        start_time = time.time()
        identifiers = extract_target_identifiers(target)

        raw_evidence_list: List[Dict[str, Any]] = []
        evidence_sources: List[str] = []
        source_records: Dict[str, Any] = {}

        # 1. Normalize Threat Intelligence Evidence
        if threat_intel:
            evidence_sources.append("THREAT_INTELLIGENCE")
            source_records["threat_intelligence"] = getattr(threat_intel, 'id', None)
            ti_ev = self._normalize_threat_intel(threat_intel, identifiers)
            raw_evidence_list.extend(ti_ev)

        # 2. Normalize File Analysis Evidence
        if file_analysis:
            evidence_sources.append("FILE_ANALYZER")
            source_records["file_analysis"] = getattr(file_analysis, 'id', None)
            fa_ev = self._normalize_file_analysis(file_analysis, identifiers)
            raw_evidence_list.extend(fa_ev)

        # 3. Normalize SSL Scanner Evidence
        if ssl_scan:
            evidence_sources.append("SSL_SCANNER")
            source_records["ssl_scan"] = getattr(ssl_scan, 'id', None)
            ssl_ev = self._normalize_ssl_scan(ssl_scan, identifiers)
            raw_evidence_list.extend(ssl_ev)

        # 4. Normalize WHOIS Evidence
        if whois_lookup:
            evidence_sources.append("WHOIS")
            source_records["whois_lookup"] = getattr(whois_lookup, 'id', None)
            whois_ev = self._normalize_whois_lookup(whois_lookup, identifiers)
            raw_evidence_list.extend(whois_ev)

        # 5. Normalize URL Scanner Evidence
        if url_scan:
            evidence_sources.append("URL_SCANNER")
            source_records["url_scan"] = getattr(url_scan, 'id', None)
            url_ev = self._normalize_url_scan(url_scan, identifiers)
            raw_evidence_list.extend(url_ev)

        # 6. Normalize Port Scanner Evidence
        if port_scan:
            evidence_sources.append("PORT_SCANNER")
            source_records["port_scan"] = getattr(port_scan, 'id', None)
            port_ev = self._normalize_port_scan(port_scan, identifiers)
            raw_evidence_list.extend(port_ev)

        # 7. Normalize Website Scanner Evidence
        if website_scan:
            evidence_sources.append("WEBSITE_SCANNER")
            source_records["website_scan"] = getattr(website_scan, 'id', None)
            web_ev = self._normalize_website_scan(website_scan, identifiers)
            raw_evidence_list.extend(web_ev)

        # Execute Correlation Rules
        correlations = self._evaluate_correlation_rules(
            threat_intel=threat_intel,
            file_analysis=file_analysis,
            ssl_scan=ssl_scan,
            whois_lookup=whois_lookup,
            url_scan=url_scan,
            port_scan=port_scan,
            raw_evidence=raw_evidence_list
        )

        # Generate Deduplicated Unified Findings
        findings = self._generate_findings(raw_evidence_list, correlations)

        # Calculate Deterministic Metrics
        risk_score, severity, confidence, threat_level = self._calculate_soc_metrics(
            findings=findings,
            correlations=correlations,
            evidence_sources=evidence_sources,
            raw_evidence_count=len(raw_evidence_list)
        )

        # Generate Actionable Recommendations & Executive Summary
        recommendations = self._generate_soc_recommendations(findings, correlations)
        summary = self._generate_executive_summary(
            target=target,
            risk_score=risk_score,
            severity=severity,
            threat_level=threat_level,
            findings=findings,
            correlations=correlations,
            evidence_sources=evidence_sources
        )

        analysis_duration = round(time.time() - start_time, 2)

        return {
            "target": target,
            "analysis_type": identifiers.get("target_type", "COMPOSITE"),
            "target_identifiers": identifiers,
            "risk_score": risk_score,
            "severity": severity,
            "confidence": confidence,
            "threat_level": threat_level,
            "summary": summary,
            "findings": findings,
            "correlations": correlations,
            "recommendations": recommendations,
            "evidence_sources": evidence_sources,
            "source_records": source_records,
            "raw_evidence_count": len(raw_evidence_list),
            "status": "COMPLETED" if evidence_sources else "PARTIAL",
            "analysis_duration": analysis_duration
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Evidence Normalization Subsystems
    # ──────────────────────────────────────────────────────────────────────────

    def _normalize_threat_intel(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        score = getattr(record, 'threat_score', 0)
        vt_data = getattr(record, 'virustotal_data', {}) or {}
        abuse_data = getattr(record, 'abuseipdb_data', {}) or {}
        urlscan_data = getattr(record, 'urlscan_data', {}) or {}

        vt_positives = vt_data.get('positives', 0) if isinstance(vt_data, dict) else 0
        abuse_confidence = abuse_data.get('abuseConfidenceScore', 0) if isinstance(abuse_data, dict) else 0

        if score >= 50 or vt_positives >= 3 or abuse_confidence >= 50:
            evidence.append({
                "source": "THREAT_INTELLIGENCE",
                "category": "REPUTATION",
                "indicator": "HIGH_CONFIDENCE_MALICIOUS_REPUTATION",
                "severity": "CRITICAL" if score >= 75 or vt_positives >= 5 else "HIGH",
                "confidence": 95,
                "description": f"Threat intelligence feeds flag target as malicious (Score: {score}/100, VT Positives: {vt_positives}, Abuse Confidence: {abuse_confidence}%).",
                "evidence_data": {
                    "threat_score": score,
                    "virustotal_positives": vt_positives,
                    "abuse_confidence": abuse_confidence
                }
            })
        elif score >= 20 or vt_positives >= 1 or abuse_confidence >= 20:
            evidence.append({
                "source": "THREAT_INTELLIGENCE",
                "category": "REPUTATION",
                "indicator": "SUSPICIOUS_REPUTATION_FLAGGED",
                "severity": "MEDIUM",
                "confidence": 85,
                "description": f"Target exhibits suspicious reputation metrics across threat feeds (Score: {score}/100).",
                "evidence_data": {
                    "threat_score": score,
                    "virustotal_positives": vt_positives
                }
            })

        return evidence

    def _normalize_file_analysis(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        score = getattr(record, 'threat_score', 0)
        yara_matches = getattr(record, 'yara_matches', []) or []
        script_findings = getattr(record, 'script_findings', []) or []
        entropy = getattr(record, 'entropy', 0.0)
        mime_mismatch = getattr(record, 'mime_type_mismatch', False)

        if yara_matches:
            evidence.append({
                "source": "FILE_ANALYZER",
                "category": "MALWARE",
                "indicator": "YARA_RULE_SIGNATURE_MATCHED",
                "severity": "CRITICAL",
                "confidence": 98,
                "description": f"YARA rules matched known malicious patterns: {', '.join(yara_matches[:3])}.",
                "evidence_data": {"yara_matches": yara_matches}
            })

        if score >= 75:
            evidence.append({
                "source": "FILE_ANALYZER",
                "category": "FILE",
                "indicator": "HIGH_RISK_MALICIOUS_FILE_CHARACTERISTICS",
                "severity": "CRITICAL",
                "confidence": 95,
                "description": f"File demonstrates high-risk malicious characteristics (Threat Score: {score}/100).",
                "evidence_data": {"threat_score": score}
            })
        elif score >= 40:
            evidence.append({
                "source": "FILE_ANALYZER",
                "category": "FILE",
                "indicator": "SUSPICIOUS_FILE_HEURISTICS",
                "severity": "MEDIUM",
                "confidence": 85,
                "description": f"File exhibits suspicious heuristic indicators (Score: {score}/100, Entropy: {entropy}).",
                "evidence_data": {"threat_score": score, "entropy": entropy}
            })

        if mime_mismatch:
            evidence.append({
                "source": "FILE_ANALYZER",
                "category": "FILE",
                "indicator": "FILE_EXTENSION_MAGIC_BYTE_MISMATCH",
                "severity": "MEDIUM",
                "confidence": 90,
                "description": "File extension does not match true internal magic bytes, indicating obfuscation.",
                "evidence_data": {"mime_mismatch": True}
            })

        return evidence

    def _normalize_ssl_scan(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        cert_status = getattr(record, 'certificate_status', 'UNKNOWN')
        days_left = getattr(record, 'days_until_expiration', None)
        is_self_signed = getattr(record, 'is_self_signed', False)
        cipher_strength = getattr(record, 'cipher_strength', 'STRONG')

        if cert_status == 'EXPIRED':
            evidence.append({
                "source": "SSL_SCANNER",
                "category": "TLS",
                "indicator": "SSL_CERTIFICATE_EXPIRED",
                "severity": "HIGH",
                "confidence": 99,
                "description": "TLS certificate has expired, rendering encrypted communications untrusted.",
                "evidence_data": {"status": cert_status, "days_until_expiration": days_left}
            })
        elif cert_status == 'EXPIRING_SOON' or (days_left is not None and days_left <= 14):
            evidence.append({
                "source": "SSL_SCANNER",
                "category": "TLS",
                "indicator": "SSL_CERTIFICATE_EXPIRING_SOON",
                "severity": "MEDIUM",
                "confidence": 95,
                "description": f"TLS certificate will expire in {days_left} days.",
                "evidence_data": {"days_until_expiration": days_left}
            })

        if is_self_signed:
            evidence.append({
                "source": "SSL_SCANNER",
                "category": "TLS",
                "indicator": "SELF_SIGNED_CERTIFICATE_DETECTED",
                "severity": "HIGH",
                "confidence": 98,
                "description": "Certificate is self-signed and not signed by a trusted Public Certificate Authority.",
                "evidence_data": {"is_self_signed": True}
            })

        if cipher_strength == 'WEAK':
            evidence.append({
                "source": "SSL_SCANNER",
                "category": "TLS",
                "indicator": "WEAK_CIPHER_SUITE_ENABLED",
                "severity": "MEDIUM",
                "confidence": 90,
                "description": "TLS configuration permits weak or legacy ciphers vulnerable to cryptographic attacks.",
                "evidence_data": {"cipher_strength": cipher_strength}
            })

        return evidence

    def _normalize_whois_lookup(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        age_cat = getattr(record, 'age_category', 'UNKNOWN')
        age_days = getattr(record, 'domain_age_days', None)
        exp_cat = getattr(record, 'expiration_category', 'UNKNOWN')
        dnssec = getattr(record, 'dnssec', 'UNSIGNED')

        if age_cat == 'NEW' or (age_days is not None and age_days <= 30):
            evidence.append({
                "source": "WHOIS",
                "category": "DOMAIN",
                "indicator": "RECENTLY_REGISTERED_DOMAIN",
                "severity": "MEDIUM",
                "confidence": 95,
                "description": f"Domain was registered very recently ({age_days} days ago), a pattern common in phishing and disposable attack domains.",
                "evidence_data": {"domain_age_days": age_days, "age_category": age_cat}
            })

        if exp_cat == 'EXPIRED':
            evidence.append({
                "source": "WHOIS",
                "category": "DOMAIN",
                "indicator": "WHOIS_DOMAIN_EXPIRED",
                "severity": "HIGH",
                "confidence": 95,
                "description": "Domain registration has lapsed/expired.",
                "evidence_data": {"expiration_category": exp_cat}
            })

        return evidence

    def _normalize_url_scan(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        indicators = getattr(record, 'indicators', []) or []
        redirect_count = getattr(record, 'redirect_count', 0)
        status_val = getattr(record, 'status', 'SUCCESS')

        for ind in indicators:
            ind_type = ind.get('type', 'URL_INDICATOR')
            sev = ind.get('severity', 'LOW')
            desc = ind.get('description', '')

            evidence.append({
                "source": "URL_SCANNER",
                "category": "URL",
                "indicator": ind_type,
                "severity": sev,
                "confidence": 90,
                "description": desc,
                "evidence_data": ind
            })

        if status_val == 'SSRF_BLOCKED':
            evidence.append({
                "source": "URL_SCANNER",
                "category": "NETWORK",
                "indicator": "SSRF_DESTINATION_BLOCKED",
                "severity": "HIGH",
                "confidence": 99,
                "description": "URL attempted connection to a restricted/private network destination and was neutralized.",
                "evidence_data": {"status": status_val}
            })

        return evidence

    def _normalize_port_scan(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        indicators = getattr(record, 'indicators', []) or []
        open_ports = getattr(record, 'open_ports', []) or []

        for ind in indicators:
            ind_type = ind.get('type', 'PORT_INDICATOR')
            sev = ind.get('severity', 'LOW')
            desc = ind.get('description', '')

            evidence.append({
                "source": "PORT_SCANNER",
                "category": "NETWORK",
                "indicator": ind_type,
                "severity": sev,
                "confidence": 95,
                "description": desc,
                "evidence_data": ind
            })

        return evidence

    def _normalize_website_scan(self, record: Any, identifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence = []
        vulns = getattr(record, 'vulnerabilities', []) or []
        risk_score = getattr(record, 'risk_score', 0)

        for vuln in vulns:
            name = vuln.get('name', 'Vulnerability') if isinstance(vuln, dict) else str(vuln)
            sev = vuln.get('severity', 'MEDIUM') if isinstance(vuln, dict) else 'MEDIUM'
            evidence.append({
                "source": "WEBSITE_SCANNER",
                "category": "WEB_APP",
                "indicator": f"WEB_VULNERABILITY_{name.upper().replace(' ', '_')}",
                "severity": sev,
                "confidence": 88,
                "description": f"Website scanner detected security issue: {name}.",
                "evidence_data": vuln if isinstance(vuln, dict) else {"name": name}
            })

        return evidence

    # ──────────────────────────────────────────────────────────────────────────
    # Correlation Rules Subsystem
    # ──────────────────────────────────────────────────────────────────────────

    def _evaluate_correlation_rules(
        self,
        threat_intel: Any,
        file_analysis: Any,
        ssl_scan: Any,
        whois_lookup: Any,
        url_scan: Any,
        port_scan: Any,
        raw_evidence: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Executes deterministic multi-source correlation rules.
        """
        correlations = []
        all_indicators = {e["indicator"] for e in raw_evidence}
        all_sources = {e["source"] for e in raw_evidence}

        # RULE 1: Brand New Domain + Suspicious/Malicious Reputation
        has_new_domain = "RECENTLY_REGISTERED_DOMAIN" in all_indicators
        has_bad_rep = any(ind in all_indicators for ind in ("HIGH_CONFIDENCE_MALICIOUS_REPUTATION", "SUSPICIOUS_REPUTATION_FLAGGED"))
        if has_new_domain and has_bad_rep:
            correlations.append({
                "rule_id": "CORR-001",
                "title": "Newly Registered Domain with Malicious Threat Reputation",
                "severity": "CRITICAL",
                "confidence": 95,
                "sources": ["WHOIS", "THREAT_INTELLIGENCE"],
                "description": "Target domain was registered within the past 30 days and matches active malicious threat intelligence feeds, strongly indicating a disposable phishing or malware distribution campaign."
            })

        # RULE 2: Suspicious Redirect / Phishing Keywords + Bad Reputation
        has_phish_url = any(ind in all_indicators for ind in ("SUSPICIOUS_PHISHING_KEYWORDS", "DOUBLE_URL_ENCODING", "EMBEDDED_CREDENTIALS_USERINFO", "PUNYCODE_DOMAIN"))
        if has_phish_url and has_bad_rep:
            correlations.append({
                "rule_id": "CORR-002",
                "title": "Deceptive URL Structure Paired with Flagged Reputation",
                "severity": "CRITICAL",
                "confidence": 96,
                "sources": ["URL_SCANNER", "THREAT_INTELLIGENCE"],
                "description": "Target URL utilizes deceptive syntactic evasion patterns (punycode, credential embedding, double encoding, or phishing terms) and matches negative threat intelligence reputation."
            })

        # RULE 3: Public Internet-Facing Target + Exposed Database Service
        has_db_exposed = "DATABASE_PORT_EXPOSED" in all_indicators
        has_web_or_domain = (
            url_scan is not None or
            ssl_scan is not None or
            whois_lookup is not None or
            any(s in all_sources for s in ("URL_SCANNER", "SSL_SCANNER", "WHOIS", "WEBSITE_SCANNER"))
        )
        if has_db_exposed and has_web_or_domain:
            primary_web_source = "URL_SCANNER" if (url_scan is not None or "URL_SCANNER" in all_sources) else ("SSL_SCANNER" if ssl_scan is not None else "WHOIS")
            correlations.append({
                "rule_id": "CORR-003",
                "title": "Public Web Asset Directly Exposing Database Port",
                "severity": "HIGH",
                "confidence": 95,
                "sources": ["PORT_SCANNER", primary_web_source],
                "description": "Internet-facing web host directly exposes backend database ports (MySQL, PostgreSQL, MongoDB, MSSQL, Redis) to external networks, bypassing network DMZ isolation."
            })

        # RULE 4: Expired / Self-Signed SSL + Protocol Downgrade / Cleartext
        has_bad_ssl = any(ind in all_indicators for ind in ("SSL_CERTIFICATE_EXPIRED", "SELF_SIGNED_CERTIFICATE_DETECTED"))
        has_downgrade = any(ind in all_indicators for ind in ("HTTPS_TO_HTTP_DOWNGRADE", "UNENCRYPTED_LEGACY_SERVICE"))
        if has_bad_ssl and has_downgrade:
            correlations.append({
                "rule_id": "CORR-004",
                "title": "Compromised Transport Layer: Invalid Certificate & Plaintext Fallback",
                "severity": "HIGH",
                "confidence": 92,
                "sources": ["SSL_SCANNER", "URL_SCANNER" if "URL_SCANNER" in all_sources else "PORT_SCANNER"],
                "description": "The destination lacks trusted cryptographic guarantees and actively routes or accepts unencrypted communications, creating high vulnerability to interception and Man-in-the-Middle (MitM) attacks."
            })

        # RULE 5: High-Risk Management Exposure (Docker Daemon / Telnet / RDP)
        has_crit_port = any(ind in all_indicators for ind in ("DOCKER_UNAUTHENTICATED_API_EXPOSED", "UNENCRYPTED_LEGACY_SERVICE"))
        if has_crit_port:
            correlations.append({
                "rule_id": "CORR-005",
                "title": "Unauthenticated Remote Host Management Vector",
                "severity": "CRITICAL" if "DOCKER_UNAUTHENTICATED_API_EXPOSED" in all_indicators else "HIGH",
                "confidence": 96,
                "sources": ["PORT_SCANNER"],
                "description": "Host exposes unauthenticated or insecure administrative protocols directly to the internet, providing immediate lateral movement or host takeover opportunities."
            })

        # RULE 6: Malicious File Signature + Suspicious Reputation
        has_malware_file = any(ind in all_indicators for ind in ("YARA_RULE_SIGNATURE_MATCHED", "HIGH_RISK_MALICIOUS_FILE_CHARACTERISTICS"))
        if has_malware_file and has_bad_rep:
            correlations.append({
                "rule_id": "CORR-006",
                "title": "Confirmed Malicious File Signature with Corroborating Feed Telemetry",
                "severity": "CRITICAL",
                "confidence": 99,
                "sources": ["FILE_ANALYZER", "THREAT_INTELLIGENCE"],
                "description": "Uploaded binary or document matches definitive YARA malware signatures and corroborates known malicious threat feed IOC records."
            })

        return correlations

    # ──────────────────────────────────────────────────────────────────────────
    # Finding Generation & Deduplication
    # ──────────────────────────────────────────────────────────────────────────

    def _generate_findings(
        self,
        raw_evidence: List[Dict[str, Any]],
        correlations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Deduplicates raw evidence into unified traceable findings.
        """
        findings = []
        finding_counter = 1

        # Track grouped evidence by normalized topic
        grouped_topics: Dict[str, List[Dict[str, Any]]] = {}

        for ev in raw_evidence:
            cat = ev["category"]
            ind = ev["indicator"]

            # Map specific indicators into semantic group keys
            if "REPUTATION" in ind or "THREAT" in ind:
                key = "THREAT_REPUTATION"
            elif "YARA" in ind or "MALICIOUS_FILE" in ind or "MALWARE" in ind:
                key = "MALWARE_SIGNATURE"
            elif "SSL" in ind or "CERTIFICATE" in ind or "CIPHER" in ind:
                key = "TLS_CERTIFICATE_SECURITY"
            elif "DOMAIN" in ind or "WHOIS" in ind:
                key = "DOMAIN_REGISTRATION_POSTURE"
            elif "DATABASE" in ind:
                key = "EXPOSED_DATABASE_SERVICES"
            elif "REMOTE_ADMIN" in ind or "DOCKER" in ind:
                key = "EXPOSED_MANAGEMENT_SERVICES"
            elif "LEGACY" in ind or "DOWNGRADE" in ind:
                key = "UNENCRYPTED_PROTOCOLS"
            elif "URL" in ind or "PHISHING" in ind or "PUNYCODE" in ind:
                key = "SUSPICIOUS_URL_STRUCTURE"
            else:
                key = f"{cat}_{ind}"

            if key not in grouped_topics:
                grouped_topics[key] = []
            grouped_topics[key].append(ev)

        # Convert grouped topics into structured findings
        for key, ev_list in grouped_topics.items():
            sources = sorted(list({e["source"] for e in ev_list}))
            max_sev = self._get_highest_severity([e["severity"] for e in ev_list])
            avg_conf = int(sum(e["confidence"] for e in ev_list) / len(ev_list))

            # Bonus confidence when multiple independent sources agree
            if len(sources) > 1:
                avg_conf = min(100, avg_conf + 5)

            title = self._get_finding_title(key, ev_list)
            desc = self._get_finding_description(key, ev_list)
            rec = self._get_finding_recommendation(key, ev_list)

            findings.append({
                "finding_id": f"FIND-{finding_counter:03d}",
                "title": title,
                "category": ev_list[0]["category"],
                "severity": max_sev,
                "confidence": avg_conf,
                "description": desc,
                "sources": sources,
                "evidence": [e["evidence_data"] for e in ev_list if e.get("evidence_data")],
                "recommendation": rec
            })
            finding_counter += 1

        # Sort findings by severity descending (CRITICAL -> HIGH -> MEDIUM -> LOW)
        sev_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        findings.sort(key=lambda f: (sev_order.get(f["severity"], 0), f["confidence"]), reverse=True)

        return findings

    # ──────────────────────────────────────────────────────────────────────────
    # Risk & Threat Level Calculations
    # ──────────────────────────────────────────────────────────────────────────

    def _calculate_soc_metrics(
        self,
        findings: List[Dict[str, Any]],
        correlations: List[Dict[str, Any]],
        evidence_sources: List[str],
        raw_evidence_count: int
    ) -> Tuple[int, str, int, str]:
        """
        Calculates deterministic Risk Score (0-100), Severity, Confidence, and Threat Level.
        """
        if not findings and not correlations:
            return 0, "LOW", 75 if evidence_sources else 50, "LOW"

        sev_scores = {"CRITICAL": 35, "HIGH": 20, "MEDIUM": 10, "LOW": 3}
        score = 0

        # Finding base weights
        for f in findings:
            score += sev_scores.get(f["severity"], 5)

        # Correlation multipliers (inter-module agreement adds confirmed risk)
        for c in correlations:
            if c["severity"] == "CRITICAL":
                score += 20
            elif c["severity"] == "HIGH":
                score += 15
            else:
                score += 8

        # Multiple independent sources agreement bonus
        if len(evidence_sources) >= 3:
            score += 5

        risk_score = max(0, min(100, score))

        if risk_score >= 75:
            severity = "CRITICAL"
        elif risk_score >= 50:
            severity = "HIGH"
        elif risk_score >= 25:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # Calculate Confidence Score (0-100)
        base_conf = 70
        if len(evidence_sources) >= 4:
            base_conf += 15
        elif len(evidence_sources) >= 2:
            base_conf += 10

        if correlations:
            base_conf += 10

        if raw_evidence_count == 0:
            base_conf = 60

        confidence = max(40, min(99, base_conf))

        # Threat Level determination (contextual evaluation)
        if risk_score >= 75 and confidence >= 60:
            threat_level = "CRITICAL"
        elif risk_score >= 50 and confidence >= 50:
            threat_level = "HIGH"
        elif risk_score >= 50 and confidence < 50:
            threat_level = "REVIEW_REQUIRED"
        elif risk_score >= 25:
            threat_level = "MEDIUM"
        else:
            threat_level = "LOW"

        return risk_score, severity, confidence, threat_level

    # ──────────────────────────────────────────────────────────────────────────
    # Recommendation & Summary Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _generate_soc_recommendations(
        self,
        findings: List[Dict[str, Any]],
        correlations: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generates deterministic, deduplicated, actionable recommendations.
        """
        recs = []

        for c in correlations:
            if c["rule_id"] == "CORR-001":
                recs.append("Block or isolate the domain at firewall/DNS boundaries; newly registered domains with malicious reputation represent active threat campaigns.")
            elif c["rule_id"] == "CORR-002":
                recs.append("Immediately block the deceptive URL across web security gateways and inspect email gateways for matching phishing lures.")
            elif c["rule_id"] == "CORR-003":
                recs.append("Place exposed database ports behind a secure VPN/VPC boundary; terminate direct public network routing.")
            elif c["rule_id"] == "CORR-004":
                recs.append("Renew and deploy valid CA-signed TLS certificates and enforce strict HTTPS/HSTS to mitigate MitM vulnerabilities.")
            elif c["rule_id"] == "CORR-005":
                recs.append("Enforce mutual TLS or private bastion access for all remote administration ports (RDP, Docker API, Telnet).")
            elif c["rule_id"] == "CORR-006":
                recs.append("Quarantine the identified file artifact immediately and trigger endpoint isolation on affected hosts.")

        for f in findings:
            rec = f.get("recommendation")
            if rec and rec not in recs:
                recs.append(rec)

        if not recs:
            recs.append("Target displays clean telemetry across evaluated vectors. Maintain continuous monitoring and scheduled scanning.")

        return recs[:8]  # Bounded to top 8 most critical recommendations

    def _generate_executive_summary(
        self,
        target: str,
        risk_score: int,
        severity: str,
        threat_level: str,
        findings: List[Dict[str, Any]],
        correlations: List[Dict[str, Any]],
        evidence_sources: List[str]
    ) -> str:
        """
        Generates a deterministic human-readable SOC assessment summary.
        """
        src_str = ", ".join(evidence_sources) if evidence_sources else "None"

        if severity == "CRITICAL":
            headline = f"CRITICAL SECURITY ALERT: Multi-vector security analysis on '{target}' identified severe high-confidence exposure."
        elif severity == "HIGH":
            headline = f"HIGH RISK ADVISORY: Security evaluation on '{target}' revealed elevated risk indicators requiring proactive remediation."
        elif severity == "MEDIUM":
            headline = f"MODERATE CONCERN: Assessment on '{target}' noted operational security anomalies and potential exposure vectors."
        else:
            headline = f"LOW RISK: Assessment on '{target}' found no critical vulnerabilities across tested subsystems."

        details = []
        if correlations:
            top_corr = correlations[0]["title"]
            details.append(f"Primary cross-module correlation indicates: {top_corr}.")

        if findings:
            top_finding_titles = [f["title"] for f in findings[:2]]
            details.append(f"Key findings include: {'; '.join(top_finding_titles)}.")

        details.append(f"Analysis evaluated {len(findings)} findings across {len(evidence_sources)} telemetry sources ({src_str}) with an overall confidence score of {threat_level}.")

        return f"{headline} {' '.join(details)}"

    # ──────────────────────────────────────────────────────────────────────────
    # Utility Mapping Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _get_highest_severity(self, severities: List[str]) -> str:
        order = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        highest = "LOW"
        for s in severities:
            if order.index(s.upper()) > order.index(highest):
                highest = s.upper()
        return highest

    def _get_finding_title(self, key: str, ev_list: List[Dict[str, Any]]) -> str:
        titles = {
            "THREAT_REPUTATION": "Malicious or Suspicious Threat Intelligence Reputation",
            "MALWARE_SIGNATURE": "Malware Signatures and Malicious File Characteristics",
            "TLS_CERTIFICATE_SECURITY": "TLS/SSL Certificate and Transport Layer Weakness",
            "DOMAIN_REGISTRATION_POSTURE": "Anomalous or High-Risk Domain Registration Age",
            "EXPOSED_DATABASE_SERVICES": "Externally Accessible Database Services",
            "EXPOSED_MANAGEMENT_SERVICES": "Exposed Administrative & Management Interfaces",
            "UNENCRYPTED_PROTOCOLS": "Unencrypted Cleartext Network Protocols",
            "SUSPICIOUS_URL_STRUCTURE": "Deceptive URL Syntax and Redirection Anomalies",
        }
        return titles.get(key, ev_list[0].get("description", "Security Finding"))

    def _get_finding_description(self, key: str, ev_list: List[Dict[str, Any]]) -> str:
        descs = [e["description"] for e in ev_list if e.get("description")]
        return " ".join(descs) if descs else "Security evidence observed during telemetry ingestion."

    def _get_finding_recommendation(self, key: str, ev_list: List[Dict[str, Any]]) -> str:
        recs = {
            "THREAT_REPUTATION": "Audit domain/IP reputation metrics, verify origin authenticity, and block at perimeter if confirmed malicious.",
            "MALWARE_SIGNATURE": "Isolate affected hosts, quarantine the file, and perform dynamic sandbox detonation.",
            "TLS_CERTIFICATE_SECURITY": "Deploy valid CA-signed certificates and disable outdated SSL/TLS ciphers.",
            "DOMAIN_REGISTRATION_POSTURE": "Exercise heightened scrutiny for domains under 30 days old due to disposable attack patterns.",
            "EXPOSED_DATABASE_SERVICES": "Restrict database listener interfaces to localhost or secure private VPC subnets.",
            "EXPOSED_MANAGEMENT_SERVICES": "Disable public administrative ports or restrict access strictly to authenticated VPN bastions.",
            "UNENCRYPTED_PROTOCOLS": "Migrate cleartext protocols (Telnet, FTP, HTTP) to secure encrypted counterparts (SSH, SFTP, HTTPS).",
            "SUSPICIOUS_URL_STRUCTURE": "Inspect destination endpoints and train users to recognize homograph and obfuscated URLs.",
        }
        return recs.get(key, "Review the identified security indicators and apply recommended defense-in-depth controls.")
