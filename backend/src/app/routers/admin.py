from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db, require_admin
from ..models import AuditLog, User
from ..schemas import AuditLogOut, UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        username=user.username,
        role=user.role,
        createdAt=int(user.created_at.timestamp() * 1000),
    )


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[UserOut]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [_user_out(u) for u in users]


@router.delete("/users/{username}")
def delete_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    if username == current_user.username:
        return {"success": False, "message": "不能删除当前管理员"}
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return {"success": True}
    if user.role == "admin":
        return {"success": False, "message": "不能删除管理员"}
    db.delete(user)
    db.commit()
    return {"success": True}


@router.get("/logs", response_model=list[AuditLogOut])
def list_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AuditLogOut]:
    logs = db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200)).all()
    return [
        AuditLogOut(
            id=log.id,
            timestamp=int(log.timestamp.timestamp() * 1000),
            username=log.username,
            action=log.action,
            details=log.details,
        )
        for log in logs
    ]
