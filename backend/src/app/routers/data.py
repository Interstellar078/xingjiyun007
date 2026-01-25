from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, and_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import AppData, User
from ..schemas import DataItem, DataRestoreRequest, DataUpsert

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/{key}", response_model=DataItem)
def get_data(
    key: str, 
    scope: Optional[str] = Query(None, pattern="^(private|public)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> DataItem:
    item = None

    if scope == "private":
        # Force fetch private
        item = db.get(AppData, (current_user.username, key))
    
    elif scope == "public":
        # Force fetch public
        # Priority 1: System owner (Shared Data)
        item = db.get(AppData, ("system", key))
        if not item or not item.is_public:
            # Priority 2: Any public data (legacy or user-promoted)
            item = db.scalar(
                select(AppData).where(
                    AppData.key == key,
                    AppData.is_public == True
                ).limit(1)
            )
    
    else:
        # Default Overlay Logic (Priority: Private > System Public > Any Public)
        item = db.get(AppData, (current_user.username, key))
        if not item:
            # Try System Public
            item = db.get(AppData, ("system", key))
            if not item or not item.is_public: # Ensure it is actually public
                 # Fallback to any public
                item = db.scalar(
                    select(AppData).where(
                        AppData.key == key,
                        AppData.is_public == True
                    ).limit(1)
                )
    
    if not item:
        # Return empty/default structure instead of 404 to simplify frontend merging
        # determining default based on key existence elsewhere is hard, so we throw 404 
        # but frontend needs to handle it gracefully
        raise HTTPException(status_code=404, detail="Key not found")
        
    return DataItem(
        key=item.key, 
        value=item.value, 
        is_public=item.is_public,
        updated_at=item.updated_at
    )


@router.put("/{key}", response_model=DataItem)
def upsert_data(
    key: str, 
    payload: DataUpsert, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> DataItem:
    # Logic for Shared Public Data:
    # If a user is an ADMIN and is saving PUBLIC data, we store it under a special 'system' owner_id.
    # This allows multiple admin accounts to edit the same shared resource library.
    target_owner_id = current_user.username
    if current_user.role == 'admin':
        if payload.is_public:
            target_owner_id = 'system'
    else:
        # Non-admins CANNOT create public data directly.
        # Enforce private scope even if payload requested public.
        if payload.is_public:
             # We could raise 403, but silently enforcing False is robust for "Share" attempts that aren't promotions
             # payload is a Pydantic model, we can't mutate it directly if frozen? 
             # DataUpsert is likely basic.
             # Actually, just use variables in insert.
             pass 

    # Final values to use
    final_is_public = payload.is_public if current_user.role == 'admin' else False

    stmt = insert(AppData).values(
        owner_id=target_owner_id,
        key=key,
        value=payload.value,
        is_public=final_is_public,
        updated_at=datetime.utcnow(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[AppData.owner_id, AppData.key],
        set_={
            "value": payload.value,
            "is_public": final_is_public,
            "updated_at": datetime.utcnow(),
        },
    )
    db.execute(stmt)
    db.commit()
    
    # Reload from DB to confirm
    item = db.get(AppData, (target_owner_id, key))
    return DataItem(
        key=item.key, 
        value=item.value, 
        is_public=item.is_public,
        updated_at=item.updated_at
    )


@router.delete("/{key}")
def delete_data(
    key: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    # Only allow deleting OWN data or SYSTEM data if Admin
    item = db.get(AppData, (current_user.username, key))
    if not item:
        # If not found in private, check if it's SYSTEM data and we are ADMIN
        if current_user.role == 'admin':
            item = db.get(AppData, ("system", key))
    
    if not item:
        # If still not found, we can't delete it
        return {"success": True}

    if item.owner_id != current_user.username:
         # Double check permission if we found a system item
         if item.owner_id == 'system' and current_user.role != 'admin':
             raise HTTPException(status_code=403, detail="Not authorized to delete this data")
        
    db.delete(item)
    db.commit()
    return {"success": True}


@router.get("", response_model=list[DataItem])
def list_all(
    scope: Optional[str] = Query("all", pattern="^(all|private|public)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[DataItem]:
    query = select(AppData)
    
    if scope == "private":
        query = query.where(AppData.owner_id == current_user.username)
    elif scope == "public":
        query = query.where(AppData.is_public == True)
    else: # all
        # Show my private data AND public data
        # Note: If a key exists in both, this simple list returns both.
        # Front-end might want to dedupe or show both.
        query = query.where(
            or_(
                AppData.owner_id == current_user.username,
                AppData.is_public == True
            )
        )
        
    items = db.scalars(query).all()
    return [
        DataItem(
            key=i.key, 
            value=i.value, 
            is_public=i.is_public, 
            updated_at=i.updated_at
        ) 
        for i in items
    ]


@router.post("/restore")
def restore(
    payload: DataRestoreRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    if not payload.items:
        return {"success": True}

    # Restore only affects the CURRENT USER's private storage
    for item in payload.items:
        stmt = insert(AppData).values(
            owner_id=current_user.username,
            key=item.key,
            value=item.value,
            # Default to False for restored items unless specified? 
            # The DataItem schema has is_public, let's use it if present
            is_public=item.is_public,
            updated_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[AppData.owner_id, AppData.key],
            set_={
                "value": item.value,
                "is_public": item.is_public,
                "updated_at": datetime.utcnow(),
            },
        )
        db.execute(stmt)
    db.commit()
    return {"success": True}
