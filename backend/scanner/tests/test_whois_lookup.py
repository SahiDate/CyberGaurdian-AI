import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from scanner.models import WhoisLookupResult
from scanner.services.whois_service.service import (
    WhoisService, normalize_domain_for_whois, _parse_iso_or_date
)

User = get_user_model()


class WhoisServiceUnitTests(TestCase):
    """Unit tests for WHOIS / RDAP normalization, parsing, and scoring."""

    def test_domain_normalization(self):
        # Plain domain
        d = normalize_domain_for_whois("github.com")
        self.assertEqual(d, "github.com")

        # URL with scheme and path
        d = normalize_domain_for_whois("https://github.com/torvalds/linux?tab=readme")
        self.assertEqual(d, "github.com")

        # IP address rejected with ValueError
        with self.assertRaises(ValueError):
            normalize_domain_for_whois("192.168.1.1")

    def test_rdap_normalization_and_privacy_handling(self):
        service = WhoisService()
        sample_rdap = {
            "handle": "2336799_DOMAIN_COM-VRSN",
            "status": ["clientTransferProhibited", "active"],
            "entities": [
                {
                    "roles": ["registrar"],
                    "vcardArray": [
                        "vcard",
                        [
                            ["version", {}, "text", "4.0"],
                            ["fn", {}, "text", "MarkMonitor Inc."]
                        ]
                    ]
                },
                {
                    "roles": ["registrant"],
                    "vcardArray": [
                        "vcard",
                        [
                            ["version", {}, "text", "4.0"],
                            ["fn", {}, "text", "REDACTED FOR PRIVACY"],
                            ["org", {}, "text", "Domains By Proxy, LLC"],
                            ["adr", {}, "text", ["", "", "", "", "", "", "US"]]
                        ]
                    ]
                }
            ],
            "events": [
                {"eventAction": "registration", "eventDate": "2008-01-22T00:00:00Z"},
                {"eventAction": "last changed", "eventDate": "2024-01-10T00:00:00Z"},
                {"eventAction": "expiration", "eventDate": "2028-01-22T00:00:00Z"}
            ],
            "nameservers": [
                {"ldhName": "ns1.p01.dynect.net"},
                {"ldhName": "ns2.p01.dynect.net"}
            ],
            "secureDNS": {"delegationSigned": True}
        }

        parsed = service._normalize_record("github.com", sample_rdap, None)
        self.assertEqual(parsed["registrar"], "MarkMonitor Inc.")
        self.assertTrue(parsed["is_privacy_protected"])
        self.assertEqual(parsed["registrant_org"], "REDACTED_FOR_PRIVACY")
        self.assertEqual(parsed["age_category"], "ESTABLISHED")
        self.assertEqual(parsed["expiration_category"], "ACTIVE")
        self.assertEqual(parsed["dnssec"], "SIGNED")
        self.assertEqual(len(parsed["nameservers"]), 2)

    def test_whois_scoring_new_domain(self):
        service = WhoisService()
        parsed = {
            "created_date": "2026-08-01T00:00:00+00:00",
            "registrar": "NameCheap Inc.",
            "age_category": "NEW",
            "expiration_category": "ACTIVE",
            "domain_age_days": 10
        }
        indicators = [
            {
                "type": "NEWLY_REGISTERED_DOMAIN",
                "severity": "MEDIUM",
                "description": "Domain was registered recently."
            }
        ]

        score, sev, conf = service._calculate_whois_threat_score(parsed, indicators)
        self.assertGreaterEqual(score, 35)
        self.assertIn(sev, ("MEDIUM", "HIGH"))


class WhoisSecurityAndAPITests(TestCase):
    """Security, user data isolation, and API integration tests for WHOIS Lookup."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username='user_whois_a', email='usera@whois.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.user_b = User.objects.create_user(
            username='user_whois_b', email='userb@whois.test', password='Password123!', role='USER', status='ACTIVE'
        )
        self.admin_user = User.objects.create_user(
            username='admin_whois', email='admin@whois.test', password='Password123!', role='ADMIN', status='ACTIVE'
        )

    @patch.object(WhoisService, 'lookup_domain')
    def test_user_can_lookup_and_owns_record(self, mock_lookup):
        mock_lookup.return_value = {
            "domain": "example.com",
            "status": "SUCCESS",
            "registrar": "ICANN Reserved Registrar",
            "registry_domain_id": "EXAMPLE_ID_123",
            "created_date": "1995-08-14T00:00:00+00:00",
            "updated_date": "2024-01-01T00:00:00+00:00",
            "expires_date": "2030-08-14T00:00:00+00:00",
            "domain_age_days": 10000,
            "days_until_expiration": 1500,
            "age_category": "ESTABLISHED",
            "expiration_category": "ACTIVE",
            "nameservers": ["a.iana-servers.net", "b.iana-servers.net"],
            "domain_status": ["clientDeleteProhibited"],
            "registrant_org": "Internet Assigned Numbers Authority",
            "registrant_country": "US",
            "dnssec": "SIGNED",
            "security_indicators": [],
            "threat_score": 0,
            "severity": "LOW",
            "confidence": 90,
            "error_message": None,
            "structured_evidence": {"source": "WHOIS_SERVICE"}
        }

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post('/api/whois/lookup/', {"domain": "example.com"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["domain"], "example.com")
        self.assertEqual(response.data["registrar"], "ICANN Reserved Registrar")

        # Verify database record belongs strictly to User A
        record = WhoisLookupResult.objects.get(id=response.data["id"])
        self.assertEqual(record.user, self.user_a)

    def test_whois_user_data_isolation(self):
        rec_a = WhoisLookupResult.objects.create(
            user=self.user_a,
            domain="usera-target.com",
            registrar="Registrar A",
            threat_score=5,
            severity="LOW"
        )
        rec_b = WhoisLookupResult.objects.create(
            user=self.user_b,
            domain="userb-target.com",
            registrar="Registrar B",
            threat_score=60,
            severity="HIGH"
        )

        # User A requests their history
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.get('/api/whois/history/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        domains_a = [item["domain"] for item in res_a.data]
        self.assertIn("usera-target.com", domains_a)
        self.assertNotIn("userb-target.com", domains_a)

        # User A attempts to request User B's detail endpoint
        res_forbidden = self.client.get(f'/api/whois/{rec_b.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_user_denied_whois_admin_endpoint(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/admin/whois/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_platform_wide_whois_records(self):
        WhoisLookupResult.objects.create(user=self.user_a, domain="domain-a.org", registrar="Reg A")
        WhoisLookupResult.objects.create(user=self.user_b, domain="domain-b.org", registrar="Reg B")

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/whois/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        domains = [item["domain"] for item in response.data]
        self.assertIn("domain-a.org", domains)
        self.assertIn("domain-b.org", domains)
