from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, DateTime, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class AppData(Base):
    __tablename__ = "app_data"

    owner_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)


# --- Relational Resource Tables ---

class ResourceCountry(Base):
    __tablename__ = "resource_countries"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ResourceCity(Base):
    __tablename__ = "resource_cities"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True) # UUID
    country: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ResourceSpot(Base):
    __tablename__ = "resource_spots"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    city_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # Logical FK (no constraint to allow soft delete/complex ownership)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Integer, default=0) # Storing as Integer/Float. Use Float or Numeric? Dict used number.
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)


class ResourceHotel(Base):
    __tablename__ = "resource_hotels"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    city_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False) # Hotel Name
    room_type: Mapped[str] = mapped_column(String(100), nullable=True)
    price: Mapped[float] = mapped_column(Integer, default=0)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)


class ResourceActivity(Base):
    __tablename__ = "resource_activities"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    city_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Integer, default=0)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)


class ResourceTransport(Base):
    __tablename__ = "resource_transports"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    region: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # Country
    car_model: Mapped[str] = mapped_column(String(100), nullable=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=True)
    passengers: Mapped[int] = mapped_column(Integer, default=4)
    price_low: Mapped[float] = mapped_column(Integer, default=0)
    price_high: Mapped[float] = mapped_column(Integer, default=0)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

