import uuid
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from src.app.db import SessionLocal, engine
from src.app.models import Base, ResourceCity, ResourceTransport, ResourceCountry

def migrate_countries():
    # Ensure tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Migrating Countries...")
        
        # 1. Collect names
        city_countries = db.scalars(select(ResourceCity.country).distinct()).all()
        transport_regions = db.scalars(select(ResourceTransport.region).distinct()).all()
        
        all_names = set()
        for c in city_countries: 
            if c: all_names.add(c)
        for r in transport_regions: 
            if r: all_names.add(r)
            
        print(f"Found {len(all_names)} unique countries/regions.")
        
        # 2. Insert if not exists
        count = 0
        for name in all_names:
            # Check if exists by name (public or private? just global check by name to avoid dupes)
            # Actually, we should check if a PUBLIC country exists.
            existing = db.scalars(
                select(ResourceCountry)
                .where(ResourceCountry.name == name)
            ).first()
            
            if not existing:
                count += 1
                obj = ResourceCountry(
                    id=str(uuid.uuid4()),
                    name=name,
                    owner_id='system',
                    is_public=True
                )
                db.add(obj)
        
        db.commit()
        print(f"Created {count} new country records.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_countries()
