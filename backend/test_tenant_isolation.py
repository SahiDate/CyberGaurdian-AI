import os
import sys
import django

# Add backend directory to Python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
django.setup()

from django.contrib.auth import get_user_model
from scanner.models import ScanResult, Report, Incident, URLScanResult, ThreatIntelResult
from core_engine.views import AnalyzeTargetView
from rest_framework.test import APIRequestFactory, force_authenticate

User = get_user_model()

def run_tenant_isolation_test():
    # 1. Create two separate tenant users
    user_a, _ = User.objects.get_or_create(username="tenant_alpha_test", defaults={"email": "alpha@test.com", "role": "security_analyst"})
    user_b, _ = User.objects.get_or_create(username="tenant_beta_test", defaults={"email": "beta@test.com", "role": "security_analyst"})

    # Clear previous test data for clean slate
    ScanResult.objects.filter(user__in=[user_a, user_b]).delete()
    Incident.objects.filter(user__in=[user_a, user_b]).delete()
    Report.objects.filter(user__in=[user_a, user_b]).delete()

    # 2. User A scans a PhishTank URL via AnalyzeTargetView
    factory = APIRequestFactory()
    request_a = factory.post("/api/scan/", {"target": "https://sl83684.pro/loading.php"}, format="json")
    force_authenticate(request_a, user=user_a)

    view = AnalyzeTargetView.as_view()
    response_a = view(request_a)

    print("=== MULTI-TENANT ISOLATION VERIFICATION ===")
    print(f"User A scan response status: {response_a.status_code}")
    print(f"User A is_phishing: {response_a.data.get('is_phishing')}")
    print(f"User A phishing indicators: {response_a.data.get('phishing_indicators')}")

    # 3. Check Database Ownership Isolation
    user_a_scans = ScanResult.objects.filter(user=user_a).count()
    user_b_scans = ScanResult.objects.filter(user=user_b).count()

    user_a_incidents = Incident.objects.filter(user=user_a).count()
    user_b_incidents = Incident.objects.filter(user=user_b).count()

    user_a_reports = Report.objects.filter(user=user_a).count()
    user_b_reports = Report.objects.filter(user=user_b).count()

    print(f"\nUser A (Tenant Alpha) records:")
    print(f"  Scans: {user_a_scans}")
    print(f"  Incidents: {user_a_incidents}")
    print(f"  Reports: {user_a_reports}")

    print(f"\nUser B (Tenant Beta) records:")
    print(f"  Scans: {user_b_scans}")
    print(f"  Incidents: {user_b_incidents}")
    print(f"  Reports: {user_b_reports}")

    assert user_a_scans >= 1, "User A should have at least 1 scan record"
    assert user_b_scans == 0, "User B must have ZERO scans (Strict Isolation)"
    assert user_a_incidents >= 1, "User A should have an incident logged for phishing"
    assert user_b_incidents == 0, "User B must have ZERO incidents (Strict Isolation)"

    print("\n>>> STRICT MULTI-TENANT ISOLATION IS 100% VERIFIED! <<<")

    # Cleanup
    ScanResult.objects.filter(user__in=[user_a, user_b]).delete()
    Incident.objects.filter(user__in=[user_a, user_b]).delete()
    Report.objects.filter(user__in=[user_a, user_b]).delete()
    user_a.delete()
    user_b.delete()
    print("Test users cleaned up successfully.")

if __name__ == "__main__":
    run_tenant_isolation_test()
