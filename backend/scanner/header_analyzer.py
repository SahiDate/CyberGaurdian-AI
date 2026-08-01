"""
Security Header Analyzer — Phase 2
Fetches HTTP response headers for a URL and audits security-relevant headers.

FUTURE (Phase 3+): Feed header analysis into AI Recommendation Engine.
"""

import requests

# Score weight: 25 points maximum from header analysis
MAX_HEADER_SCORE = 25

# Security headers to check: name → (score_points, description, recommended_value)
SECURITY_HEADERS = {
    'strict-transport-security': {
        'points': 5,
        'label': 'Strict-Transport-Security (HSTS)',
        'description': 'Forces browsers to use HTTPS for all future requests.',
        'recommended': 'max-age=31536000; includeSubDomains',
    },
    'content-security-policy': {
        'points': 6,
        'label': 'Content-Security-Policy (CSP)',
        'description': 'Prevents XSS attacks by controlling which resources can be loaded.',
        'recommended': "default-src 'self'",
    },
    'x-frame-options': {
        'points': 4,
        'label': 'X-Frame-Options',
        'description': 'Prevents clickjacking by disabling iframe embedding.',
        'recommended': 'DENY or SAMEORIGIN',
    },
    'x-content-type-options': {
        'points': 3,
        'label': 'X-Content-Type-Options',
        'description': 'Prevents MIME sniffing attacks.',
        'recommended': 'nosniff',
    },
    'referrer-policy': {
        'points': 3,
        'label': 'Referrer-Policy',
        'description': 'Controls how much referrer information is sent with requests.',
        'recommended': 'strict-origin-when-cross-origin',
    },
    'permissions-policy': {
        'points': 2,
        'label': 'Permissions-Policy',
        'description': 'Controls browser features (camera, microphone, geolocation, etc.).',
        'recommended': 'geolocation=(), microphone=(), camera=()',
    },
    'cache-control': {
        'points': 2,
        'label': 'Cache-Control',
        'description': 'Prevents caching of sensitive data.',
        'recommended': 'no-store, no-cache',
    },
}


def analyze_headers(url: str) -> dict:
    """
    Fetch HTTP response headers from the URL and audit security headers.

    Returns a structured dict with:
        - score: int (0-25)
        - risk_level: str
        - present_headers: list of found security headers with values
        - missing_headers: list of missing security headers
        - all_headers: raw dict of ALL response headers
        - server_info: detected server/tech stack info (information disclosure)
        - recommendations: list[str]
        - error: str (if request failed)
    """
    result = {
        "score": 0,
        "risk_level": "high",
        "present_headers": [],
        "missing_headers": [],
        "all_headers": {},
        "server_info": {},
        "recommendations": [],
        "error": None,
        "status_code": None,
    }

    try:
        response = requests.get(
            url,
            timeout=10,
            allow_redirects=True,
            headers={'User-Agent': 'CyberGuardian-Scanner/2.0'},
            verify=True,
        )
        result["status_code"] = response.status_code

        # Lowercase all header keys for consistent comparison
        headers = {k.lower(): v for k, v in response.headers.items()}
        result["all_headers"] = dict(response.headers)  # Keep original casing for display

        score = 0
        present = []
        missing = []
        recommendations = []

        for header_key, meta in SECURITY_HEADERS.items():
            if header_key in headers:
                present.append({
                    "name": meta['label'],
                    "key": header_key,
                    "value": headers[header_key],
                    "description": meta['description'],
                    "points": meta['points'],
                })
                score += meta['points']
            else:
                missing.append({
                    "name": meta['label'],
                    "key": header_key,
                    "description": meta['description'],
                    "recommended": meta['recommended'],
                    "points": meta['points'],
                })
                recommendations.append(
                    f"Missing '{meta['label']}'. Add: {header_key}: {meta['recommended']}"
                )

        # Check for information disclosure
        server_info = {}
        for info_header in ('server', 'x-powered-by', 'x-aspnet-version', 'x-generator'):
            if info_header in headers:
                server_info[info_header] = headers[info_header]

        if server_info:
            result["server_info"] = server_info
            recommendations.append(
                "⚠️ Server is disclosing technology information in headers. "
                "Remove or obscure: " + ", ".join(server_info.keys())
            )

        result["score"] = min(score, MAX_HEADER_SCORE)
        result["risk_level"] = _score_to_risk(result["score"], MAX_HEADER_SCORE)
        result["present_headers"] = present
        result["missing_headers"] = missing
        result["recommendations"] = recommendations

    except requests.exceptions.SSLError as e:
        result["error"] = f"SSL error when fetching headers: {str(e)}"
        result["recommendations"] = ["SSL certificate issue detected. Check SSL configuration."]
    except requests.exceptions.ConnectionError as e:
        result["error"] = f"Connection error: {str(e)}"
        result["recommendations"] = ["Could not connect to the target URL."]
    except requests.exceptions.Timeout:
        result["error"] = "Request timed out after 10 seconds."
        result["recommendations"] = ["The server took too long to respond."]
    except requests.exceptions.RequestException as e:
        result["error"] = f"Request failed: {str(e)}"

    return result


def _score_to_risk(score: int, max_score: int) -> str:
    pct = (score / max_score) * 100 if max_score else 0
    if pct >= 90:
        return 'excellent'
    elif pct >= 75:
        return 'good'
    elif pct >= 50:
        return 'medium'
    return 'high'
