from typing import List, Dict, Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..deps import get_db, get_current_user
from ..models import User, Trip

router = APIRouter(prefix="/api/trips", tags=["trips"])

@router.get("", response_model=List[Dict[str, Any]])
def list_trips(
    scope: str = "private",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Trip)
    if scope == "public":
        query = query.where(Trip.is_public == True)
    else:
        query = query.where(Trip.owner_id == current_user.username)
    
    query = query.order_by(Trip.updated_at.desc())
    trips = db.scalars(query).all()
    
    # Return the content payload directly (Frontend expects SavedTrip objects)
    return [t.content for t in trips]

@router.put("/batch", response_model=List[Dict[str, Any]])
def sync_trips(
    trips: List[Dict[str, Any]],
    scope: str = "private",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Batch overwrite for compatibility with "Save All" frontend
    if scope == "public":
        if current_user.role != 'admin': raise HTTPException(403)
        db.query(Trip).filter(Trip.is_public == True).delete()
        
        new_objs = []
        for t in trips:
            t_id = t.get('id') or str(uuid.uuid4())
            t['id'] = t_id # Ensure ID is set in content
            
            obj = Trip(
                 id=t_id,
                 name=t.get('name', 'Untitled'),
                 owner_id='system',
                 is_public=True,
                 content=t
            )
            db.add(obj)
            new_objs.append(obj)
            
    else:
        # Private
        db.query(Trip).filter(Trip.owner_id == current_user.username).delete()
        new_objs = []
        for t in trips:
             t_id = t.get('id') or str(uuid.uuid4())
             t['id'] = t_id
             
             obj = Trip(
                 id=t_id,
                 name=t.get('name', 'Untitled'),
                 owner_id=current_user.username,
                 is_public=False,
                 content=t
            )
             db.add(obj)
             new_objs.append(obj)
             
    db.commit()
    # Return the input list (which now includes IDs if generated)
    # Or return objects.content
    return trips

