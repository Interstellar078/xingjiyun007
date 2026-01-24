import { SavedTrip, CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile } from '../types';
import { apiGet, apiPut, apiPost } from './apiClient';

export const KEYS = {
  DB_CARS: 'travel_builder_db_cars',
  DB_CITIES: 'travel_builder_db_poi_cities',
  DB_SPOTS: 'travel_builder_db_poi_spots',
  DB_HOTELS: 'travel_builder_db_poi_hotels_v2',
  DB_ACTIVITIES: 'travel_builder_db_poi_activities',
  DB_FILES: 'travel_builder_db_country_files',
  HISTORY: 'travel_builder_history',
  PUBLIC_TRIPS: 'travel_builder_public_trips', // New Key for Official Public Library
  LOCATIONS: 'travel_builder_locations_history',
  SETTINGS_GLOBAL: 'travel_builder_settings_global'
};

const getData = async <T>(key: string, fallback: T, scope?: 'public' | 'private'): Promise<T> => {
  try {
    const url = scope
      ? `/api/data/${encodeURIComponent(key)}?scope=${scope}`
      : `/api/data/${encodeURIComponent(key)}`;
    const data = await apiGet<{ key: string; value: T }>(url);
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
};

const setData = async <T>(key: string, value: T, isPublic: boolean = false): Promise<void> => {
  // When saving, we must specify is_public flag. 
  // For overlay logic: Private saves go to owner_id=me. Public saves go to owner_id=me, is_public=true.
  await apiPut(`/api/data/${encodeURIComponent(key)}`, { value, is_public: isPublic });
};

export const StorageService = {
  // --- Core Data ---
  async getCars(): Promise<CarCostEntry[]> { return getData(KEYS.DB_CARS, []); },
  async getCities(): Promise<PoiCity[]> { return getData(KEYS.DB_CITIES, []); },
  async getSpots(): Promise<PoiSpot[]> { return getData(KEYS.DB_SPOTS, []); },
  async getHotels(): Promise<PoiHotel[]> { return getData(KEYS.DB_HOTELS, []); },
  async getActivities(): Promise<PoiActivity[]> { return getData(KEYS.DB_ACTIVITIES, []); },
  async getFiles(): Promise<CountryFile[]> { return getData(KEYS.DB_FILES, []); },
  async getTrips(): Promise<SavedTrip[]> { return apiGet('/api/trips?scope=private'); },
  async getPublicTrips(): Promise<SavedTrip[]> { return apiGet('/api/trips?scope=public'); },
  async getLocations(): Promise<string[]> { return getData(KEYS.LOCATIONS, []); },

  // --- Admin ---
  async adminGetAllKeys(key: string): Promise<{ owner_id: string, value: any, is_public: boolean }[]> {
    return apiGet(`/api/admin/data/all?key=${encodeURIComponent(key)}`);
  },

  // --- Scoped Data Access ---
  async getPublicData<T>(key: string): Promise<T> { return getData(key, [] as any, 'public'); },
  async getPrivateData<T>(key: string): Promise<T> { return getData(key, [] as any, 'private'); },

  // --- Saving ---
  async saveCars(data: CarCostEntry[], isPublic = false): Promise<void> { return setData(KEYS.DB_CARS, data, isPublic); },
  async saveCities(data: PoiCity[], isPublic = false): Promise<void> { return setData(KEYS.DB_CITIES, data, isPublic); },
  async saveSpots(data: PoiSpot[], isPublic = false): Promise<void> { return setData(KEYS.DB_SPOTS, data, isPublic); },
  async saveHotels(data: PoiHotel[], isPublic = false): Promise<void> { return setData(KEYS.DB_HOTELS, data, isPublic); },
  async saveActivities(data: PoiActivity[], isPublic = false): Promise<void> { return setData(KEYS.DB_ACTIVITIES, data, isPublic); },
  async saveFiles(data: CountryFile[], isPublic = false): Promise<void> { return setData(KEYS.DB_FILES, data, isPublic); },

  async saveTrips(data: SavedTrip[]): Promise<void> { return apiPut('/api/trips/batch?scope=private', data); },
  async savePublicTrips(data: SavedTrip[]): Promise<void> { return apiPut('/api/trips/batch?scope=public', data); }, // Always public
  async saveLocations(data: string[]): Promise<void> { return setData(KEYS.LOCATIONS, data); },

  async getAppSettings(): Promise<any> {
    return getData(KEYS.SETTINGS_GLOBAL, {});
  },

  async saveAppSettings(settings: any): Promise<void> {
    return setData(KEYS.SETTINGS_GLOBAL, settings);
  },

  // --- Compatibility no-op ---
  async ensureAdminProfile(): Promise<void> {
    return;
  },

  // --- Full Backup & Restore ---
  createBackup: async (): Promise<any[]> => {
    return apiGet<any[]>(`/api/data`);
  },

  restoreBackup: async (dump: { key: string; value: any }[]): Promise<void> => {
    await apiPost(`/api/data/restore`, { items: dump });
  }
};
