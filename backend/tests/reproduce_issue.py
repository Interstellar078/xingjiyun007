
import sys
import os
import requests

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

def test_registration():
    url = "http://localhost:8000/api/auth/register"
    payload = {
        "username": "test_script_user",
        "password": "test_password_123"
    }
    try:
        print(f"Attempting to register at {url}...")
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_registration()
