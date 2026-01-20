from __future__ import annotations

import json
from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..schemas import (
    ItineraryRequest,
    ItineraryResponse,
    SuggestHotelsRequest,
    SuggestHotelsResponse,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_model():
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY not configured")
    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="AI dependencies not installed") from exc

    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


@router.post("/suggest-hotels", response_model=SuggestHotelsResponse)
def suggest_hotels(payload: SuggestHotelsRequest) -> SuggestHotelsResponse:
    if not payload.destination:
        return SuggestHotelsResponse(hotels=[])

    model = _get_model()
    prompt = f"""
请列出位于 \"{payload.destination}\" 的5家知名酒店名称。
只返回JSON数组。
"""
    response = model.generate_content(prompt)
    text = response.text or "[]"
    try:
        hotels = json.loads(text)
    except json.JSONDecodeError:
        hotels = []
    if not isinstance(hotels, list):
        hotels = []
    return SuggestHotelsResponse(hotels=[str(h) for h in hotels])


@router.post("/itinerary", response_model=ItineraryResponse)
def generate_itinerary(payload: ItineraryRequest) -> ItineraryResponse:
    model = _get_model()

    prompt = f"""
作为一名专业的旅行行程规划师，请根据用户的【指令】规划一份完整的行程。

【系统现有国家列表 (参考库)】
{', '.join(payload.availableCountries)}

【当前界面状态 (仅供参考)】
- 原定目的地: {', '.join(payload.currentDestinations) or '未设定'}
- 原定天数: {payload.currentDays} 天

【用户具体指令】
"{payload.userPrompt or ''}"

【任务要求】
1. **分析用户指令**：
   - 如果用户指令中包含了新的目的地，请**优先使用用户指令中的目的地**。
   - **关于国家名称的严格要求**：
      - 检测到的目的地必须是**国家名称**。
      - **如果该国家已存在于【系统现有国家列表】中，必须直接使用列表中的准确名称**（例如：列表中有 "中国 (China)"，你必须返回 "中国 (China)"，而不能只返回 "China" 或 "中国"）。
      - 如果不在列表中，请尽量使用 "中文名 (English Name)" 的标准格式。

2. **生成行程**：
   - 必须包含：第几天(day)、出发地(origin)、到达地(destination)、门票(ticketName)、活动(activityName)、行程详情(description)。
   - **关键：必须明确每个城市所属的国家**。
      - originCountry: 出发地所在的国家（同样遵循上述命名规则，优先匹配系统列表）。
      - destinationCountry: 到达地所在的国家（同样遵循上述命名规则，优先匹配系统列表）。
   - **严格区分门票和活动**：
      - "ticketName" (门票名称)：具体的景点/景区名称（如：迪士尼乐园、故宫）。
      - "activityName" (活动名称)：体验类项目或动作（如：和服体验、出海浮潜、CityWalk）。
   - **行程详情 (description) - 关键**：
      - **请将所有无法放入“门票”或“活动”字段的详细信息写入此字段**。
      - 包含：详细的每日流程安排、推荐的特定餐厅/美食（如用户要求的日料、米其林等）、交通换乘提示、以及用户指令中提到的任何特殊要求或偏好备注。
      - **目标**：保证用户在指令中提出的所有定制化要求都能在行程中体现出来，不要丢失信息。
   - 语言：简体中文。

请返回一个 JSON 对象，包含检测到的**国家列表**和行程数组。
"""

    response = model.generate_content(prompt)
    text = response.text or "{}"
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {}

    detected = parsed.get("detectedDestinations") or []
    itinerary = parsed.get("itinerary") or []
    reasoning = parsed.get("reasoning")

    if not isinstance(detected, list):
        detected = []
    if not isinstance(itinerary, list):
        itinerary = []

    return ItineraryResponse(
        detectedDestinations=[str(x) for x in detected],
        itinerary=itinerary,
        reasoning=reasoning if isinstance(reasoning, str) else None,
    )
