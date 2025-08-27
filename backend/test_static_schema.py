#!/usr/bin/env python
import os
import django
from django.conf import settings
from django.test import RequestFactory

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'recruitment_backend.settings')
django.setup()

from schema_serve import serve_static_schema

# Create a test request
rf = RequestFactory()
request = rf.get('/api/schema/')

try:
    response = serve_static_schema(request)
    print(f"Status: {response.status_code}")
    print("SUCCESS: Schema view worked!")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()