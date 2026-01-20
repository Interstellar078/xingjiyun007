import { DayRow, SavedTrip } from "../types";
import { apiPost } from "./apiClient";

export const suggestHotels = async (destination: string): Promise<string[]> => {
  if (!destination) return [];
  try {
    const result = await apiPost<{ hotels: string[] }>("/api/ai/suggest-hotels", { destination });
    return result?.hotels || [];
  } catch (error) {
    console.error("AI suggestHotels error:", error);
    return [];
  }
};

export const generateFileName = async (
  plannerName: string,
  destinations: string[],
  people: number,
  days: number
): Promise<string> => {
  const base = `${plannerName}${destinations.join('')}${people}人${days}天`;
  return base;
};

export interface ItineraryItem {
  day: number;
  origin: string;
  originCountry?: string;
  destination: string;
  destinationCountry?: string;
  ticketName?: string;
  activityName?: string;
  description?: string;
}

export interface AIPlanningResult {
  detectedDestinations: string[];
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
  availableCountries: string[],
  userPrompt?: string
): Promise<AIPlanningResult | null> => {
  try {
    const result = await apiPost<AIPlanningResult>("/api/ai/itinerary", {
      currentDestinations,
      currentDays,
      currentRows,
      historyTrips,
      availableCountries,
      userPrompt
    });
    return result || null;
  } catch (error) {
    console.error("AI generateComprehensiveItinerary error:", error);
    return null;
  }
};
