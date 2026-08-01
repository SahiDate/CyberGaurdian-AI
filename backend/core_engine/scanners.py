import requests
import socket
import ssl
from urllib.parse import urlparse

def scan_website_headers(url):
    """Scan for common security headers."""
    if not url.startswith('http'):
        url = 'https://' + url
    try:
        response = requests.get(url, timeout=5)
        headers = response.headers
        security_headers = {
            'Strict-Transport-Security': headers.get('Strict-Transport-Security', 'Missing'),
            'Content-Security-Policy': headers.get('Content-Security-Policy', 'Missing'),
            'X-Frame-Options': headers.get('X-Frame-Options', 'Missing'),
            'X-Content-Type-Options': headers.get('X-Content-Type-Options', 'Missing'),
        }
        return security_headers
    except requests.RequestException as e:
        return {"error": str(e)}

def check_ssl_certificate(hostname):
    """Check SSL validity and details."""
    parsed = urlparse(hostname)
    domain = parsed.netloc if parsed.netloc else parsed.path
    if ':' in domain:
        domain = domain.split(':')[0]
    
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                return {
                    "issuer": dict(x[0] for x in cert['issuer'])['commonName'],
                    "expires": cert['notAfter'],
                    "status": "Valid"
                }
    except Exception as e:
        return {"status": "Invalid or No SSL", "error": str(e)}

def scan_ports(ip_or_domain):
    """Scan common ports (simplified)."""
    parsed = urlparse(ip_or_domain)
    domain = parsed.netloc if parsed.netloc else parsed.path
    if ':' in domain:
        domain = domain.split(':')[0]

    common_ports = [21, 22, 23, 80, 443, 3306, 8080]
    open_ports = []
    
    for port in common_ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        result = sock.connect_ex((domain, port))
        if result == 0:
            open_ports.append(port)
        sock.close()
        
    return open_ports
