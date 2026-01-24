from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class PaginatedResponse(CamelModel):
    total: int
    page: int
    size: int
    items: List[dict]

# --- Country ---
class CountryBase(CamelModel):
    name: str
    is_public: Optional[bool] = False

class CountryCreate(CountryBase):
    id: Optional[str] = None

class CountryUpdate(CamelModel):
    name: Optional[str] = None
    is_public: Optional[bool] = None

class CountryOut(CountryBase):
    id: str
    owner_id: str
    created_at: Optional[datetime] = None

# --- City ---
class CityBase(CamelModel):
    country: str
    name: str
    is_public: Optional[bool] = False

class CityCreate(CityBase):
    id: Optional[str] = None

class CityUpdate(CamelModel):
    name: Optional[str] = None
    is_public: Optional[bool] = None

class CityOut(CityBase):
    id: str
    owner_id: str

# --- Spot ---
class SpotBase(CamelModel):
    city_id: str
    name: str
    price: Optional[float] = 0
    is_public: Optional[bool] = False

class SpotCreate(SpotBase):
    id: Optional[str] = None

class SpotUpdate(CamelModel):
    name: Optional[str] = None
    price: Optional[float] = None
    is_public: Optional[bool] = None

class SpotOut(SpotBase):
    id: str
    owner_id: str

# --- Hotel ---
class HotelBase(CamelModel):
    city_id: str
    name: str
    room_type: Optional[str] = None
    price: Optional[float] = 0
    is_public: Optional[bool] = False

class HotelCreate(HotelBase):
    id: Optional[str] = None

class HotelUpdate(CamelModel):
    name: Optional[str] = None
    room_type: Optional[str] = None
    price: Optional[float] = None
    is_public: Optional[bool] = None

class HotelOut(HotelBase):
    id: str
    owner_id: str

# --- Activity ---
class ActivityBase(CamelModel):
    city_id: str
    name: str
    price: Optional[float] = 0
    is_public: Optional[bool] = False

class ActivityCreate(ActivityBase):
    id: Optional[str] = None

class ActivityUpdate(CamelModel):
    name: Optional[str] = None
    price: Optional[float] = None
    is_public: Optional[bool] = None

class ActivityOut(ActivityBase):
    id: str
    owner_id: str

# --- Transport ---
class TransportBase(CamelModel):
    region: str
    car_model: Optional[str] = None
    service_type: Optional[str] = None
    passengers: Optional[int] = 4
    price_low: Optional[float] = 0
    price_high: Optional[float] = 0
    is_public: Optional[bool] = False

class TransportCreate(TransportBase):
    id: Optional[str] = None

class TransportUpdate(CamelModel):
    car_model: Optional[str] = None
    service_type: Optional[str] = None
    passengers: Optional[int] = None
    price_low: Optional[float] = None
    price_high: Optional[float] = None
    is_public: Optional[bool] = None

class TransportOut(TransportBase):
    id: str
    owner_id: str

