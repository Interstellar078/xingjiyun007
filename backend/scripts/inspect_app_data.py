from sqlalchemy import select, func
from src.app.db import SessionLocal
from src.app.models import AppData

def inspect():
    db = SessionLocal()
    try:
        results = db.query(AppData.key, AppData.owner_id, AppData.updated_at).all()
        
        print(f"{'Key':<40} | {'Owner':<15} | {'Last Updated'}")
        print("-" * 80)
        
        keys = {}
        for r in results:
            k = r.key
            print(f"{k:<40} | {r.owner_id:<15} | {r.updated_at}")
            keys[k] = keys.get(k, 0) + 1
            
        print("\nSummary of Keys:")
        for k, v in keys.items():
            print(f"{k}: {v} rows")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect()
