"""
URL/domain validation utilities for the Website Security Scanner.
Supports plain domains, subdomains, and full URLs (http/https).
"""

import re
from urllib.parse import urlparse


# Supported schemes for scanning
SUPPORTED_SCHEMES = ('http', 'https')

# RFC-compliant domain regex (supports subdomains, IDN via punycode)
_DOMAIN_REGEX = re.compile(
    r'^(?:[a-zA-Z0-9]'
    r'(?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)'
    r'+[a-zA-Z]{2,63}$'
)


class ValidationError(Exception):
    """Raised when a user-supplied URL/domain fails validation."""
    pass


def normalize_url(raw_input: str) -> dict:
    """
    Normalize a raw user input (domain or URL) into a canonical form.

    Returns a dict:
        {
            "url":    "https://example.com",   # Full URL used for HTTP requests
            "domain": "example.com",           # Bare domain for DNS/WHOIS
            "scheme": "https",                 # Detected or assumed scheme
            "is_https": True,
        }

    Raises ValidationError if the input is invalid or uses an unsupported scheme.
    """
    if not raw_input or not raw_input.strip():
        raise ValidationError("Input cannot be empty.")

    raw = raw_input.strip()

    # If no scheme present, assume https
    if '://' not in raw:
        raw = 'https://' + raw

    parsed = urlparse(raw)

    # Scheme validation
    scheme = parsed.scheme.lower()
    if scheme not in SUPPORTED_SCHEMES:
        raise ValidationError(
            f"Unsupported protocol '{scheme}'. Only HTTP and HTTPS are supported."
        )

    # Extract hostname (strip port if present)
    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("Could not extract a valid hostname from the input.")

    # Validate domain format
    if not _is_valid_domain(hostname) and not _is_valid_ip(hostname):
        raise ValidationError(
            f"'{hostname}' is not a valid domain name. "
            "Examples of valid inputs: google.com, https://example.com, sub.domain.org"
        )

    # Reconstruct canonical URL (always include path if present)
    path = parsed.path or ''
    canonical_url = f"{scheme}://{hostname}{path}"

    return {
        "url": canonical_url,
        "domain": hostname,
        "scheme": scheme,
        "is_https": scheme == 'https',
    }


def _is_valid_domain(hostname: str) -> bool:
    """Return True if hostname matches domain format (supports subdomains)."""
    return bool(_DOMAIN_REGEX.match(hostname))


def _is_valid_ip(hostname: str) -> bool:
    """Return True if hostname is a valid IPv4 or IPv6 address."""
    import ipaddress
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def _is_valid_hash(raw_hash: str) -> bool:
    """Return True if raw_hash is a valid SHA-256, SHA-1, or MD5 hex digest."""
    clean = raw_hash.strip()
    return bool(re.match(r'^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$', clean))


def detect_target_type(target: str) -> str:
    """
    Auto-detect the target type from the raw input string.
    Returns: 'URL', 'IP', 'FILE_HASH', or 'DOMAIN'
    """
    if not target or not target.strip():
        raise ValidationError("Target input cannot be empty.")

    clean = target.strip()

    # 1. URL check
    if clean.startswith(('http://', 'https://')):
        return 'URL'

    # 2. IP check (IPv4 / IPv6)
    if _is_valid_ip(clean):
        return 'IP'

    # 3. File Hash check (32, 40, 64 hex chars)
    if _is_valid_hash(clean):
        return 'FILE_HASH'

    # 4. Domain check
    if _is_valid_domain(clean):
        return 'DOMAIN'

    # Fallback heuristic: if it looks like a URL without scheme e.g. domain/path
    if '/' in clean:
        return 'URL'

    # Default to DOMAIN if it passes basic domain format
    return 'DOMAIN'


def validate_target_format(target: str, target_type: str = None) -> dict:
    """
    Validate target string against target_type (or auto-detect if target_type is None/empty).
    
    Returns dict:
        {
            "target": <normalized_target_string>,
            "target_type": "DOMAIN" | "URL" | "IP" | "FILE_HASH",
        }
        
    Raises ValidationError if invalid.
    """
    if not target or not target.strip():
        raise ValidationError("Target input cannot be empty.")

    clean_target = target.strip()
    detected_type = detect_target_type(clean_target)

    if not target_type or target_type.upper() not in ('DOMAIN', 'URL', 'IP', 'FILE_HASH'):
        final_type = detected_type
    else:
        final_type = target_type.upper()

    # Detailed validation based on final_type
    if final_type == 'IP':
        if not _is_valid_ip(clean_target):
            raise ValidationError(f"'{clean_target}' is not a valid IPv4 or IPv6 address.")
    elif final_type == 'FILE_HASH':
        if not _is_valid_hash(clean_target):
            raise ValidationError(
                f"'{clean_target}' is not a valid hex file hash. "
                "Expected SHA-256 (64 hex characters), SHA-1 (40 hex), or MD5 (32 hex)."
            )
        clean_target = clean_target.lower()
    elif final_type == 'URL':
        if '://' not in clean_target:
            clean_target = 'https://' + clean_target
        parsed = urlparse(clean_target)
        if parsed.scheme.lower() not in SUPPORTED_SCHEMES:
            raise ValidationError(f"Unsupported URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are supported.")
        if not parsed.hostname:
            raise ValidationError("Invalid URL: missing hostname.")
    elif final_type == 'DOMAIN':
        # If user passed a full URL, strip scheme and path for domain type
        if '://' in clean_target:
            parsed = urlparse(clean_target)
            clean_target = parsed.hostname or clean_target
        # Strip path or port if present
        clean_target = clean_target.split('/')[0].split(':')[0]
        if not _is_valid_domain(clean_target) and not _is_valid_ip(clean_target):
            raise ValidationError(f"'{clean_target}' is not a valid domain name.")

    return {
        "target": clean_target,
        "target_type": final_type,
    }

