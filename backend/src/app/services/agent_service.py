
from typing import Dict, Any, Optional, TypedDict, List
import json
import logging
from sqlalchemy.orm import Session
from ..config import get_settings

# LangChain Imports
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from pydantic import TypeAdapter, ValidationError
from ..schemas import ItineraryItem

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    req: Any
    hotels: List[Dict[str, Any]]
    spots: List[Dict[str, Any]]
    itinerary: List[Dict[str, Any]]
    error: Optional[str]

class AIAgentService:
    def __init__(self, db: Session, user: Optional[Any] = None):
        self.db = db
        self.user = user
        self.settings = get_settings()
        self.llm = None
        self._configure_llm()
        
    def _configure_llm(self):
        provider = self.settings.llm_provider.lower()
        logger.info(f"Configuring LLM. Provider: {provider}")
        
        if provider == "gemini":
            if self.settings.gemini_api_key:
                logger.info("Initializing Gemini Chat Model")
                self.llm = ChatGoogleGenerativeAI(
                    model=self.settings.gemini_model_name,
                    google_api_key=self.settings.gemini_api_key,
                    convert_system_message_to_human=True, # Helper for Gemini quirks
                    temperature=0.7
                )
            else:
                 logger.error("Gemini API Key missing in settings")
                 
        elif provider == "openai":
            if self.settings.openai_api_key:
                logger.info(f"Initializing OpenAI Chat Model: {self.settings.openai_model_name}")
                self.llm = ChatOpenAI(
                    model=self.settings.openai_model_name or "gpt-3.5-turbo",
                    api_key=self.settings.openai_api_key,
                    base_url=self.settings.openai_base_url,
                    temperature=0.7
                )
            else:
                 logger.error("OpenAI API Key missing in settings")
        
        if not self.llm:
            logger.error(f"Failed to configure LLM. self.llm is None. Settings: provider={provider}, openai_key_set={bool(self.settings.openai_api_key)}")

    def search_hotels(self, city_name: str, price_max: Optional[int] = None) -> str:
        return self._search_hotels_tool(city_name, price_max)

    def search_spots(self, city_name: str) -> str:
        return self._search_spots_tool(city_name)
    
    # --- Defined Tools ---
    # We define tools dynamically to bind self.db implicitly or pass db explicitly
    # But @tool decorator works best on static functions or we use StructuredTool.from_function.
    # To access 'self', we'll define methods and wrap them.

    def _fetch_hotels(self, city_name: str, price_max: Optional[int] = None) -> List[Dict[str, Any]]:
        """Search for hotels in the database by city name."""
        from sqlalchemy import select, or_
        from ..models import ResourceHotel, ResourceCity
        
        user = self.user
        if not user:
            return []

        # Join Hotel -> City on city_id = id
        stmt = (
            select(ResourceHotel)
            .join(ResourceCity, ResourceHotel.city_id == ResourceCity.id)
            .where(
                ResourceCity.name.ilike(f"%{city_name}%"),
                or_(
                    ResourceHotel.is_public == True,
                    ResourceHotel.owner_id == user.username,
                ),
            )
            .order_by(ResourceHotel.price.asc().nulls_last())
        )
        results = self.db.execute(stmt).scalars().all()
        
        filtered = []
        for h in results:
            price = h.price or 0
            if price_max and price > price_max:
                continue
            filtered.append(
                {
                    "name": h.name,
                    "price": price,
                    "room_type": h.room_type or "N/A",
                }
            )
        
        return filtered[:5]

    def _fetch_spots(self, city_name: str) -> List[Dict[str, Any]]:
        """Search for scenic spots/attractions in the database by city name."""
        from sqlalchemy import select, or_
        from ..models import ResourceSpot, ResourceCity
        
        user = self.user
        if not user:
            return []

        stmt = (
            select(ResourceSpot)
            .join(ResourceCity, ResourceSpot.city_id == ResourceCity.id)
            .where(
                ResourceCity.name.ilike(f"%{city_name}%"),
                or_(
                    ResourceSpot.is_public == True,
                    ResourceSpot.owner_id == user.username,
                ),
            )
            .order_by(ResourceSpot.price.asc().nulls_last())
        )
        results = self.db.execute(stmt).scalars().all()
        
        # Model for Spot: id, city_id, name, price, owner_id, is_public.
        # No suggested_hours in the model shown (ResourceSpot). It was in previous logs/assumptions.
        return [{"name": s.name, "price": s.price or 0} for s in results][:8]

    def _search_hotels_tool(self, city_name: str, price_max: Optional[int] = None) -> str:
        hotels = self._fetch_hotels(city_name, price_max)
        return json.dumps(hotels, ensure_ascii=False) if hotels else f"No hotels found in {city_name}."

    def _search_spots_tool(self, city_name: str) -> str:
        spots = self._fetch_spots(city_name)
        return json.dumps(spots, ensure_ascii=False) if spots else f"No spots found in {city_name}."

    def generate_itinerary_with_react(self, req: Any) -> Dict[str, Any]:
        if not self.llm:
            return {"error": "LLM not configured (LangChain)"}
            
        city = req.currentDestinations[0] if req.currentDestinations else "Unknown"
        days = req.currentDays
        available_countries = ", ".join(req.availableCountries or [])

        def fetch_resources(state: AgentState) -> AgentState:
            hotels = self._fetch_hotels(city)
            spots = self._fetch_spots(city)
            return {**state, "hotels": hotels, "spots": spots}

        def generate_plan(state: AgentState) -> AgentState:
            hotels_json = json.dumps(state["hotels"], ensure_ascii=False)
            spots_json = json.dumps(state["spots"], ensure_ascii=False)
            system_prompt = f"""你是一位专业的行程规划师。
你的目标是规划一个前往 {city} 的 {days} 天行程。
你必须严格遵守以下 JSON 格式返回结果，**所有文本内容（如路线、描述、景点名称）必须使用简体中文**。
请不要使用 markdown 代码块包裹 JSON，尽量直接返回原始 JSON 字符串。
如果提供了可用国家列表，请优先在这些国家范围内规划：{available_countries or "未提供"}。

可用酒店资源（JSON 数组，供参考）：{hotels_json}
可用景点资源（JSON 数组，供参考）：{spots_json}

Required JSON Structure:
{{{{
  "itinerary": [
    {{{{
      "day": 1,
      "date": "YYYY-MM-DD",
      "route": "城市A",
      "s_city": "城市A",
      "e_city": "城市A",
      "transport": ["Car"],
      "hotelName": "酒店名称",
      "hotelCost": 100,
      "ticketName": ["景点A"],
      "ticketCost": 50,
      "activityName": [],
      "activityCost": 0,
      "description": "详细的中文行程描述..."
    }}}}
  ]
}}}}

Context: User Prompt: "{req.userPrompt}"
"""
            try:
                response = self.llm.invoke(
                    [
                        SystemMessage(content=system_prompt),
                        HumanMessage(content="Please generate the itinerary JSON.")
                    ]
                )
                output_str = getattr(response, "content", "")
            except Exception as exc:
                return {**state, "error": str(exc), "itinerary": []}

            clean_json = output_str.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].strip()

            try:
                data = json.loads(clean_json)
                itinerary = data.get("itinerary", []) if isinstance(data, dict) else data
                return {**state, "itinerary": itinerary, "error": None}
            except json.JSONDecodeError:
                logger.error(f"Failed to parse AI output JSON: {output_str}")
                return {**state, "error": "Failed to parse JSON from AI", "itinerary": []}

        def validate_plan(state: AgentState) -> AgentState:
            if state.get("error"):
                return state
            try:
                adapter = TypeAdapter(List[ItineraryItem])
                validated = adapter.validate_python(state.get("itinerary", []))
                return {**state, "itinerary": [item.model_dump() for item in validated]}
            except ValidationError:
                return {**state, "error": "Validation failed", "itinerary": []}

        graph = StateGraph(AgentState)
        graph.add_node("fetch_resources", fetch_resources)
        graph.add_node("generate_plan", generate_plan)
        graph.add_node("validate_plan", validate_plan)
        graph.set_entry_point("fetch_resources")
        graph.add_edge("fetch_resources", "generate_plan")
        graph.add_edge("generate_plan", "validate_plan")
        graph.add_edge("validate_plan", END)
        app = graph.compile()

        initial_state: AgentState = {
            "req": req,
            "hotels": [],
            "spots": [],
            "itinerary": [],
            "error": None,
        }
        result = app.invoke(initial_state)
        return {
            "itinerary": result.get("itinerary", []),
            "error": result.get("error"),
        }
