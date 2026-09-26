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
from .threat_intel import check_virustotal  # type: ignore


OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "cybersec-ai-phishing")

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
    is_phishing = is_malicious_vt or (isinstance(vt, dict) and "phishing" in str(vt.get("category", "")).lower())

    recs = []
    # 1. PHISHING / ACTIVE MALICIOUS THREATS (Top Priority)
    if is_phishing or is_malicious_vt:
        sev = vt.get("severity", "Critical")
        indicators = vt.get("indicators", []) if isinstance(vt, dict) else []
        ind_str = f" Key indicators: {'; '.join(indicators[:3])}." if indicators else ""
        
        summary = (
            f"🚨 CRITICAL PHISHING / MALICIOUS THREAT DETECTED: Target '{target}' exhibits active "
            f"credential harvesting, deceptive infrastructure, or brand impersonation signatures.{ind_str}"
        )
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


import requests

def _call_fast_ollama(prompt_text: str, timeout: float = 2.0) -> dict:
    """Fast non-blocking direct Ollama API call with model fallback and fast preflight."""
    # Fast preflight check (0.25s) to verify if Ollama is listening locally
    try:
        ping = requests.get("http://localhost:11434/api/tags", timeout=0.25)
        if ping.status_code != 200:
            return None
        available_models = [m.get('name', '') for m in ping.json().get('models', [])]
    except Exception:
        # Ollama server is offline or unreachable — immediately return with zero delay
        return None

    # Pick the best available model
    target_model = None
    for candidate in [OLLAMA_MODEL, "cybersec-ai-phishing:latest", "cybersec-ai-phishing", "cybersec-ai:latest", "cybersec-ai", "llama3:latest", "llama3"]:
        if any(candidate in m for m in available_models):
            target_model = candidate
            break

    if not target_model:
        return None

    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": target_model,
            "prompt": prompt_text,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_predict": 180
            }
        }
        res = requests.post(url, json=payload, timeout=timeout)
        if res.status_code == 200:
            data = res.json()
            raw_response = data.get("response", "").strip()
            clean_json = raw_response.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(clean_json)
            if isinstance(parsed, dict) and "summary" in parsed:
                return parsed
    except Exception:
        pass
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

    with ThreadPoolExecutor(max_workers=4) as executor:
        f_headers = executor.submit(scan_website_headers, target)
        f_ssl = executor.submit(check_ssl_certificate, target)
        f_ports = executor.submit(scan_ports, target)
        f_vt = executor.submit(check_virustotal, target)

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

    # 2. Compile Findings
    findings = {
        "target": target,
        "security_headers": headers,
        "ssl": ssl_info,
        "open_ports": ports,
        "threat_intel": vt_result
    }

    # 3. Check Cache
    cache_key = _get_cache_key(findings)
    if cache_key in _AI_SYNTHESIS_CACHE:
        cached_ai = _AI_SYNTHESIS_CACHE[cache_key]
        findings["ai_analysis"] = cached_ai
        findings["security_score"] = 15 if cached_ai.get("is_phishing") or cached_ai.get("severity") in ["Critical", "High"] else 80
        findings["is_phishing"] = cached_ai.get("is_phishing", False)
        findings["phishing_indicators"] = vt_result.get("indicators", [])
        return findings

    # Compute high-accuracy deterministic baseline immediately (<1ms)
    ai_analysis = _compute_deterministic_scan_analysis(target, findings)
    is_phish_baseline = ai_analysis.get("is_phishing", False) or vt_result.get("status") == "Malicious"

    # 4. Optional fast LLM augmentation (bounded timeout)
    prompt_str = f"""
    You are CyberGuardian AI, an expert cybersecurity and phishing analyst.
    Analyze target '{target}' and threat findings to evaluate phishing, credential theft, and security posture.
    Return pure JSON:
    Findings: {json.dumps(findings, default=str)}
    JSON structure: {{"severity": "Critical/High/Medium/Low", "is_phishing": true/false, "summary": "2 sentence summary", "recommendations": ["rec1", "rec2"]}}
    """
    llm_res = _call_fast_ollama(prompt_str, timeout=2.0)
    if llm_res:
        # Security Guardrail: Never let LLM downgrade confirmed phishing/malicious findings
        if is_phish_baseline:
            llm_res["is_phishing"] = True
            if llm_res.get("severity") not in ["Critical", "High"]:
                llm_res["severity"] = ai_analysis.get("severity", "Critical")
        ai_analysis = llm_res

    # Determine final authoritative severity and security score
    final_sev = str(ai_analysis.get("severity", "Low")).capitalize()
    is_phishing = ai_analysis.get("is_phishing", False) or is_phish_baseline
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
    findings["phishing_indicators"] = vt_result.get("indicators", [])

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

    # Optional fast LLM augmentation (strict 1.0s socket timeout)
    prompt_str = f"""
    You are CyberGuardian AI, an expert SOC Analyst.
    Analyze the following parsed log metrics and assess the security risk in pure JSON.
    Metrics: {json.dumps(metrics_summary)}
    JSON structure: {{"severity": "Low/Medium/High/Critical", "summary": "2-3 sentence summary", "recommendations": ["rec1", "rec2"]}}
    """
    llm_res = _call_fast_ollama(prompt_str, timeout=1.0)
    if llm_res:
        ai_analysis = llm_res

    _AI_SYNTHESIS_CACHE[cache_key] = ai_analysis
    return ai_analysis


