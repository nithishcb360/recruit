#!/usr/bin/env python3
import requests
import json

# Login
login_url = "http://103.61.224.161:9100/api/auth/users/login/"
login_data = {"email": "admin@demo.com", "password": "admin123"}
login_response = requests.post(login_url, json=login_data)
access_token = login_response.json().get('access')

# Test marketing role
generate_url = "http://103.61.224.161:9100/api/jobs/generate_jd/"
headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

generate_data = {
    "title": "Digital Marketing Manager",
    "department": "Marketing", 
    "level": "mid",
    "location": "Remote",
    "work_type": "remote"
}

generate_response = requests.post(generate_url, headers=headers, json=generate_data)
result = generate_response.json()

print("=== Marketing Role Generated ===")
print("DESCRIPTION:")
print(result.get('description', 'No description'))
print("\nREQUIREMENTS:")
print(result.get('requirements', 'No requirements')[:300] + "...")