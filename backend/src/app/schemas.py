from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class UserOut(BaseModel):
    username: str
    role: str
    createdAt: int


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: UserOut | None = None
    token: str | None = None


class DataItem(BaseModel):
    key: str
    value: Any
    is_public: bool = False
    updated_at: datetime | None = None


class DataUpsert(BaseModel):
    value: Any
    is_public: bool = False


class DataRestoreRequest(BaseModel):
    items: list[DataItem]


class AuditLogOut(BaseModel):
    id: int
    timestamp: int
    username: str
    action: str
    details: str


class SuggestHotelsRequest(BaseModel):
    destination: str


class SuggestHotelsResponse(BaseModel):
    hotels: list[str]


class ItineraryRequest(BaseModel):
    currentDestinations: list[str]
    currentDays: int
    currentRows: list[dict]
    historyTrips: list[dict]
    availableCountries: list[str]
    userPrompt: str | None = None


class ItineraryResponse(BaseModel):
    detectedDestinations: list[str]
    itinerary: list[dict]
    reasoning: str | None = None
