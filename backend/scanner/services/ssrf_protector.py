"""
SSRF Protection Utility for CyberGuardian AI.
Validates target hostnames and IP addresses to prevent Server-Side Request Forgery (SSRF).
Blocks loopback, private RFC1918, link-local, cloud metadata, multicast, broadcast, and invalid destinations.
"""

import socket
import ipaddress
from urllib.parse import urlparse


class SSRFBlockedError(Exception):
    """Raised when a scan target resolves to a restricted/private network destination."""
    pass


# Restricted IP Networks (IPv4 and IPv6)
RESTRICTED_NETWORKS = [
    # Loopback
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('::1/128'),

    # Private RFC 1918 (IPv4)
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),

    # Unique Local Address (IPv6 private)
    ipaddress.ip_network('fc00::/7'),

    # Link-Local (including Cloud Metadata: 169.254.169.254)
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('fe80::/10'),

    # Current network / Unspecified
    ipaddress.ip_network('0.0.0.0/8'),
    ipaddress.ip_network('::/128'),

    # Carrier-Grade NAT (RFC 6598)
    ipaddress.ip_network('100.64.0.0/10'),

    # Multicast & Reserved
    ipaddress.ip_network('224.0.0.0/4'),
    ipaddress.ip_network('240.0.0.0/4'),
    ipaddress.ip_network('ff00::/8'),

    # Broadcast
    ipaddress.ip_network('255.255.255.255/32'),
]

# Explicitly blocked hostnames
BLOCKED_HOSTNAMES = {
    'localhost',
    'localhost.localdomain',
    'ip6-localhost',
    'ip6-loopback',
    'metadata.google.internal',
    'instance-data',
}


def is_ip_restricted(ip_str: str) -> tuple[bool, str]:
    """
    Check if an IP address falls within restricted/private network ranges.
    Returns (is_restricted, reason).
    """
    try:
        ip = ipaddress.ip_address(ip_str.strip())
    except ValueError:
        return True, f"Invalid IP address format: {ip_str}"

    # Check built-in properties
    if ip.is_loopback:
        return True, f"Target IP {ip_str} is a loopback address."
    if ip.is_private:
        return True, f"Target IP {ip_str} is a private network address (RFC 1918 / ULA)."
    if ip.is_link_local:
        return True, f"Target IP {ip_str} is a link-local address (potential cloud metadata)."
    if ip.is_multicast:
        return True, f"Target IP {ip_str} is a multicast address."
    if ip.is_reserved:
        return True, f"Target IP {ip_str} is a reserved network address."
    if ip.is_unspecified:
        return True, f"Target IP {ip_str} is an unspecified/zero address."

    # Check against explicit restricted networks
    for net in RESTRICTED_NETWORKS:
        if ip in net:
            return True, f"Target IP {ip_str} belongs to restricted network range {net}."

    return False, ""


def validate_target_ssrf(target: str, port: int = None) -> list[str]:
    """
    Validates a target hostname or IP against SSRF rules.
    Resolves the hostname to IP addresses and ensures all resolved addresses are public.
    
    Returns list of resolved public IP addresses.
    Raises SSRFBlockedError if target resolves to restricted/internal IP or hostname.
    """
    if not target or not target.strip():
        raise SSRFBlockedError("Target cannot be empty.")

    clean_target = target.strip().lower()

    # If scheme was included, parse hostname
    if '://' in clean_target:
        parsed = urlparse(clean_target)
        clean_target = parsed.hostname or clean_target

    # Strip port if present
    if ':' in clean_target:
        clean_target = clean_target.split(':')[0]

    # Clean brackets for IPv6 literal
    clean_target = clean_target.strip('[]')

    # Check blocked hostname list
    if clean_target in BLOCKED_HOSTNAMES:
        raise SSRFBlockedError(f"Access to '{clean_target}' is strictly forbidden (SSRF protection).")

    # Check if target is a direct IP string
    try:
        ipaddress.ip_address(clean_target)
        is_restr, reason = is_ip_restricted(clean_target)
        if is_restr:
            raise SSRFBlockedError(f"Target blocked by SSRF protection: {reason}")
        return [clean_target]
    except ValueError:
        pass  # It's a hostname, proceed to DNS resolution

    # Resolve hostname via DNS
    try:
        addr_info = socket.getaddrinfo(clean_target, port or 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise SSRFBlockedError(f"DNS resolution failed for '{clean_target}': {str(e)}")
    except Exception as e:
        raise SSRFBlockedError(f"Failed to resolve target '{clean_target}': {str(e)}")

    if not addr_info:
        raise SSRFBlockedError(f"No DNS records found for target '{clean_target}'.")

    resolved_ips = []
    for item in addr_info:
        sockaddr = item[4]
        ip_candidate = sockaddr[0]
        if ip_candidate not in resolved_ips:
            resolved_ips.append(ip_candidate)

    # Validate each resolved IP
    for ip_str in resolved_ips:
        is_restr, reason = is_ip_restricted(ip_str)
        if is_restr:
            raise SSRFBlockedError(
                f"Target '{clean_target}' resolved to restricted IP {ip_str}. Access blocked (SSRF protection)."
            )

    return resolved_ips
