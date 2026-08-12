import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.test.utils import get_runner
from django.conf import settings

TestRunner = get_runner(settings)
test_runner = TestRunner(verbosity=2, interactive=False)
failures = test_runner.run_tests(['users.tests_security'])

if failures:
    print(f"\n❌ SECURITY TESTS FAILED: {failures} failures.")
    sys.exit(1)
else:
    print("\n✅ ALL 8 SECURITY TESTS PASSED PERFECTLY!")
    sys.exit(0)
