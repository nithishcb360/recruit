#!/usr/bin/env python3
import requests
import json

# Login as admin
login_url = "http://103.61.224.161:9100/api/auth/users/login/"
login_data = {"email": "admin@demo.com", "password": "admin123"}
login_response = requests.post(login_url, json=login_data)

if login_response.status_code == 200:
    tokens = login_response.json()
    access_token = tokens.get('access')
    
    # Get users
    users_url = "http://103.61.224.161:9100/api/auth/users/"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    users_response = requests.get(users_url, headers=headers)
    
    if users_response.status_code == 200:
        users = users_response.json()
        print(f"Total users: {users.get('count', 0)}")
        print("\nUsers list:")
        for user in users.get('results', []):
            print(f"- {user.get('email')} ({user.get('full_name')}) - Role: {user.get('role')} - Org: {user.get('organization')}")
    else:
        print(f"Failed to get users: {users_response.status_code}")
else:
    print(f"Login failed: {login_response.status_code}")