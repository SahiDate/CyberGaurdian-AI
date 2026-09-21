import re
import io
import time
from datetime import datetime

# Regular expressions for Nginx/Apache Combined & Common logs, and SSH/Auth logs
COMBINED_LOG_REGEX = re.compile(
    r'^(\S+) \S+ \S+ \[([\w:/]+\s[+\-]\d{4})\] "(\S+)\s?(\S+)?\s?(\S+)?" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?$'
)
COMMON_LOG_REGEX = re.compile(
    r'^(\S+) \S+ \S+ \[([\w:/]+\s[+\-]\d{4})\] "(\S+)\s?(\S+)?\s?(\S+)?" (\d{3}) (\S+)$'
)
SSH_FAILED_REGEX = re.compile(
    r'Failed password for (?:invalid user )?(\S+) from (\S+) port \d+ ssh2?'
)
SSH_ACCEPTED_REGEX = re.compile(
    r'Accepted password for (\S+) from (\S+) port \d+ ssh2?'
)
FIREWALL_REGEX = re.compile(
    r'(?:SRC|src)=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+(?:DST|dst)=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}).*?(?:PROTO|proto)=(\w+).*?(?:DPT|dpt)=(\d+)'
)
WINDOWS_EVENT_REGEX = re.compile(
    r'(?:EventID|Event ID|Event\s*\[\s*\d+\s*\])\s*[:=]\s*(\d+)', re.IGNORECASE
)

# Common web sensitive paths for directory scanning detection
SENSITIVE_PATHS = [
    '/wp-admin', '/wp-login.php', '/wp-config.php',
    '/.env', '/config.php', '/config/config.yml',
    '/phpmyadmin', '/pma', '/admin', '/db',
    '/.git', '/.svn', '/.metadata',
    '/etc/passwd', '/etc/shadow',
    '/xmlrpc.php', '/shell.php', '/cmd.php',
    '/upload.php', '/temp', '/backup.sql', '/backup.zip',
    '/actuator', '/api/v1/debug', '/console'
]

# Attack payload patterns (SQLi, XSS, Path Traversal, Command Injection)
ATTACK_PATTERNS = [
    (re.compile(r"(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b).*(\bFROM\b|\bWHERE\b|\bTABLE\b)|'--|\bOR\s+['\"0-9]+=['\"0-9]+", re.IGNORECASE), "SQL Injection Attempt", "HIGH"),
    (re.compile(r"<script.*?>|javascript:|onload=|onerror=|alert\(", re.IGNORECASE), "Cross-Site Scripting (XSS) Pattern", "HIGH"),
    (re.compile(r"\.\./\.\./|\.\.\\\.\.\\|/etc/passwd|windows/system32|win\.ini", re.IGNORECASE), "Path Traversal / LFI Attempt", "HIGH"),
    (re.compile(r";\s*(?:cat|ls|whoami|id|curl|wget|bash|sh|cmd|powershell)\b|`.*?`|\$\(.*?\)", re.IGNORECASE), "Command Injection Pattern", "CRITICAL"),
]

