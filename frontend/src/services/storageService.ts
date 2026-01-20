import { SavedTrip, CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile } from '../types';
import { apiGet, apiPut, apiPost } from './apiClient';

const KEYS = {
  DB_CARS: 'travel_builder_db_cars',
  DB_CITIES: 'travel_builder_db_poi_cities',
  DB_SPOTS: 'travel_builder_db_poi_spots',
  DB_HOTELS: 'travel_builder_db_poi_hotels_v2',
  DB_ACTIVITIES: 'travel_builder_db_poi_activities',
  DB_FILES: 'travel_builder_db_country_files',
  HISTORY: 'travel_builder_history',
  LOCATIONS: 'travel_builder_locations_history',
  SETTINGS_GLOBAL: 'travel_builder_settings_global'
};

const getData = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const data = await apiGet<{ key: string; value: T }>(`/api/data/${encodeURIComponent(key)}`);
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
};

const setData = async <T>(key: string, value: T): Promise<void> => {
  await apiPut(`/api/data/${encodeURIComponent(key)}`, { value });
};

export const StorageService = {
  // --- Core Data ---
  async getCars(): Promise<CarCostEntry[]> { return getData(KEYS.DB_CARS, []); },
  async getCities(): Promise<PoiCity[]> { return getData(KEYS.DB_CITIES, []); },
  async getSpots(): Promise<PoiSpot[]> { return getData(KEYS.DB_SPOTS, []); },
  async getHotels(): Promise<PoiHotel[]> { return getData(KEYS.DB_HOTELS, []); },
  async getActivities(): Promise<PoiActivity[]> { return getData(KEYS.DB_ACTIVITIES, []); },
  async getFiles(): Promise<CountryFile[]> { return getData(KEYS.DB_FILES, []); },
  async getTrips(): Promise<SavedTrip[]> { return getData(KEYS.HISTORY, []); },
  async getLocations(): Promise<string[]> { return getData(KEYS.LOCATIONS, []); },

  async saveCars(data: CarCostEntry[]): Promise<void> { return setData(KEYS.DB_CARS, data); },
  async saveCities(data: PoiCity[]): Promise<void> { return setData(KEYS.DB_CITIES, data); },
  async saveSpots(data: PoiSpot[]): Promise<void> { return setData(KEYS.DB_SPOTS, data); },
  async saveHotels(data: PoiHotel[]): Promise<void> { return setData(KEYS.DB_HOTELS, data); },
  async saveActivities(data: PoiActivity[]): Promise<void> { return setData(KEYS.DB_ACTIVITIES, data); },
  async saveFiles(data: CountryFile[]): Promise<void> { return setData(KEYS.DB_FILES, data); },
  async saveTrips(data: SavedTrip[]): Promise<void> { return setData(KEYS.HISTORY, data); },
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
