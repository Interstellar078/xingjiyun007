from datetime import datetime
from typing import List, Optional, Type
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, func, desc
from sqlalchemy.orm import Session
import uuid

from ..deps import get_db, get_current_user
from ..models import (
    User, ResourceCountry, ResourceCity, ResourceSpot, ResourceHotel, 
    ResourceActivity, ResourceTransport
)
from ..schemas_resources import (
    CountryOut, CountryCreate, CountryUpdate,
    CityOut, CityCreate, CityUpdate,
    SpotOut, SpotCreate, SpotUpdate,
    HotelOut, HotelCreate, HotelUpdate,
    ActivityOut, ActivityCreate, ActivityUpdate,
    TransportOut, TransportCreate, TransportUpdate
)

router = APIRouter(prefix="/api/resources", tags=["resources"])

# --- Helper for Pagination ---
def paginate_query(query, page: int, size: int):
    return query.offset((page - 1) * size).limit(size)

def apply_scope_filter(query, model, user: User, scope: str = "all"):
    if scope == "private":
        return query.where(model.owner_id == user.username)
    elif scope == "public":
        return query.where(model.is_public == True)
    else: # all
        return query.where(or_(model.owner_id == user.username, model.is_public == True))

# --- Countries ---


@router.get("/countries", response_model=List[CountryOut])
def list_countries(
    search: Optional[str] = None,
    scope: str = "all",
    page: int = 1,
    size: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ResourceCountry)
    query = apply_scope_filter(query, ResourceCountry, current_user, scope)
    if search: query = query.where(ResourceCountry.name.ilike(f"%{search}%"))
    query = query.order_by(ResourceCountry.name)
    return db.scalars(paginate_query(query, page, size)).all()

