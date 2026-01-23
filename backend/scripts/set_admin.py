import sys
import os

from dotenv import load_dotenv

# Add the parent directory (backend) to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

# Load environment variables from backend/.env
load_dotenv(os.path.join(backend_dir, ".env"))

from src.app.db import SessionLocal
from src.app.models import User

def set_admin():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("\nExisting Users:")
        for u in users:
            print(f"- {u.username} (Role: {u.role})")
        print("")

        username = input("Enter the username to promote to Admin: ").strip()
        if not username:
            print("Username cannot be empty")
            return

        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found!")
            return

        user.role = "admin"
        db.commit()
        print(f"Successfully promoted '{username}' to admin role!")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    set_admin()
