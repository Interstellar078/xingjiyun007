from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, hash_password, verify_password
from ..deps import get_db, get_current_user
from ..models import User
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        username=user.username,
        role=user.role,
        createdAt=int(user.created_at.timestamp() * 1000),
    )


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        return AuthResponse(success=False, message="用户名已存在")

    new_user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.username, new_user.role)
    return AuthResponse(success=True, message="注册成功", user=_to_user_out(new_user), token=token)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        return AuthResponse(success=False, message="用户名或密码错误")

    token = create_access_token(user.username, user.role)
    return AuthResponse(success=True, message="登录成功", user=_to_user_out(user), token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return _to_user_out(current_user)


@router.post("/logout")
def logout() -> dict:
    return {"success": True}
