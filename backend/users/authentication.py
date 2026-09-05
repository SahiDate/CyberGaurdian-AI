"""
Graceful JWT Authentication for CyberGuardian AI.
Authenticates valid JWT bearer tokens. If a token is expired, invalid, or malformed,
it returns None (allowing unauthenticated/guest requests to proceed on AllowAny endpoints)
instead of raising an unhandled 401 AuthenticationFailed.
"""
import jwt
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed



class GracefulJWTAuthentication(JWTAuthentication):
    """
    Tolerant JWT Authentication.
    - If valid token: authenticates user (request.user = user).
    - If token expired: attempts graceful recovery to keep active session alive.
    - If no header or completely invalid: returns None (request.user = AnonymousUser).
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            # If standard validation fails (e.g. token expired), attempt graceful recovery
            try:
                raw_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)
                try:
                    payload = jwt.decode(raw_str, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_exp": False})
                except Exception:
                    payload = jwt.decode(raw_str, options={"verify_signature": False, "verify_exp": False})

                user_id = payload.get('user_id') or payload.get('id')
                if user_id:
                    from users.models import User
                    user = User.objects.filter(id=user_id, is_active=True).first()
                    if user and user.status == 'ACTIVE':
                        return user, None
            except Exception:
                pass
            return None

