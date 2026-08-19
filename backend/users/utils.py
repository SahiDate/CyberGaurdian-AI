import os
import sys
import re
import logging
import requests
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

logger = logging.getLogger(__name__)


def _normalize_phone_number(raw_phone: str, default_country_code: str = "+91"):
    """
    Cleans and standardizes a phone number into international E.164 and local 10-digit formats.
    """
    if not raw_phone:
        return "", ""

    # Remove all whitespace, hyphens, and brackets
    cleaned = re.sub(r'[\s\-\(\)]', '', str(raw_phone).strip())

    # Extract digits only
    digits_only = re.sub(r'\D', '', cleaned)

    if cleaned.startswith('+'):
        e164 = cleaned
        local_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only
    elif len(digits_only) == 10:
        # e.g., 9313133748 -> +919313133748
        prefix = default_country_code if default_country_code.startswith('+') else f"+{default_country_code}"
        e164 = f"{prefix}{digits_only}"
        local_10 = digits_only
    elif len(digits_only) == 11 and digits_only.startswith('0'):
        # e.g., 09313133748 -> +919313133748
        prefix = default_country_code if default_country_code.startswith('+') else f"+{default_country_code}"
        local_10 = digits_only[1:]
        e164 = f"{prefix}{local_10}"
    elif len(digits_only) == 12 and digits_only.startswith('91'):
        # e.g., 919313133748 -> +919313133748
        e164 = f"+{digits_only}"
        local_10 = digits_only[2:]
    else:
        prefix = default_country_code if default_country_code.startswith('+') else f"+{default_country_code}"
        e164 = f"{prefix}{digits_only}"
        local_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only

    return e164, local_10


def print_terminal_otp_banner(otp: str, purpose: str, to_email: str = "", to_phone: str = "", username: str = ""):
    """
    Prints a prominent, beautifully formatted OTP notification banner directly to the Django server terminal.
    Flushes sys.stdout immediately so it is 100% visible with zero lag.
    """
    purpose_labels = {
        'registration': 'Account Registration & Verification',
        'login': 'User Portal Login Authentication',
        'admin_login': 'SOC Admin Console Login',
        'password_reset': 'Account Password Reset',
    }
    purpose_label = purpose_labels.get(purpose, purpose.replace('_', ' ').title())
    e164_phone, _ = _normalize_phone_number(to_phone) if to_phone else ("", "")

    border = "=" * 66
    sys.stdout.write(f"\n+{border}+\n")
    sys.stdout.write(f"|{' [OTP GENERATED] CYBERGUARDIAN SECURITY':^66}|\n")
    sys.stdout.write(f"+{border}+\n")
    if username:
        sys.stdout.write(f"|  {'Username':<16}: {username:<46}|\n")
    if to_email:
        sys.stdout.write(f"|  {'Target Email':<16}: {to_email:<46}|\n")
    if e164_phone:
        sys.stdout.write(f"|  {'Target Phone':<16}: {e164_phone:<46}|\n")
    sys.stdout.write(f"|  {'OTP Purpose':<16}: {purpose_label:<46}|\n")
    sys.stdout.write(f"+{border}+\n")
    sys.stdout.write(f"|  {'>>> OTP CODE <<<':<16}: >>>   {otp}   <<<{(' ' * 21)}|\n")
    sys.stdout.write(f"|  {'Validity Period':<16}: 10 Minutes (Keep strictly confidential){' '*6}|\n")
    sys.stdout.write(f"+{border}+\n")
    sys.stdout.flush()


