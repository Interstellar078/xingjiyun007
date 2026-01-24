from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .logging_config import configure_logging
from .routers import ai, auth, data, resources, trips, admin, admin_data

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
app.include_router(resources.router)
app.include_router(trips.router)
app.include_router(admin.router)
app.include_router(admin_data.router)
app.include_router(ai.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
