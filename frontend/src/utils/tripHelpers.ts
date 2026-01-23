import { DayRow, TripSettings } from '../types';
import { addDays, generateUUID } from './dateUtils';

/**
 * Creates an empty row for a trip planner day
 */
export function createEmptyRow(dayIndex: number, startDate?: string): DayRow {
    return {
        id: generateUUID(),
        dayIndex,
        date: startDate ? addDays(startDate, dayIndex - 1) : '',
        route: '',
        transport: ['包车'],
        carModel: '',
        hotelName: '',
        ticketName: [],
        activityName: [],
        description: '',
        rooms: 0,
        transportCost: 0,
        hotelPrice: 0,
        hotelCost: 0,
        ticketCost: 0,
        activityCost: 0,
        otherCost: 0,
        customCosts: {},
    };
}

/**
 * Extracts city names from a route string
 * Splits by common delimiters: - — > ， ,
 */
export function extractCitiesFromRoute(route: string): string[] {
    if (!route) return [];
    return route.split(/[-—>，,]/).map(s => s.trim()).filter(Boolean);
}

/**
 * Find relevant ticket price sum for a given route
 */
export function findRelevantTicketPriceSum(
    ticketNames: string[],
    spots: any[],
    peopleCount: number
): number {
    if (!ticketNames || ticketNames.length === 0) return 0;
    let sum = 0;
    ticketNames.forEach(name => {
        const found = spots.find(s => s.name === name);
        if (found) sum += found.price;
    });
    return sum * peopleCount;
}

/**
 * Find relevant activity price sum for a given route
 */
export function findRelevantActivityPriceSum(
    activityNames: string[],
    activities: any[],
    peopleCount: number
): number {
    if (!activityNames || activityNames.length === 0) return 0;
    let sum = 0;
    activityNames.forEach(name => {
        const found = activities.find(a => a.name === name);
        if (found) sum += found.price;
    });
    return sum * peopleCount;
}