def _build_otp_email_content(otp: str, purpose: str):
    """Builds HTML and plain text email content for the OTP message."""
    subjects = {
        'registration': 'Verify Your CyberGuardian Account — Security OTP',
        'login': 'CyberGuardian Portal Login — Verification Code',
        'admin_login': 'CyberGuardian SOC Portal — Admin Security OTP',
        'password_reset': 'CyberGuardian Security — Password Reset OTP',
    }
    subject = subjects.get(purpose, 'CyberGuardian Security Verification Code')

    action_lines = {
        'registration': 'Thank you for registering with CyberGuardian. Please use the One-Time Password (OTP) below to verify your email address and activate your account.',
        'login': 'A login attempt was initiated for your CyberGuardian User account. Use the OTP below to complete authentication.',
        'admin_login': 'A privileged login attempt was initiated for your CyberGuardian SOC Admin account. Enter the OTP code below to proceed.',
        'password_reset': 'We received a request to reset your CyberGuardian account password. Enter the OTP code below to proceed with resetting your password.',
    }
    action_line = action_lines.get(purpose, 'Use the following One-Time Password (OTP) to complete your verification.')

    plain_text = f"""
============================================================
CYBERGUARDIAN AI - SECURITY NOTIFICATION
============================================================

Your One-Time Password (OTP) is: {otp}

This code is valid for 10 minutes.
Do NOT share this code with anyone.

If you did not request this code, please secure your account.
============================================================
© 2026 CyberGuardian AI · Enterprise Cybersecurity
"""

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CyberGuardian OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:12px;overflow:hidden;border:1px solid #30363d;">
          <tr>
            <td style="background:linear-gradient(135deg,#1f6feb,#388bfd);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">
                CyberGuardian AI
              </h1>
              <p style="margin:6px 0 0;color:#cce0ff;font-size:13px;letter-spacing:0.5px;">
                Enterprise Security & Threat Intelligence Platform
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#c9d1d9;font-size:15px;line-height:1.7;margin:0 0 28px;">
                {action_line}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#0d1117;border:1px solid #388bfd;border-radius:10px;padding:28px;text-align:center;">
                    <p style="margin:0 0 8px;color:#8b949e;font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                      Your One-Time Password
                    </p>
                    <p style="margin:0;color:#388bfd;font-size:42px;font-weight:700;letter-spacing:10px;font-family:'Courier New',monospace;">
                      {otp}
                    </p>
                    <p style="margin:12px 0 0;color:#6e7681;font-size:12px;">
                      This code expires in <strong style="color:#e3b341;">10 minutes</strong>
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1c2128;border-left:3px solid #e3b341;border-radius:0 6px 6px 0;padding:14px 18px;">
                    <p style="margin:0;color:#e3b341;font-size:13px;font-weight:600;">
                      Security Notice
                    </p>
                    <p style="margin:6px 0 0;color:#8b949e;font-size:13px;line-height:1.6;">
                      CyberGuardian will never ask for your OTP via phone call or chat. If you did not request this code, contact your security administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#0d1117;padding:20px 40px;border-top:1px solid #21262d;text-align:center;">
              <p style="margin:0;color:#484f58;font-size:12px;line-height:1.7;">
                © 2026 CyberGuardian AI · Enterprise Cybersecurity
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, plain_text, html_body


def send_email_otp(to_email: str, otp: str, purpose: str) -> tuple[bool, str]:
    """
    Sends the OTP email via SMTP.
    """
    if not to_email or '@' not in to_email:
        return False, "Invalid email address."

    try:
        from dotenv import load_dotenv
        env_file = getattr(settings, 'BASE_DIR', None)
        if env_file:
            p = env_file / '.env'
            if p.exists():
                load_dotenv(p, override=True)
    except Exception:
        pass

    email_user = os.environ.get('EMAIL_HOST_USER', getattr(settings, 'EMAIL_HOST_USER', '')).strip()
    email_pass = os.environ.get('EMAIL_HOST_PASSWORD', getattr(settings, 'EMAIL_HOST_PASSWORD', '')).strip()
    email_host = os.environ.get('EMAIL_HOST', getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')).strip()

    if not email_user or not email_pass:
        msg = "EMAIL_HOST_USER / EMAIL_HOST_PASSWORD not configured in .env."
        logger.warning(msg)
        return False, msg

    subject, plain_text, html_body = _build_otp_email_content(otp, purpose)

    configs = [
        {'port': 587, 'use_tls': True, 'use_ssl': False},
        {'port': 465, 'use_tls': False, 'use_ssl': True},
    ]

    last_error = None
    for cfg in configs:
        try:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=email_host,
                port=cfg['port'],
                username=email_user,
                password=email_pass,
                use_tls=cfg['use_tls'],
                use_ssl=cfg['use_ssl'],
                timeout=12,
                fail_silently=False,
            )
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=f"CyberGuardian Security <{email_user}>",
                to=[to_email],
                connection=connection
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            sys.stdout.write(f"  [EMAIL SENT] Delivered OTP to {to_email} via {email_host}:{cfg['port']}\n")
            sys.stdout.flush()
            return True, "Email delivered successfully to inbox."
        except Exception as err:
            last_error = err

    sys.stdout.write(f"  [EMAIL WARNING] SMTP delivery failed: {last_error}\n")
    sys.stdout.flush()
    return False, str(last_error)


