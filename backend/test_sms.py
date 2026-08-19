import os
import sys
from pathlib import Path

# Load .env file
base_dir = Path(__file__).resolve().parent
env_file = base_dir / '.env'
if not env_file.exists():
    env_file = base_dir.parent / '.env'

try:
    from dotenv import load_dotenv
    load_dotenv(env_file, override=True)
except ImportError:
    pass

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
django.setup()

from users.utils import send_sms

target_phone = sys.argv[1] if len(sys.argv) > 1 else "9313133748"
otp_code = "245005"
message = f"[CyberGuardian] Your verification OTP is: {otp_code}. Valid for 10 minutes. Do NOT share this code."

print("=" * 64)
print(" [SMS] CYBERGUARDIAN SMS DELIVERY DIAGNOSTIC TEST")
print("=" * 64)
print(f"Target Phone: {target_phone}")
print(f"Message:      {message}")
print("=" * 64)

success = send_sms(target_phone, message)
print(f"Result: {'SUCCESS' if success else 'FAILED'}")
