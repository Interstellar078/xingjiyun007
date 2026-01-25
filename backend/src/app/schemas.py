from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


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


class ItineraryItem(BaseModel):
    day: int | None = None
    date: str | None = None
    route: str | None = None
    s_city: str | None = None
    e_city: str | None = None
    transport: list[str] = Field(default_factory=list)
    hotelName: str | None = None
    hotelCost: float | int | None = None
    ticketName: list[str] = Field(default_factory=list)
    ticketCost: float | int | None = None
    activityName: list[str] = Field(default_factory=list)
    activityCost: float | int | None = None
    description: str | None = None
    rooms: int | None = None
    transportCost: float | int | None = None
    otherCost: float | int | None = None


class ItineraryResponse(BaseModel):
    detectedDestinations: list[str]
    itinerary: list[ItineraryItem]
    reasoning: str | None = None
    error: str | None = None
