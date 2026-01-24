import sys
import os
import requests
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Removed unused backend imports
# We will use purely HTTP requests

# Config
BASE_URL = "http://127.0.0.1:8000"
TEST_USER = "debug_api_user"
TEST_PASS = "debug123"

def setup_user():
    # Connect directly to DB to ensure user exists
    # We cheat and use the definition from db.py but we need the DATABASE_URL
    # easier to just use the running app's db module if we can import it
    # But for a script, let's just use requests to REGISTER if possible?
    # Or just Assume user exists? No.
    
    # Let's try to register via API first, if fails (exists), then login.
    print(f"Ensuring user {TEST_USER} exists...")
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": TEST_USER,
            "password": TEST_PASS
        })
        if resp.status_code == 200:
            print("User registered.")
        else:
            print(f"Register status: {resp.status_code} (User probably exists)")
    except Exception as e:
        print(f"Failed to connect to API: {e}")
        sys.exit(1)

def test_access():
    # Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USER,
        "password": TEST_PASS
    })
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
        
    auth_data = resp.json()
    if not auth_data.get("success"):
        print(f"Login failed (API logic): {auth_data.get('message')}")
        return
        
    token = auth_data["token"]
    print(f"Logged in. Token: {token[:10]}...")
    headers = {"Authorization": f"Bearer {token}"}
    
    
    # Test Public Data Access for ALL keys
    keys = [
        "travel_builder_db_cars",
        "travel_builder_db_poi_cities",
        "travel_builder_db_poi_spots",
        "travel_builder_db_poi_hotels_v2",
        "travel_builder_db_poi_activities"
    ]
    
    for key in keys:
        print(f"Fetching {key} with scope=public...")
        url = f"{BASE_URL}/api/data/{key}?scope=public"
        r = requests.get(url, headers=headers)
        
        if r.status_code == 200:
            data = r.json()
            val = data.get("value", [])
            print(f"  [OK] {key}: Len={len(val)}, Public={data.get('is_public')}")
        else:
            print(f"  [FAIL] {key}: Status {r.status_code}")

if __name__ == "__main__":
    setup_user()
    test_access()
