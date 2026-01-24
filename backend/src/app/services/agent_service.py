
from typing import List, Dict, Any, Optional
import json
import logging
from sqlalchemy.orm import Session
from ..config import get_settings

# LangChain Imports
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent
from langchain.agents.agent import AgentExecutor # Fix import
from langchain.agents.format_scratchpad.openai_tools import (
    format_to_openai_tool_messages,
)
from langchain.agents.output_parsers.openai_tools import (
    OpenAIToolsAgentOutputParser,
)

logger = logging.getLogger(__name__)

class AIAgentService:
    def __init__(self, db: Session):
        self.db = db
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
    
    # --- Defined Tools ---
    # We define tools dynamically to bind self.db implicitly or pass db explicitly
    # But @tool decorator works best on static functions or we use StructuredTool.from_function.
    # To access 'self', we'll define methods and wrap them.

    def _search_hotels_tool(self, city_name: str, price_max: Optional[int] = None) -> str:
        """Search for hotels in the database by city name."""
        from sqlalchemy import select
        from ..models import ResourceHotel, ResourceCity
        
        # Join Hotel -> City on city_id = id
        stmt = (
            select(ResourceHotel)
            .join(ResourceCity, ResourceHotel.city_id == ResourceCity.id)
            .where(ResourceCity.name.ilike(f"%{city_name}%"))
        )
        results = self.db.execute(stmt).scalars().all()
        
        filtered = []
        for h in results:
            price = h.price or 0
            if price_max and price > price_max:
                continue
            # Note: h.rating is not in the model definition you showed, but I'll leave it out or check safely?
            # Model says: id, city_id, name, room_type, price, owner_id, is_public. NO RATING.
            filtered.append(f"ID: {h.id}, Name: {h.name}, Price: {price}, Type: {h.room_type or 'N/A'}")
        
        return json.dumps(filtered[:5], ensure_ascii=False) if filtered else f"No hotels found in {city_name}."

    def _search_spots_tool(self, city_name: str) -> str:
        """Search for scenic spots/attractions in the database by city name."""
        from sqlalchemy import select
        from ..models import ResourceSpot, ResourceCity
        
        stmt = (
            select(ResourceSpot)
            .join(ResourceCity, ResourceSpot.city_id == ResourceCity.id)
            .where(ResourceCity.name.ilike(f"%{city_name}%"))
        )
        results = self.db.execute(stmt).scalars().all()
        
        # Model for Spot: id, city_id, name, price, owner_id, is_public.
        # No suggested_hours in the model shown (ResourceSpot). It was in previous logs/assumptions.
        filtered = [f"ID: {s.id}, Name: {s.name}, Price: {s.price or 0}" for s in results]
        return json.dumps(filtered[:8], ensure_ascii=False) if filtered else f"No spots found in {city_name}."

    def generate_itinerary_with_react(self, req: Any) -> Dict[str, Any]:
        if not self.llm:
            return {"error": "LLM not configured (LangChain)"}
            
        # 1. Prepare Tools
        from langchain.tools import StructuredTool
        
        tools = [
            StructuredTool.from_function(
                func=self._search_hotels_tool,
                name="search_hotels",
                description="Search keys: city_name (str), price_max (int, optional). Returns list of hotels."
            ),
            StructuredTool.from_function(
                func=self._search_spots_tool,
                name="search_spots",
                description="Search keys: city_name (str). Returns list of spots/attractions."
            )
        ]

        # 2. Prepare Prompt
        city = req.currentDestinations[0] if req.currentDestinations else "Unknown"
        days = req.currentDays
        
        system_prompt = f"""你是一位专业的行程规划师。
你的目标是规划一个前往 {city} 的 {days} 天行程。
你必须严格遵守以下 JSON 格式返回结果，**所有文本内容（如路线、描述、景点名称）必须使用简体中文**。
请不要使用 markdown 代码块包裹 JSON，尽量直接返回原始 JSON 字符串。

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

Query the database for real hotels and spots using the provided tools.
Context: User Prompt: "{req.userPrompt}"
"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # 3. Create Agent
        from langchain_core.runnables import RunnablePassthrough
        logger.info(f"Creating Agent. LLM: {type(self.llm)}, Tools: {len(tools)}, Prompt: {type(prompt)}")
        
        # Verify LLM
        if self.llm is None:
             logger.error("CRITICAL: self.llm is None before agent creation")
             return {"error": "LLM configuration failed"}

        # Bind tools
        try:
            llm_with_tools = self.llm.bind_tools(tools)
        except Exception as e:
            logger.error(f"Failed to bind tools: {e}")
            return {"error": f"Tool binding failed: {e}"}
            
        # Define Agent Chain (Deconstructed for Debugging)
        try:
            from langchain_core.runnables import RunnableLambda
            
            def prepare_agent_inputs(x):
                # Manual assignment of scratchpad to bypass RunnablePassthrough.assign issues
                x = x.copy()
                x["agent_scratchpad"] = format_to_openai_tool_messages(x["intermediate_steps"])
                return x

            step1 = RunnableLambda(prepare_agent_inputs)
            step2 = prompt
            step3 = llm_with_tools
            step4 = OpenAIToolsAgentOutputParser()
            
            logger.info(f"DEBUG Chain Components: Step1={type(step1)}, Step2={type(step2)}, Step3={type(step3)}, Step4={type(step4)}")
            
            agent = step1 | step2 | step3 | step4
        except Exception as e:
            logger.error(f"Chain construction failed: {e}")
            return {"error": f"Agent construction failed: {e}"}
        
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=tools, 
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=8
        )
        
        # 4. Execute
        try:
            logger.info("Starting LangChain Agent Execution...")
            result = agent_executor.invoke({"input": "Please generate the itinerary JSON."})
            output_str = result.get("output", "")
            
            # 5. Extract JSON safely
            # Sometimes LangChain returns text with ```json block
            try:
                # Naive cleanup
                clean_json = output_str.strip()
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].strip()
                
                data = json.loads(clean_json)
                return data
            except json.JSONDecodeError:
                logger.error(f"Failed to parse LangChain output JSON: {output_str}")
                return {"error": "Failed to parse JSON from AI", "raw": output_str}

        except Exception as e:
            logger.error(f"LangChain Execution Error: {e}")
            return {"error": str(e)}

