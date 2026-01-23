
import sys
import os
import requests
import time

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

BASE_URL = "http://localhost:8000"
S = requests.Session()

def register_user(username, password):
    resp = S.post(f"{BASE_URL}/api/auth/register", json={"username": username, "password": password})
    if resp.status_code == 200:
        return resp.json()["token"]
    # Try login if exists
    resp = S.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    if resp.status_code == 200:
        return resp.json()["token"]
    raise Exception(f"Auth failed: {resp.text}")

def test_isolation():
    print("Testing Data Isolation...")
    
    # 1. Setup User A and User B
    token_a = register_user("user_a", "123456")
    token_b = register_user("user_b", "123456")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    key = "my_settings"
    
    # 2. User A sets a PRIVATE value
    print("User A setting private value...")
    resp = S.put(
        f"{BASE_URL}/api/data/{key}", 
        headers=headers_a,
        json={"value": {"theme": "dark"}, "is_public": False}
    )
    assert resp.status_code == 200
    assert resp.json()["value"]["theme"] == "dark"
    
    # 3. User B should NOT see User A's value (404)
    print("User B trying to read User A's private key (should 404)...")
    resp = S.get(f"{BASE_URL}/api/data/{key}", headers=headers_b)
    assert resp.status_code == 404
    
    # 4. User B sets their OWN PRIVATE value
    print("User B setting their own private value...")
    resp = S.put(
        f"{BASE_URL}/api/data/{key}", 
        headers=headers_b,
        json={"value": {"theme": "light"}, "is_public": False}
    )
    assert resp.status_code == 200
    assert resp.json()["value"]["theme"] == "light"
    
    # 5. Verify User A still sees "dark"
    print("User A verifying their value is still unchanged...")
    resp = S.get(f"{BASE_URL}/api/data/{key}", headers=headers_a)
    assert resp.json()["value"]["theme"] == "dark"
    
    # 6. Test Public Data
    public_key = "shared_config"
    print("\nUser A creating PUBLIC data...")
    resp = S.put(
        f"{BASE_URL}/api/data/{public_key}", 
        headers=headers_a,
        json={"value": {"version": "1.0"}, "is_public": True}
    )
    assert resp.status_code == 200
    
    # 7. User B should see this public data
    print("User B reading PUBLIC data (should succeed)...")
    resp = S.get(f"{BASE_URL}/api/data/{public_key}", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json()["value"]["version"] == "1.0"
    assert resp.json()["is_public"] == True

    print("\nSUCCESS: All isolation and sharing tests passed!")

if __name__ == "__main__":
    try:
        test_isolation()
    except Exception as e:
        print(f"FAILED: {e}")
        exit(1)
