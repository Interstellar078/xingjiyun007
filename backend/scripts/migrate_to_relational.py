import asyncio
import uuid
import json
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from src.app.config import get_settings
from src.app.models import AppData, ResourceCity, ResourceSpot, ResourceHotel, ResourceActivity, ResourceTransport
from src.app.db import Base

settings = get_settings()
engine = create_engine(settings.database_url)

def migrate():
    print("Starting migration from JSON blobs to Relational Tables...")
    
    # Create Tables if not exist
    Base.metadata.create_all(engine)
    
    with Session(engine) as db:
        # Load all AppData
        all_data = db.scalars(select(AppData)).all()
        
        migrated_count = {
            "cities": 0, "spots": 0, "hotels": 0, "activities": 0, "transports": 0
        }

        # Helper to find city
        def ensure_city(country, cityName, owner_id):
            # Check existing in NEW table
            # Simple check unique by (country, name, owner) or just (country, name)?
            # Let's assume shared owner_id='system' for public.
            
            # Note: We need to dedupe.
            stmt = select(ResourceCity).where(ResourceCity.country == country, ResourceCity.name == cityName)
            existing = db.scalars(stmt).first()
            if existing: return existing.id
            
            # Create
            cid = str(uuid.uuid4())
            c = ResourceCity(id=cid, country=country, name=cityName, owner_id=owner_id, is_public=(owner_id=='system'))
            db.add(c)
            # db.flush() # Flush to make it visible to next query?
            # Or just keep a local cache? DB flush is safer.
            db.flush()
            migrated_count["cities"] += 1
            return cid

        for row in all_data:
            key = row.key
            val = row.value
            owner = row.owner_id
            is_pub = row.is_public
            
            if not isinstance(val, list): continue
            
            # Identifiers based on key
            if "poi_cities" in key:
                # Cities List
                for item in val:
                    # Item: {id, country, name, ...}
                    # We use the OLD ID if present? Or gen new?
                    # Better use OLD ID to maintain relationships if we migrate spots later?
                    # The JSON data has UUIDs. Let's try to reuse them if they are valid.
                    cid = item.get('id') or str(uuid.uuid4())
                    
                    # Check duplicate PK?
                    if not db.get(ResourceCity, cid):
                        c = ResourceCity(
                            id=cid,
                            country=item.get('country', 'Unknown'),
                            name=item.get('name', 'Unknown'),
                            owner_id=owner,
                            is_public=is_pub
                        )
                        db.add(c)
                        migrated_count["cities"] += 1
            
            elif "poi_spots" in key:
                 for item in val:
                     # Item: {id, cityId, name, price, ...}
                     sid = item.get('id') or str(uuid.uuid4())
                     if not db.get(ResourceSpot, sid):
                         db.add(ResourceSpot(
                             id=sid,
                             city_id=item.get('cityId', ''),
                             name=item.get('name', ''),
                             price=item.get('price', 0),
                             owner_id=owner,
                             is_public=is_pub
                         ))
                         migrated_count["spots"] += 1

            elif "poi_hotels" in key:
                 # Key mismatch: JSON key might be 'travel_builder_db_poi_hotels_v2'
                 # Val: {id, cityId, name, roomType, price}
                 for item in val:
                     hid = item.get('id') or str(uuid.uuid4())
                     if not db.get(ResourceHotel, hid):
                         db.add(ResourceHotel(
                             id=hid,
                             city_id=item.get('cityId', ''),
                             name=item.get('name', ''),
                             room_type=item.get('roomType', ''),
                             price=item.get('price', 0),
                             owner_id=owner,
                             is_public=is_pub
                         ))
                         migrated_count["hotels"] += 1

            elif "poi_activities" in key:
                 for item in val:
                     aid = item.get('id') or str(uuid.uuid4())
                     if not db.get(ResourceActivity, aid):
                         db.add(ResourceActivity(
                             id=aid,
                             city_id=item.get('cityId', ''),
                             name=item.get('name', ''),
                             price=item.get('price', 0),
                             owner_id=owner,
                             is_public=is_pub
                         ))
                         migrated_count["activities"] += 1
            
            elif "cars" in key:
                 for item in val:
                     tid = item.get('id') or str(uuid.uuid4())
                     if not db.get(ResourceTransport, tid):
                         db.add(ResourceTransport(
                             id=tid,
                             region=item.get('region', ''),
                             car_model=item.get('carModel', ''),
                             service_type=item.get('serviceType', ''),
                             passengers=item.get('passengers', 4),
                             price_low=item.get('priceLow', 0),
                             price_high=item.get('priceHigh', 0),
                             owner_id=owner,
                             is_public=is_pub
                         ))
                         migrated_count["transports"] += 1

        db.commit()
    
    print("Migration Complete!")
    print(json.dumps(migrated_count, indent=2))

if __name__ == "__main__":
    migrate()
