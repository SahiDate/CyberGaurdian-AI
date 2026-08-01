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
    """Return True if hostname is a valid IPv4 address."""
    parts = hostname.split('.')
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(p) <= 255 for p in parts)
    except ValueError:
        return False
