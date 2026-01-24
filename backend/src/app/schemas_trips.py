from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel

class TripBase(BaseModel):
    name: str = "Untitled Trip"
    content: Dict # Full JSON content
    is_public: Optional[bool] = False

class TripCreate(TripBase):
    id: Optional[str] = None

class TripUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[Dict] = None
    is_public: Optional[bool] = None

class TripOut(TripBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True
