import json
import uuid
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from src.app.db import SessionLocal, engine
from src.app.models import AppData, Trip, Base

def migrate_trips():
    # Ensure table exists
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        print("Starting Trip Migration...")
        
        # 1. Private History (travel_builder_history)
        history_rows = db.scalars(select(AppData).where(AppData.key == 'travel_builder_history')).all()
        
        count_private = 0
        for row in history_rows:
            trips_list = row.value
            if isinstance(trips_list, list):
                for trip_data in trips_list:
                    trip_id = trip_data.get('id') or str(uuid.uuid4())
                    trip_name = trip_data.get('name') or "Untitled Trip"
                    
                    existing = db.get(Trip, trip_id)
                    if not existing:
                        new_trip = Trip(
                            id=trip_id,
                            name=trip_name,
                            owner_id=row.owner_id,
                            is_public=False,
                            content=trip_data
                        )
                        db.add(new_trip)
                        count_private += 1
                    else:
                        print(f"Skipping existing private trip {trip_id}")
        
        print(f"Migrated {count_private} private trips.")

        # 2. Public Trips (travel_builder_public_trips)
        public_rows = db.scalars(select(AppData).where(AppData.key == 'travel_builder_public_trips')).all()
        
        count_public = 0
        for row in public_rows:
            trips_list = row.value
            if isinstance(trips_list, list):
                for trip_data in trips_list:
                     trip_id = trip_data.get('id') or str(uuid.uuid4())
                     trip_name = trip_data.get('name') or "Untitled Public Trip"
                     
                     existing = db.get(Trip, trip_id)
                     if not existing:
                         new_trip = Trip(
                             id=trip_id,
                             name=trip_name,
                             owner_id=row.owner_id if row.owner_id != 'system' else 'system',
                             is_public=True,
                             content=trip_data
                         )
                         db.add(new_trip)
                         count_public += 1
                     else:
                        print(f"Skipping existing public trip {trip_id}")

        print(f"Migrated {count_public} public trips.")
        
        db.commit()
        print("Trip Migration Complete!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_trips()
