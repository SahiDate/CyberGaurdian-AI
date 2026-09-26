import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User
from scanner.models import (
    SSLScanResult, URLScanResult, PortScanResult, WhoisLookupResult,
    ThreatIntelResult, ScanResult
)

class Command(BaseCommand):
    help = 'Seeds platform-wide forensic scan records (SSL, URL, Port, WHOIS) matching users actions and targets.'

    def handle(self, *args, **options):
        now = timezone.now()

        # Primary user accounts
        sahilraj = User.objects.filter(username__iexact='Sahilraj').first()
        if not sahilraj:
            sahilraj = User.objects.filter(role='USER').first() or User.objects.first()

        guest_user = User.objects.filter(username__iexact='guest_user').first() or sahilraj
        tenant_user = User.objects.filter(username__iexact='tenant_phish_tester').first() or sahilraj
        soc_user = User.objects.filter(username__iexact='soc_test_user').first() or sahilraj

        self.stdout.write(f"[*] Attaching user-action scans for: {sahilraj.username}, {guest_user.username}, {tenant_user.username}")

        # -------------------------------------------------------------------------
        # 1. SSL SCAN RECORDS
        # -------------------------------------------------------------------------
        ssl_dataset = [
            {
                "user": sahilraj,
                "target": "codefreefire.org",
                "domain": "codefreefire.org",
                "port": 443,
                "certificate_status": "EXPIRED",
                "issuer_cn": "Let's Encrypt Authority X3",
                "subject_cn": "codefreefire.org",
                "valid_from": now - timedelta(days=120),
                "valid_until": now - timedelta(days=5),
                "days_remaining": -5,
                "tls_version": "TLSv1.2",
                "cipher_name": "ECDHE-RSA-AES128-GCM-SHA256",
                "cipher_bits": 128,
                "hostname_valid": True,
                "san_list": ["codefreefire.org", "www.codefreefire.org"],
                "security_issues": [
                    "Certificate expired 5 days ago",
                    "TLS 1.2 in use without forward-secrecy enforcement",
                    "Domain flagged on phishing feeds"
                ],
                "threat_score": 95,
                "severity": "CRITICAL",
                "confidence": 98,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=3)
            },
            {
                "user": sahilraj,
                "target": "allegro.pl-lokalna-ofeta95430458.sbs",
                "domain": "allegro.pl-lokalna-ofeta95430458.sbs",
                "port": 443,
                "certificate_status": "HOSTNAME_MISMATCH",
                "issuer_cn": "cPanel, Inc. Certification Authority",
                "subject_cn": "*.shared-hosting.net",
                "valid_from": now - timedelta(days=20),
                "valid_until": now + timedelta(days=70),
                "days_remaining": 70,
                "tls_version": "TLSv1.2",
                "cipher_name": "ECDHE-RSA-AES256-GCM-SHA384",
                "cipher_bits": 256,
                "hostname_valid": False,
                "san_list": ["*.shared-hosting.net", "shared-hosting.net"],
                "security_issues": [
                    "Certificate Subject Alternative Name does NOT match requested domain",
                    "Untrusted multi-tenant host certificate used on fraudulent target",
                    "High probability of Man-In-The-Middle or deceptive typosquatting"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 99,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=5)
            },
            {
                "user": sahilraj,
                "target": "confirma-preduction.up.railway.app",
                "domain": "confirma-preduction.up.railway.app",
                "port": 443,
                "certificate_status": "EXPIRING_SOON",
                "issuer_cn": "Cloudflare Inc ECC CA-3",
                "subject_cn": "*.up.railway.app",
                "valid_from": now - timedelta(days=80),
                "valid_until": now + timedelta(days=10),
                "days_remaining": 10,
                "tls_version": "TLSv1.3",
                "cipher_name": "TLS_AES_128_GCM_SHA256",
                "cipher_bits": 128,
                "hostname_valid": True,
                "san_list": ["*.up.railway.app", "up.railway.app"],
                "security_issues": [
                    "Certificate expires within 10 days",
                    "Suspicious ephemeral cloud subdomain deployment pattern"
                ],
                "threat_score": 75,
                "severity": "HIGH",
                "confidence": 90,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=8)
            },
            {
                "user": sahilraj,
                "target": "espacesecu.tehna.com",
                "domain": "espacesecu.tehna.com",
                "port": 443,
                "certificate_status": "VALID",
                "issuer_cn": "Sectigo RSA Domain Validation Secure Server CA",
                "subject_cn": "tehna.com",
                "valid_from": now - timedelta(days=60),
                "valid_until": now + timedelta(days=305),
                "days_remaining": 305,
                "tls_version": "TLSv1.3",
                "cipher_name": "TLS_AES_256_GCM_SHA384",
                "cipher_bits": 256,
                "hostname_valid": True,
                "san_list": ["espacesecu.tehna.com", "tehna.com"],
                "security_issues": [
                    "Subdomain matches credential harvesting campaign patterns"
                ],
                "threat_score": 85,
                "severity": "HIGH",
                "confidence": 92,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=12)
            },
            {
                "user": sahilraj,
                "target": "sl83684.pro",
                "domain": "sl83684.pro",
                "port": 443,
                "certificate_status": "EXPIRED",
                "issuer_cn": "ZeroSSL RSA Domain Secure Site CA",
                "subject_cn": "sl83684.pro",
                "valid_from": now - timedelta(days=95),
                "valid_until": now - timedelta(days=3),
                "days_remaining": -3,
                "tls_version": "TLSv1.2",
                "cipher_name": "ECDHE-RSA-AES128-GCM-SHA256",
                "cipher_bits": 128,
                "hostname_valid": True,
                "san_list": ["sl83684.pro"],
                "security_issues": [
                    "Expired certificate",
                    "Reported C2 / Trojan payload staging server"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 99,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=1)
            },
            {
                "user": guest_user,
                "target": "orj.vercel.app",
                "domain": "orj.vercel.app",
                "port": 443,
                "certificate_status": "VALID",
                "issuer_cn": "Let's Encrypt Authority E1",
                "subject_cn": "*.vercel.app",
                "valid_from": now - timedelta(days=30),
                "valid_until": now + timedelta(days=60),
                "days_remaining": 60,
                "tls_version": "TLSv1.3",
                "cipher_name": "TLS_CHACHA20_POLY1305_SHA256",
                "cipher_bits": 256,
                "hostname_valid": True,
                "san_list": ["*.vercel.app", "vercel.app"],
                "security_issues": [],
                "threat_score": 15,
                "severity": "LOW",
                "confidence": 95,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=2)
            },
            {
                "user": tenant_user,
                "target": "github.com",
                "domain": "github.com",
                "port": 443,
                "certificate_status": "VALID",
                "issuer_cn": "DigiCert High Assurance TLS Hybrid ECC SHA256 2020 CA1",
                "subject_cn": "github.com",
                "valid_from": now - timedelta(days=180),
                "valid_until": now + timedelta(days=185),
                "days_remaining": 185,
                "tls_version": "TLSv1.3",
                "cipher_name": "TLS_AES_128_GCM_SHA256",
                "cipher_bits": 128,
                "hostname_valid": True,
                "san_list": ["github.com", "www.github.com"],
                "security_issues": [],
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 100,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=3)
            }
        ]

        SSLScanResult.objects.all().delete()
        for item in ssl_dataset:
            dt = item.pop("created_at")
            rec = SSLScanResult.objects.create(**item)
            SSLScanResult.objects.filter(pk=rec.pk).update(created_at=dt)

        self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(ssl_dataset)} SSL Scan records."))

        # -------------------------------------------------------------------------
        # 2. URL SCAN RECORDS
        # -------------------------------------------------------------------------
        url_dataset = [
            {
                "user": sahilraj,
                "original_url": "https://codefreefire.org",
                "normalized_url": "https://codefreefire.org/",
                "final_url": "https://codefreefire.org/login-reward.php",
                "hostname": "codefreefire.org",
                "domain": "codefreefire.org",
                "scheme": "https",
                "port": 443,
                "primary_ip": "104.21.48.112",
                "http_status": 200,
                "content_type": "text/html; charset=UTF-8",
                "server": "cloudflare",
                "redirect_count": 1,
                "redirect_chain": [
                    "https://codefreefire.org",
                    "https://codefreefire.org/login-reward.php"
                ],
                "indicators": [
                    "Fake FreeFire reward promotion lure",
                    "Harvests social credentials via deceptive form inputs",
                    "Cloudflare proxy hiding origin hosting provider"
                ],
                "recommendations": [
                    "Block domain on firewall and DNS filters",
                    "Submit abuse report to Cloudflare Trust & Safety",
                    "Revoke any credentials inputted into this URL"
                ],
                "threat_score": 95,
                "severity": "CRITICAL",
                "confidence": 98,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=3)
            },
            {
                "user": sahilraj,
                "original_url": "https://allegro.pl-lokalna-ofeta95430458.sbs",
                "normalized_url": "https://allegro.pl-lokalna-ofeta95430458.sbs/",
                "final_url": "https://allegro.pl-lokalna-ofeta95430458.sbs/pay/login.php",
                "hostname": "allegro.pl-lokalna-ofeta95430458.sbs",
                "domain": "allegro.pl-lokalna-ofeta95430458.sbs",
                "scheme": "https",
                "port": 443,
                "primary_ip": "185.196.11.45",
                "http_status": 200,
                "content_type": "text/html",
                "server": "nginx/1.18.0",
                "redirect_count": 2,
                "redirect_chain": [
                    "https://allegro.pl-lokalna-ofeta95430458.sbs",
                    "https://allegro.pl-lokalna-ofeta95430458.sbs/item/95430458",
                    "https://allegro.pl-lokalna-ofeta95430458.sbs/pay/login.php"
                ],
                "indicators": [
                    "Deceptive Polish e-commerce phishing portal (Allegro imitation)",
                    "Captures online banking login and OTP tokens",
                    "Domain hosted in high-risk bulletproof ASN"
                ],
                "recommendations": [
                    "Emergency DNS sinkholing recommended",
                    "Alert enterprise SOC of targeted finance lure"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 100,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=5)
            },
            {
                "user": sahilraj,
                "original_url": "https://confirma-preduction.up.railway.app/",
                "normalized_url": "https://confirma-preduction.up.railway.app/",
                "final_url": "https://confirma-preduction.up.railway.app/verify",
                "hostname": "confirma-preduction.up.railway.app",
                "domain": "confirma-preduction.up.railway.app",
                "scheme": "https",
                "port": 443,
                "primary_ip": "34.117.186.192",
                "http_status": 302,
                "content_type": "text/html",
                "server": "railway-edge",
                "redirect_count": 1,
                "redirect_chain": [
                    "https://confirma-preduction.up.railway.app/",
                    "https://confirma-preduction.up.railway.app/verify"
                ],
                "indicators": [
                    "Free tier cloud PaaS abused for disposable phishing",
                    "Redirects to payment card verification portal"
                ],
                "recommendations": [
                    "Submit takedown request to Railway.app abuse desk"
                ],
                "threat_score": 90,
                "severity": "CRITICAL",
                "confidence": 94,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=8)
            },
            {
                "user": sahilraj,
                "original_url": "https://espacesecu.tehna.com/index.php",
                "normalized_url": "https://espacesecu.tehna.com/index.php",
                "final_url": "https://espacesecu.tehna.com/auth/login",
                "hostname": "espacesecu.tehna.com",
                "domain": "espacesecu.tehna.com",
                "scheme": "https",
                "port": 443,
                "primary_ip": "178.33.240.11",
                "http_status": 200,
                "content_type": "text/html; charset=UTF-8",
                "server": "Apache",
                "redirect_count": 1,
                "redirect_chain": [
                    "https://espacesecu.tehna.com/index.php",
                    "https://espacesecu.tehna.com/auth/login"
                ],
                "indicators": [
                    "French banking brand impersonation",
                    "Subdomain hijacking or compromised CMS installation"
                ],
                "recommendations": [
                    "Contact domain registrar OVH for abuse investigation"
                ],
                "threat_score": 95,
                "severity": "CRITICAL",
                "confidence": 96,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=12)
            },
            {
                "user": sahilraj,
                "original_url": "https://sl83684.pro/loading.php",
                "normalized_url": "https://sl83684.pro/loading.php",
                "final_url": "https://sl83684.pro/stealer/gate.php",
                "hostname": "sl83684.pro",
                "domain": "sl83684.pro",
                "scheme": "https",
                "port": 443,
                "primary_ip": "194.87.68.10",
                "http_status": 200,
                "content_type": "application/octet-stream",
                "server": "nginx",
                "redirect_count": 1,
                "redirect_chain": [
                    "https://sl83684.pro/loading.php",
                    "https://sl83684.pro/stealer/gate.php"
                ],
                "indicators": [
                    "Returns obfuscated binary payload",
                    "Matches RedLine / Lumma Stealer C2 drop URLs"
                ],
                "recommendations": [
                    "Isolate any endpoint that attempted contact with this IP",
                    "Run EDR malware sweep on originating host"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 100,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=1)
            },
            {
                "user": guest_user,
                "original_url": "http://169.254.169.254/latest/meta-data/",
                "normalized_url": "http://169.254.169.254/latest/meta-data/",
                "final_url": "http://169.254.169.254/latest/meta-data/",
                "hostname": "169.254.169.254",
                "domain": "169.254.169.254",
                "scheme": "http",
                "port": 80,
                "primary_ip": "169.254.169.254",
                "http_status": 0,
                "content_type": "",
                "server": "",
                "redirect_count": 0,
                "redirect_chain": [],
                "indicators": [
                    "SSRF attempt targeting AWS/cloud instance metadata service",
                    "Request contained link-local link address 169.254.169.254"
                ],
                "recommendations": [
                    "Platform SSRF firewall contained request",
                    "Ensure user account activity is audited"
                ],
                "threat_score": 90,
                "severity": "CRITICAL",
                "confidence": 100,
                "status": "SSRF_BLOCKED",
                "created_at": now - timedelta(days=2)
            },
            {
                "user": guest_user,
                "original_url": "https://orj.vercel.app/",
                "normalized_url": "https://orj.vercel.app/",
                "final_url": "https://orj.vercel.app/",
                "hostname": "orj.vercel.app",
                "domain": "orj.vercel.app",
                "scheme": "https",
                "port": 443,
                "primary_ip": "76.76.21.21",
                "http_status": 200,
                "content_type": "text/html; charset=utf-8",
                "server": "Vercel",
                "redirect_count": 0,
                "redirect_chain": [],
                "indicators": [
                    "Legitimate React SPA hosted on Vercel CDN",
                    "Clean headers and low risk parameters"
                ],
                "recommendations": [
                    "No immediate action needed"
                ],
                "threat_score": 15,
                "severity": "LOW",
                "confidence": 95,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=2)
            }
        ]

        URLScanResult.objects.all().delete()
        for item in url_dataset:
            dt = item.pop("created_at")
            rec = URLScanResult.objects.create(**item)
            URLScanResult.objects.filter(pk=rec.pk).update(created_at=dt)

        self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(url_dataset)} URL Scan records."))

        # -------------------------------------------------------------------------
        # 3. PORT SCAN RECORDS
        # -------------------------------------------------------------------------
        port_dataset = [
            {
                "user": sahilraj,
                "target": "codefreefire.org",
                "target_type": "DOMAIN",
                "resolved_ips": ["104.21.48.112", "172.67.182.203"],
                "primary_ip": "104.21.48.112",
                "scan_profile": "COMMON",
                "requested_ports": [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 8080],
                "results": {
                    "80": {"state": "open", "service": "http", "product": "Cloudflare Reverse Proxy"},
                    "443": {"state": "open", "service": "https", "product": "Cloudflare SSL"},
                    "8080": {"state": "open", "service": "http-alt", "product": "Cloudflare Origin Ingress"}
                },
                "open_ports": [80, 443, 8080],
                "closed_ports": [21, 22, 25, 53, 110, 143, 465, 587, 993, 995],
                "filtered_ports": [3306],
                "indicators": [
                    "Web port 8080 exposed alongside standard HTTP/HTTPS",
                    "Origin database port 3306 filtered by network perimeter"
                ],
                "recommendations": [
                    "Restrict port 8080 to internal administrative CIDRs only"
                ],
                "threat_score": 45,
                "severity": "MEDIUM",
                "confidence": 92,
                "status": "SUCCESS",
                "scan_duration": 1.45,
                "created_at": now - timedelta(hours=3)
            },
            {
                "user": sahilraj,
                "target": "allegro.pl-lokalna-ofeta95430458.sbs",
                "target_type": "DOMAIN",
                "resolved_ips": ["185.196.11.45"],
                "primary_ip": "185.196.11.45",
                "scan_profile": "EXTENDED",
                "requested_ports": [21, 22, 80, 443, 2082, 2083, 2086, 2087, 3306, 8443],
                "results": {
                    "21": {"state": "open", "service": "ftp", "product": "Pure-FTPd"},
                    "22": {"state": "open", "service": "ssh", "product": "OpenSSH 7.4 (Vulnerable legacy)"},
                    "80": {"state": "open", "service": "http", "product": "nginx"},
                    "443": {"state": "open", "service": "https", "product": "nginx"},
                    "2083": {"state": "open", "service": "cpanel-ssl", "product": "cPanel Control Center"},
                    "3306": {"state": "open", "service": "mysql", "product": "MySQL 5.7.33 (Exposed to public internet)"}
                },
                "open_ports": [21, 22, 80, 443, 2083, 3306],
                "closed_ports": [2082, 2086, 2087],
                "filtered_ports": [8443],
                "indicators": [
                    "CRITICAL: MySQL Database (3306) directly accessible from internet",
                    "Legacy OpenSSH 7.4 daemon detected with known CVE vulnerabilities",
                    "cPanel admin control port exposed alongside public web services"
                ],
                "recommendations": [
                    "Immediately bind MySQL 3306 to localhost (127.0.0.1)",
                    "Upgrade OpenSSH to version 9.0+ and restrict root login",
                    "Isolate CPanel access behind VPN gateway"
                ],
                "threat_score": 95,
                "severity": "CRITICAL",
                "confidence": 98,
                "status": "SUCCESS",
                "scan_duration": 3.82,
                "created_at": now - timedelta(hours=5)
            },
            {
                "user": sahilraj,
                "target": "sl83684.pro",
                "target_type": "DOMAIN",
                "resolved_ips": ["194.87.68.10"],
                "primary_ip": "194.87.68.10",
                "scan_profile": "COMMON",
                "requested_ports": [22, 80, 443, 8000, 8080, 8888, 9001],
                "results": {
                    "80": {"state": "open", "service": "http", "product": "nginx/1.22.1"},
                    "443": {"state": "open", "service": "https", "product": "nginx/1.22.1"},
                    "8888": {"state": "open", "service": "http-c2", "product": "Custom Stealer C2 Gate"}
                },
                "open_ports": [80, 443, 8888],
                "closed_ports": [22, 8000, 9001],
                "filtered_ports": [8080],
                "indicators": [
                    "High-port 8888 listener active with suspicious HTTP API signature",
                    "Known C2 malware control protocol on port 8888"
                ],
                "recommendations": [
                    "Flag host as malicious C2 node in threat intelligence system"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 99,
                "status": "SUCCESS",
                "scan_duration": 2.15,
                "created_at": now - timedelta(days=1)
            },
            {
                "user": guest_user,
                "target": "10.0.0.1",
                "target_type": "IP",
                "resolved_ips": ["10.0.0.1"],
                "primary_ip": "10.0.0.1",
                "scan_profile": "COMMON",
                "requested_ports": [22, 80, 443],
                "results": {},
                "open_ports": [],
                "closed_ports": [],
                "filtered_ports": [],
                "indicators": [
                    "Attempted RFC-1918 Private IPv4 address scan blocked by SSRF filter"
                ],
                "recommendations": [
                    "Internal network exploration attempt prevented"
                ],
                "threat_score": 80,
                "severity": "HIGH",
                "confidence": 100,
                "status": "SSRF_BLOCKED",
                "scan_duration": 0.05,
                "created_at": now - timedelta(days=2)
            },
            {
                "user": guest_user,
                "target": "orj.vercel.app",
                "target_type": "DOMAIN",
                "resolved_ips": ["76.76.21.21"],
                "primary_ip": "76.76.21.21",
                "scan_profile": "WEB",
                "requested_ports": [80, 443],
                "results": {
                    "80": {"state": "open", "service": "http", "product": "Vercel Edge Proxy"},
                    "443": {"state": "open", "service": "https", "product": "Vercel Edge TLS"}
                },
                "open_ports": [80, 443],
                "closed_ports": [],
                "filtered_ports": [],
                "indicators": [
                    "Standard web edge listener ports open only",
                    "No management or administrative ports exposed"
                ],
                "recommendations": [
                    "Excellent network perimeter security posture"
                ],
                "threat_score": 0,
                "severity": "LOW",
                "confidence": 95,
                "status": "SUCCESS",
                "scan_duration": 0.88,
                "created_at": now - timedelta(days=2)
            }
        ]

        PortScanResult.objects.all().delete()
        for item in port_dataset:
            dt = item.pop("created_at")
            rec = PortScanResult.objects.create(**item)
            PortScanResult.objects.filter(pk=rec.pk).update(created_at=dt)

        self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(port_dataset)} Port Scan records."))

        # -------------------------------------------------------------------------
        # 4. WHOIS LOOKUP RECORDS
        # -------------------------------------------------------------------------
        whois_dataset = [
            {
                "user": sahilraj,
                "domain": "codefreefire.org",
                "registrar": "NameCheap, Inc.",
                "registry_domain_id": "D402200000000123456-LROR",
                "created_date": now - timedelta(days=45),
                "updated_date": now - timedelta(days=10),
                "expires_date": now + timedelta(days=320),
                "domain_age_days": 45,
                "days_until_expiration": 320,
                "age_category": "NEW",
                "expiration_category": "ACTIVE",
                "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
                "domain_status": ["clientTransferProhibited"],
                "registrant_org": "Privacy service provided by Withheld for Privacy ehf",
                "registrant_country": "IS",
                "dnssec": False,
                "security_indicators": [
                    "Recently registered domain (< 90 days)",
                    "Whois identity fully masked by Icelandic privacy proxy",
                    "Domain name mimics popular mobile game brand"
                ],
                "threat_score": 95,
                "severity": "CRITICAL",
                "confidence": 96,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=3)
            },
            {
                "user": sahilraj,
                "domain": "allegro.pl-lokalna-ofeta95430458.sbs",
                "registrar": "NICENIC INTERNATIONAL GROUP CO., LIMITED",
                "registry_domain_id": "D20240901-SBS",
                "created_date": now - timedelta(days=12),
                "updated_date": now - timedelta(days=12),
                "expires_date": now + timedelta(days=353),
                "domain_age_days": 12,
                "days_until_expiration": 353,
                "age_category": "NEW",
                "expiration_category": "ACTIVE",
                "nameservers": ["dns1.bulletdns.net", "dns2.bulletdns.net"],
                "domain_status": ["clientHold", "clientTransferProhibited"],
                "registrant_org": "Redacted for Privacy",
                "registrant_country": "CN",
                "dnssec": False,
                "security_indicators": [
                    "Ultra-new domain registered 12 days ago",
                    "Disposable TLD (.sbs) commonly abused in phishing campaigns",
                    "Domain name contains high-entropy string mimicking e-commerce auctions"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 100,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=5)
            },
            {
                "user": sahilraj,
                "domain": "confirma-preduction.up.railway.app",
                "registrar": "MarkMonitor Inc.",
                "registry_domain_id": "RAILWAY-APP-DOM",
                "created_date": now - timedelta(days=1200),
                "updated_date": now - timedelta(days=40),
                "expires_date": now + timedelta(days=400),
                "domain_age_days": 1200,
                "days_until_expiration": 400,
                "age_category": "ESTABLISHED",
                "expiration_category": "ACTIVE",
                "nameservers": ["ns-cloud-c1.googledomains.com", "ns-cloud-c2.googledomains.com"],
                "domain_status": ["clientUpdateProhibited"],
                "registrant_org": "Railway Corp",
                "registrant_country": "US",
                "dnssec": True,
                "security_indicators": [
                    "Parent domain is legitimate cloud PaaS",
                    "Subdomain represents untrusted tenant creation"
                ],
                "threat_score": 60,
                "severity": "MEDIUM",
                "confidence": 88,
                "status": "SUCCESS",
                "created_at": now - timedelta(hours=8)
            },
            {
                "user": sahilraj,
                "domain": "sl83684.pro",
                "registrar": "REGTIME-RU",
                "registry_domain_id": "D20240815-PRO",
                "created_date": now - timedelta(days=42),
                "updated_date": now - timedelta(days=5),
                "expires_date": now + timedelta(days=323),
                "domain_age_days": 42,
                "days_until_expiration": 323,
                "age_category": "NEW",
                "expiration_category": "ACTIVE",
                "nameservers": ["ns1.regtime.net", "ns2.regtime.net"],
                "domain_status": ["serverTransferProhibited"],
                "registrant_org": "Private Person",
                "registrant_country": "RU",
                "dnssec": False,
                "security_indicators": [
                    "Recently registered generic .pro domain",
                    "Known registrar associated with Russian infostealer C2 infrastructure",
                    "Multiple antivirus vendors detect active malware binaries hosted on domain"
                ],
                "threat_score": 100,
                "severity": "CRITICAL",
                "confidence": 100,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=1)
            },
            {
                "user": guest_user,
                "domain": "orj.vercel.app",
                "registrar": "Gandi SAS",
                "registry_domain_id": "VERCEL-APP-DOM",
                "created_date": now - timedelta(days=1850),
                "updated_date": now - timedelta(days=100),
                "expires_date": now + timedelta(days=710),
                "domain_age_days": 1850,
                "days_until_expiration": 710,
                "age_category": "LEGACY",
                "expiration_category": "ACTIVE",
                "nameservers": ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
                "domain_status": ["clientTransferProhibited"],
                "registrant_org": "Vercel Inc.",
                "registrant_country": "US",
                "dnssec": True,
                "security_indicators": [],
                "threat_score": 10,
                "severity": "LOW",
                "confidence": 95,
                "status": "SUCCESS",
                "created_at": now - timedelta(days=2)
            }
        ]

        WhoisLookupResult.objects.all().delete()
        for item in whois_dataset:
            dt = item.pop("created_at")
            rec = WhoisLookupResult.objects.create(**item)
            WhoisLookupResult.objects.filter(pk=rec.pk).update(created_at=dt)

        self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(whois_dataset)} WHOIS records."))
        self.stdout.write(self.style.SUCCESS("All user actions successfully mapped to forensic records on Admin side!"))
