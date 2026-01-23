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
    setLocationHistory: (data: string[]) => void;
    setColWidths: (data: Record<string, number>) => void;
}

export function useCloudStorage() {
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
    const [locationHistory, setLocationHistory] = useState<string[]>([]);
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        day: 48, date: 110, route: 180, transport: 140, hotel: 140,
        ticket: 140, activity: 140, description: 250, rooms: 50,
        transportCost: 90, hotelPrice: 90, hotelCost: 90,
        ticketCost: 90, activityCost: 90, otherCost: 90
    });

    // Load data from cloud
    const loadCloudData = async () => {
        try {
            await StorageService.ensureAdminProfile();

            const [
                cars, cities, spots, hotels, activities, files, trips, locs, settings
            ] = await Promise.all([
                StorageService.getCars(),
                StorageService.getCities(),
                StorageService.getSpots(),
                StorageService.getHotels(),
                StorageService.getActivities(),
                StorageService.getFiles(),
                StorageService.getTrips(),
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
    const useDebouncedSave = (data: any, saver: (d: any) => Promise<void>, delay = 1500) => {
        const firstRun = useRef(true);
        useEffect(() => {
            if (firstRun.current) {
                firstRun.current = false;
                return;
            }
            if (isAppLoading) return;

            setCloudStatus('syncing');
            const handler = setTimeout(() => {
                saver(data)
                    .then(() => setCloudStatus('synced'))
                    .catch(() => setCloudStatus('error'));
            }, delay);
            return () => clearTimeout(handler);
        }, [data]);
    };

    // Auto-save all data
    useDebouncedSave(carDB, StorageService.saveCars);
    useDebouncedSave(poiCities, StorageService.saveCities);
    useDebouncedSave(poiSpots, StorageService.saveSpots);
    useDebouncedSave(poiHotels, StorageService.saveHotels);
    useDebouncedSave(poiActivities, StorageService.saveActivities);
    useDebouncedSave(countryFiles, StorageService.saveFiles);
    useDebouncedSave(savedTrips, StorageService.saveTrips);
    useDebouncedSave(locationHistory, StorageService.saveLocations);
    useDebouncedSave(colWidths, StorageService.saveAppSettings);

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
            setLocationHistory,
            setColWidths
        }
    };
}
