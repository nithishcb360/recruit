#!/usr/bin/env python
import os
import django
from django.conf import settings
from django.test import RequestFactory

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'recruitment_backend.settings')
django.setup()

from simple_schema import minimal_schema

# Create a test request
rf = RequestFactory()
request = rf.get('/api/schema/')

try:
    response = minimal_schema(request)
    print(f"Status: {response.status_code}")
    print("SUCCESS: Minimal schema worked!")
    print("Content preview:", str(response.content)[:200])
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()