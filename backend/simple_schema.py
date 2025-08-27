from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def minimal_schema(request):
    """Minimal working schema for Swagger UI"""
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    
    # Minimal OpenAPI schema
    schema = {
        "openapi": "3.0.3",
        "info": {
            "title": "Recruitment API",
            "version": "1.0.0",
            "description": "API for Recruitment Management System"
        },
        "servers": [
            {"url": "http://localhost:8000", "description": "Development server"}
        ],
        "paths": {
            "/api/auth/users/login/": {
                "post": {
                    "summary": "User Login",
                    "tags": ["Authentication"],
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "email": {"type": "string"},
                                        "password": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Login successful",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "access": {"type": "string"},
                                            "refresh": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/jobs/": {
                "get": {
                    "summary": "List Jobs",
                    "tags": ["Jobs"],
                    "responses": {
                        "200": {
                            "description": "List of jobs",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "results": {
                                                "type": "array",
                                                "items": {"type": "object"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT"
                }
            }
        }
    }
    
    response = JsonResponse(schema)
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response