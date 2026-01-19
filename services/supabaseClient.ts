
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_CONFIG = 'travel_builder_supabase_config';

export interface SupabaseConfig {
    url: string;
    key: string;
}

let supabaseInstance: SupabaseClient | null = null;

export const SupabaseManager = {
    getConfig: (): SupabaseConfig | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    },

    saveConfig: (config: SupabaseConfig) => {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
        // Force client recreation
        supabaseInstance = createClient(config.url, config.key);
    },

    clearConfig: () => {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
        supabaseInstance = null;
    },

    getClient: (): SupabaseClient | null => {
        if (supabaseInstance) return supabaseInstance;

        const config = SupabaseManager.getConfig();
        if (config && config.url && config.key) {
            try {
                supabaseInstance = createClient(config.url, config.key);
                return supabaseInstance;
            } catch (e) {
                console.error("Failed to initialize Supabase client", e);
                return null;
            }
        }
        return null;
    },

    isConfigured: (): boolean => {
        const config = SupabaseManager.getConfig();
        return !!(config && config.url && config.key);
    }
};