# Suspicious patterns for static script security analysis (.bat, .ps1, .sh, .py, etc.)
SCRIPT_SUSPICIOUS_RULES = [
    (re.compile(r"powershell.*?(?:-enc|-encodedcommand)\s+[A-Za-z0-9+/=]{10,}", re.IGNORECASE), "Encoded PowerShell Execution", "CRITICAL"),
    (re.compile(r"(?:DownloadString|DownloadFile|Start-BitsTransfer|curl|wget)\s*[\(\s]['\"]?https?://", re.IGNORECASE), "Remote Payload Download Cradle", "HIGH"),
    (re.compile(r"(?:Invoke-Expression|\bIEX\b)\s*[\(\$]", re.IGNORECASE), "In-Memory Script Execution (IEX)", "HIGH"),
    (re.compile(r"vssadmin\s+delete\s+shadows|wmic\s+shadowcopy\s+delete|wbadmin\s+delete", re.IGNORECASE), "Ransomware Shadow Copy Deletion", "CRITICAL"),
    (re.compile(r"net\s+user\s+\w+\s+[^\s]+\s+/add|net\s+localgroup\s+administrators\s+\w+\s+/add", re.IGNORECASE), "Local Account Backdoor Creation", "HIGH"),
    (re.compile(r"Set-MpPreference\s+-DisableRealtimeMonitoring|netsh\s+advfirewall\s+set\s+.*?state\s+off|sc\s+stop\s+WinDefend", re.IGNORECASE), "Security Control Evasion / AV Disabling", "CRITICAL"),
    (re.compile(r"schtasks\s+/create|reg\s+add\s+.*?\\CurrentVersion\\Run", re.IGNORECASE), "Persistence Mechanism Creation", "HIGH"),
    (re.compile(r"certutil.*?-urlcache.*?-f\s+https?://", re.IGNORECASE), "Living-off-the-Land Binary (Certutil Download)", "HIGH"),
    (re.compile(r"(?:nc|ncat|netcat)\s+-e\s+(?:cmd|sh|powershell)|bash\s+-i\s+>&|/dev/tcp/", re.IGNORECASE), "Interactive Reverse Shell Execution", "CRITICAL"),
    (re.compile(r"del\s+/[fF]\s+/[sS]\s+/[qQ]\s+[a-zA-Z]:\\|rm\s+-rf\s+/(?:\*|\s|$)", re.IGNORECASE), "Destructive Disk Deletion Command", "CRITICAL"),
    (re.compile(r"FromBase64String\s*\(|\[System\.Text\.Encoding\]::", re.IGNORECASE), "Base64 De-obfuscation Routine", "MEDIUM"),
]