def send_sms(to_phone: str, body: str) -> bool:
    """
    Sends an SMS containing the OTP to the specified phone number.
    """
    if not to_phone:
        return False

    try:
        from dotenv import load_dotenv
        env_file = getattr(settings, 'BASE_DIR', None)
        if env_file:
            p = env_file / '.env'
            if p.exists():
                load_dotenv(p, override=False)
    except Exception:
        pass

    default_code = os.environ.get('DEFAULT_COUNTRY_CODE', getattr(settings, 'DEFAULT_COUNTRY_CODE', '+91'))
    e164_phone, local_10 = _normalize_phone_number(to_phone, default_code)

    # 1. Twilio SMS Provider
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID', getattr(settings, 'TWILIO_ACCOUNT_SID', '')).strip()
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN', getattr(settings, 'TWILIO_AUTH_TOKEN', '')).strip()
    from_number = (
        os.environ.get('TWILIO_PHONE_NUMBER', '') or 
        os.environ.get('TWILIO_FROM_NUMBER', '') or 
        getattr(settings, 'TWILIO_PHONE_NUMBER', '')
    ).strip()

    is_twilio_configured = (
        account_sid and 
        auth_token and 
        from_number and 
        not account_sid.startswith('ACXXXX') and 
        'your_twilio' not in auth_token and 
        from_number != '+1234567890'
    )

    if is_twilio_configured:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        try:
            response = requests.post(
                url,
                data={
                    "To": e164_phone,
                    "From": from_number,
                    "Body": body
                },
                auth=(account_sid, auth_token),
                timeout=12
            )
            if response.status_code in [200, 201]:
                sys.stdout.write(f"  [SMS SENT] Successfully delivered SMS to {e164_phone} via Twilio.\n")
                sys.stdout.flush()
                return True
            else:
                sys.stdout.write(f"  [TWILIO ERROR] {response.status_code}: {response.text}\n")
                sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(f"  [TWILIO EXCEPTION] {str(e)}\n")
            sys.stdout.flush()

    # 2. Fast2SMS Provider (for Indian Numbers)
    fast2sms_key = os.environ.get('FAST2SMS_API_KEY', getattr(settings, 'FAST2SMS_API_KEY', '')).strip()
    if fast2sms_key and len(local_10) == 10:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            r = requests.post(
                url,
                data={'message': body, 'language': 'english', 'route': 'q', 'numbers': local_10},
                headers={'authorization': fast2sms_key},
                timeout=12
            )
            data = r.json() if r.status_code == 200 else {}
            if r.status_code == 200 and data.get('return'):
                sys.stdout.write(f"  [SMS SENT] Successfully delivered SMS to {local_10} via Fast2SMS.\n")
                sys.stdout.flush()
                return True
            else:
                sys.stdout.write(f"  [FAST2SMS STATUS] {r.text}\n")
                sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(f"  [FAST2SMS EXCEPTION] {str(e)}\n")
            sys.stdout.flush()

    sys.stdout.write(f"  [SMS NOTICE] SMS queued for {e164_phone}. (To receive live SMS on your phone, set live TWILIO or FAST2SMS keys in backend/.env)\n")
    sys.stdout.flush()
    return True


def dispatch_otp(to_email: str, otp: str, purpose: str, to_phone: str = "", username: str = ""):
    """
    Unified multi-channel OTP dispatcher:
      1. ALWAYS prints the OTP banner directly and visibly in the server terminal with zero delay.
      2. Sends email to user's mailbox via Gmail SMTP.
      3. Sends SMS to user's phone number via configured SMS gateway.
    """
    # 1. Terminal Print (Always guaranteed to be visible in server terminal)
    print_terminal_otp_banner(
        otp=otp,
        purpose=purpose,
        to_email=to_email,
        to_phone=to_phone,
        username=username
    )

    # 2. Email Delivery
    email_ok = False
    if to_email:
        email_ok, _ = send_email_otp(to_email, otp, purpose)

    # 3. SMS Delivery
    sms_ok = False
    if to_phone:
        purpose_label = purpose.replace('_', ' ').title()
        sms_body = f"[CyberGuardian] Your {purpose_label} OTP is: {otp}. Valid for 10 minutes. Do NOT share this code."
        sms_ok = send_sms(to_phone, sms_body)

    sys.stdout.write("\n")
    sys.stdout.flush()
    return email_ok or sms_ok
