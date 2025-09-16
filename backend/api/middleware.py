"""
Custom middleware for API requests
"""

class DisableCSRFMiddleware:
    """
    Middleware to disable CSRF protection for all API requests
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Disable CSRF for all API requests
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)

        response = self.get_response(request)
        return response