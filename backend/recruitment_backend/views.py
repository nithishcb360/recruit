from django.http import JsonResponse
from django.conf import settings
import json
import os

def static_schema_view(request):
    """Serve static schema.json file"""
    try:
        schema_path = os.path.join(settings.BASE_DIR, 'static', 'schema.json')
        
        # Debug info
        print(f"DEBUG: Schema path: {schema_path}")
        print(f"DEBUG: File exists: {os.path.exists(schema_path)}")
        
        if not os.path.exists(schema_path):
            return JsonResponse({'error': 'Schema file not found', 'path': schema_path}, status=404)
            
        with open(schema_path, 'r') as f:
            schema_data = json.load(f)
            
        print("DEBUG: Schema loaded successfully")
        return JsonResponse(schema_data)
        
    except Exception as e:
        print(f"DEBUG: Exception in schema view: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Error loading schema: {str(e)}'}, status=500)