"""
Graceful JWT Authentication for CyberGuardian AI.
Authenticates valid JWT bearer tokens. If a token is expired, invalid, or malformed,
it returns None (allowing unauthenticated/guest requests to proceed on AllowAny endpoints)
instead of raising an unhandled 401 AuthenticationFailed.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class GracefulJWTAuthentication(JWTAuthentication):
    """
    Tolerant JWT Authentication.
    - If valid token: authenticates user (request.user = user).
    - If no header or invalid/expired token: returns None (request.user = AnonymousUser),
      allowing AllowAny endpoints to execute gracefully and resolve guest users.
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
        except (InvalidToken, AuthenticationFailed, Exception):
            # Gracefully treat invalid/expired tokens as unauthenticated
            return None