@router.post("/countries", response_model=CountryOut)
def create_country(payload: CountryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    final_is_public = payload.is_public and current_user.role == 'admin'
    owner = 'system' if final_is_public else current_user.username
    obj = ResourceCountry(
        id=payload.id or str(uuid.uuid4()),
        name=payload.name,
        owner_id=owner,
        is_public=final_is_public
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/countries/{id}", response_model=CountryOut)
def update_country(id: str, payload: CountryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceCountry, id)
    if not obj: raise HTTPException(404, "Not found")
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    
    if payload.name is not None: obj.name = payload.name
    if payload.is_public is not None:
        if current_user.role != 'admin': raise HTTPException(403)
        obj.is_public = payload.is_public
        obj.owner_id = 'system' if payload.is_public else current_user.username
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/countries/{id}")
def delete_country(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceCountry, id)
    if not obj: return {"success": True}
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    
    db.delete(obj)
    db.commit()
    return {"success": True}


# --- Cities ---
@router.get("/cities", response_model=List[CityOut])
def list_cities(
    country: Optional[str] = None,
    search: Optional[str] = None,
    scope: str = "all",
    page: int = 1,
    size: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ResourceCity)
    query = apply_scope_filter(query, ResourceCity, current_user, scope)
    
    if country:
        query = query.where(ResourceCity.country == country)
    if search:
        query = query.where(ResourceCity.name.ilike(f"%{search}%"))
        
    query = query.order_by(ResourceCity.country, ResourceCity.name)
    query = paginate_query(query, page, size)
    return db.scalars(query).all()

@router.post("/cities", response_model=CityOut)
def create_city(
    payload: CityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Public check
    final_is_public = payload.is_public and current_user.role == 'admin'
    owner = 'system' if final_is_public else current_user.username
    
    obj = ResourceCity(
        id=payload.id or str(uuid.uuid4()),
        country=payload.country,
        name=payload.name,
        owner_id=owner,
        is_public=final_is_public
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/cities/{id}", response_model=CityOut)
def update_city(id: str, payload: CityUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceCity, id)
    if not obj: raise HTTPException(404, "Not found")
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    if payload.name is not None: obj.name = payload.name
    if payload.is_public is not None:
        if current_user.role != 'admin': raise HTTPException(403)
        obj.is_public = payload.is_public
        obj.owner_id = 'system' if payload.is_public else current_user.username
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/cities/{id}")
def delete_city(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceCity, id)
    if not obj: return {"success": True}
    
    # Permission Check
    if obj.owner_id != current_user.username:
        if not (obj.is_public and current_user.role == 'admin'):
            raise HTTPException(403, "Not authorized")
            
    db.delete(obj)
    db.commit()
    return {"success": True}


# --- Spots ---
@router.get("/spots", response_model=List[SpotOut])
def list_spots(
    city_id: Optional[str] = None,
    city_name: Optional[List[str]] = Query(None), # Support filtering by city name(s)
    search: Optional[str] = None,
    scope: str = "all",
    page: int = 1,
    size: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ResourceSpot)
    query = apply_scope_filter(query, ResourceSpot, current_user, scope)
    
    if city_id:
        query = query.where(ResourceSpot.city_id == city_id)
    if city_name:
        query = query.join(ResourceCity).where(ResourceCity.name.in_(city_name))
        
    if search:
        query = query.where(ResourceSpot.name.ilike(f"%{search}%"))
        
    query = paginate_query(query, page, size)
    return db.scalars(query).all()

@router.post("/spots", response_model=SpotOut)
def create_spot(payload: SpotCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    final_is_public = payload.is_public and current_user.role == 'admin'
    owner = 'system' if final_is_public else current_user.username
    
    obj = ResourceSpot(
        id=payload.id or str(uuid.uuid4()),
        city_id=payload.city_id,
        name=payload.name,
        price=payload.price,
        owner_id=owner,
        is_public=final_is_public
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/spots/{id}", response_model=SpotOut)
def update_spot(id: str, payload: SpotUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceSpot, id)
    if not obj: raise HTTPException(404, "Not found")
    
    if obj.owner_id != current_user.username:
        if not (obj.is_public and current_user.role == 'admin'):
            raise HTTPException(403, "Not authorized")
            
    if payload.name is not None: obj.name = payload.name
    if payload.price is not None: obj.price = payload.price
    if payload.is_public is not None:
        if current_user.role != 'admin': raise HTTPException(403)
        obj.is_public = payload.is_public
        obj.owner_id = 'system' if payload.is_public else current_user.username
    
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/spots/{id}")
def delete_spot(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceSpot, id)
    if not obj: return {"success": True}
    if obj.owner_id != current_user.username:
        if not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403, "Not authorized")
    db.delete(obj)
    db.commit()
    return {"success": True}


# --- Hotels ---
@router.get("/hotels", response_model=List[HotelOut])
def list_hotels(
    city_id: Optional[str] = None,
    city_name: Optional[List[str]] = Query(None),
    search: Optional[str] = None,
    scope: str = "all",
    page: int = 1,
    size: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ResourceHotel)
    query = apply_scope_filter(query, ResourceHotel, current_user, scope)
    if city_id: query = query.where(ResourceHotel.city_id == city_id)
    if city_name: query = query.join(ResourceCity).where(ResourceCity.name.in_(city_name))
    if search: query = query.where(ResourceHotel.name.ilike(f"%{search}%"))
    return db.scalars(paginate_query(query, page, size)).all()

@router.post("/hotels", response_model=HotelOut)
def create_hotel(payload: HotelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    final_is_public = payload.is_public and current_user.role == 'admin'
    owner = 'system' if final_is_public else current_user.username
    obj = ResourceHotel(
        id=payload.id or str(uuid.uuid4()),
        city_id=payload.city_id,
        name=payload.name,
        room_type=payload.room_type,
        price=payload.price,
        owner_id=owner,
        is_public=final_is_public
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/hotels/{id}", response_model=HotelOut)
def update_hotel(id: str, payload: HotelUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceHotel, id)
    if not obj: raise HTTPException(404, "Not found")
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    
    if payload.name is not None: obj.name = payload.name
    if payload.room_type is not None: obj.room_type = payload.room_type
    if payload.price is not None: obj.price = payload.price
    if payload.is_public is not None:
        if current_user.role != 'admin': raise HTTPException(403)
        obj.is_public = payload.is_public
        obj.owner_id = 'system' if payload.is_public else current_user.username
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/hotels/{id}")
def delete_hotel(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceHotel, id)
    if not obj: return {"success": True}
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    db.delete(obj)
    db.commit()
    return {"success": True}


# --- Activities ---
@router.get("/activities", response_model=List[ActivityOut])
def list_activities(
    city_id: Optional[str] = None,
    city_name: Optional[List[str]] = Query(None),
    search: Optional[str] = None,
    scope: str = "all",
    page: int = 1,
    size: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ResourceActivity)
    query = apply_scope_filter(query, ResourceActivity, current_user, scope)
    if city_id: query = query.where(ResourceActivity.city_id == city_id)
    if city_name: query = query.join(ResourceCity).where(ResourceCity.name.in_(city_name))
    if search: query = query.where(ResourceActivity.name.ilike(f"%{search}%"))
    return db.scalars(paginate_query(query, page, size)).all()


@router.post("/activities", response_model=ActivityOut)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    final_is_public = payload.is_public and current_user.role == 'admin'
    owner = 'system' if final_is_public else current_user.username
    obj = ResourceActivity(
        id=payload.id or str(uuid.uuid4()),
        city_id=payload.city_id,
        name=payload.name,
        price=payload.price,
        owner_id=owner,
        is_public=final_is_public
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/activities/{id}", response_model=ActivityOut)
def update_activity(id: str, payload: ActivityUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceActivity, id)
    if not obj: raise HTTPException(404, "Not found")
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    if payload.name is not None: obj.name = payload.name
    if payload.price is not None: obj.price = payload.price
    if payload.is_public is not None:
        if current_user.role != 'admin': raise HTTPException(403)
        obj.is_public = payload.is_public
        obj.owner_id = 'system' if payload.is_public else current_user.username
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/activities/{id}")
def delete_activity(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceActivity, id)
    if not obj: return {"success": True}
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    db.delete(obj)
    db.commit()
    return {"success": True}


# --- Transports ---
@router.get("/transports", response_model=List[TransportOut])
def list_transports(
    region: Optional[str] = None, # Country
    search: Optional[str] = None,
    scope: str = "all",
    page: int = 1,
    size: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ResourceTransport)
    query = apply_scope_filter(query, ResourceTransport, current_user, scope)
    if region: query = query.where(ResourceTransport.region == region)
    if search: query = query.where(ResourceTransport.car_model.ilike(f"%{search}%"))
    return db.scalars(paginate_query(query, page, size)).all()

@router.post("/transports", response_model=TransportOut)
def create_transport(payload: TransportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    final_is_public = payload.is_public and current_user.role == 'admin'
    owner = 'system' if final_is_public else current_user.username
    obj = ResourceTransport(
        id=payload.id or str(uuid.uuid4()),
        region=payload.region,
        car_model=payload.car_model,
        service_type=payload.service_type,
        passengers=payload.passengers,
        price_low=payload.price_low,
        price_high=payload.price_high,
        owner_id=owner,
        is_public=final_is_public
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/transports/{id}", response_model=TransportOut)
def update_transport(id: str, payload: TransportUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceTransport, id)
    if not obj: raise HTTPException(404, "Not found")
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    
    if payload.car_model is not None: obj.car_model = payload.car_model
    if payload.service_type is not None: obj.service_type = payload.service_type
    if payload.passengers is not None: obj.passengers = payload.passengers
    if payload.price_low is not None: obj.price_low = payload.price_low
    if payload.price_high is not None: obj.price_high = payload.price_high
    if payload.is_public is not None:
        if current_user.role != 'admin': raise HTTPException(403)
        obj.is_public = payload.is_public
        obj.owner_id = 'system' if payload.is_public else current_user.username
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/transports/{id}")
def delete_transport(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.get(ResourceTransport, id)
    if not obj: return {"success": True}
    if obj.owner_id != current_user.username and not (obj.is_public and current_user.role == 'admin'): raise HTTPException(403)
    db.delete(obj)
    db.commit()
    return {"success": True}
