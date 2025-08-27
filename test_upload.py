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
    
    # Test file upload
    upload_url = "http://103.61.224.161:9100/api/jobs/parse_jd/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # Upload test file
    with open('/home/infotribo/work/recruit/test_jd.txt', 'rb') as f:
        files = {'file': ('test_jd.txt', f, 'text/plain')}
        print("Uploading file...")
        upload_response = requests.post(upload_url, headers=headers, files=files)
        print(f"Upload status: {upload_response.status_code}")
        print(f"Upload response: {upload_response.text}")
else:
    print(f"Login failed: {login_response.text}")