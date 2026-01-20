from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .auth import hash_password
from .config import get_settings
from .db import SessionLocal
from .logging_config import configure_logging
from .models import User
from .routers import ai, auth, data, admin

settings = get_settings()
configure_logging(settings.log_level, settings.log_json)

app = FastAPI(title="Custom Travel Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(admin.router)
app.include_router(ai.router)


@app.on_event("startup")
def on_startup() -> None:
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == settings.admin_username).first()
        if not existing:
            admin_user = User(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
                role="admin",
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
