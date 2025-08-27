#!/usr/bin/env python
"""Debug URL patterns"""
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'recruitment_backend.settings')
django.setup()

from django.urls import resolve
try:
    from django.urls import get_resolver
    
    resolver = get_resolver()
    print("Available URL patterns:")
    
    def print_urls(patterns, prefix=''):
        for pattern in patterns:
            if hasattr(pattern, 'url_patterns'):
                print_urls(pattern.url_patterns, prefix + str(pattern.pattern))
            else:
                print(f"  {prefix}{pattern.pattern} -> {pattern.callback}")
    
    print_urls(resolver.url_patterns)
    
except Exception as e:
    print(f"Error: {e}")
    
    # Try simpler approach
    try:
        print("Testing specific endpoints:")
        test_urls = [
            '/api/schema/',
            '/api/auth/',
            '/api/auth/token/',
            '/api/docs/'
        ]
        
        for url in test_urls:
            try:
                match = resolve(url)
                print(f"{url} -> {match.func}")
            except Exception as e:
                print(f"{url} -> Error: {e}")
                
    except Exception as e:
        print(f"Secondary test failed: {e}")