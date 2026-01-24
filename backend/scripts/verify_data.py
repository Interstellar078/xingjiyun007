import sys
import os
from sqlalchemy import text

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.app.db import SessionLocal
from src.app.models import AppData

def verify():
    print("Verifying Database Content...")
    db = SessionLocal()
    try:
        # Check system data
        items = db.query(AppData).filter(AppData.owner_id == 'system').all()
        print(f"Found {len(items)} items for owner 'system':")
        for item in items:
            value_len = len(item.value) if isinstance(item.value, list) else 'N/A'
            print(f"  - Key: {item.key}, Public: {item.is_public}, Value (len): {value_len}")
            
        if len(items) == 0:
            print("ERROR: No system data found!")
        else:
            print("SUCCESS: System data exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
