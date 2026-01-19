
import { SavedTrip, CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile, User } from '../types';
import { SupabaseManager } from './supabaseClient';

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
            
            if (error || !data) return defaultValue;
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
    },

    delete: async (key: string): Promise<void> => {
        const client = SupabaseManager.getClient();
        if (!client) return;
        await client.from('app_data').delete().eq('key', key);
    }
};

export const StorageService = {
  // --- Core Data ---
  async getCars(): Promise<CarCostEntry[]> { return db.get(KEYS.DB_CARS, []); },
  async getCities(): Promise<PoiCity[]> { return db.get(KEYS.DB_CITIES, []); },
  async getSpots(): Promise<PoiSpot[]> { return db.get(KEYS.DB_SPOTS, []); },
  async getHotels(): Promise<PoiHotel[]> { return db.get(KEYS.DB_HOTELS, []); },
  async getActivities(): Promise<PoiActivity[]> { return db.get(KEYS.DB_ACTIVITIES, []); },
  async getFiles(): Promise<CountryFile[]> { return db.get(KEYS.DB_FILES, []); },
  async getTrips(): Promise<SavedTrip[]> { return db.get(KEYS.HISTORY, []); },
  async getLocations(): Promise<string[]> { return db.get(KEYS.LOCATIONS, []); },

  async saveCars(data: CarCostEntry[]): Promise<void> { return db.set(KEYS.DB_CARS, data); },
  async saveCities(data: PoiCity[]): Promise<void> { return db.set(KEYS.DB_CITIES, data); },
  async saveSpots(data: PoiSpot[]): Promise<void> { return db.set(KEYS.DB_SPOTS, data); },
  async saveHotels(data: PoiHotel[]): Promise<void> { return db.set(KEYS.DB_HOTELS, data); },
  async saveActivities(data: PoiActivity[]): Promise<void> { return db.set(KEYS.DB_ACTIVITIES, data); },
  async saveFiles(data: CountryFile[]): Promise<void> { return db.set(KEYS.DB_FILES, data); },
  async saveTrips(data: SavedTrip[]): Promise<void> { return db.set(KEYS.HISTORY, data); },
  async saveLocations(data: string[]): Promise<void> { return db.set(KEYS.LOCATIONS, data); },

  // --- User Profiles (Simulating a Users table using KV store for Admin Dashboard) ---
  async getUserProfiles(): Promise<User[]> {
    const client = SupabaseManager.getClient();
    if (!client) return [];
    // Fetch all keys starting with 'user_profile_'
    const { data } = await client.from('app_data').select('value').like('key', 'user_profile_%');
    return data?.map(d => d.value) || [];
  },

  async saveUserProfile(user: User): Promise<void> {
    return db.set(`user_profile_${user.username}`, user);
  },

  async deleteUserProfile(username: string): Promise<void> {
    return db.delete(`user_profile_${username}`);
  },
  
  // --- Admin Bootstrap ---
  async ensureAdminProfile(): Promise<void> {
      const adminKey = 'user_profile_admin';
      const existing = await db.get<User | null>(adminKey, null);
      if (!existing) {
          const adminUser: User = {
              username: 'admin',
              password: '', 
              role: 'admin',
              createdAt: Date.now()
          };
          console.log("Bootstrapping Admin User Profile...");
          await db.set(adminKey, adminUser);
      }
  },

  // --- App Settings (e.g. Column Widths) ---
  async getAppSettings(): Promise<any> {
    return db.get(KEYS.SETTINGS_GLOBAL, {});
  },

  async saveAppSettings(settings: any): Promise<void> {
    return db.set(KEYS.SETTINGS_GLOBAL, settings);
  },

  // --- Full Backup & Restore ---
  createBackup: async (): Promise<any[]> => {
    const client = SupabaseManager.getClient();
    if (!client) return [];
    // Fetch everything
    const { data, error } = await client.from('app_data').select('*');
    if (error) throw error;
    return data || [];
  },

  restoreBackup: async (dump: { key: string; value: any }[]): Promise<void> => {
      const client = SupabaseManager.getClient();
      if (!client) throw new Error("No cloud connection");
      
      if (!Array.isArray(dump) || dump.length === 0) return;

      // Upsert all data. Supabase handles upsert efficiently.
      // We map to match the table structure expected: key, value, updated_at
      const payload = dump.map(d => ({
          key: d.key,
          value: d.value,
          updated_at: new Date().toISOString()
      }));

      const { error } = await client.from('app_data').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
  }
};
