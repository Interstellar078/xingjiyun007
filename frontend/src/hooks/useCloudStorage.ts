import { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
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
    const loadCloudData = async () => {
        if (!currentUser) return;
        try {
            await StorageService.ensureAdminProfile();

            const isAdmin = currentUser.role === 'admin';
            let cars, cities, spots, hotels, activities, files;

            if (isAdmin) {
                // Admin: Load standard (which maps to overlay, but for admin with no private data = public)
                // Actually, ensure we load PUBLIC specifically to be safe?
                // "Administrator only uses public library info".
                // Let's use getPublicData to be explicit and avoid any accidental private shadows.
                [cars, cities, spots, hotels, activities, files] = await Promise.all([
                    StorageService.getPublicData<CarCostEntry[]>('travel_builder_db_cars'),
                    StorageService.getPublicData<PoiCity[]>('travel_builder_db_poi_cities'),
                    StorageService.getPublicData<PoiSpot[]>('travel_builder_db_poi_spots'),
                    StorageService.getPublicData<PoiHotel[]>('travel_builder_db_poi_hotels_v2'),
                    StorageService.getPublicData<PoiActivity[]>('travel_builder_db_poi_activities'),
                    StorageService.getPublicData<CountryFile[]>('travel_builder_db_country_files'),
                ]);
            } else {
                // User: Load Merged
                // Helper to load by key using generic Getters
                const loadKey = async <T>(key: string) => {
                    const [pub, priv] = await Promise.all([
                        StorageService.getPublicData<T[]>(key),
                        StorageService.getPrivateData<T[]>(key)
                    ]);
                    return mergeData(pub, priv);
                };

                [cars, cities, spots, hotels, activities, files] = await Promise.all([
                    loadKey<CarCostEntry>('travel_builder_db_cars'),
                    loadKey<PoiCity>('travel_builder_db_poi_cities'),
                    loadKey<PoiSpot>('travel_builder_db_poi_spots'),
                    loadKey<PoiHotel>('travel_builder_db_poi_hotels_v2'),
                    loadKey<PoiActivity>('travel_builder_db_poi_activities'),
                    loadKey<CountryFile>('travel_builder_db_country_files'),
                ]);
            }

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
                    const isAdmin = currentUser.role === 'admin';
                    if (isAdmin) {
                        // Admin saves everything to Public
                        // NOTE: Admin might have "private" marked items if we transferred them? 
                        // But here we assume Admin edits = Public update.
                        // Strip _source tag before saving? 
                        // Actually, backend JSONB stores what we send. Cleaner to strip `_source`.
                        const cleanData = data.map((d: any) => {
                            const { _source, ...rest } = d;
                            return rest;
                        });
                        saver(cleanData, true) // isPublic=true
                            .then(() => setCloudStatus('synced'))
                            .catch(() => setCloudStatus('error'));
                    } else {
                        // User saves ONLY Private items
                        // Filter out public sourced items
                        const privateItems = data.filter((d: any) => d._source !== 'public').map((d: any) => {
                            const { _source, ...rest } = d;
                            return rest;
                        });
                        saver(privateItems, false) // isPublic=false
                            .then(() => setCloudStatus('synced'))
                            .catch(() => setCloudStatus('error'));
                    }
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
    useDebouncedSave(carDB, StorageService.saveCars, 1500, true);
    useDebouncedSave(poiCities, StorageService.saveCities, 1500, true);
    useDebouncedSave(poiSpots, StorageService.saveSpots, 1500, true);
    useDebouncedSave(poiHotels, StorageService.saveHotels, 1500, true);
    useDebouncedSave(poiActivities, StorageService.saveActivities, 1500, true);
    useDebouncedSave(countryFiles, StorageService.saveFiles, 1500, true);

    useDebouncedSave(savedTrips, StorageService.saveTrips, 1500, false);
    useDebouncedSave(publicTrips, StorageService.savePublicTrips, 1500, false); // Admin only, saves isPublic=true logic handled in Service
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
