import re
import os
from typing import Dict, Any, List


SUSPICIOUS_SCRIPT_PATTERNS = [
    (r'eval\s*\(', "eval() dynamic execution"),
    (r'exec\s*\(', "exec() dynamic execution"),
    (r'Invoke-Expression|iex\b', "PowerShell Invoke-Expression"),
    (r'WScript\.Shell', "WScript.Shell COM object invocation"),
    (r'cmd\.exe\s+/c', "Command prompt execution wrapper"),
    (r'powershell\.exe\s+-[eE][nN][cC]', "Base64 encoded PowerShell execution"),
    (r'Net\.WebClient|DownloadString|DownloadFile', "PowerShell remote payload download"),
    (r'socket\s*\.\s*socket|connect\s*\(', "Network socket connection setup"),
    (r'base64_decode|atob\s*\(', "Base64 decoding string obfuscation"),
    (r'VirtualAlloc|WriteProcessMemory', "Win32 memory injection references"),
]

URL_PATTERN = re.compile(r'https?://[^\s\'"<>]+', re.IGNORECASE)
IP_PATTERN = re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b')


def analyze_script(file_path: str) -> Dict[str, Any]:
    """
    Perform safe static inspection on script files (.js, .ps1, .py, .vbs, .sh, .bat).
    Does NOT execute scripts or pass them to interpreter runtimes.
    """
    if not os.path.exists(file_path):
        return {"is_script": False, "error": "File does not exist."}

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(100000) # Analyze first 100 KB
    except Exception as e:
        return {"is_script": False, "error": f"Failed to read script file: {str(e)}"}

    indicators = []
    found_urls = list(set(URL_PATTERN.findall(content)))[:5]
    found_ips = [ip for ip in set(IP_PATTERN.findall(content)) if not ip.startswith(('127.', '10.', '192.168.', '0.'))][:5]

    for pattern, desc in SUSPICIOUS_SCRIPT_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            indicators.append(desc)

    is_obfuscated = False
    if len(indicators) >= 2 or any("Base64" in ind or "eval" in ind for ind in indicators):
        is_obfuscated = True

    return {
        "is_script": True,
        "indicator_count": len(indicators),
        "indicators": indicators,
        "is_obfuscated": is_obfuscated,
        "extracted_urls": found_urls,
        "extracted_ips": found_ips,
    }
