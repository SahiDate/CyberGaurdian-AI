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


OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "cybersec-ai")

# In-memory LRU-style cache for AI inferences (Fingerprint -> AI Response)
_AI_SYNTHESIS_CACHE = {}


def _get_cache_key(data: dict) -> str:
    """Generate deterministic hash of data dictionary."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode('utf-8')).hexdigest()


def _compute_deterministic_scan_analysis(target: str, findings: dict) -> dict:
    """Ultra-fast (<1ms) expert rule-based cybersecurity analysis."""
    ports = findings.get("open_ports", []) or []
    headers = findings.get("security_headers", {}) or {}
    ssl_info = findings.get("ssl", {}) or {}
    vt = findings.get("threat_intel", {}) or {}

    open_count = len(ports) if isinstance(ports, list) else 0
    missing_headers = [k for k, v in headers.items() if v == 'Missing'] if isinstance(headers, dict) else []
    has_ssl_err = isinstance(ssl_info, dict) and ("error" in ssl_info or ssl_info.get("status") not in ["Valid", "OK"])
    is_malicious_vt = isinstance(vt, dict) and (vt.get("positives", 0) > 0 or vt.get("status") == "Malicious")

    recs = []
    if is_malicious_vt:
        sev = "Critical"
        summary = f"Target {target} has been flagged by threat intelligence feeds with malicious reputation indicators."
        recs.append("Isolate target and review inbound/outbound connection logs immediately.")
        recs.append("Blacklist associated domain and IP addresses on network firewalls.")
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

def _call_fast_ollama(prompt_text: str, timeout: float = 1.2) -> dict:
    """Fast, non-blocking direct Ollama API call with true socket-level timeout."""
    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt_text,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "num_predict": 150
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
        findings["ai_analysis"] = _AI_SYNTHESIS_CACHE[cache_key]
        return findings

    # Compute high-accuracy deterministic baseline immediately (<1ms)
    ai_analysis = _compute_deterministic_scan_analysis(target, findings)

    # 4. Optional fast LLM augmentation (strict 1.0s socket timeout)
    prompt_str = f"""
    You are CyberGuardian AI, an expert cybersecurity analyst.
    Analyze the following findings for target '{target}' and return pure JSON.
    Findings: {json.dumps(findings)}
    JSON structure: {{"severity": "Low/Medium/High/Critical", "summary": "2 sentence summary", "recommendations": ["rec1", "rec2"]}}
    """
    llm_res = _call_fast_ollama(prompt_str, timeout=1.0)
    if llm_res:
        ai_analysis = llm_res

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


