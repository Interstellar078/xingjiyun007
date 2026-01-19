
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

      【系统现有国家列表 (参考库)】
      ${availableCountries.join(', ')}

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
            - **目标**：保证用户在指令中提出的所有定制化要求（如“住很好的酒店”、“喜欢吃日料”、“即使只有两个人也要...”）都能在行程中体现出来，不要丢失信息。
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
                        origin: { type: Type.STRING },
                        originCountry: { type: Type.STRING, description: "The country of the origin city. MUST match existing list if applicable." },
                        destination: { type: Type.STRING },
                        destinationCountry: { type: Type.STRING, description: "The country of the destination city. MUST match existing list if applicable." },
                        ticketName: { type: Type.STRING },
                        activityName: { type: Type.STRING },
                        description: { type: Type.STRING, description: "Detailed daily itinerary, including dining recommendations, logistics, and specific user requests that don't fit in other fields." }
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
