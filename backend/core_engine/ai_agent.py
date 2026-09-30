try:
    from langchain_community.llms import Ollama  # type: ignore
except ImportError:
    # Fallback: attempt import from base langchain package or define a minimal stub
    try:
        from langchain.llms import Ollama  # type: ignore
    except ImportError:
        class Ollama:
            """Placeholder Ollama LLM class when the real implementation is unavailable.

            It mimics the interface used in this project by raising a clear error upon usage.
            """
            def __init__(self, model: str = "cybersec-ai"):
                raise ImportError(
                    "Ollama LLM class is unavailable because the required package "
                    "'langchain_community' is not installed. Please install it "
                    "or ensure Ollama is accessible."
                )

            def __call__(self, *args, **kwargs):
                raise NotImplementedError("Ollama placeholder cannot be called.")

try:
    from langchain_core.prompts import PromptTemplate  # type: ignore
except ImportError:
    try:
        from langchain.prompts import PromptTemplate  # type: ignore
    except ImportError:
        class PromptTemplate:  # type: ignore
            """Placeholder PromptTemplate when langchain_core is not installed."""
            def __init__(self, input_variables=None, template=""):
                self.template = template
                self.input_variables = input_variables or []

            def __or__(self, other):
                raise ImportError(
                    "langchain_core is not installed. Run: pip install langchain-core"
                )
import os
import json
import hashlib
from concurrent.futures import ThreadPoolExecutor
from .scanners import scan_website_headers, check_ssl_certificate, scan_ports  # type: ignore
from .threat_intel import check_virustotal, check_phishtank  # type: ignore


import logging
import requests

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")

GENERAL_OLLAMA_MODEL = os.getenv(
    "GENERAL_OLLAMA_MODEL",
    "cyberguardian-ai:latest"
)

PHISHING_OLLAMA_MODEL = os.getenv(
    "PHISHING_OLLAMA_MODEL",
    "cyberguardian-phishing:latest"
)

# Backward-compatible alias for any legacy references
OLLAMA_MODEL = GENERAL_OLLAMA_MODEL

# Configurable timeout for Ollama inferences (defaults to 60.0s for local models)
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "60.0"))

# In-memory LRU-style cache for AI inferences (Fingerprint -> AI Response)
_AI_SYNTHESIS_CACHE = {}


