import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import PortScanResult
from scanner.services.port_scanner.service import (
    PortScannerService,
    normalize_and_validate_target,
    parse_and_validate_ports,
    resolve_target_dns,
    PORT_PROFILES,
    SERVICE_PORT_MAP
)

User = get_user_model()


class PortScannerUnitTests(TestCase):
    """Unit tests for target normalization, port parsing, service mapping, indicators, and SSRF handling."""

    def test_target_normalization(self):
        # Plain hostname
        res = normalize_and_validate_target("example.com")
        self.assertEqual(res["target"], "example.com")
        self.assertFalse(res["is_ip"])

        # URL with scheme, port, and path
        res = normalize_and_validate_target("https://sub.portal.org:8443/login?redirect=true#top")
        self.assertEqual(res["target"], "sub.portal.org")

        # Plain IP
        res = normalize_and_validate_target("198.51.100.45")
        self.assertEqual(res["target"], "198.51.100.45")
        self.assertTrue(res["is_ip"])
        self.assertEqual(res["ip_version"], 4)

        # Invalid target inputs
        with self.assertRaises(ValueError):
            normalize_and_validate_target("")
        with self.assertRaises(ValueError):
            normalize_and_validate_target("   ")
        with self.assertRaises(ValueError):
            normalize_and_validate_target("example;rm -rf /")

    def test_port_profile_and_custom_ports_parsing(self):
        # COMMON profile
        common = parse_and_validate_ports(profile="COMMON")
        self.assertIn(80, common)
        self.assertIn(443, common)
        self.assertIn(22, common)
        self.assertIn(3306, common)

        # WEB profile
        web = parse_and_validate_ports(profile="WEB")
        self.assertEqual(web, [80, 443, 8000, 8080, 8443, 8888, 9000, 9090])

        # DATABASE profile
        db = parse_and_validate_ports(profile="DATABASE")
        self.assertEqual(db, [1433, 1521, 3306, 5432, 6379, 9200, 11211, 27017])

        # Custom ports with deduplication, out of bounds filtering, and sorting
        custom = parse_and_validate_ports(
            profile="CUSTOM",
            custom_ports=[8080, 443, 0, -5, 65536, "3000", 443, 22]
        )
        self.assertEqual(custom, [22, 443, 3000, 8080])

        # Max port limit constraint (100 max)
        huge_list = list(range(1, 200))
        bounded = parse_and_validate_ports(profile="CUSTOM", custom_ports=huge_list)
        self.assertEqual(len(bounded), 100)
        self.assertEqual(bounded[0], 1)
        self.assertEqual(bounded[-1], 100)

    def test_ssrf_blocking_restricted_targets(self):
        service = PortScannerService(timeout=0.5)

        # Localhost
        res = service.scan_target("localhost")
        self.assertEqual(res["status"], "SSRF_BLOCKED")
        self.assertIn("SSRF", res["error_message"])

        # IPv4 Loopback
        res = service.scan_target("127.0.0.1")
        self.assertEqual(res["status"], "SSRF_BLOCKED")

        # RFC1918 Private
        res = service.scan_target("192.168.1.1")
        self.assertEqual(res["status"], "SSRF_BLOCKED")
        res = service.scan_target("10.10.10.50")
        self.assertEqual(res["status"], "SSRF_BLOCKED")

        # Cloud Metadata
        res = service.scan_target("169.254.169.254")
        self.assertEqual(res["status"], "SSRF_BLOCKED")

    def test_service_identification_and_indicators(self):
        service = PortScannerService()

        open_ports = [
            {"port": 80, "state": "OPEN", "service": "HTTP"},
            {"port": 443, "state": "OPEN", "service": "HTTPS"},
            {"port": 3306, "state": "OPEN", "service": "MYSQL"},
            {"port": 3389, "state": "OPEN", "service": "RDP"},
            {"port": 23, "state": "OPEN", "service": "TELNET"},
            {"port": 2375, "state": "OPEN", "service": "DOCKER-API"},
        ]

        indicators = service._analyze_port_security_indicators(open_ports, total_scanned=20)
        ind_types = [ind["type"] for ind in indicators]

        self.assertIn("DATABASE_PORT_EXPOSED", ind_types)
        self.assertIn("REMOTE_ADMIN_SERVICE_EXPOSED", ind_types)
        self.assertIn("UNENCRYPTED_LEGACY_SERVICE", ind_types)
        self.assertIn("DOCKER_UNAUTHENTICATED_API_EXPOSED", ind_types)
        self.assertIn("MULTIPLE_EXPOSED_SERVICES", ind_types)

    def test_deterministic_scoring(self):
        service = PortScannerService()

        # Clean web server (80, 443)
        web_open = [
            {"port": 80, "state": "OPEN", "service": "HTTP"},
            {"port": 443, "state": "OPEN", "service": "HTTPS"}
        ]
        score, sev, conf = service._calculate_port_risk_score(web_open, indicators=[], resolved_ip_count=1)
        self.assertLess(score, 25)
        self.assertEqual(sev, "LOW")

        # Database + Telnet exposed
        critical_open = [
            {"port": 3306, "state": "OPEN", "service": "MYSQL"},
            {"port": 23, "state": "OPEN", "service": "TELNET"},
            {"port": 2375, "state": "OPEN", "service": "DOCKER-API"}
        ]
        indicators = service._analyze_port_security_indicators(critical_open, total_scanned=10)
        score, sev, conf = service._calculate_port_risk_score(critical_open, indicators=indicators, resolved_ip_count=1)
        self.assertGreaterEqual(score, 75)
        self.assertEqual(sev, "CRITICAL")


