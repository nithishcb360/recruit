from django.utils.deprecation import MiddlewareMixin

class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF checks for all API endpoints.
    This is placed before CsrfViewMiddleware in MIDDLEWARE setting.
    """
    def process_request(self, request):
        # Disable CSRF for all API endpoints
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Also disable CSRF checks in the view processing stage
        # This ensures CSRF is disabled even if the request object is recreated
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

    def process_response(self, request, response):
        # Remove CSRF cookie for API endpoints to prevent any CSRF issues
        if request.path.startswith('/api/'):
            response.delete_cookie('csrftoken')
        return response