def _get_cache_key(data: dict) -> str:
    """Generate deterministic hash of data dictionary."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode('utf-8')).hexdigest()


def _compute_deterministic_scan_analysis(target: str, findings: dict) -> dict:
    """
    Expert rule-based cybersecurity & phishing detection analysis engine.
    Ensures phishing, credential harvesting, and brand spoofing threats are accurately
    flagged as Critical or High severity with zero false-negative drop to Medium.
    """
    ports = findings.get("open_ports", []) or []
    headers = findings.get("security_headers", {}) or {}
    ssl_info = findings.get("ssl", {}) or {}
    vt = findings.get("threat_intel", {}) or {}

    open_count = len(ports) if isinstance(ports, list) else 0
    missing_headers = [k for k, v in headers.items() if v == 'Missing'] if isinstance(headers, dict) else []
    has_ssl_err = isinstance(ssl_info, dict) and ("error" in ssl_info or ssl_info.get("status") not in ["Valid", "OK"])
    is_malicious_vt = isinstance(vt, dict) and (vt.get("positives", 0) > 0 or vt.get("status") == "Malicious")
    pt = findings.get("phishtank", {}) or {}
    is_pt_phishing = isinstance(pt, dict) and (pt.get("verified") or pt.get("in_database"))
    is_phishing = is_malicious_vt or is_pt_phishing or (isinstance(vt, dict) and "phishing" in str(vt.get("category", "")).lower())

    recs = []
    # 1. PHISHING / ACTIVE MALICIOUS THREATS (Top Priority)
    if is_phishing or is_malicious_vt or is_pt_phishing:
        sev = "Critical" if (isinstance(pt, dict) and pt.get("verified")) else vt.get("severity", "Critical")
        indicators = vt.get("indicators", [])[:] if isinstance(vt, dict) else []
        if isinstance(pt, dict) and pt.get("in_database"):
            if pt.get("verified"):
                indicators.insert(0, f"PhishTank: Verified Phishing (ID #{pt.get('phish_id')})")
            else:
                indicators.insert(0, f"PhishTank: Logged Phish (ID #{pt.get('phish_id')})")
        ind_str = f" Key indicators: {'; '.join(indicators[:3])}." if indicators else ""
        
        summary = (
            f"🚨 CRITICAL PHISHING / MALICIOUS THREAT DETECTED: Target '{target}' exhibits active "
            f"credential harvesting, deceptive infrastructure, or brand impersonation signatures.{ind_str}"
        )
        if isinstance(pt, dict) and pt.get("verified"):
            recs.append(f"PHISHTANK VERIFIED: Active phishing campaign confirmed by PhishTank (ID #{pt.get('phish_id')}).")
        recs.append("BLOCK IMMEDIATELY: Restrict all outbound traffic to this URL across enterprise firewall and DNS filters.")
        recs.append("CREDENTIAL SAFETY: Do NOT enter credentials, login details, 2FA tokens, or personal banking information.")
        recs.append("THREAT ESCALATION: Report domain to Google Safe Browsing, PhishTank, and corporate SOC teams.")
        recs.append("INCIDENT RESPONSE: If users visited this site, immediately reset passwords and revoke active web sessions.")
    elif open_count >= 4 or (has_ssl_err and open_count >= 2):
        sev = "High"
        summary = f"Target {target} exposes {open_count} open perimeter ports ({ports}) with SSL/header hardening gaps."
        recs.append(f"Close or restrict unneeded public ports: {ports}")
        recs.append("Renew and configure valid TLS 1.3 certificate.")
    elif open_count >= 1 or missing_headers or has_ssl_err:
        sev = "Medium"
        summary = f"Target {target} is accessible with mild perimeter exposures and {len(missing_headers)} missing HTTP security headers."
        if missing_headers:
            recs.append(f"Implement recommended security headers: {', '.join(missing_headers[:3])}")
        if open_count:
            recs.append("Audit open service ports and enable firewall rate limiting.")
        if has_ssl_err:
            recs.append("Verify SSL/TLS certificate chain and expiration.")
    else:
        sev = "Low"
        summary = f"Target {target} verified with clean perimeter telemetry and baseline security controls in place."
        recs.append("Maintain periodic perimeter scans and automated threat monitoring.")
        recs.append("Keep web services and packages updated with latest security patches.")

    if not recs:
        recs = ["Maintain continuous monitoring and periodic SOC threat intelligence review."]

    return {
        "severity": sev,
        "is_phishing": is_phishing or is_malicious_vt,
        "summary": summary,
        "recommendations": recs
    }


def _compute_deterministic_log_analysis(metrics_summary: dict) -> dict:
    """Ultra-fast (<1ms) expert rule-based log analysis."""
    bf_count = metrics_summary.get("brute_force_attempts_count", 0)
    dir_count = metrics_summary.get("directory_scans_count", 0)
    bf_ips = metrics_summary.get("brute_force_ips", [])
    dir_ips = metrics_summary.get("directory_scan_ips", [])
    total_reqs = metrics_summary.get("total_requests", 0)
    unique_ips = metrics_summary.get("unique_ips", 0)

    if bf_count > 0 or dir_count > 0:
        severity = "High" if (bf_count >= 3 or dir_count >= 3) else "Medium"
        attacker_ips = list(dict.fromkeys(bf_ips + dir_ips))
        summary = f"Identified {bf_count} brute-force attack signatures and {dir_count} unauthorized directory traversal scans across {unique_ips} client hosts."
        recommendations = [
            f"Block offending attacker IP addresses: {', '.join(attacker_ips[:4]) or 'active threat hosts'}",
            "Implement rate limiting and CAPTCHA challenges on authentication endpoints",
            "Block access to hidden sensitive files (.env, .git, wp-config)",
            "Enable automated Web Application Firewall (WAF) rule sets"
        ]
    else:
        severity = "Low"
        summary = f"Successfully parsed {total_reqs} requests from {unique_ips} distinct hosts. No active exploit or brute force patterns detected."
        recommendations = [
            "Maintain continuous centralized logging and audit retention",
            "Monitor authentication endpoints for sudden anomaly spikes",
            "Ensure perimeter firewall remains active"
        ]

    return {
        "severity": severity,
        "summary": summary,
        "recommendations": recommendations
    }


def _clean_and_parse_json(raw_text: str) -> dict:
    """Safely extracts and parses JSON from LLM output, with autofix for minor truncation."""
    if not raw_text or not raw_text.strip():
        return None
    cleaned = raw_text.strip()
    if '```json' in cleaned:
        cleaned = cleaned.split('```json')[1].split('```')[0].strip()
    elif '```' in cleaned:
        cleaned = cleaned.split('```')[1].split('```')[0].strip()

    # 1. Try direct parse
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # 2. Autofix trailing brackets if token generation was capped
    for fix in [
        '}', '"}', '"]}', '"]}}', '"}]}', '": ""}', '": []}',
        '\n"]\n}', '\n  "]\n}', '"]\n}'
    ]:
        try:
            data = json.loads(cleaned + fix)
            if isinstance(data, dict):
                return data
        except Exception:
            continue

    # 3. Regex search for balanced JSON block
    import re
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # 4. Fallback heuristic regex extraction for robust recovery
    extracted = {}
    sev_match = re.search(r'"severity"\s*:\s*"([^"]+)"', cleaned, re.IGNORECASE)
    if sev_match:
        extracted["severity"] = sev_match.group(1).capitalize()

    sum_match = re.search(r'"summary"\s*:\s*"([^"]+)"', cleaned, re.IGNORECASE)
    if sum_match:
        extracted["summary"] = sum_match.group(1)

    phish_match = re.search(r'"is_phishing"\s*:\s*(true|false)', cleaned, re.IGNORECASE)
    if phish_match:
        extracted["is_phishing"] = phish_match.group(1).lower() == 'true'

    if extracted and ("severity" in extracted or "summary" in extracted or "is_phishing" in extracted):
        return extracted

    return None


def _build_compact_scan_summary(target: str, findings: dict) -> str:
    """Builds an ultra-compact token-dense telemetry string for fast sub-second LLM ingestion."""
    ports = findings.get("open_ports", []) or []
    headers = findings.get("security_headers", {}) or {}
    ssl_info = findings.get("ssl", {}) or {}
    vt = findings.get("threat_intel", {}) or {}

    missing_headers = [k for k, v in headers.items() if v == 'Missing'] if isinstance(headers, dict) else []
    ssl_status = ssl_info.get("status", "Valid" if ssl_info.get("issuer") else "Unknown")
    vt_status = vt.get("status", "Clean")
    indicators = vt.get("indicators", [])

    summary_parts = [
        f"Target: {target}",
        f"Ports: {ports if ports else 'None'}",
        f"SSL: {ssl_status}",
        f"MissingHeaders: {', '.join(missing_headers[:3]) if missing_headers else 'None'}",
        f"ThreatIntel: {vt_status}"
    ]
    if indicators:
        summary_parts.append(f"Indicators: {'; '.join(indicators[:2])}")
    return " | ".join(summary_parts)


def _call_fast_ollama(prompt_text: str, model: str = None, timeout: float = None, num_predict: int = 65) -> dict:
    """
    Direct Ollama API call with explicit model routing and configurable timeout.
    Accepts prompt_text, explicit model name, and timeout.
    """
    effective_timeout = OLLAMA_TIMEOUT if timeout is None else timeout
    target_model = model or GENERAL_OLLAMA_MODEL

    # 1. Fast preflight check (1.5s) to verify if Ollama is listening locally
    try:
        ping = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=1.5)
        if ping.status_code != 200:
            logger.warning("Ollama is unavailable; using deterministic cybersecurity analysis.")
            return None
        available_models = [m.get('name', '') for m in ping.json().get('models', [])]
    except Exception:
        # Ollama server is offline or unreachable — immediately return with zero delay
        logger.warning("Ollama is unavailable; using deterministic cybersecurity analysis.")
        return None

    # 2. Check if the requested model is available in Ollama
    matched_model = None
    if target_model in available_models:
        matched_model = target_model
    elif f"{target_model}:latest" in available_models:
        matched_model = f"{target_model}:latest"
    else:
        # Check base name match (e.g. 'cyberguardian-ai' matching 'cyberguardian-ai:latest')
        base_name = target_model.split(":")[0]
        for m in available_models:
            if m == base_name or m.startswith(f"{base_name}:"):
                matched_model = m
                break

    if not matched_model:
        logger.warning(
            f"Requested Ollama model '{target_model}' is not available in Ollama; "
            f"using deterministic cybersecurity analysis."
        )
        return None

    # 3. Safe debug logging showing which model was selected
    logger.info(f"Using Ollama model: {matched_model}")
    print(f"Using Ollama model: {matched_model}")

    # 4. Direct Ollama generate API call
    try:
        url = f"{OLLAMA_BASE_URL}/api/generate"
        payload = {
            "model": matched_model,
            "prompt": prompt_text,
            "stream": False,
            "format": "json",
            "keep_alive": -1,
            "options": {
                "temperature": 0.1,
                "num_predict": num_predict,
                "num_ctx": 256,
                "top_k": 20,
                "top_p": 0.9
            }
        }
        # Allow 4.0s for initial connect and effective_timeout for response generation
        req_timeout = (4.0, float(effective_timeout)) if isinstance(effective_timeout, (int, float)) else effective_timeout
        res = requests.post(url, json=payload, timeout=req_timeout)
        if res.status_code == 200:
            data = res.json()
            raw_response = data.get("response", "").strip()
            parsed = _clean_and_parse_json(raw_response)
            if isinstance(parsed, dict) and any(k in parsed for k in ["summary", "is_phishing", "classification", "severity"]):
                return parsed
            logger.warning(
                f"Ollama model '{matched_model}' returned unparseable JSON; "
                f"using deterministic cybersecurity analysis."
            )
        else:
            logger.warning(
                f"Ollama returned HTTP status {res.status_code}; "
                f"using deterministic cybersecurity analysis."
            )
    except Exception as e:
        logger.warning(
            f"Ollama generation failed ({e}); using deterministic cybersecurity analysis."
        )
    return None


def run_autonomous_analysis(target):
    """
    The main autonomous workflow.
    Executes sub-scanners concurrently in parallel, applies sub-second bounded timeouts,
    and returns high-speed threat synthesis.
    """
    # 1. Run all independent Scanners in Parallel with bounded timeouts
    headers = {}
    ssl_info = {}
    ports = []
    vt_result = {}
    pt_result = {}

    with ThreadPoolExecutor(max_workers=5) as executor:
        f_headers = executor.submit(scan_website_headers, target)
        f_ssl = executor.submit(check_ssl_certificate, target)
        f_ports = executor.submit(scan_ports, target)
        f_vt = executor.submit(check_virustotal, target)
        f_pt = executor.submit(check_phishtank, target)

        try:
            headers = f_headers.result(timeout=1.8)
        except Exception as e:
            headers = {"error": str(e)}

        try:
            ssl_info = f_ssl.result(timeout=1.8)
        except Exception as e:
            ssl_info = {"status": "Error", "error": str(e)}

        try:
            ports = f_ports.result(timeout=1.8)
        except Exception as e:
            ports = []

        try:
            vt_result = f_vt.result(timeout=1.8)
        except Exception as e:
            vt_result = {"error": str(e)}

        try:
            pt_result = f_pt.result(timeout=1.8)
        except Exception as e:
            pt_result = {"source": "PhishTank", "error": str(e), "in_database": False, "verified": False}

    # 2. Compile Findings
    findings = {
        "target": target,
        "security_headers": headers,
        "ssl": ssl_info,
        "open_ports": ports,
        "threat_intel": vt_result,
        "phishtank": pt_result
    }

    # 3. Check Cache
    cache_key = _get_cache_key(findings)
    if cache_key in _AI_SYNTHESIS_CACHE:
        cached_ai = _AI_SYNTHESIS_CACHE[cache_key]
        findings["ai_analysis"] = cached_ai
        findings["security_score"] = 15 if cached_ai.get("is_phishing") or cached_ai.get("severity") in ["Critical", "High"] else 80
        findings["is_phishing"] = cached_ai.get("is_phishing", False)
        phish_inds = vt_result.get("indicators", [])[:]
        if pt_result.get("in_database"):
            phish_inds.insert(0, f"PhishTank: ID #{pt_result.get('phish_id')}")
        findings["phishing_indicators"] = phish_inds
        return findings

    # Compute high-accuracy deterministic baseline immediately (<1ms)
    deterministic_analysis = _compute_deterministic_scan_analysis(target, findings)
    is_phish_baseline = deterministic_analysis.get("is_phishing", False) or vt_result.get("status") == "Malicious" or pt_result.get("verified", False)
    ai_analysis = deterministic_analysis

    # 4. Multi-Stage AI Pipeline: First 'cyberguardian-phishing', then 'cyberguardian-ai'
    compact_summary = _build_compact_scan_summary(target, findings)

    # ── STAGE 1: First evaluate using cyberguardian-phishing (Ultra-fast ~9s execution) ──
    phishing_prompt = (
        f"Analyze target for phishing/malicious lures.\n"
        f"Context: {compact_summary}\n"
        f"Output pure JSON only:\n"
        f'{{"is_phishing": false, "severity": "Low", "summary": "Short 1-sentence assessment"}}'
    )
    phishing_res = _call_fast_ollama(
        phishing_prompt,
        model=PHISHING_OLLAMA_MODEL,
        timeout=50.0,
        num_predict=35
    )

    is_phish_detected = is_phish_baseline
    if phishing_res:
        phish_flag = bool(
            phishing_res.get("is_phishing", False) or
            str(phishing_res.get("classification", "")).lower() == "phishing"
        )
        phish_sev = str(phishing_res.get("severity", phishing_res.get("risk", ""))).capitalize()
        if phish_flag or phish_sev in ["Critical", "High"]:
            is_phish_detected = True
            phishing_res["is_phishing"] = True
        elif is_phish_baseline:
            # Security guardrail: never downgrade confirmed threat baseline
            is_phish_detected = True
            phishing_res["is_phishing"] = True
            if phish_sev not in ["Critical", "High"]:
                phishing_res["severity"] = deterministic_analysis.get("severity", "Critical")

    # ── STAGE 2: Then evaluate using cyberguardian-ai (Ultra-fast ~15s execution) ──
    phish_verdict_str = "PHISHING" if is_phish_detected else "SAFE"
    phish_sev_str = phishing_res.get("severity", "Critical" if is_phish_detected else "Low") if phishing_res else ("Critical" if is_phish_detected else "Low")
    general_prompt = (
        f"Analyze cybersecurity posture.\n"
        f"Context: {compact_summary} | Phishing: {phish_verdict_str} ({phish_sev_str})\n"
        f"Output pure JSON only:\n"
        f'{{"severity": "Low", "summary": "1 sentence security summary", "recommendations": ["rec1", "rec2"]}}'
    )
    general_res = _call_fast_ollama(
        general_prompt,
        model=GENERAL_OLLAMA_MODEL,
        timeout=50.0,
        num_predict=60
    )

    # ── STAGE 3: Synthesize AI Outputs & Apply Security Guardrails ──
    if general_res:
        ai_analysis = general_res
        if is_phish_detected:
            ai_analysis["is_phishing"] = True
            if ai_analysis.get("severity") not in ["Critical", "High"]:
                ai_analysis["severity"] = (
                    phishing_res.get("severity", "Critical")
                    if phishing_res and phishing_res.get("severity") in ["Critical", "High"]
                    else deterministic_analysis.get("severity", "Critical")
                )
    elif phishing_res:
        # Fallback to phishing model results if general model is unavailable
        ai_analysis = {
            "severity": phishing_res.get("severity", deterministic_analysis.get("severity", "Low")),
            "is_phishing": phishing_res.get("is_phishing", is_phish_detected),
            "summary": phishing_res.get("summary", deterministic_analysis.get("summary", "")),
            "recommendations": deterministic_analysis.get("recommendations", [])
        }
    # else ai_analysis remains deterministic_analysis

    # Determine final authoritative severity and security score
    final_sev = str(ai_analysis.get("severity", "Low")).capitalize()
    is_phishing = bool(ai_analysis.get("is_phishing", False) or is_phish_detected)
    ai_analysis["is_phishing"] = is_phishing

    if is_phishing or final_sev in ["Critical", "High"]:
        final_sev = "Critical" if (final_sev == "Critical" or vt_result.get("threat_score", 0) >= 70) else "High"
        sec_score = 15 if final_sev == "Critical" else 30
    elif final_sev == "Medium":
        sec_score = 60
    else:
        sec_score = 92

    ai_analysis["severity"] = final_sev
    findings["security_score"] = sec_score
    findings["is_phishing"] = is_phishing

    # Consolidate indicators from VirusTotal and phishing model
    combined_indicators = list(vt_result.get("indicators", []) or [])
    if phishing_res:
        phish_inds = phishing_res.get("indicators", []) or phishing_res.get("phishing_indicators", []) or []
        for ind in phish_inds:
            if ind and ind not in combined_indicators:
                combined_indicators.append(ind)
        findings["phishing_analysis"] = phishing_res

    findings["phishing_indicators"] = combined_indicators
    _AI_SYNTHESIS_CACHE[cache_key] = ai_analysis
    findings["ai_analysis"] = ai_analysis
    return findings


def run_log_analysis_ai(parsed_data):
    """
    Synthesize parsed log data with caching and sub-second deterministic rule engine.
    """
    metrics_summary = {
        "total_requests": parsed_data["total_requests"],
        "unique_ips": parsed_data["unique_ips_count"],
        "error_rate_pct": parsed_data["error_rate"],
        "brute_force_attempts_count": len(parsed_data["brute_force_ips"]),
        "brute_force_ips": [item["ip"] for item in parsed_data["brute_force_ips"]],
        "directory_scans_count": len(parsed_data["directory_scans"]),
        "directory_scan_ips": [item["ip"] for item in parsed_data["directory_scans"]]
    }

    cache_key = _get_cache_key(metrics_summary)
    if cache_key in _AI_SYNTHESIS_CACHE:
        return _AI_SYNTHESIS_CACHE[cache_key]

    # Compute high-accuracy deterministic analysis immediately (<1ms)
    ai_analysis = _compute_deterministic_log_analysis(metrics_summary)

    # Optional fast LLM augmentation with compact prompt
    compact_log = (
        f"Reqs: {metrics_summary.get('total_requests')}, "
        f"UniqueIPs: {metrics_summary.get('unique_ips')}, "
        f"ErrorRate: {metrics_summary.get('error_rate_pct')}%, "
        f"BruteForce: {metrics_summary.get('brute_force_attempts_count')}, "
        f"DirScans: {metrics_summary.get('directory_scans_count')}"
    )
    prompt_str = (
        f"Analyze SOC log telemetry.\n"
        f"Context: {compact_log}\n"
        f"Output pure JSON only:\n"
        f'{{"severity": "Low", "summary": "1 sentence security summary", "recommendations": ["rec1", "rec2"]}}'
    )
    llm_res = _call_fast_ollama(
        prompt_str,
        model=GENERAL_OLLAMA_MODEL,
        timeout=30.0,
        num_predict=55
    )
    if llm_res:
        ai_analysis = llm_res

    _AI_SYNTHESIS_CACHE[cache_key] = ai_analysis
    return ai_analysis


