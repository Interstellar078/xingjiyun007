from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import AppData, User
from ..schemas import DataItem

router = APIRouter(prefix="/api/admin/data", tags=["admin-data"])

def check_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

@router.get("/all", response_model=List[dict])
def list_all_user_data(
    key: str,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin)
):
    """
    Admin Only: List ALL data rows for a specific key across ALL users.
    Useful for seeing everyone's private trips to promote them.
    """
    items = db.scalars(
        select(AppData).where(AppData.key == key)
    ).all()
    
    return [
        {
            "owner_id": i.owner_id,
            "key": i.key,
            "value": i.value,
            "is_public": i.is_public,
            "updated_at": i.updated_at
        }
        for i in items
    ]
