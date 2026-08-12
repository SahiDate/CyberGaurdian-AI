import os
import sys
import smtplib
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

email_user = os.environ.get('EMAIL_HOST_USER', '').strip()
email_pass = os.environ.get('EMAIL_HOST_PASSWORD', '').strip()
email_host = os.environ.get('EMAIL_HOST', 'smtp.gmail.com').strip()

print("=" * 60)
print(" 📧 CYBERGUARDIAN SMTP DIAGNOSTIC TEST")
print("=" * 60)
print(f"  EMAIL_HOST:      {email_host}")
print(f"  EMAIL_HOST_USER: {email_user}")
print(f"  EMAIL_PASSWORD:  {'*' * len(email_pass)} ({len(email_pass)} chars)")
print("=" * 60)

if not email_user or not email_pass:
    print("❌ ERROR: EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is empty in .env!")
    sys.exit(1)

print("\n🔄 Attempting SMTP TLS connection on port 587...")
try:
    server = smtplib.SMTP(email_host, 587, timeout=10)
    server.starttls()
    server.login(email_user, email_pass)
    print("✅ SUCCESS! Gmail SMTP authentication succeeded on port 587!")
    server.quit()
    sys.exit(0)
except Exception as e:
    print(f"❌ Port 587 Failed: {e}")

print("\n🔄 Attempting SMTP SSL connection on port 465...")
try:
    server = smtplib.SMTP_SSL(email_host, 465, timeout=10)
    server.login(email_user, email_pass)
    print("✅ SUCCESS! Gmail SMTP authentication succeeded on port 465!")
    server.quit()
    sys.exit(0)
except Exception as e:
    print(f"❌ Port 465 Failed: {e}")

print("\n" + "=" * 60)
print("❌ GMAIL REJECTED YOUR CREDENTIALS!")
print("Reason: Google returned 535 BadCredentials.")
print("Fix:")
print("1. Log in to https://myaccount.google.com/security with 'ts0279190@gmail.com'")
print("2. Ensure 2-Step Verification is ON")
print("3. Go to https://myaccount.google.com/apppasswords")
print("4. Generate a 16-letter App Password (e.g. abcd efgh ijkl mnop)")
print("5. Paste the 16 letters into .env as EMAIL_HOST_PASSWORD=uiyturotgrasjjjl")
print("=" * 60)
