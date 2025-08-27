#!/usr/bin/env python
"""
Test script to debug the schema generation issue
"""
import os
import django
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'recruitment_backend.settings')
django.setup()

try:
    from drf_spectacular.openapi import AutoSchema
    from drf_spectacular.views import SpectacularAPIView
    
    # Try to create the schema view instance
    view = SpectacularAPIView()
    print("SUCCESS: SpectacularAPIView instance created successfully")
    
    # Try to generate the schema using the view
    from django.test import RequestFactory
    request_factory = RequestFactory()
    request = request_factory.get('/api/schema/')
    
    response = view.get(request)
    print("SUCCESS: Schema response generated successfully")
    print(f"Response status: {response.status_code}")
    
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()