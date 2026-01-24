from sqlalchemy import delete
from src.app.db import SessionLocal, engine
from src.app.models import AppData

def cleanup():
    # Keys to KEEP
    KEEP_KEYS = [
        'travel_builder_settings_global',
        'travel_builder_locations_history'
    ]
    
    db = SessionLocal()
    try:
        print("Starting cleanup of app_data...")
        # Delete where key NOT IN keep_keys
        stmt = delete(AppData).where(AppData.key.notin_(KEEP_KEYS))
        result = db.execute(stmt)
        deleted_count = result.rowcount
        db.commit()
        
        print(f"Cleanup complete. Deleted {deleted_count} obsolete rows.")
        print(f"Retained keys: {KEEP_KEYS}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
