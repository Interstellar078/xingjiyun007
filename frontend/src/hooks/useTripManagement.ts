import { useState } from 'react';
import { SavedTrip, TripSettings, DayRow, CustomColumn, User } from '../types';
import { generateUUID } from '../utils/dateUtils';
import { extractCitiesFromRoute } from '../utils/tripHelpers';

export function useTripManagement(
    currentUser: User | null,
    savedTrips: SavedTrip[], // Private Trips
    setSavedTrips: (trips: SavedTrip[]) => void, // Set Private
    publicTrips: SavedTrip[], // Public Trips (From CloudStorage)
    setPublicTrips: (trips: SavedTrip[]) => void, // Set Public (Admin only)
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
    const [isSavingPublic, setIsSavingPublic] = useState(false); // UI toggle for "Share to Public"

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
            const currentTrip = savedTrips.find(t => t.id === activeTripId) || publicTrips.find(t => t.id === activeTripId);
            setSaveName(currentTrip ? currentTrip.name : defaultName);
        } else {
            setSaveName(defaultName);
        }
        // Default to private
        setIsSavingPublic(false);
        setShowSaveModal(true);
    };

    const handleConfirmSave = async () => {
        const nameToCheck = saveName.trim();
        if (!nameToCheck) {
            alert("请输入行程名称");
            return;
        }

        // Duplication check (Private only)
        // If saving public, we don't strictly check vs private, but maybe check vs public if logical?
        // Let's keep it simple: Ensure name unique in PRIVATE list if saving private.
        // If saving public (Admin acting), check public list.
        const targetList = isSavingPublic ? publicTrips : savedTrips;
        const isDuplicate = targetList.some(t => t.name === nameToCheck && t.id !== activeTripId);

        if (isDuplicate) {
            alert(`行程名称 "${nameToCheck}" 已存在于${isSavingPublic ? '公有' : '私有'}库中。`);
            return;
        }

        const isAdmin = currentUser?.role === 'admin';

        // NOTE: Standard users CANNOT save directly to Public List (Admin Key).
        // If a standard user checks "Public", what happens?
        // Proposal: They save to PRIVATE list, but with `isPublicRequest: true`? 
        // Or we just DISALLOW standard users from checking "Public" in the save dialog?
        // Requirement: "User saved trip can be chosen... Public or Private".
        // Requirement: "Admin can transfer private to public".
        // Conclusion: Users save to Private. Admin transfers.
        // BUT if user chooses "Public", maybe it just means "I want this public".
        // Let's allow Users to check "Public", but it saves to PRIVATE list with a flag `isShared: true`.
        // ADMIN can then see "Shared" trips easier? 
        // OR: Simpler: Users ONLY save to Private. "Save to Public" is disabled for non-admins.
        // User requesting public visibility is a separate "Submit" action maybe?
        // Let's implement: Only Admin can tick "Save to Public" (which writes to Public Key).
        // Standard User saving "Publicly" is ambiguous without a "User Public Key".
        // Let's RESTRICT "Save to Public" to Admins for MVP to ensure data integrity.
        // Use "Transfer" feature for user trips.

        if (isSavingPublic && !isAdmin) {
            alert("只有管理员可以直接保存到公有库。普通用户请联系管理员将私有行程转入公有库。");
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
                ? (targetList.find(t => t.id === activeTripId)?.createdBy || currentUser?.username)
                : currentUser?.username,
            lastModifiedBy: currentUser?.username
        };

        if (isSavingPublic) {
            // Save to Public
            const newPublic = activeTripId
                ? publicTrips.map(t => t.id === activeTripId ? tripToSave : t)
                : [tripToSave, ...publicTrips];
            // If it was in private, do we remove it? Ideally yes if moving? 
            // But here we are just SAVING current state.
            // Let's assume distinct identities.
            setPublicTrips(newPublic);
        } else {
            // Save to Private
            const newPrivate = activeTripId
                ? savedTrips.map(t => t.id === activeTripId ? tripToSave : t)
                : [tripToSave, ...savedTrips];
            setSavedTrips(newPrivate);
        }

        setActiveTripId(tripToSave.id);
        setShowSaveModal(false);
    };

    const loadTrip = (trip: SavedTrip) => {
        setActiveTripId(trip.id);
        setSettings(trip.settings);
        setRows(trip.rows);
        setCustomColumns(trip.customColumns || []);
    };

    const deleteTrip = (id: string, isPublicTarget = false) => {
        if (window.confirm('确定删除此行程吗？')) {
            if (isPublicTarget) {
                if (currentUser?.role !== 'admin') return;
                setPublicTrips(publicTrips.filter(t => t.id !== id));
            } else {
                setSavedTrips(savedTrips.filter(t => t.id !== id));
            }
            if (activeTripId === id) setActiveTripId(null);
        }
    };

    // Promote Logic: Copy a trip from Private -> Public
    const promoteToPublic = (trip: SavedTrip) => {
        if (currentUser?.role !== 'admin') return;

        // Check duplicate name in public
        const exists = publicTrips.some(t => t.name === trip.name);
        if (exists) {
            if (!confirm(`公有库中已存在名为 "${trip.name}" 的行程。是否覆盖/创建副本？`)) return;
        }

        const publicCopy: SavedTrip = {
            ...trip,
            id: generateUUID(), // New ID for public copy to avoid conflict
            name: exists ? `${trip.name} (Copy)` : trip.name,
            lastModifiedBy: currentUser.username
        };

        setPublicTrips([publicCopy, ...publicTrips]);
        alert("已成功发布到公有库！");
    };

    return {
        activeTripId,
        setActiveTripId,
        showSaveModal,
        setShowSaveModal,
        saveName,
        setSaveName,
        isSavingPublic,
        setIsSavingPublic,
        handleOpenSaveModal,
        handleConfirmSave,
        loadTrip,
        deleteTrip,
        promoteToPublic
    };
}
