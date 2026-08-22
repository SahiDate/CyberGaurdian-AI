import os
import sys

os.environ['USE_SQLITE'] = 'True'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.test.utils import get_runner
from django.conf import settings

TestRunner = get_runner(settings)
test_runner = TestRunner(verbosity=2, interactive=False)
failures = test_runner.run_tests([
    'scanner.tests.test_report_generator',
    'scanner.tests.test_ai_agent',
    'scanner.tests.test_soc_engine',
    'scanner.tests.test_port_scanner',
    'scanner.tests.test_url_scanner',
    'scanner.tests.test_ssl_scanner',
    'scanner.tests.test_whois_lookup',
    'scanner.tests.test_file_analyzer',
    'users.tests_security',
])

if failures:
    print(f"\n[FAIL] TESTS FAILED: {failures} failures.")
    sys.exit(1)
else:
    print("\n[PASS] ALL TESTS PASSED PERFECTLY!")
    sys.exit(0)
