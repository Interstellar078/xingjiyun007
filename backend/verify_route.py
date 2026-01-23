
from fastapi.testclient import TestClient
from src.app.main import app

def test_admin_route():
    client = TestClient(app)
    
    # Check if the route exists (even if 401/403)
    response = client.get("/api/admin/data/all?key=test")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    test_admin_route()
