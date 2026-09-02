import requests
import socket
import ssl
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

def scan_website_headers(url):
    """Scan for common security headers with fast bounded timeout."""
    if not url.startswith('http'):
        url = 'https://' + url
    try:
        # Fast HEAD or short GET request with 2s timeout
        response = requests.get(url, timeout=2.0, allow_redirects=True, headers={"User-Agent": "CyberGuardian-Scanner/2.0"})
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
    """Check SSL validity and details with fast bounded timeout."""
    parsed = urlparse(hostname)
    domain = parsed.netloc if parsed.netloc else parsed.path
    if ':' in domain:
        domain = domain.split(':')[0]
    
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=2.0) as sock:
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
    """Scan common ports concurrently with sub-second bounded timeouts."""
    parsed = urlparse(ip_or_domain)
    domain = parsed.netloc if parsed.netloc else parsed.path
    if ':' in domain:
        domain = domain.split(':')[0]

    common_ports = [21, 22, 23, 80, 443, 3306, 8080]
    open_ports = []

    def _check_port(p):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.25)
        try:
            res = sock.connect_ex((domain, p))
            if res == 0:
                return p
        except Exception:
            pass
        finally:
            sock.close()
        return None

    with ThreadPoolExecutor(max_workers=len(common_ports)) as executor:
        futures = [executor.submit(_check_port, p) for p in common_ports]
        for f in as_completed(futures):
            try:
                res = f.result()
                if res is not None:
                    open_ports.append(res)
            except Exception:
                pass

    return sorted(open_ports)

