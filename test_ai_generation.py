#!/usr/bin/env python3
import requests
import json

# First login to get access token
login_url = "http://103.61.224.161:9100/api/auth/users/login/"
login_data = {
    "email": "admin@demo.com",
    "password": "admin123"
}

print("Logging in...")
login_response = requests.post(login_url, json=login_data)
print(f"Login status: {login_response.status_code}")

if login_response.status_code == 200:
    tokens = login_response.json()
    access_token = tokens.get('access')
    print(f"Got access token: {access_token[:20]}...")
    
    # Test AI generation
    generate_url = "http://103.61.224.161:9100/api/jobs/generate_jd/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test data for AI generation
    generate_data = {
        "title": "Senior Software Engineer",
        "department": "Engineering", 
        "level": "senior",
        "location": "San Francisco, CA",
        "work_type": "hybrid"
    }
    
    print("Generating job description...")
    generate_response = requests.post(generate_url, headers=headers, json=generate_data)
    print(f"Generation status: {generate_response.status_code}")
    
    if generate_response.status_code == 200:
        result = generate_response.json()
        print("\n=== Generated Job Description ===")
        print("DESCRIPTION:")
        print(result.get('description', 'No description'))
        print("\nRESPONSIBILITIES:")
        print(result.get('responsibilities', 'No responsibilities'))
        print("\nREQUIREMENTS:")
        print(result.get('requirements', 'No requirements'))
    else:
        print(f"Generation failed: {generate_response.text}")
else:
    print(f"Login failed: {login_response.text}")