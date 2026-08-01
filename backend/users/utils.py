from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

def send_sms(to_phone, body):
    """
    Sends an SMS to a phone number.
    Uses Twilio API if settings are configured, otherwise falls back to logging to console.
    """
    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
    from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)

    if account_sid and auth_token and from_number:
        # Use Twilio API directly via requests
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        try:
            response = requests.post(
                url,
                data={
                    "To": to_phone,
                    "From": from_number,
                    "Body": body
                },
                auth=(account_sid, auth_token),
                timeout=10
            )
            if response.status_code in [200, 201]:
                logger.info(f"SMS successfully sent to {to_phone} via Twilio.")
                return True
            else:
                logger.error(f"Failed to send SMS via Twilio. Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            logger.error(f"Exception occurred while sending SMS via Twilio: {str(e)}")
    
    # Fallback/Mock to console
    print(f"\n[MOCK SMS] To: {to_phone} | Message: {body}\n")
    return True
