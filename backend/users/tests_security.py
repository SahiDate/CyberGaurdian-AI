from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from scanner.models import ScanResult, Report, ThreatIntelResult, FileAnalysis, Incident, AIActivity
from users.models import Notification, AdminAuditLog

User = get_user_model()


class UserDataIsolationSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create User A
        self.user_a = User.objects.create_user(
            username='user_a',
            email='user_a@test.com',
            password='Password123!',
            role='USER',
            status='ACTIVE',
            is_active=True
        )

        # Create User B
        self.user_b = User.objects.create_user(
            username='user_b',
            email='user_b@test.com',
            password='Password123!',
            role='USER',
            status='ACTIVE',
            is_active=True
        )

        # Create Admin User
        self.admin_user = User.objects.create_user(
            username='admin_soc',
            email='admin@test.com',
            password='Password123!',
            role='ADMIN',
            status='ACTIVE',
            is_active=True
        )

    def test_1_user_data_isolation(self):
        """TEST 1: User A creates a scan. Verify User B cannot access it."""
        scan_a = ScanResult.objects.create(
            user=self.user_a,
            url='https://usera-site.com',
            domain='usera-site.com',
            security_score=85,
            risk_level='good'
        )

        # Authenticate as User B
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get('/api/scans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scan_ids = [item['id'] for item in response.json()]
        self.assertNotIn(scan_a.id, scan_ids, "User B must not see User A's scan result.")

    def test_2_report_object_permission(self):
        """TEST 2: User A attempts to request User B's report ID. Verify access is denied."""
        report_b = Report.objects.create(
            user=self.user_b,
            title="User B Confidential Audit Report",
            summary="Confidential data",
            status="GENERATED"
        )

        # User A tries to access User B's report
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f'/api/reports/{report_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, "User A must receive 404 when requesting User B's report.")

    def test_3_prevent_user_id_spoofing(self):
        """TEST 3: User A sends another user's ID in payload. Verify backend ignores it and binds to request.user."""
        self.client.force_authenticate(user=self.user_a)

        # Send target scan with spoofed user_id in payload
        payload = {
            "target": "spoof-test.com",
            "user_id": self.user_b.id  # Attempting to spoof User B!
        }
        response = self.client.post('/api/analyze/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify ScanResult created in database belongs to User A, NOT User B!
        latest_scan = ScanResult.objects.filter(domain="spoof-test.com").first()
        self.assertIsNotNone(latest_scan)
        self.assertEqual(latest_scan.user, self.user_a, "Backend must force record owner to request.user!")

    def test_4_user_admin_api_forbidden(self):
        """TEST 4: Normal user attempts to access Admin APIs. Verify 403 Forbidden."""
        self.client.force_authenticate(user=self.user_a)

        admin_endpoints = [
            '/api/admin/users/',
            '/api/admin/scans/',
            '/api/admin/reports/',
            '/api/admin/threats-list/',
            '/api/admin/logs/'
        ]

        for url in admin_endpoints:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, f"Normal user must be forbidden from {url}")

    def test_5_admin_user_detail_access(self):
        """TEST 5: Admin accesses User A's records. Verify authorized access works."""
        ScanResult.objects.create(
            user=self.user_a,
            url='https://usera-detail.com',
            domain='usera-detail.com',
            security_score=90,
            risk_level='excellent'
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/admin/users/{self.user_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data['user']['username'], 'user_a')
        self.assertEqual(len(data['scans']), 1)
        self.assertEqual(data['scans'][0]['domain'], 'usera-detail.com')

    def test_6_admin_platform_wide_access(self):
        """TEST 6: Admin accesses platform-wide scans. Verify authorized access works."""
        ScanResult.objects.create(user=self.user_a, url='https://a.com', domain='a.com')
        ScanResult.objects.create(user=self.user_b, url='https://b.com', domain='b.com')

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/scans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        domains = [item['domain'] for item in response.json()]
        self.assertIn('a.com', domains)
        self.assertIn('b.com', domains)

    def test_7_new_user_automatic_ownership(self):
        """TEST 7: Create a new user. Verify their new records automatically belong to them."""
        new_user = User.objects.create_user(
            username='user_c',
            email='user_c@test.com',
            password='Password123!',
            role='USER',
            status='ACTIVE',
            is_active=True
        )

        self.client.force_authenticate(user=new_user)
        response = self.client.post('/api/analyze/', {"target": "userc-site.org"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user_c_scans = ScanResult.objects.filter(user=new_user)
        self.assertEqual(user_c_scans.count(), 1)
        self.assertEqual(user_c_scans.first().domain, 'userc-site.org')

    def test_8_existing_legacy_records_intact(self):
        """TEST 8: Existing legacy records remain intact after migration."""
        legacy_scan = ScanResult.objects.create(
            user=None,  # Legacy record with no owner originally
            url='https://legacy-archive.com',
            domain='legacy-archive.com',
            security_score=50,
            risk_level='medium'
        )

        from django.core.management import call_command
        call_command('migrate_legacy_data')

        legacy_scan.refresh_from_db()
        self.assertIsNotNone(legacy_scan.user, "Legacy scan must be safely assigned to system_legacy user.")
        self.assertEqual(legacy_scan.user.username, 'system_legacy')
