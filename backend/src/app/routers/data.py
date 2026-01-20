from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import AppData
from ..schemas import DataItem, DataRestoreRequest, DataUpsert

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/{key}", response_model=DataItem)
def get_data(key: str, db: Session = Depends(get_db)) -> DataItem:
    item = db.get(AppData, key)
    if not item:
        raise HTTPException(status_code=404, detail="Key not found")
    return DataItem(key=item.key, value=item.value, updated_at=item.updated_at)


@router.put("/{key}", response_model=DataItem)
def upsert_data(key: str, payload: DataUpsert, db: Session = Depends(get_db)) -> DataItem:
    stmt = insert(AppData).values(
        key=key,
        value=payload.value,
        updated_at=datetime.utcnow(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[AppData.key],
        set_={
            "value": payload.value,
            "updated_at": datetime.utcnow(),
        },
    )
    db.execute(stmt)
    db.commit()
    item = db.get(AppData, key)
    return DataItem(key=item.key, value=item.value, updated_at=item.updated_at)


@router.delete("/{key}")
def delete_data(key: str, db: Session = Depends(get_db)) -> dict:
    item = db.get(AppData, key)
    if not item:
        return {"success": True}
    db.delete(item)
    db.commit()
    return {"success": True}


@router.get("", response_model=list[DataItem])
def list_all(db: Session = Depends(get_db)) -> list[DataItem]:
    items = db.scalars(select(AppData)).all()
    return [DataItem(key=i.key, value=i.value, updated_at=i.updated_at) for i in items]


@router.post("/restore")
def restore(payload: DataRestoreRequest, db: Session = Depends(get_db)) -> dict:
    if not payload.items:
        return {"success": True}

    for item in payload.items:
        stmt = insert(AppData).values(
            key=item.key,
            value=item.value,
            updated_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[AppData.key],
            set_={
                "value": item.value,
                "updated_at": datetime.utcnow(),
            },
        )
        db.execute(stmt)
    db.commit()
    return {"success": True}
