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

SENSITIVE_PATHS = [
    '/wp-admin', '/wp-login.php', '/wp-config.php',
    '/.env', '/config.php', '/config/config.yml',
    '/phpmyadmin', '/pma', '/admin', '/db',
    '/.git', '/.svn', '/.metadata',
    '/etc/passwd', '/etc/shadow',
    '/xmlrpc.php', '/shell.php', '/cmd.php',
    '/upload.php', '/temp', '/backup.sql', '/backup.zip'
]


class LogParser:
    """
    High-Performance SOC Log Parser and Threat Correlation Engine.
    Features:
    - Level 1: Fast Deduplication & Ingest Streaming
    - Level 2: Rule-based Heuristic Correlation (Brute-force, Web Traversal)
    - Throughput & Efficiency Telemetry
    """

    def __init__(self, raw_logs):
        self.raw_logs = raw_logs
        self.parsed_entries = []
        self.total_lines_read = 0
        self.parse_duration = 0.0

    def parse(self):
        start_time = time.time()
        
        # Fast line streaming without loading massive split arrays into memory
        line_counts = {}
        ordered_lines = []

        if isinstance(self.raw_logs, str):
            stream = io.StringIO(self.raw_logs)
        else:
            stream = self.raw_logs

        for raw_line in stream:
            self.total_lines_read += 1
            line = raw_line.strip()
            if not line:
                continue

            if line in line_counts:
                line_counts[line] += 1
            else:
                line_counts[line] = 1
                ordered_lines.append(line)

        # Parse unique lines (10x-50x speedup on repetitive server logs)
        parsed_cache = {}
        for line in ordered_lines:
            entry = self._parse_line(line)
            if entry:
                parsed_cache[line] = entry

        # Build parsed entries with count awareness
        for line in ordered_lines:
            entry = parsed_cache.get(line)
            if entry:
                count = line_counts[line]
                entry_copy = dict(entry)
                entry_copy["occurrence_count"] = count
                self.parsed_entries.append(entry_copy)

        self.parse_duration = round(time.time() - start_time, 4)
        return self._generate_analysis(line_counts)

    def _parse_line(self, line):
        # Fast string heuristics before invoking full regex
        # 1. Try Combined / Common Web Log
        if ' "' in line or ' HTTP/' in line or ' GET ' in line or ' POST ' in line:
            match = COMBINED_LOG_REGEX.match(line)
            if match:
                ip, timestamp, method, path, protocol, status, size, referrer, user_agent = match.groups()
                return {
                    "ip": ip,
                    "timestamp": timestamp,
                    "method": method,
                    "path": path or "/",
                    "status": int(status),
                    "size": size,
                    "referrer": referrer,
                    "user_agent": user_agent,
                    "log_type": "web"
                }

            match = COMMON_LOG_REGEX.match(line)
            if match:
                ip, timestamp, method, path, protocol, status, size = match.groups()
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

        # 2. Try SSH Auth Logs
        if 'Failed password' in line or 'Failed ' in line:
            match = SSH_FAILED_REGEX.search(line)
            if match:
                user, ip = match.groups()
                return {
                    "ip": ip,
                    "timestamp": self._extract_timestamp(line),
                    "method": "SSH",
                    "path": f"Login attempt for user: {user}",
                    "status": 401,
                    "size": "0",
                    "referrer": "-",
                    "user_agent": "SSH-Client",
                    "log_type": "auth",
                    "auth_user": user,
                    "auth_status": "failed"
                }

        if 'Accepted password' in line or 'Accepted ' in line:
            match = SSH_ACCEPTED_REGEX.search(line)
            if match:
                user, ip = match.groups()
                return {
                    "ip": ip,
                    "timestamp": self._extract_timestamp(line),
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

        # 3. Generic Log fallback (Search for IP and failures)
        ip_match = re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', line)
        if ip_match:
            ip = ip_match.group(0)
            status = 200
            if any(kw in line.lower() for kw in ["fail", "error", "invalid", "deny", "unauthorized", "refused"]):
                status = 401
            return {
                "ip": ip,
                "timestamp": self._extract_timestamp(line) or "Unknown",
                "method": "GENERIC",
                "path": line[:100],  # Truncate long lines
                "status": status,
                "size": "0",
                "referrer": "-",
                "user_agent": "-",
                "log_type": "generic"
            }

        return None

    def _extract_timestamp(self, line):
        match = re.search(r'^([A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})', line)
        if match:
            return match.group(0)
        return ""

    def _generate_analysis(self, line_counts=None):
        total_requests = sum(entry.get("occurrence_count", 1) for entry in self.parsed_entries)
        if total_requests == 0:
            return {
                "total_requests": 0,
                "unique_ips_count": 0,
                "error_rate": 0,
                "brute_force_ips": [],
                "directory_scans": [],
                "scanned_urls": [],
                "parsed_logs": [],
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
            unique_ips.add(ip)
            status = entry["status"]
            path = entry["path"]
            count = entry.get("occurrence_count", 1)

            # Count errors (4xx, 5xx or SSH failures)
            if status >= 400 or entry.get("auth_status") == "failed":
                failed_requests += count

            # Track potential web scanning
            path_lower = path.lower()
            is_sensitive = any(s in path_lower for s in SENSITIVE_PATHS)

            if is_sensitive:
                if ip not in ip_directory_scans:
                    ip_directory_scans[ip] = []
                if path not in ip_directory_scans[ip]:
                    ip_directory_scans[ip].append(path)
                entry["is_threat"] = True
                entry["threat_reason"] = "Directory Scanning Attempt"

            # Track failed logins (brute force)
            is_login_fail = False
            if entry["log_type"] == "auth" and entry.get("auth_status") == "failed":
                is_login_fail = True
            elif entry["log_type"] == "web" and status in [401, 403] and any(kw in path_lower for kw in ["login", "admin", "auth"]):
                is_login_fail = True

            if is_login_fail:
                if ip not in ip_failed_logins:
                    ip_failed_logins[ip] = {"count": 0, "paths": set()}
                ip_failed_logins[ip]["count"] += count
                ip_failed_logins[ip]["paths"].add(path)
                entry["is_threat"] = True
                entry["threat_reason"] = "Brute Force Auth Attempt"

            # Track top URLs
            if entry["log_type"] == "web":
                url_counts[path] = url_counts.get(path, 0) + count

        # Format Brute Force Threats (Threshold: >= 3 failed attempts)
        brute_force_ips = []
        for ip, info in ip_failed_logins.items():
            if info["count"] >= 3:
                brute_force_ips.append({
                    "ip": ip,
                    "failed_count": info["count"],
                    "paths": list(info["paths"])
                })

        # Format Directory Scan Threats
        directory_scans = []
        for ip, paths in ip_directory_scans.items():
            directory_scans.append({
                "ip": ip,
                "paths": paths,
                "count": len(paths)
            })

        # Format top URLs
        scanned_urls = [{"url": k, "count": v} for k, v in sorted(url_counts.items(), key=lambda item: item[1], reverse=True)[:10]]

        error_rate = round((failed_requests / total_requests) * 100, 2)
        throughput = round(self.total_lines_read / max(self.parse_duration, 0.0001), 2)

        return {
            "total_requests": total_requests,
            "unique_ips_count": len(unique_ips),
            "error_rate": error_rate,
            "brute_force_ips": brute_force_ips,
            "directory_scans": directory_scans,
            "scanned_urls": scanned_urls,
            "parsed_logs": self.parsed_entries[:100],  # Return top 100 log items for display
            "performance_metrics": {
                "total_lines_read": self.total_lines_read,
                "unique_lines": len(line_counts or {}),
                "parse_duration_seconds": self.parse_duration,
                "throughput_lines_per_sec": throughput
            }
        }
