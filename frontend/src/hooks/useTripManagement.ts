import { useState } from 'react';
import { SavedTrip, TripSettings, DayRow, CustomColumn, User } from '../types';
import { generateUUID } from '../utils/dateUtils';
import { extractCitiesFromRoute } from '../utils/tripHelpers';

export function useTripManagement(
    currentUser: User | null,
    savedTrips: SavedTrip[],
    setSavedTrips: (trips: SavedTrip[]) => void,
    settings: TripSettings,
    rows: DayRow[],
    customColumns: CustomColumn[],
    setSettings: (settings: TripSettings) => void,
    setRows: (rows: DayRow[]) => void,
    setCustomColumns: (cols: CustomColumn[]) => void
) {
    const [activeTripId, setActiveTripId] = useState<string | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveName, setSaveName] = useState('');

    const handleOpenSaveModal = () => {
        const planner = currentUser?.username || settings.plannerName || '未命名';
        const dayCount = `${rows.length}天`;
        const country = settings.destinations.length > 0 ? settings.destinations.join('') : "";
        let city = '';
        const day1Route = rows[0]?.route || '';
        if (day1Route) {
            const cities = extractCitiesFromRoute(day1Route);
            if (cities.length > 0) city = cities[0];
        }
        const people = `${settings.peopleCount}人`;
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const defaultName = `${planner}${dayCount}${country}${city}${people}${dateStr}`;

        if (activeTripId) {
            const currentTrip = savedTrips.find(t => t.id === activeTripId);
            setSaveName(currentTrip ? currentTrip.name : defaultName);
        } else {
            setSaveName(defaultName);
        }
        setShowSaveModal(true);
    };

    const handleConfirmSave = async () => {
        const nameToCheck = saveName.trim();
        if (!nameToCheck) {
            alert("请输入行程名称");
            return;
        }

        const isDuplicate = savedTrips.some(t => t.name === nameToCheck && t.id !== activeTripId);
        if (isDuplicate) {
            alert(`行程名称 "${nameToCheck}" 已存在。`);
            return;
        }

        const tripToSave: SavedTrip = {
            id: activeTripId || generateUUID(),
            name: nameToCheck,
            timestamp: Date.now(),
            settings,
            rows,
            customColumns,
            createdBy: activeTripId
                ? (savedTrips.find(t => t.id === activeTripId)?.createdBy || currentUser?.username)
                : currentUser?.username,
            lastModifiedBy: currentUser?.username
        };

        const newTrips = activeTripId
            ? savedTrips.map(t => t.id === activeTripId ? tripToSave : t)
            : [tripToSave, ...savedTrips];

        setSavedTrips(newTrips);
        setActiveTripId(tripToSave.id);
        setShowSaveModal(false);
    };

    const loadTrip = (trip: SavedTrip) => {
        setActiveTripId(trip.id);
        setSettings(trip.settings);
        setRows(trip.rows);
        setCustomColumns(trip.customColumns || []);
    };

    const deleteTrip = (id: string) => {
        if (window.confirm('确定删除此行程吗？')) {
            setSavedTrips(savedTrips.filter(t => t.id !== id));
            if (activeTripId === id) setActiveTripId(null);
        }
    };

    return {
        activeTripId,
        setActiveTripId,
        showSaveModal,
        setShowSaveModal,
        saveName,
        setSaveName,
        handleOpenSaveModal,
        handleConfirmSave,
        loadTrip,
        deleteTrip
    };
}
