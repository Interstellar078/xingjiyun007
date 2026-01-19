
import { SavedTrip, CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile } from '../types';
import { SupabaseManager } from './supabaseClient';

// We map the old LocalStorage Keys to 'key' column in 'app_data' table
const KEYS = {
  DB_CARS: 'travel_builder_db_cars',
  DB_CITIES: 'travel_builder_db_poi_cities',
  DB_SPOTS: 'travel_builder_db_poi_spots',
  DB_HOTELS: 'travel_builder_db_poi_hotels_v2',
  DB_ACTIVITIES: 'travel_builder_db_poi_activities',
  DB_FILES: 'travel_builder_db_country_files',
  HISTORY: 'travel_builder_history',
  LOCATIONS: 'travel_builder_locations_history'
};

// Helper to interact with 'app_data' table
// Table Schema expected: key (text pk), value (jsonb), updated_at (timestamp)
const db = {
    get: async <T>(key: string, defaultValue: T): Promise<T> => {
        const client = SupabaseManager.getClient();
        if (!client) return defaultValue;

        try {
            const { data, error } = await client
                .from('app_data')
                .select('value')
                .eq('key', key)
                .single();
            
            if (error || !data) {
                // Return default if key doesn't exist yet
                return defaultValue;
            }
            return data.value as T;
        } catch (e) {
            console.error(`Error fetching ${key}`, e);
            return defaultValue;
        }
    },

    set: async <T>(key: string, value: T): Promise<void> => {
        const client = SupabaseManager.getClient();
        if (!client) throw new Error("No cloud connection");

        try {
            const { error } = await client
                .from('app_data')
                .upsert({ 
                    key, 
                    value: value as any, 
                    updated_at: new Date().toISOString() 
                }, { onConflict: 'key' });
                
            if (error) throw error;
        } catch (e) {
            console.error(`Error saving ${key}`, e);
            throw e;
        }
    }
};

export const StorageService = {
  // --- Getters ---
  async getCars(): Promise<CarCostEntry[]> { return db.get(KEYS.DB_CARS, []); },
  async getCities(): Promise<PoiCity[]> { return db.get(KEYS.DB_CITIES, []); },
  async getSpots(): Promise<PoiSpot[]> { return db.get(KEYS.DB_SPOTS, []); },
  async getHotels(): Promise<PoiHotel[]> { return db.get(KEYS.DB_HOTELS, []); },
  async getActivities(): Promise<PoiActivity[]> { return db.get(KEYS.DB_ACTIVITIES, []); },
  async getFiles(): Promise<CountryFile[]> { return db.get(KEYS.DB_FILES, []); },
  async getTrips(): Promise<SavedTrip[]> { return db.get(KEYS.HISTORY, []); },
  async getLocations(): Promise<string[]> { return db.get(KEYS.LOCATIONS, []); },

  // --- Savers ---
  async saveCars(data: CarCostEntry[]): Promise<void> { return db.set(KEYS.DB_CARS, data); },
  async saveCities(data: PoiCity[]): Promise<void> { return db.set(KEYS.DB_CITIES, data); },
  async saveSpots(data: PoiSpot[]): Promise<void> { return db.set(KEYS.DB_SPOTS, data); },
  async saveHotels(data: PoiHotel[]): Promise<void> { return db.set(KEYS.DB_HOTELS, data); },
  async saveActivities(data: PoiActivity[]): Promise<void> { return db.set(KEYS.DB_ACTIVITIES, data); },
  async saveFiles(data: CountryFile[]): Promise<void> { return db.set(KEYS.DB_FILES, data); },
  async saveTrips(data: SavedTrip[]): Promise<void> { return db.set(KEYS.HISTORY, data); },
  async saveLocations(data: string[]): Promise<void> { return db.set(KEYS.LOCATIONS, data); },
};
