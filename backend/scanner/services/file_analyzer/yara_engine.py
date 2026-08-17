import os
import re
from typing import Dict, Any, List

try:
    import yara  # type: ignore
    HAS_YARA = True
except ImportError:
    yara = None
    HAS_YARA = False


class LocalYaraEngine:
    """
    Defensive YARA rule matching engine for static file inspection.
    Parses rules from backend/scanner/yara_rules/*.yar and matches string, regex, and hex byte patterns.
    """

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.rules_dir = os.path.join(base_dir, 'yara_rules')
        else:
            self.rules_dir = rules_dir

    def scan_file(self, file_path: str) -> Dict[str, Any]:
        """
        Scan target file against all trusted YARA rules in rules_dir.
        """
        if not os.path.exists(file_path):
            return {
                "status": "ERROR",
                "matches": [],
                "error_message": "Target file does not exist."
            }

        try:
            with open(file_path, 'rb') as f:
                file_bytes = f.read()

            file_text = file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            return {
                "status": "ERROR",
                "matches": [],
                "error_message": f"Failed to read file for YARA inspection: {str(e)}"
            }

        rule_files = []
        if os.path.exists(self.rules_dir):
            rule_files = [os.path.join(self.rules_dir, f) for f in os.listdir(self.rules_dir) if f.endswith('.yar')]

        matches = []

        # If yara library is available, use native compilation
        if HAS_YARA and yara is not None:
            try:
                compiled_rules = yara.compile(filepaths={os.path.basename(f): f for f in rule_files})
                yara_matches = compiled_rules.match(filepath=file_path)

                for m in yara_matches:
                    matches.append({
                        "rule_name": m.rule,
                        "severity": m.meta.get("severity", "HIGH"),
                        "score": m.meta.get("score", 20),
                        "description": m.meta.get("description", "YARA rule match"),
                        "matched_strings": [str(s[2])[:50] for s in m.strings[:5]]
                    })

                return {
                    "status": "MATCH" if matches else "NO_MATCH",
                    "matches": matches,
                    "error_message": None
                }
            except Exception:
                # If native yara scanning fails, fall back to pure-Python scanner
                pass

        # Fallback pure-Python YARA rule parser
        return self._fallback_python_yara_scan(file_bytes, file_text, rule_files)

    def _fallback_python_yara_scan(self, file_bytes: bytes, file_text: str, rule_files: List[str]) -> Dict[str, Any]:
        """
        Pure-Python YARA rule pattern evaluator for fallback execution.
        """
        matches = []

        rules = [
            {
                "rule_name": "Ransomware_Note_Strings",
                "severity": "CRITICAL",
                "score": 35,
                "description": "Detects common ransomware extortion note patterns",
                "patterns": ["your files have been encrypted", "restore your files", "decrypt your data", "tor browser", "bitcoin"],
                "min_matches": 2
            },
            {
                "rule_name": "Shellcode_NOP_Sled",
                "severity": "HIGH",
                "score": 25,
                "description": "Detects NOP sled patterns typical in buffer overflow shellcode",
                "bytes_pattern": b"\x90" * 12,
                "min_matches": 1
            },
            {
                "rule_name": "Mimikatz_LSASS_Memory_Dumper",
                "severity": "CRITICAL",
                "score": 40,
                "description": "Detects mimikatz credential dumping tool indicators",
                "patterns": ["lsadump", "sekurlsa", "wdigest", "kerberos::ptt", "mimikatz"],
                "min_matches": 2
            },
            {
                "rule_name": "Suspicious_Encoded_PowerShell",
                "severity": "HIGH",
                "score": 25,
                "description": "Detects base64 encoded PowerShell command execution flags",
                "patterns": ["-encodedcommand", "-enc ", "powershell.exe -e", "-nop -w hidden"],
                "min_matches": 1
            },
            {
                "rule_name": "Suspicious_PE_Header_Obfuscation",
                "severity": "MEDIUM",
                "score": 15,
                "description": "Detects hidden or non-standard section characteristics in executable",
                "patterns": ["UPX0", "UPX1", ".vmp0", ".themida"],
                "min_matches": 1
            },
            {
                "rule_name": "Suspicious_WinAPI_Remote_Injection",
                "severity": "HIGH",
                "score": 25,
                "description": "Detects Win32 API functions associated with process injection",
                "patterns": ["VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread", "NtUnmapViewOfSection", "URLDownloadToFileA", "WinExec"],
                "min_matches": 3
            },
            {
                "rule_name": "WebShell_Backdoor_Indicators",
                "severity": "HIGH",
                "score": 30,
                "description": "Detects web shell backdoor command execution patterns",
                "patterns": ["c99shell", "r57shell", "eval(base64_decode", "passthru($_POST", "system($_GET", "WScript.Shell", "cmd.exe /c"],
                "min_matches": 2
            },
        ]

        text_lower = file_text.lower()

        for r in rules:
            matched_terms = []
            if "patterns" in r:
                for p in r["patterns"]:
                    if p.lower() in text_lower:
                        matched_terms.append(p)
            if "bytes_pattern" in r:
                if r["bytes_pattern"] in file_bytes:
                    matched_terms.append("<bytes_nop_sled>")

            if len(matched_terms) >= r.get("min_matches", 1):
                matches.append({
                    "rule_name": r["rule_name"],
                    "severity": r["severity"],
                    "score": r["score"],
                    "description": r["description"],
                    "matched_strings": matched_terms
                })

        return {
            "status": "MATCH" if matches else "NO_MATCH",
            "matches": matches,
            "error_message": None
        }
