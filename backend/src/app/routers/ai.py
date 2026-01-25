from __future__ import annotations

import json
import logging
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import User
from ..schemas import (
    ItineraryRequest,
    ItineraryResponse,
    ItineraryItem,
    SuggestHotelsRequest,
    SuggestHotelsResponse,
)
from ..services.agent_service import AIAgentService

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)


@router.post("/suggest-hotels", response_model=SuggestHotelsResponse)
def suggest_hotels(
    payload: SuggestHotelsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SuggestHotelsResponse:
    if not payload.destination:
        return SuggestHotelsResponse(hotels=[])
    
    # Use Agent Service Tool directly
    service = AIAgentService(db, current_user)
    # The tool returns a JSON string, need to parse it back or just use the logic
    # Reusing the search_hotels tool logic might returns raw string "No hotels..." 
    # Let's just use the finding logic. 
    # Actually, for "suggest", we might want top hotels. The tool does exactly that.
    
    result_str = service.search_hotels(payload.destination)
    hotels = []
    try:
        data = json.loads(result_str)
        if isinstance(data, list):
            hotels = [h.get("name") for h in data if isinstance(h, dict) and h.get("name")]
    except Exception:
        pass
        
    return SuggestHotelsResponse(hotels=hotels)


@router.post("/itinerary", response_model=ItineraryResponse)
def generate_itinerary(
    payload: ItineraryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItineraryResponse:
    service = AIAgentService(db, current_user)
    
    # Run ReAct Agent
    result = service.generate_itinerary_with_react(payload)
    
    itinerary_data = []
    error_msg = None
    if isinstance(result, dict):
        itinerary_data = result.get("itinerary", [])
        error_msg = result.get("error")
    
    validated_items: list[ItineraryItem] = []
    if isinstance(itinerary_data, list):
        adapter = TypeAdapter(list[ItineraryItem])
        try:
            validated_items = adapter.validate_python(itinerary_data)
        except ValidationError:
            logger.warning("AI itinerary validation failed; returning empty list.")

    # Simple detection from input if not in result
    detected = payload.currentDestinations or []
    
    return ItineraryResponse(
        detectedDestinations=detected,
        itinerary=validated_items,
        reasoning="Generated via ReAct Agent with DB access.",
        error=error_msg
    )
