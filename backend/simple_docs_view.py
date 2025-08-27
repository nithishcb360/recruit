from django.http import HttpResponse
from django.conf import settings
import os

def simple_docs_view(request):
    """Serve simple API documentation"""
    docs_path = os.path.join(settings.BASE_DIR, 'simple_docs.html')
    try:
        with open(docs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HttpResponse(content, content_type='text/html')
    except FileNotFoundError:
        return HttpResponse("API Documentation not found", status=404)