class PortScannerSecurityAndAPITests(TestCase):
    """Security, user data isolation, and API integration tests for Port Scanner."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username='user_port_a', email='usera@port.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.user_b = User.objects.create_user(
            username='user_port_b', email='userb@port.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.admin_user = User.objects.create_user(
            username='admin_port', email='admin@port.test', password='Password123!', role='ADMIN', status='ACTIVE'
        )

    @patch.object(PortScannerService, 'scan_target')
    def test_user_can_scan_ports_and_owns_record(self, mock_scan):
        mock_scan.return_value = {
            "target": "example.com",
            "target_type": "HOSTNAME",
            "resolved_ips": ["93.184.216.34"],
            "primary_ip": "93.184.216.34",
            "scan_profile": "WEB",
            "requested_ports": [80, 443],
            "results": [
                {"port": 80, "protocol": "TCP", "state": "OPEN", "service": "HTTP", "confidence": "HIGH"},
                {"port": 443, "protocol": "TCP", "state": "OPEN", "service": "HTTPS", "confidence": "HIGH"}
            ],
            "open_ports": [
                {"port": 80, "protocol": "TCP", "state": "OPEN", "service": "HTTP", "confidence": "HIGH"},
                {"port": 443, "protocol": "TCP", "state": "OPEN", "service": "HTTPS", "confidence": "HIGH"}
            ],
            "closed_ports": [],
            "filtered_ports": [],
            "indicators": [],
            "recommendations": ["Maintain strict firewall hygiene."],
            "threat_score": 4,
            "severity": "LOW",
            "confidence": 90,
            "status": "SUCCESS",
            "error_message": None,
            "structured_evidence": {"source": "PORT_SCANNER"},
            "scan_duration": 0.45
        }

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/port-scanner/scan/', {"target": "example.com", "profile": "WEB"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target"], "example.com")
        self.assertEqual(len(response.data["open_ports"]), 2)

        # Verify database record belongs strictly to User A
        record = PortScanResult.objects.get(id=response.data["id"])
        self.assertEqual(record.user, self.user_a)

    def test_port_user_data_isolation(self):
        rec_a = PortScanResult.objects.create(
            user=self.user_a,
            target="usera-server.com",
            scan_profile="COMMON",
            threat_score=10,
            severity="LOW"
        )
        rec_b = PortScanResult.objects.create(
            user=self.user_b,
            target="userb-database.org",
            scan_profile="DATABASE",
            threat_score=75,
            severity="CRITICAL"
        )

        # User A requests history
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.get('/api/port-scanner/history/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        targets_a = [item["target"] for item in res_a.data]
        self.assertIn("usera-server.com", targets_a)
        self.assertNotIn("userb-database.org", targets_a)

        # User A attempts to request User B's detail endpoint
        res_forbidden = self.client.get(f'/api/port-scanner/{rec_b.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_user_denied_port_admin_endpoint(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/admin/port-scanner/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_platform_wide_port_records(self):
        PortScanResult.objects.create(user=self.user_a, target="target-a.com", scan_profile="COMMON")
        PortScanResult.objects.create(user=self.user_b, target="target-b.com", scan_profile="DATABASE")

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/port-scanner/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        targets = [item["target"] for item in response.data]
        self.assertIn("target-a.com", targets)
        self.assertIn("target-b.com", targets)
