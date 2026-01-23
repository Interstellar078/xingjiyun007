import { useState, useMemo } from 'react';
import { DayRow, TripSettings, CustomColumn, User } from '../types';
import { createEmptyRow, extractCitiesFromRoute } from '../utils/tripHelpers';
import { generateUUID } from '../utils/dateUtils';

const INITIAL_ROWS = 8;

export function useTripPlanner(
    currentUser: User | null,
    locationHistory: string[],
    setLocationHistory: (locs: string[]) => void
) {
    const [settings, setSettings] = useState<TripSettings>({
        plannerName: '',
        customerName: '',
        peopleCount: 2,
        roomCount: 1,
        currency: 'CNY',
        exchangeRate: 1,
        destinations: [],
        startDate: '',
        marginPercent: 15,
        tipPerDay: 50,
        manualInclusions: '1. 全程舒适专车接送\n2. 行程所列首道景点门票\n3. 全程高品质酒店住宿\n4. 7x24小时管家服务',
        manualExclusions: ''
    });

    const [rows, setRows] = useState<DayRow[]>(() =>
        Array.from({ length: INITIAL_ROWS }).map((_, i) =>
            createEmptyRow(i + 1, settings.startDate)
        )
    );

    const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);

    // Calculate total cost
    const totalCost = useMemo(
        () => rows.reduce((acc, r) =>
            acc + r.transportCost + r.hotelCost + r.ticketCost + r.activityCost + r.otherCost,
            0
        ),
        [rows]
    );

    // Handle route update
    const handleRouteUpdate = (index: number, val: string[]) => {
        const newRouteStr = val.join('-');
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], route: newRouteStr };

        const currentDest = val.length > 0 ? val[val.length - 1] : null;
        if (currentDest && index < newRows.length - 1) {
            const nextRow = newRows[index + 1];
            const nextRowCities = extractCitiesFromRoute(nextRow.route);
            if (nextRowCities.length === 0) {
                newRows[index + 1] = { ...nextRow, route: currentDest };
            } else {
                nextRowCities[0] = currentDest;
                newRows[index + 1] = { ...nextRow, route: nextRowCities.join('-') };
            }
        }
        setRows(newRows);

        const newLocs = val.filter(v => !locationHistory.includes(v));
        if (newLocs.length > 0) {
            setLocationHistory([...locationHistory, ...newLocs]);
        }
    };

    return {
        settings,
        setSettings,
        rows,
        setRows,
        customColumns,
        setCustomColumns,
        totalCost,
        handleRouteUpdate
    };
}
