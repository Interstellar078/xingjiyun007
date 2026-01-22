
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded configuration as requested.
// IMPORTANT: Please ensure "Confirm email" is DISABLED in Supabase Dashboard -> Authentication -> Providers -> Email
// Otherwise, the virtual email registration strategy will require verification emails that cannot be received.
const SUPABASE_URL = 'https://jevzroynvcrhgqvxfsvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jh-gKcvUWMwTEFEO4mRrDg_0qU6lz4K';

export interface SupabaseConfig {
    url: string;
    key: string;
}

let supabaseInstance: SupabaseClient | null = null;

export const SupabaseManager = {
    getConfig: (): SupabaseConfig => {
        return { url: SUPABASE_URL, key: SUPABASE_KEY };
    },

    saveConfig: (config: SupabaseConfig) => {
        // No-op: Configuration is hardcoded
        console.log("Configuration is hardcoded, save ignored.");
    },

    clearConfig: () => {
        // No-op
    },

    getClient: (): SupabaseClient | null => {
        if (supabaseInstance) return supabaseInstance;

        try {
            // Using the hardcoded credentials
            // Using persistSession: true (default) to keep user logged in across reloads
            supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
            return supabaseInstance;
        } catch (e) {
            console.error("Failed to initialize Supabase client", e);
            return null;
        }
    },

    isConfigured: (): boolean => {
        return true; // Always configured
    }
};
