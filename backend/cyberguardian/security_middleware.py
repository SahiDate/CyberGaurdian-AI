class SecurityHeadersMiddleware:
    """
    Injects Content-Security-Policy and Strict-Transport-Security headers
    for production security hardening.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;"
        if 'Strict-Transport-Security' not in response:
            response['Strict-Transport-Security'] = "max-age=31536000; includeSubDomains; preload"
        return response
