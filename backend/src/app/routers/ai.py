from __future__ import annotations

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db
from ..schemas import (
    ItineraryRequest,
    ItineraryResponse,
    SuggestHotelsRequest,
    SuggestHotelsResponse,
)
from ..services.agent_service import AIAgentService

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/suggest-hotels", response_model=SuggestHotelsResponse)
def suggest_hotels(
    payload: SuggestHotelsRequest,
    db: Session = Depends(get_db)
) -> SuggestHotelsResponse:
    if not payload.destination:
        return SuggestHotelsResponse(hotels=[])
    
    # Use Agent Service Tool directly
    service = AIAgentService(db)
    # The tool returns a JSON string, need to parse it back or just use the logic
    # Reusing the search_hotels tool logic might returns raw string "No hotels..." 
    # Let's just use the finding logic. 
    # Actually, for "suggest", we might want top hotels. The tool does exactly that.
    
    result_str = service.search_hotels(payload.destination)
    hotels = []
    try:
        data = json.loads(result_str)
        if isinstance(data, list):
            hotels = [h["name"] for h in data]
    except:
        pass
        
    return SuggestHotelsResponse(hotels=hotels)


@router.post("/itinerary", response_model=ItineraryResponse)
def generate_itinerary(
    payload: ItineraryRequest,
    db: Session = Depends(get_db)
) -> ItineraryResponse:
    service = AIAgentService(db)
    
    # Run ReAct Agent
    print(f"Generating Intinerary for Payload: {payload}")
    result = service.generate_itinerary_with_react(payload)
    print(f"Agent Result: {result}")
    
    itinerary_data = result.get("itinerary", [])
    error_msg = result.get("error")
    
    if not isinstance(itinerary_data, list):
        itinerary_data = []

    # Simple detection from input if not in result
    detected = payload.currentDestinations or []
    
    return ItineraryResponse(
        detectedDestinations=detected,
        itinerary=itinerary_data,
        reasoning="Generated via ReAct Agent with DB access.",
        error=error_msg
    )
