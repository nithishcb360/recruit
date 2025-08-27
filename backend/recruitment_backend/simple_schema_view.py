import json
import os
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def simple_schema_view(request):
    """Simple schema view that returns the pre-generated schema"""
    try:
        schema_path = os.path.join(settings.BASE_DIR, 'static', 'schema.json')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_content = f.read()
        
        # Return as plain JSON response with proper headers
        response = HttpResponse(
            schema_content, 
            content_type='application/json'
        )
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
        
    except FileNotFoundError:
        return JsonResponse({'error': 'Schema file not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)