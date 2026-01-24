import { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { resourceApi } from '../services/resourceApi';
import {
    CarCostEntry,
    PoiCity,
    PoiSpot,
    PoiHotel,
    PoiActivity,
    CountryFile,
    SavedTrip
} from '../types';

type CloudStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface CloudStorageData {
    carDB: CarCostEntry[];
    poiCities: PoiCity[];
    poiSpots: PoiSpot[];
    poiHotels: PoiHotel[];
    poiActivities: PoiActivity[];
    countryFiles: CountryFile[];
    savedTrips: SavedTrip[];
    publicTrips: SavedTrip[];
    locationHistory: string[];
    colWidths: Record<string, number>;
}

export interface CloudStorageActions {
    setCarDB: (data: CarCostEntry[]) => void;
    setPoiCities: (data: PoiCity[]) => void;
    setPoiSpots: (data: PoiSpot[]) => void;
    setPoiHotels: (data: PoiHotel[]) => void;
    setPoiActivities: (data: PoiActivity[]) => void;
    setCountryFiles: (data: CountryFile[]) => void;
    setSavedTrips: (data: SavedTrip[]) => void;
    setPublicTrips: (data: SavedTrip[]) => void;
    setLocationHistory: (data: string[]) => void;
    setColWidths: (data: Record<string, number>) => void;
}

import { User } from '../types';

export function useCloudStorage(currentUser: User | null) {
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle');

    // Data state
    const [carDB, setCarDB] = useState<CarCostEntry[]>([]);
    const [poiCities, setPoiCities] = useState<PoiCity[]>([]);
    const [poiSpots, setPoiSpots] = useState<PoiSpot[]>([]);
    const [poiHotels, setPoiHotels] = useState<PoiHotel[]>([]);
    const [poiActivities, setPoiActivities] = useState<PoiActivity[]>([]);
    const [countryFiles, setCountryFiles] = useState<CountryFile[]>([]);
    const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
    const [publicTrips, setPublicTrips] = useState<SavedTrip[]>([]); // New State for Public Trips
    const [locationHistory, setLocationHistory] = useState<string[]>([]);
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        day: 48, date: 110, route: 180, transport: 140, hotel: 140,
        ticket: 140, activity: 140, description: 250, rooms: 50,
        transportCost: 90, hotelPrice: 90, hotelCost: 90,
        ticketCost: 90, activityCost: 90, otherCost: 90
    });

    const mergeData = (publicData: any[], privateData: any[]) => {
        // Mark items with source for UI and splitting on save
        // We do NOT deduplicate by ID because a user might override a public item with a private one?
        // Actually, requirement is "User uses public AND private".
        // Let's assume unique IDs. If duplication exists, both show up.
        const p1 = publicData.map(d => ({ ...d, _source: 'public' }));
        const p2 = privateData.map(d => ({ ...d, _source: 'private' }));
        return [...p1, ...p2];
    };

    const loadMerged = async (publicGetter: (k: string) => Promise<any>, privateGetter: (k: string) => Promise<any>, key: string) => {
        const [pub, priv] = await Promise.all([publicGetter(key), privateGetter(key)]);
        return mergeData(pub, priv);
    };

    // Load data from cloud
    const loadCloudData = async (userOverride?: User) => {
        const activeUser = userOverride || currentUser;
        if (!activeUser) return;

        try {
            StorageService.ensureAdminProfile(); // No-op but keeps flow

            const isAdmin = activeUser.role === 'admin';
            let cars, cities, spots, hotels, activities, files;

            // Use New Resource API for everyone (it handles scope/merging backend side)
            // Fetch everything with large page size to emulate "loading all data" for Planner Context
            [cars, cities, spots, hotels, activities] = await Promise.all([
                resourceApi.listTransports({ size: 2000 }),
                resourceApi.listCities({ size: 2000 }),
                resourceApi.listSpots({ size: 2000 }),
                resourceApi.listHotels({ size: 2000 }),
                resourceApi.listActivities({ size: 2000 }),
            ]);
            files = []; // Files deprecated or moved to new system later

            // Non-resource data (Trips, Settings) are always private/scoped natively by overlay
            const [trips, pubTrips, locs, settings] = await Promise.all([
                StorageService.getTrips(),
                StorageService.getPublicTrips(),
                StorageService.getLocations(),
                StorageService.getAppSettings()
            ]);

            setCarDB(cars);
            setPoiCities(cities);
            setPoiSpots(spots);
            setPoiHotels(hotels);
            setPoiActivities(activities);
            setCountryFiles(files);
            setSavedTrips(trips);
            setPublicTrips(pubTrips);
            setLocationHistory(locs);

            if (settings && Object.keys(settings).length > 0) {
                setColWidths(settings);
            }

            setCloudStatus('synced');
        } catch (e) {
            console.error("Load failed", e);
            setCloudStatus('error');
        }
    };

    // Debounced save hook
    const useDebouncedSave = (data: any, saver: (d: any, isPublic: boolean) => Promise<void>, delay = 1500, isResource = false) => {
        const firstRun = useRef(true);
        useEffect(() => {
            if (firstRun.current) {
                firstRun.current = false;
                return;
            }
            if (isAppLoading || !currentUser) return;

            setCloudStatus('syncing');
            const handler = setTimeout(() => {
                if (isResource) {
                    // Resources are now saved individually via API, NOT synced as blobs.
                    // This hook should ignored for resources, or we remove usages.
                    // We kept this logic just in case, but usages below are removed.
                    return;
                } else {
                    // Regular non-resource data (Trips, Settings)
                    saver(data, false)
                        .then(() => setCloudStatus('synced'))
                        .catch(() => setCloudStatus('error'));
                }
            }, delay);
            return () => clearTimeout(handler);
        }, [data]);
    };

    // Auto-save all data
    // Removed Resource Sync calls (Cars, Cities, Spots, Hotels, Activities, Files)
    // They are now managed via Atomic CRUD in ResourceDatabase.

    useDebouncedSave(savedTrips, StorageService.saveTrips, 1500, false);
    useDebouncedSave(publicTrips, StorageService.savePublicTrips, 1500, false);
    useDebouncedSave(locationHistory, StorageService.saveLocations, 1500, false);
    useDebouncedSave(colWidths, StorageService.saveAppSettings, 1500, false);

    return {
        isAppLoading,
        setIsAppLoading,
        cloudStatus,
        loadCloudData,
        data: {
            carDB,
            poiCities,
            poiSpots,
            poiHotels,
            poiActivities,
            countryFiles,
            savedTrips,
            publicTrips,
            locationHistory,
            colWidths
        },
        actions: {
            setCarDB,
            setPoiCities,
            setPoiSpots,
            setPoiHotels,
            setPoiActivities,
            setCountryFiles,
            setSavedTrips,
            setPublicTrips,
            setLocationHistory,
            setColWidths
        }
    };
}
