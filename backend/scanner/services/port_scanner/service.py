import socket
import re
import ipaddress
import time
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Tuple, Optional

from scanner.services.ssrf_protector import (
    validate_target_ssrf,
    SSRFBlockedError,
    RESTRICTED_NETWORKS,
)

# Operational limits
MAX_PORTS_PER_SCAN = 100
MAX_CONCURRENT_PORT_CHECKS = 10
DEFAULT_PORT_SCAN_TIMEOUT = 1.5

# Predefined Port Profiles
PORT_PROFILES = {
    "COMMON": [
        21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 587,
        993, 995, 1433, 1521, 2082, 2083, 3306, 3389, 5432, 5900, 6379,
        8080, 8443, 27017
    ],
    "WEB": [
        80, 443, 8000, 8080, 8443, 8888, 9000, 9090
    ],
    "DATABASE": [
        1433, 1521, 3306, 5432, 6379, 9200, 11211, 27017
    ],
    "ADMIN_REMOTE": [
        22, 23, 3389, 5900, 2082, 2083, 8443, 9090, 10000
    ]
}

# Static Port-to-Service Catalog
SERVICE_PORT_MAP: Dict[int, Dict[str, Any]] = {
    20: {"service": "FTP-DATA", "category": "FILE_TRANSFER", "confidence": "HIGH", "plaintext": True},
    21: {"service": "FTP", "category": "FILE_TRANSFER", "confidence": "HIGH", "plaintext": True},
    22: {"service": "SSH", "category": "REMOTE_ADMIN", "confidence": "HIGH", "plaintext": False},
    23: {"service": "TELNET", "category": "REMOTE_ADMIN", "confidence": "HIGH", "plaintext": True},
    25: {"service": "SMTP", "category": "EMAIL", "confidence": "HIGH", "plaintext": True},
    53: {"service": "DNS", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    67: {"service": "DHCP", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    68: {"service": "DHCP", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    69: {"service": "TFTP", "category": "FILE_TRANSFER", "confidence": "HIGH", "plaintext": True},
    80: {"service": "HTTP", "category": "WEB", "confidence": "HIGH", "plaintext": True},
    88: {"service": "KERBEROS", "category": "AUTHENTICATION", "confidence": "HIGH", "plaintext": False},
    110: {"service": "POP3", "category": "EMAIL", "confidence": "HIGH", "plaintext": True},
    111: {"service": "RPCBIND", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    123: {"service": "NTP", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    135: {"service": "MSRPC", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    137: {"service": "NETBIOS-NS", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    138: {"service": "NETBIOS-DGM", "category": "INFRASTRUCTURE", "confidence": "HIGH", "plaintext": True},
    139: {"service": "NETBIOS-SSN", "category": "FILE_SHARING", "confidence": "HIGH", "plaintext": True},
    143: {"service": "IMAP", "category": "EMAIL", "confidence": "HIGH", "plaintext": True},
    161: {"service": "SNMP", "category": "MANAGEMENT", "confidence": "HIGH", "plaintext": True},
    162: {"service": "SNMP-TRAP", "category": "MANAGEMENT", "confidence": "HIGH", "plaintext": True},
    389: {"service": "LDAP", "category": "DIRECTORY", "confidence": "HIGH", "plaintext": True},
    443: {"service": "HTTPS", "category": "WEB", "confidence": "HIGH", "plaintext": False},
    445: {"service": "SMB", "category": "FILE_SHARING", "confidence": "HIGH", "plaintext": True},
    465: {"service": "SMTPS", "category": "EMAIL", "confidence": "HIGH", "plaintext": False},
    514: {"service": "SYSLOG", "category": "LOGGING", "confidence": "HIGH", "plaintext": True},
    587: {"service": "SMTP-SUBMISSION", "category": "EMAIL", "confidence": "HIGH", "plaintext": False},
    636: {"service": "LDAPS", "category": "DIRECTORY", "confidence": "HIGH", "plaintext": False},
    873: {"service": "RSYNC", "category": "FILE_TRANSFER", "confidence": "HIGH", "plaintext": True},
    993: {"service": "IMAPS", "category": "EMAIL", "confidence": "HIGH", "plaintext": False},
    995: {"service": "POP3S", "category": "EMAIL", "confidence": "HIGH", "plaintext": False},
    1080: {"service": "SOCKS-PROXY", "category": "PROXY", "confidence": "HIGH", "plaintext": True},
    1433: {"service": "MSSQL", "category": "DATABASE", "confidence": "HIGH", "plaintext": False},
    1521: {"service": "ORACLE-DB", "category": "DATABASE", "confidence": "HIGH", "plaintext": False},
    2049: {"service": "NFS", "category": "FILE_SHARING", "confidence": "HIGH", "plaintext": True},
    2082: {"service": "CPANEL", "category": "MANAGEMENT", "confidence": "HIGH", "plaintext": True},
    2083: {"service": "CPANEL-SSL", "category": "MANAGEMENT", "confidence": "HIGH", "plaintext": False},
    2375: {"service": "DOCKER-API", "category": "CONTAINER", "confidence": "HIGH", "plaintext": True},
    2376: {"service": "DOCKER-API-TLS", "category": "CONTAINER", "confidence": "HIGH", "plaintext": False},
    3000: {"service": "DEV-SERVER-NODE", "category": "DEVELOPMENT", "confidence": "MEDIUM", "plaintext": True},
    3306: {"service": "MYSQL", "category": "DATABASE", "confidence": "HIGH", "plaintext": False},
    3389: {"service": "RDP", "category": "REMOTE_ADMIN", "confidence": "HIGH", "plaintext": False},
    4200: {"service": "DEV-SERVER-ANGULAR", "category": "DEVELOPMENT", "confidence": "MEDIUM", "plaintext": True},
    5000: {"service": "DEV-SERVER-FLASK", "category": "DEVELOPMENT", "confidence": "MEDIUM", "plaintext": True},
    5432: {"service": "POSTGRESQL", "category": "DATABASE", "confidence": "HIGH", "plaintext": False},
    5672: {"service": "RABBITMQ-AMQP", "category": "MESSAGE_QUEUE", "confidence": "HIGH", "plaintext": True},
    5900: {"service": "VNC", "category": "REMOTE_ADMIN", "confidence": "HIGH", "plaintext": False},
    5901: {"service": "VNC-DISPLAY1", "category": "REMOTE_ADMIN", "confidence": "HIGH", "plaintext": False},
    6379: {"service": "REDIS", "category": "DATABASE", "confidence": "HIGH", "plaintext": True},
    7001: {"service": "WEBLOGIC", "category": "WEB_APP", "confidence": "HIGH", "plaintext": True},
    8000: {"service": "HTTP-DEV", "category": "WEB", "confidence": "MEDIUM", "plaintext": True},
    8080: {"service": "HTTP-ALT", "category": "WEB", "confidence": "HIGH", "plaintext": True},
    8443: {"service": "HTTPS-ALT", "category": "WEB", "confidence": "HIGH", "plaintext": False},
    8888: {"service": "JUPYTER-DEV", "category": "DEVELOPMENT", "confidence": "MEDIUM", "plaintext": True},
    9000: {"service": "SONARQUBE-PORTAINER", "category": "MANAGEMENT", "confidence": "MEDIUM", "plaintext": True},
    9090: {"service": "PROMETHEUS-COCKPIT", "category": "MANAGEMENT", "confidence": "MEDIUM", "plaintext": True},
    9092: {"service": "KAFKA", "category": "MESSAGE_QUEUE", "confidence": "HIGH", "plaintext": True},
    9200: {"service": "ELASTICSEARCH", "category": "DATABASE", "confidence": "HIGH", "plaintext": True},
    10000: {"service": "WEBMIN", "category": "MANAGEMENT", "confidence": "HIGH", "plaintext": False},
    11211: {"service": "MEMCACHED", "category": "DATABASE", "confidence": "HIGH", "plaintext": True},
    27017: {"service": "MONGODB", "category": "DATABASE", "confidence": "HIGH", "plaintext": True},
}


def normalize_and_validate_target(raw_target: str) -> Dict[str, Any]:
    """
    Cleans, normalizes, and extracts the target hostname or IP.
    Strips protocol, path, and port if a URL is accidentally provided.
    """
    if not raw_target or not isinstance(raw_target, str):
        raise ValueError("Target host or IP address is required.")

    target = raw_target.strip()

    # If user provided a URL (e.g., https://example.com:8443/login)
    if "://" in target or target.startswith("//"):
        parsed = urlparse(target if "://" in target else f"http:{target}")
        target = parsed.hostname or parsed.netloc or target

    # Strip trailing slashes, paths, and colons if any remain
    target = target.split('/')[0].split('?')[0].split('#')[0]
    if ':' in target and not target.count(':') > 1:  # Not IPv6
        target = target.split(':')[0]

    target = target.strip().lower()

    if not target:
        raise ValueError("Invalid empty target specified.")

    # Validate target character structure
    if not re.match(r'^[a-zA-Z0-9.\-_:]+$', target):
        raise ValueError("Target contains invalid or forbidden characters.")

    # Check if target is an IP
    is_ip = False
    ip_ver = None
    try:
        ip_obj = ipaddress.ip_address(target)
        is_ip = True
        ip_ver = ip_obj.version
    except ValueError:
        is_ip = False

    return {
        "target": target,
        "is_ip": is_ip,
        "ip_version": ip_ver,
        "raw_input": raw_target
    }


def resolve_target_dns(target: str) -> Tuple[List[str], Optional[str]]:
    """
    Safely resolves hostname to IPv4/IPv6 addresses and returns (resolved_ips, error_message).
    """
    try:
        # Check if already an IP
        ipaddress.ip_address(target)
        return [target], None
    except ValueError:
        pass

    try:
        resolved_ips = []
        addr_info = socket.getaddrinfo(target, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for item in addr_info:
            ip = item[4][0]
            if ip not in resolved_ips:
                resolved_ips.append(ip)

        if not resolved_ips:
            return [], "DNS resolution returned no IP addresses."
        return resolved_ips, None
    except socket.gaierror as e:
        return [], f"DNS resolution failed: {str(e)}"
    except Exception as e:
        return [], f"DNS lookup error: {str(e)}"


def parse_and_validate_ports(profile: str = "COMMON", custom_ports: Optional[List[Any]] = None) -> List[int]:
    """
    Validates, deduplicates, and bounds requested ports within [1, 65535] and MAX_PORTS_PER_SCAN.
    """
    selected_ports = set()
    profile_upper = (profile or "COMMON").upper()

    if profile_upper in PORT_PROFILES:
        selected_ports.update(PORT_PROFILES[profile_upper])

    if custom_ports and isinstance(custom_ports, (list, tuple, set)):
        for p in custom_ports:
            try:
                p_int = int(p)
                if 1 <= p_int <= 65535:
                    selected_ports.add(p_int)
            except (ValueError, TypeError):
                continue

    if not selected_ports:
        selected_ports.update(PORT_PROFILES["COMMON"])

    sorted_ports = sorted(list(selected_ports))
    if len(sorted_ports) > MAX_PORTS_PER_SCAN:
        sorted_ports = sorted_ports[:MAX_PORTS_PER_SCAN]

    return sorted_ports


class PortScannerService:
    """
    Safe and Defensive TCP Port Scanner Service.
    Performs controlled non-exploitative TCP connection checks with bounded concurrency and timeouts.
    """

    def __init__(self, timeout: float = DEFAULT_PORT_SCAN_TIMEOUT, max_workers: int = MAX_CONCURRENT_PORT_CHECKS):
        self.timeout = timeout
        self.max_workers = max_workers

    def scan_port(self, target_ip: str, port: int) -> Dict[str, Any]:
        """
        Executes a safe, non-exploitative TCP socket connection attempt on a single target port.
        Returns port state and static service metadata.
        """
        state = "UNKNOWN"
        error_detail = None
        start_time = time.time()

        sock = None
        try:
            # Determine address family (IPv4 vs IPv6)
            is_ipv6 = ":" in target_ip
            family = socket.AF_INET6 if is_ipv6 else socket.AF_INET

            sock = socket.socket(family, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)

            # Attempt connection
            result = sock.connect_ex((target_ip, port))

            if result == 0:
                state = "OPEN"
            elif result in (111, 10061):  # ECONNREFUSED (Linux / Windows)
                state = "CLOSED"
            elif result in (110, 10060, 113, 10065):  # ETIMEDOUT / EHOSTUNREACH
                state = "FILTERED"
            else:
                state = "FILTERED"
                error_detail = f"Socket error code: {result}"

        except socket.timeout:
            state = "FILTERED"
            error_detail = "Connection timed out"
        except (ConnectionRefusedError, ConnectionResetError):
            state = "CLOSED"
        except OSError as e:
            if getattr(e, 'errno', None) in (111, 10061):
                state = "CLOSED"
            elif getattr(e, 'errno', None) in (110, 10060, 113, 10065):
                state = "FILTERED"
            else:
                state = "FILTERED"
                error_detail = str(e)
        except Exception as e:
            state = "UNKNOWN"
            error_detail = str(e)
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass

        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Retrieve static service mapping
        service_info = SERVICE_PORT_MAP.get(port, {
            "service": "UNKNOWN",
            "category": "OTHER",
            "confidence": "LOW",
            "plaintext": False
        })

        return {
            "port": port,
            "protocol": "TCP",
            "state": state,
            "service": service_info["service"],
            "category": service_info.get("category", "OTHER"),
            "confidence": service_info["confidence"] if state == "OPEN" else "LOW",
            "plaintext": service_info.get("plaintext", False),
            "response_time_ms": duration_ms,
            "error_detail": error_detail
        }

    def scan_target(
        self,
        target: str,
        profile: str = "COMMON",
        custom_ports: Optional[List[Any]] = None,
        user: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Full orchestration of safe defensive port scan against an authorized target.
        """
        scan_start_time = time.time()

        # Step 1: Normalize target
        try:
            norm = normalize_and_validate_target(target)
            clean_target = norm["target"]
            target_type = "IP" if norm["is_ip"] else "HOSTNAME"
        except ValueError as e:
            return self._build_error_response(target, str(e), status="INVALID_INPUT")

        # Step 2: SSRF & Restricted Network Verification (pre-DNS check)
        try:
            validate_target_ssrf(clean_target)
        except SSRFBlockedError as e:
            return self._build_error_response(clean_target, str(e), status="SSRF_BLOCKED")
        except Exception as e:
            return self._build_error_response(clean_target, f"SSRF check error: {str(e)}", status="ERROR")

        # Step 3: DNS Resolution
        resolved_ips, dns_err = resolve_target_dns(clean_target)
        if dns_err or not resolved_ips:
            return self._build_error_response(clean_target, dns_err or "DNS resolution failed", status="DNS_ERROR")

        # Step 4: Validate all resolved IPs against SSRF policy (DNS Rebinding defense)
        for ip_str in resolved_ips:
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                for net in RESTRICTED_NETWORKS:
                    if ip_obj in net:
                        raise SSRFBlockedError(f"Target resolved to restricted IP: {ip_str}")
            except SSRFBlockedError as e:
                return self._build_error_response(clean_target, str(e), status="SSRF_BLOCKED")
            except Exception:
                pass

        primary_ip = resolved_ips[0]

        # Step 5: Parse & Bounded Ports Selection
        ports_to_scan = parse_and_validate_ports(profile=profile, custom_ports=custom_ports)

        # Step 6: Controlled Concurrent TCP Connection Checks
        port_results = []
        with ThreadPoolExecutor(max_workers=min(self.max_workers, len(ports_to_scan))) as executor:
            future_to_port = {
                executor.submit(self.scan_port, primary_ip, port): port
                for port in ports_to_scan
            }
            for future in as_completed(future_to_port):
                try:
                    res = future.result()
                    port_results.append(res)
                except Exception as e:
                    port = future_to_port[future]
                    port_results.append({
                        "port": port,
                        "protocol": "TCP",
                        "state": "UNKNOWN",
                        "service": "UNKNOWN",
                        "confidence": "LOW",
                        "error_detail": str(e)
                    })

        # Sort results sequentially by port number
        port_results.sort(key=lambda x: x["port"])

        # Categorize results
        open_ports = [p for p in port_results if p["state"] == "OPEN"]
        closed_ports = [p for p in port_results if p["state"] == "CLOSED"]
        filtered_ports = [p for p in port_results if p["state"] == "FILTERED"]
        unknown_ports = [p for p in port_results if p["state"] == "UNKNOWN"]

        # Step 7: Security Indicators Analysis
        indicators = self._analyze_port_security_indicators(open_ports, len(ports_to_scan))

        # Step 8: Risk Scoring & Recommendations
        threat_score, severity, confidence = self._calculate_port_risk_score(open_ports, indicators, len(resolved_ips))
        recommendations = self._generate_recommendations(open_ports, indicators)

        scan_duration = round(time.time() - scan_start_time, 2)

        # Step 9: Build Structured Evidence
        structured_evidence = {
            "source": "PORT_SCANNER",
            "target": clean_target,
            "target_type": target_type,
            "resolved_ips": resolved_ips,
            "primary_ip": primary_ip,
            "scan_profile": (profile or "COMMON").upper(),
            "ports_scanned_count": len(ports_to_scan),
            "open_ports_count": len(open_ports),
            "closed_ports_count": len(closed_ports),
            "filtered_ports_count": len(filtered_ports),
            "open_ports": open_ports,
            "indicators": indicators,
            "risk": {
                "score": threat_score,
                "severity": severity,
                "confidence": confidence
            },
            "scan_duration_seconds": scan_duration
        }

        return {
            "target": clean_target,
            "target_type": target_type,
            "resolved_ips": resolved_ips,
            "primary_ip": primary_ip,
            "scan_profile": (profile or "COMMON").upper(),
            "requested_ports": ports_to_scan,
            "results": port_results,
            "open_ports": open_ports,
            "closed_ports": closed_ports,
            "filtered_ports": filtered_ports,
            "indicators": indicators,
            "recommendations": recommendations,
            "threat_score": threat_score,
            "severity": severity,
            "confidence": confidence,
            "status": "SUCCESS",
            "error_message": None,
            "structured_evidence": structured_evidence,
            "scan_duration": scan_duration
        }

    def _analyze_port_security_indicators(self, open_ports: List[Dict[str, Any]], total_scanned: int) -> List[Dict[str, Any]]:
        """
        Evaluates exposure indicators from detected open ports.
        """
        indicators = []
        open_port_numbers = {p["port"] for p in open_ports}

        # 1. Database Ports Exposed
        db_ports = {1433, 1521, 3306, 5432, 6379, 9200, 11211, 27017}
        exposed_dbs = open_port_numbers.intersection(db_ports)
        if exposed_dbs:
            for p in exposed_dbs:
                svc = SERVICE_PORT_MAP.get(p, {}).get("service", "Database")
                indicators.append({
                    "type": "DATABASE_PORT_EXPOSED",
                    "severity": "HIGH",
                    "port": p,
                    "service": svc,
                    "description": f"Database service ({svc} on port {p}) is directly accessible externally."
                })

        # 2. Remote Administration Exposed
        admin_ports = {22, 3389, 5900, 5901, 10000, 2082, 2083, 9090}
        exposed_admins = open_port_numbers.intersection(admin_ports)
        if exposed_admins:
            for p in exposed_admins:
                svc = SERVICE_PORT_MAP.get(p, {}).get("service", "Remote Admin")
                sev = "HIGH" if p in (3389, 5900, 5901, 10000) else "MEDIUM"
                indicators.append({
                    "type": "REMOTE_ADMIN_SERVICE_EXPOSED",
                    "severity": sev,
                    "port": p,
                    "service": svc,
                    "description": f"Remote management service ({svc} on port {p}) is exposed to external networks."
                })

        # 3. Plaintext / Insecure Legacy Services
        plaintext_ports = {21, 23, 110, 143, 139, 445}
        exposed_plaintext = open_port_numbers.intersection(plaintext_ports)
        if exposed_plaintext:
            for p in exposed_plaintext:
                svc = SERVICE_PORT_MAP.get(p, {}).get("service", "Legacy Protocol")
                sev = "HIGH" if p in (23, 445, 139) else "MEDIUM"
                indicators.append({
                    "type": "UNENCRYPTED_LEGACY_SERVICE",
                    "severity": sev,
                    "port": p,
                    "service": svc,
                    "description": f"Unencrypted or legacy protocol ({svc} on port {p}) is exposed without mandatory TLS."
                })

        # 4. Critical Docker API Exposure
        if 2375 in open_port_numbers:
            indicators.append({
                "type": "DOCKER_UNAUTHENTICATED_API_EXPOSED",
                "severity": "CRITICAL",
                "port": 2375,
                "service": "DOCKER-API",
                "description": "Unencrypted Docker REST API daemon port 2375 is open, allowing root host compromise."
            })

        # 5. Internal Development Servers
        dev_ports = {3000, 5000, 8000, 8888}
        exposed_devs = open_port_numbers.intersection(dev_ports)
        if exposed_devs:
            for p in exposed_devs:
                svc = SERVICE_PORT_MAP.get(p, {}).get("service", "Dev Server")
                indicators.append({
                    "type": "INTERNAL_DEV_SERVER_EXPOSED",
                    "severity": "MEDIUM",
                    "port": p,
                    "service": svc,
                    "description": f"Development server port ({svc} on port {p}) appears externally accessible."
                })

        # 6. Multiple Exposed Services
        if len(open_ports) >= 5:
            indicators.append({
                "type": "MULTIPLE_EXPOSED_SERVICES",
                "severity": "MEDIUM",
                "port": None,
                "service": "Multiple",
                "description": f"Target exposes a broad attack surface with {len(open_ports)} simultaneously open TCP services."
            })

        return indicators

    def _calculate_port_risk_score(
        self,
        open_ports: List[Dict[str, Any]],
        indicators: List[Dict[str, Any]],
        resolved_ip_count: int
    ) -> Tuple[int, str, int]:
        """
        Deterministic port exposure risk score (0–100) and severity category.
        """
        score = 0

        # Evaluate indicators
        for ind in indicators:
            sev = ind.get("severity", "LOW")
            if sev == "CRITICAL":
                score += 35
            elif sev == "HIGH":
                score += 25
            elif sev == "MEDIUM":
                score += 15
            elif sev == "LOW":
                score += 5

        # Base exposure per open port
        for p in open_ports:
            port_num = p["port"]
            # Standard web ports have low intrinsic exposure penalty
            if port_num in (80, 443, 8080, 8443):
                score += 2
            else:
                score += 5

        score = max(0, min(100, score))

        if score >= 75:
            severity = "CRITICAL"
        elif score >= 50:
            severity = "HIGH"
        elif score >= 25:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # Confidence: High if DNS succeeded and connection checks completed
        confidence = 90 if resolved_ip_count > 0 else 75

        return score, severity, confidence

    def _generate_recommendations(
        self,
        open_ports: List[Dict[str, Any]],
        indicators: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generates actionable defensive hardening recommendations.
        """
        recs = []
        open_nums = {p["port"] for p in open_ports}

        # Databases
        if any(p in open_nums for p in (3306, 5432, 1433, 1521, 6379, 27017, 9200, 11211)):
            recs.append("Restrict database listening interfaces to localhost/private VPC or place behind VPN/firewall ACLs.")

        # Remote Admin
        if any(p in open_nums for p in (3389, 5900, 5901, 10000)):
            recs.append("Enforce VPN or SSH bastion tunnels for remote administration (RDP/VNC/Webmin) rather than public exposure.")

        if 22 in open_nums:
            recs.append("Ensure SSH server enforces key-based authentication, disables root login, and uses rate-limiting (fail2ban).")

        # Insecure Protocols
        if any(p in open_nums for p in (21, 23, 110, 143, 445)):
            recs.append("Disable unencrypted legacy protocols (Telnet/FTP/SMB) and replace with encrypted alternatives (SSH/SFTP/TLS).")

        # Docker API
        if 2375 in open_nums:
            recs.append("CRITICAL: Immediately bind Docker daemon to Unix socket or enforce mutual TLS on port 2376.")

        # Dev servers
        if any(p in open_nums for p in (3000, 5000, 8000, 8888)):
            recs.append("Terminate development servers or place behind an authenticated reverse proxy.")

        if not recs:
            if open_ports:
                recs.append("Maintain strict firewall ingress filtering and regularly audit exposed service configurations.")
            else:
                recs.append("No open TCP services detected on the scanned ports. Continue regular perimeter hygiene.")

        return recs

    def _build_error_response(self, target: str, error_msg: str, status: str = "ERROR") -> Dict[str, Any]:
        """
        Constructs a normalized error response.
        """
        return {
            "target": target,
            "target_type": "UNKNOWN",
            "resolved_ips": [],
            "primary_ip": "",
            "scan_profile": "UNKNOWN",
            "requested_ports": [],
            "results": [],
            "open_ports": [],
            "closed_ports": [],
            "filtered_ports": [],
            "indicators": [],
            "recommendations": ["Verify the target hostname and ensure proper network reachability."],
            "threat_score": 0,
            "severity": "LOW",
            "confidence": 50,
            "status": status,
            "error_message": error_msg,
            "structured_evidence": {
                "source": "PORT_SCANNER",
                "target": target,
                "status": status,
                "error": error_msg
            },
            "scan_duration": 0.0
        }
