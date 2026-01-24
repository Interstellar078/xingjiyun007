
import { SavedTrip, CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile, User, ResourceMetadata } from '../types';
import { SupabaseManager } from './supabaseClient';

const KEYS = {
  DB_CARS: 'travel_builder_db_cars',
  DB_CITIES: 'travel_builder_db_poi_cities',
  DB_SPOTS: 'travel_builder_db_poi_spots',
  DB_HOTELS: 'travel_builder_db_poi_hotels_v2',
  DB_ACTIVITIES: 'travel_builder_db_poi_activities',
  DB_FILES: 'travel_builder_db_country_files',
  DB_METADATA: 'travel_builder_db_metadata', // New Key
  HISTORY: 'travel_builder_history',
  LOCATIONS: 'travel_builder_locations_history',
  SETTINGS_GLOBAL: 'travel_builder_settings_global',
  SYSTEM_CONFIG: 'travel_builder_system_config' // New Key for system-wide settings
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
  
  // New Metadata methods
  async getResourceMetadata(): Promise<ResourceMetadata | null> { return db.get(KEYS.DB_METADATA, null); },
  async saveResourceMetadata(meta: ResourceMetadata): Promise<void> { return db.set(KEYS.DB_METADATA, meta); },

  // System Config
  async getSystemConfig(): Promise<{ defaultMargin: number }> { return db.get(KEYS.SYSTEM_CONFIG, { defaultMargin: 20 }); },
  async saveSystemConfig(config: { defaultMargin: number }): Promise<void> { return db.set(KEYS.SYSTEM_CONFIG, config); },

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

  // --- Migration: LocalStorage -> Cloud ---
  // This ensures that if a user was using a local-only version, their data is synced to cloud upon upgrade.
  async migrateLocalData(): Promise<void> {
      console.log("Checking for local data migration...");
      const client = SupabaseManager.getClient();
      if (!client) return;

      const keysToMigrate = [
          KEYS.DB_CARS,
          KEYS.DB_CITIES,
          KEYS.DB_SPOTS,
          KEYS.DB_HOTELS,
          KEYS.DB_ACTIVITIES,
          KEYS.HISTORY,
          KEYS.LOCATIONS,
          KEYS.SETTINGS_GLOBAL,
          KEYS.SYSTEM_CONFIG
      ];

      for (const key of keysToMigrate) {
          try {
              // 1. Check if Cloud is empty
              const cloudData = await db.get(key, null);
              const isEmpty = !cloudData || (Array.isArray(cloudData) && cloudData.length === 0);

              // 2. Check if Local has data
              const localJson = localStorage.getItem(key);
              
              if (isEmpty && localJson) {
                  const localData = JSON.parse(localJson);
                  if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
                      console.log(`Migrating ${key} from LocalStorage to Cloud...`);
                      await db.set(key, localData);
                  }
              }
          } catch (e) {
              console.error(`Migration failed for ${key}`, e);
          }
      }
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
