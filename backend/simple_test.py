from django.http import JsonResponse

def simple_test_view(request):
    """Simple test view"""
    return JsonResponse({"message": "Hello, this is a test", "status": "working"})