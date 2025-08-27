#!/usr/bin/env python
"""Simple script to serve the schema.json file"""
import os
import json
from django.http import JsonResponse
from django.conf import settings

def serve_static_schema(request):
    """Serve the pre-generated schema.json file"""
    schema_path = os.path.join(settings.BASE_DIR, 'static', 'schema.json')
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_data = json.load(f)
        response = JsonResponse(schema_data)
        response['Access-Control-Allow-Origin'] = '*'
        return response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)