class LogParser:
    """
    High-Performance SOC Log Parser and Threat Correlation Engine.
    Features:
    - Multi-Format Auto-Detection: Nginx, Apache, SSH/Auth, Firewall (UFW/iptables),
      Windows Event exports (CSV/XML/Text), Static Script Security Analysis (.bat, .ps1, .sh, .py),
      and Generic timestamped server logs.
    - Zero Server-Side Execution: All scripts and commands are statically evaluated as raw data.
    - Level 1: Fast Deduplication & Ingest Streaming
    - Level 2: Heuristic Rule Correlation (Brute-force, Web Traversal, Attack Payloads)
    - Level 3: Security Indicator & Artifact Extraction
    """

    def __init__(self, raw_logs, filename=""):
        self.raw_logs = raw_logs
        self.filename = (filename or "").lower()
        self.parsed_entries = []
        self.total_lines_read = 0
        self.parse_duration = 0.0
        self.detected_formats = set()
        self.extracted_indicators = []
        self.suspicious_commands = []

    def parse(self):
        start_time = time.time()

        line_counts = {}
        ordered_lines = []

        if isinstance(self.raw_logs, str):
            stream = io.StringIO(self.raw_logs)
        else:
            stream = self.raw_logs

        is_script_file = any(self.filename.endswith(ext) for ext in [
            '.bat', '.cmd', '.ps1', '.sh', '.bash', '.py', '.js', '.vbs', '.psm1'
        ])

        line_num = 0
        for raw_line in stream:
            self.total_lines_read += 1
            line_num += 1
            line = raw_line.strip()
            if not line:
                continue

            # If it's a script file, preserve line order and number
            if is_script_file:
                ordered_lines.append((line, line_num))
            else:
                if line in line_counts:
                    line_counts[line] += 1
                else:
                    line_counts[line] = 1
                    ordered_lines.append((line, line_num))

        if is_script_file:
            self.detected_formats.add("script")
            for line, l_num in ordered_lines:
                entry = self._parse_script_line(line, l_num)
                if entry:
                    self.parsed_entries.append(entry)
        else:
            # Parse unique lines for server logs
            parsed_cache = {}
            for line, l_num in ordered_lines:
                if line not in parsed_cache:
                    entry = self._parse_line(line, l_num)
                    if entry:
                        parsed_cache[line] = entry

            for line, _ in ordered_lines:
                entry = parsed_cache.get(line)
                if entry:
                    count = line_counts.get(line, 1)
                    entry_copy = dict(entry)
                    entry_copy["occurrence_count"] = count
                    self.parsed_entries.append(entry_copy)

        self.parse_duration = round(time.time() - start_time, 4)
        return self._generate_analysis(line_counts)

    def _parse_script_line(self, line, line_num):
        """Perform purely static security analysis on a script line without execution."""
        is_threat = False
        threat_reason = ""
        severity = "LOW"

        # Ignore non-executable comments
        if line.startswith('::') or line.startswith('#') or line.lower().startswith('rem '):
            return {
                "ip": "Local-Script",
                "timestamp": f"Line {line_num}",
                "method": "COMMENT",
                "path": line[:150],
                "status": 200,
                "size": str(len(line)),
                "referrer": "-",
                "user_agent": "Static-Script-Analyzer",
                "log_type": "script",
                "is_threat": False,
                "threat_reason": ""
            }

        # Check against suspicious static script rules
        for pattern, reason, sev in SCRIPT_SUSPICIOUS_RULES:
            if pattern.search(line):
                is_threat = True
                threat_reason = reason
                severity = sev
                self.suspicious_commands.append({
                    "line": line_num,
                    "command": line[:200],
                    "reason": reason,
                    "severity": sev
                })
                self.extracted_indicators.append({
                    "type": "SUSPICIOUS_SCRIPT_COMMAND",
                    "severity": sev,
                    "indicator": line[:100],
                    "description": f"Line {line_num}: {reason}"
                })
                break

        # Check for embedded IP addresses or URLs in script
        ip_match = re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', line)
        extracted_ip = ip_match.group(0) if ip_match else "Local-Host"

        return {
            "ip": extracted_ip,
            "timestamp": f"Line {line_num}",
            "method": "SCRIPT_CMD",
            "path": line[:150],
            "status": 403 if is_threat else 200,
            "size": str(len(line)),
            "referrer": "-",
            "user_agent": "Static-Script-Analyzer",
            "log_type": "script",
            "is_threat": is_threat,
            "threat_reason": threat_reason,
            "severity": severity
        }

    def _parse_line(self, line, line_num=0):
        """Parse individual log line with multi-format heuristics."""
        # 1. Combined Web Log (Nginx / Apache)
        if ' "' in line or ' HTTP/' in line or ' GET ' in line or ' POST ' in line:
            match = COMBINED_LOG_REGEX.match(line)
            if match:
                ip, timestamp, method, path, protocol, status, size, referrer, user_agent = match.groups()
                self.detected_formats.add("web")
                return {
                    "ip": ip,
                    "timestamp": timestamp,
                    "method": method,
                    "path": path or "/",
                    "status": int(status),
                    "size": size,
                    "referrer": referrer or "-",
                    "user_agent": user_agent or "-",
                    "log_type": "web"
                }

            match = COMMON_LOG_REGEX.match(line)
            if match:
                ip, timestamp, method, path, protocol, status, size = match.groups()
                self.detected_formats.add("web")
                return {
                    "ip": ip,
                    "timestamp": timestamp,
                    "method": method,
                    "path": path or "/",
                    "status": int(status),
                    "size": size,
                    "referrer": "-",
                    "user_agent": "-",
                    "log_type": "web"
                }

        # 2. SSH / Linux Auth Logs
        if 'sshd' in line.lower() or 'failed password' in line.lower() or 'accepted password' in line.lower():
            self.detected_formats.add("auth")
            if 'failed password' in line.lower():
                match = SSH_FAILED_REGEX.search(line)
                user = match.group(1) if match else "unknown"
                ip = match.group(2) if match else self._extract_ip(line)
                return {
                    "ip": ip or "127.0.0.1",
                    "timestamp": self._extract_timestamp(line) or f"Event-{line_num}",
                    "method": "SSH",
                    "path": f"Login attempt failed for user: {user}",
                    "status": 401,
                    "size": "0",
                    "referrer": "-",
                    "user_agent": "SSH-Client",
                    "log_type": "auth",
                    "auth_user": user,
                    "auth_status": "failed"
                }

            if 'accepted password' in line.lower():
                match = SSH_ACCEPTED_REGEX.search(line)
                user = match.group(1) if match else "unknown"
                ip = match.group(2) if match else self._extract_ip(line)
                return {
                    "ip": ip or "127.0.0.1",
                    "timestamp": self._extract_timestamp(line) or f"Event-{line_num}",
                    "method": "SSH",
                    "path": f"Login success for user: {user}",
                    "status": 200,
                    "size": "0",
                    "referrer": "-",
                    "user_agent": "SSH-Client",
                    "log_type": "auth",
                    "auth_user": user,
                    "auth_status": "success"
                }

        # 3. Firewall Logs (iptables / UFW)
        if any(k in line.upper() for k in ['UFW BLOCK', 'IPTABLES', 'DROP', 'REJECT', 'DENY']) and 'SRC=' in line:
            self.detected_formats.add("firewall")
            match = FIREWALL_REGEX.search(line)
            src_ip = match.group(1) if match else self._extract_ip(line) or "0.0.0.0"
            dst_ip = match.group(2) if match else "Internal"
            proto = match.group(3) if match else "TCP"
            port = match.group(4) if match else "0"
            return {
                "ip": src_ip,
                "timestamp": self._extract_timestamp(line) or f"Event-{line_num}",
                "method": f"FW-{proto}",
                "path": f"Blocked connection to {dst_ip}:{port}",
                "status": 403,
                "size": "0",
                "referrer": "-",
                "user_agent": "Firewall-Kernel",
                "log_type": "firewall",
                "is_threat": True,
                "threat_reason": f"Firewall Drop: Targeted Port {port}"
            }

        # 4. Windows Event Logs (Text / CSV / XML exports)
        win_match = WINDOWS_EVENT_REGEX.search(line)
        if win_match or 'EventID' in line or 'Event ID' in line or 'Microsoft-Windows-Security-Auditing' in line:
            self.detected_formats.add("windows_event")
            event_id = win_match.group(1) if win_match else "Unknown"
            ip = self._extract_ip(line) or "127.0.0.1"
            is_threat = event_id in ['4625', '7045', '1102']
            threat_reason = "Windows Failed Logon (Event 4625)" if event_id == '4625' else (
                "New Service Installed (Event 7045)" if event_id == '7045' else ""
            )
            return {
                "ip": ip,
                "timestamp": self._extract_timestamp(line) or f"Event-{line_num}",
                "method": f"WIN-EVT-{event_id}",
                "path": line[:120],
                "status": 401 if is_threat else 200,
                "size": "0",
                "referrer": "-",
                "user_agent": "Windows-Event-Log",
                "log_type": "windows_event",
                "is_threat": is_threat,
                "threat_reason": threat_reason
            }

        # 5. Generic Log Fallback (Guaranteed safe structure, never null)
        ip = self._extract_ip(line) or "127.0.0.1"
        status = 200
        is_err = any(kw in line.lower() for kw in ["fail", "error", "invalid", "deny", "unauthorized", "refused", "critical", "fatal", "exception"])
        if is_err:
            status = 401 if any(kw in line.lower() for kw in ["unauthorized", "deny", "auth", "login"]) else 500

        self.detected_formats.add("generic")
        return {
            "ip": ip,
            "timestamp": self._extract_timestamp(line) or f"Line-{line_num}",
            "method": "LOG_ENTRY",
            "path": line[:120],
            "status": status,
            "size": str(len(line)),
            "referrer": "-",
            "user_agent": "Generic-Parser",
            "log_type": "generic"
        }

    def _extract_ip(self, line):
        """Extract first IPv4 address in line."""
        match = re.search(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b', line)
        return match.group(0) if match else ""

    def _extract_timestamp(self, line):
        """Extract standard syslog, ISO, or bracketed timestamps."""
        # Syslog format: Sep 21 10:22:31
        match = re.search(r'^([A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})', line)
        if match:
            return match.group(0)
        # ISO format: 2026-09-21 10:22:31 or 2026-09-21T10:22:31
        match = re.search(r'\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\b', line)
        if match:
            return match.group(0)
        # Bracketed timestamp: [21/Sep/2026:10:22:31 +0000]
        match = re.search(r'\[([\w:/]+\s[+\-]\d{4})\]', line)
        if match:
            return match.group(1)
        return ""

    def _generate_analysis(self, line_counts=None):
        total_requests = sum(entry.get("occurrence_count", 1) for entry in self.parsed_entries)
        primary_format = list(self.detected_formats)[0] if self.detected_formats else "generic"

        if total_requests == 0:
            return {
                "total_requests": 0,
                "unique_ips_count": 0,
                "error_rate": 0,
                "log_format": primary_format,
                "brute_force_ips": [],
                "directory_scans": [],
                "suspicious_commands": [],
                "scanned_urls": [],
                "parsed_logs": [],
                "extracted_indicators": [],
                "performance_metrics": {
                    "total_lines_read": self.total_lines_read,
                    "unique_lines": len(line_counts or {}),
                    "parse_duration_seconds": self.parse_duration,
                    "throughput_lines_per_sec": 0
                }
            }

        unique_ips = set()
        failed_requests = 0
        ip_failed_logins = {}
        ip_directory_scans = {}
        url_counts = {}

        # Analyze parsed log entries weighted by count
        for entry in self.parsed_entries:
            ip = entry["ip"]
            if ip not in ["Local-Script", "Local-Host", "Internal"]:
                unique_ips.add(ip)

            status = entry["status"]
            path = entry["path"]
            count = entry.get("occurrence_count", 1)

            # Count errors
            if status >= 400 or entry.get("auth_status") == "failed":
                failed_requests += count

            # Attack Payload Detection on request path
            path_lower = path.lower()
            for pattern, reason, sev in ATTACK_PATTERNS:
                if pattern.search(path):
                    entry["is_threat"] = True
                    entry["threat_reason"] = reason
                    self.extracted_indicators.append({
                        "type": "WEB_ATTACK_PAYLOAD",
                        "severity": sev,
                        "indicator": path[:80],
                        "description": f"Source {ip}: {reason}"
                    })
                    break

            # Sensitive directory traversal tracking
            is_sensitive = any(s in path_lower for s in SENSITIVE_PATHS)
            if is_sensitive:
                if ip not in ip_directory_scans:
                    ip_directory_scans[ip] = []
                if path not in ip_directory_scans[ip]:
                    ip_directory_scans[ip].append(path)
                entry["is_threat"] = True
                entry["threat_reason"] = "Directory Scanning Attempt"

            # Failed logins (brute force)
            is_login_fail = False
            if entry.get("log_type") == "auth" and entry.get("auth_status") == "failed":
                is_login_fail = True
            elif entry.get("log_type") == "windows_event" and entry.get("is_threat"):
                is_login_fail = True
            elif entry.get("log_type") == "web" and status in [401, 403] and any(kw in path_lower for kw in ["login", "admin", "auth", "signin"]):
                is_login_fail = True

            if is_login_fail:
                if ip not in ip_failed_logins:
                    ip_failed_logins[ip] = {"count": 0, "paths": set()}
                ip_failed_logins[ip]["count"] += count
                ip_failed_logins[ip]["paths"].add(path)
                entry["is_threat"] = True
                entry["threat_reason"] = "Brute Force Auth Attempt"

            if entry.get("log_type") == "web":
                url_counts[path] = url_counts.get(path, 0) + count

        # Format Brute Force Threats (Threshold: >= 3 attempts or single explicit script/event failure)
        brute_force_ips = []
        for ip, info in ip_failed_logins.items():
            if info["count"] >= 3:
                brute_force_ips.append({
                    "ip": ip,
                    "failed_count": info["count"],
                    "paths": list(info["paths"])
                })
                self.extracted_indicators.append({
                    "type": "BRUTE_FORCE_AUTH",
                    "severity": "HIGH",
                    "indicator": ip,
                    "description": f"{info['count']} repeated failed authentication attempts from {ip}"
                })

        # Format Directory Scan Threats
        directory_scans = []
        for ip, paths in ip_directory_scans.items():
            directory_scans.append({
                "ip": ip,
                "paths": paths,
                "count": len(paths)
            })
            self.extracted_indicators.append({
                "type": "DIRECTORY_SCANNER",
                "severity": "MEDIUM" if len(paths) < 3 else "HIGH",
                "indicator": ip,
                "description": f"Probing sensitive administrative and system paths ({len(paths)} probes)"
            })

        scanned_urls = [{"url": k, "count": v} for k, v in sorted(url_counts.items(), key=lambda item: item[1], reverse=True)[:10]]
        error_rate = round((failed_requests / total_requests) * 100, 2)
        throughput = round(self.total_lines_read / max(self.parse_duration, 0.0001), 2)

        return {
            "total_requests": total_requests,
            "unique_ips_count": len(unique_ips),
            "error_rate": error_rate,
            "log_format": primary_format,
            "brute_force_ips": brute_force_ips,
            "directory_scans": directory_scans,
            "suspicious_commands": self.suspicious_commands,
            "scanned_urls": scanned_urls,
            "parsed_logs": self.parsed_entries[:150],
            "extracted_indicators": self.extracted_indicators,
            "performance_metrics": {
                "total_lines_read": self.total_lines_read,
                "unique_lines": len(line_counts or {}),
                "parse_duration_seconds": self.parse_duration,
                "throughput_lines_per_sec": throughput
            }
        }
