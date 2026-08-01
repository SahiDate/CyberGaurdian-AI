from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import User
from .serializers import RegisterSerializer
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from datetime import timedelta
import random
from rest_framework_simplejwt.tokens import RefreshToken
from .utils import send_sms
from django.conf import settings


def generate_otp():
    return str(random.randint(100000, 999999))


def _build_otp_email(otp: str, purpose: str):
    """
    Returns (subject, plain_text_body, html_body) for a professional OTP email.
    purpose: 'registration' | 'login'
    """
    if purpose == 'registration':
        subject = "🔐 Verify Your CyberGuardian Account"
        action_line = "Thank you for registering with <strong>CyberGuardian</strong>. To complete your account setup, please verify your identity using the One-Time Password (OTP) below."
        action_label = "Account Verification OTP"
    else:
        subject = "🔒 Your CyberGuardian Login OTP"
        action_line = "We received a login request for your <strong>CyberGuardian</strong> account. Use the One-Time Password (OTP) below to complete your sign-in."
        action_label = "Login OTP"

    plain_text = (
        f"CyberGuardian Security\n"
        f"{'=' * 40}\n\n"
        f"{action_label}\n\n"
        f"Your OTP Code: {otp}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request this, please ignore this email or contact our support team immediately.\n\n"
        f"Stay secure,\n"
        f"The CyberGuardian Security Team\n"
        f"{'=' * 40}\n"
        f"This is an automated message. Please do not reply to this email."
    )

    html_body = f"""
<!DOCTYPE html>
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

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1f6feb,#388bfd);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">
                🛡️ CyberGuardian
              </h1>
              <p style="margin:6px 0 0;color:#cce0ff;font-size:13px;letter-spacing:0.5px;">
                Advanced Cybersecurity Intelligence Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#8b949e;font-size:13px;margin:0 0 20px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                {action_label}
              </p>
              <p style="color:#c9d1d9;font-size:15px;line-height:1.7;margin:0 0 28px;">
                {action_line}
              </p>

              <!-- OTP Box -->
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
                      ⏱&nbsp; This code expires in <strong style="color:#e3b341;">10 minutes</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1c2128;border-left:3px solid #e3b341;border-radius:0 6px 6px 0;padding:14px 18px;">
                    <p style="margin:0;color:#e3b341;font-size:13px;font-weight:600;">
                      ⚠️ Security Notice
                    </p>
                    <p style="margin:6px 0 0;color:#8b949e;font-size:13px;line-height:1.6;">
                      CyberGuardian will <strong style="color:#c9d1d9;">never</strong> ask for your OTP via phone call or chat.
                      If you did not request this code, please
                      <a href="mailto:support@cyberguardian.io" style="color:#388bfd;text-decoration:none;">contact our support team</a>
                      immediately and secure your account.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d1117;padding:20px 40px;border-top:1px solid #21262d;text-align:center;">
              <p style="margin:0;color:#484f58;font-size:12px;line-height:1.7;">
                © 2026 CyberGuardian · Advanced Cybersecurity Intelligence<br/>
                This is an automated message — please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, plain_text, html_body


def _send_otp_email(to_email: str, otp: str, purpose: str):
    """Send a professional HTML OTP email."""
    subject, plain_text, html_body = _build_otp_email(otp, purpose)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_text,
        from_email=f"CyberGuardian Security <{settings.EMAIL_HOST_USER}>",
        to=[to_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)



class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save(is_active=False)
        otp = generate_otp()
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()
        
        _send_otp_email(user.email, otp, purpose='registration')

        # Send SMS
        if user.phone_number:
            send_sms(
                user.phone_number,
                f"[CyberGuardian] Your account verification OTP is: {otp}\n"
                f"Valid for 10 minutes. Do NOT share this code with anyone."
            )

class VerifyRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        otp = request.data.get('otp')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if user.is_active:
            return Response({"error": "User already verified."}, status=status.HTTP_400_BAD_REQUEST)
            
        if user.otp == otp:
            if timezone.now() > user.otp_created_at + timedelta(minutes=10):
                return Response({"error": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
                
            user.is_active = True
            user.is_email_verified = True
            user.otp = None
            user.otp_created_at = None
            user.save()
            return Response({"message": "Registration verified successfully."}, status=status.HTTP_200_OK)
            
        return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

class LoginInitiateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
        if not user.check_password(password):
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
        if not user.is_active:
            return Response({"error": "Account not verified."}, status=status.HTTP_412_PRECONDITION_FAILED)
            
        # Generate OTP for login
        otp = generate_otp()
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()
        
        # Send OTP via Email
        _send_otp_email(user.email, otp, purpose='login')

        # Send OTP via SMS
        if user.phone_number:
            send_sms(
                user.phone_number,
                f"[CyberGuardian] Your login OTP is: {otp}\n"
                f"Valid for 10 minutes. If you did not attempt to log in, secure your account immediately."
            )
            
        return Response({
            "otp_required": True,
            "username": username,
            "message": "OTP has been sent to your registered email and mobile number."
        }, status=status.HTTP_200_OK)

class VerifyLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        otp = request.data.get('otp')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
        if not user.check_password(password):
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
        if user.otp == otp:
            if timezone.now() > user.otp_created_at + timedelta(minutes=10):
                return Response({"error": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
                
            user.otp = None
            user.otp_created_at = None
            user.save()
            
            refresh = RefreshToken.for_user(user)
            # Add custom claims as we did in the serializer
            refresh['username'] = user.username
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
            
        return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
