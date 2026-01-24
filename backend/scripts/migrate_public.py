from sqlalchemy.orm import Session
from src.app.deps import SessionLocal
from src.app.models import ResourceCity, ResourceSpot, ResourceHotel, ResourceActivity, ResourceTransport

def migrate_public():
    db: Session = SessionLocal()
    try:
        print("Starting public migration...")
        
        # 1. Cities
        cities = db.query(ResourceCity).all()
        for c in cities:
            c.is_public = True
            c.owner_id = 'system'
        print(f"Migrated {len(cities)} cities.")

        # 2. Spots
        spots = db.query(ResourceSpot).all()
        for s in spots:
            s.is_public = True
            s.owner_id = 'system'
        print(f"Migrated {len(spots)} spots.")

        # 3. Hotels
        hotels = db.query(ResourceHotel).all()
        for h in hotels:
            h.is_public = True
            h.owner_id = 'system'
        print(f"Migrated {len(hotels)} hotels.")

        # 4. Activities
        acts = db.query(ResourceActivity).all()
        for a in acts:
            a.is_public = True
            a.owner_id = 'system'
        print(f"Migrated {len(acts)} activities.")

        # 5. Transports
        trans = db.query(ResourceTransport).all()
        for t in trans:
            t.is_public = True
            t.owner_id = 'system'
        print(f"Migrated {len(trans)} transports.")

        db.commit()
        print("Migration complete!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_public()
