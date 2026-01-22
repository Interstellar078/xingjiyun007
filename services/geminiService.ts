import { GoogleGenAI, Type } from "@google/genai";
import { DayRow, SavedTrip } from "../types";

// Helper to safely get API key
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.warn("API Key not found in environment.");
    return "";
  }
  return key;
};

export const suggestHotels = async (
  destination: string
): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey || !destination) return [];

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `
      请列出位于 "${destination}" 的5家知名酒店名称。
      只返回JSON数组。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini suggestHotels error:", error);
    return [];
  }
};

export const generateFileName = async (
  plannerName: string,
  destinations: string[],
  people: number,
  days: number
): Promise<string> => {
    // Basic logic first, fall back to this if AI fails or for speed
    const base = `${plannerName}${destinations.join('')}${people}人${days}天`;
    return base;
};

export interface ItineraryItem {
  day: number;
  origin: string;
  originCountry?: string; // New: Explicit country for origin
  destination: string;
  destinationCountry?: string; // New: Explicit country for destination
  ticketName?: string;
  activityName?: string;
  hotelName?: string; // New: Hotel recommendation
  description?: string; // New: Detailed description
}

export interface AIPlanningResult {
    detectedDestinations: string[]; // Should be COUNTRIES
    itinerary: ItineraryItem[];
    reasoning?: string;
}

export const generateItinerary = async (
  destinations: string[],
  days: number
): Promise<ItineraryItem[]> => {
   return [];
};

export const generateComprehensiveItinerary = async (
  currentDestinations: string[],
  currentDays: number,
  currentRows: DayRow[],
  historyTrips: SavedTrip[],
  availableCountries: string[], // New: Pass existing countries for matching
  availableCities: string[], // New: Pass existing cities for matching
  userPrompt?: string 
): Promise<AIPlanningResult | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  // 1. Context Preparation
  const relevantHistory = currentDestinations.length > 0 ? historyTrips
    .filter(trip => trip.settings.destinations.some(d => currentDestinations.includes(d)))
    .slice(0, 3)
    .map(trip => ({
        destinations: trip.settings.destinations,
        itinerary: trip.rows.map(r => ({
            day: r.dayIndex,
            destination: r.route, // Fixed: use route instead of destination
            ticket: r.ticketName,
            activity: r.activityName
        }))
    })) : [];

  try {
    let prompt = `
      作为一名专业的旅行行程规划师，请根据用户的【指令】规划一份完整的行程。

      【系统现有资源库 (重要参考)】
      1. **现有国家列表**:
      ${availableCountries.join(', ')}
      
      2. **现有城市列表**:
      ${availableCities.join(', ')}

      【当前界面状态 (仅供参考)】
      - 原定目的地: ${currentDestinations.join(', ') || "未设定"}
      - 原定天数: ${currentDays} 天

      【用户具体指令】
      "${userPrompt}"

      【任务要求】
      1. **分析用户指令**：
         - 如果用户指令中包含了新的目的地，请**优先使用用户指令中的目的地**。
         - **关于国家名称的严格要求**：
            - 检测到的目的地必须是**国家名称**。
            - **如果该国家已存在于【现有国家列表】中，必须直接使用列表中的准确名称**。
      
      2. **生成行程 (严格匹配城市名)**：
         - 必须包含：第几天(day)、出发地(origin)、到达地(destination)、酒店(hotelName)、门票(ticketName)、活动(activityName)、行程详情(description)。
         - **关键规则：优先匹配现有资源**
            - 对于 "origin" (出发城市) 和 "destination" (到达城市/游玩城市)：
            - 请检查该城市是否存在于上面的【现有城市列表】中。
            - **如果存在 (即使是中文/英文部分匹配)，必须严格输出列表中的准确名称**。
            - 例如：如果列表中有 "东京 (Tokyo)"，而你想写 "东京" 或 "Tokyo"，请务必输出 "东京 (Tokyo)"。
            - 如果列表中没有，则使用标准中文名称，或 "中文 (English)" 格式。
         - **字段定义**：
            - originCountry: 出发地所在的国家（优先匹配系统列表）。
            - destinationCountry: 到达地所在的国家（优先匹配系统列表）。
            - "hotelName" (酒店名称)：推荐入住的具体酒店名称。
            - "ticketName" (门票名称)：具体的景点/景区名称。
            - "activityName" (活动名称)：体验类项目或动作。
         - **行程详情 (description) - 关键**：
            - **请将所有无法放入上述字段的详细信息写入此字段**。
            - 包含：详细的每日流程安排、推荐的特定餐厅/美食、交通换乘提示、以及用户指令中提到的任何特殊要求或偏好备注。
         - 语言：简体中文。

      请返回一个 JSON 对象，包含检测到的**国家列表**和行程数组。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedDestinations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "The list of COUNTRIES identified. MUST match existing list if applicable."
            },
            itinerary: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.INTEGER },
                        origin: { type: Type.STRING, description: "Origin city name. MUST use exact name from 'Existing Cities List' if available." },
                        originCountry: { type: Type.STRING, description: "The country of the origin city. MUST match existing list if applicable." },
                        destination: { type: Type.STRING, description: "Destination city name. MUST use exact name from 'Existing Cities List' if available." },
                        destinationCountry: { type: Type.STRING, description: "The country of the destination city. MUST match existing list if applicable." },
                        ticketName: { type: Type.STRING },
                        activityName: { type: Type.STRING },
                        hotelName: { type: Type.STRING, description: "Recommended hotel name" },
                        description: { type: Type.STRING, description: "Detailed daily itinerary, including dining recommendations, logistics, and specific user requests." }
                    },
                    required: ["day", "origin", "destination", "destinationCountry", "description"]
                }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIPlanningResult;
  } catch (error) {
    console.error("Gemini generateComprehensiveItinerary error:", error);
    return null;
  }
};