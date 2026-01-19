
import { User, AuditLog, UserRole } from '../types';
import { generateUUID } from '../utils/dateUtils';
import { SupabaseManager } from './supabaseClient';

// We map Supabase User to our App User type
// We store 'role' in user_metadata

export const AuthService = {
    init: async () => {
        // No-op for Supabase usually, session is auto-restored
        const client = SupabaseManager.getClient();
        if(!client) return;
    },

    // --- User Management ---
    
    // In a real app, listing all users requires Admin API or a specific public table.
    // For simplicity here, we might not be able to "list all users" easily without server-side code.
    // We will stub this or use a workaround if we had a 'profiles' table.
    getUsers: async (): Promise<User[]> => {
        // Implementation limitation: Client-side cannot list all users securely by default.
        // We will return empty or just current user for now to prevent errors.
        return [];
    },

    register: async (username: string, password: string): Promise<{ success: boolean, message: string }> => {
        const client = SupabaseManager.getClient();
        if (!client) return { success: false, message: '未连接云端服务' };

        // We use email for Supabase, so we append a fake domain if username is simple
        const email = username.includes('@') ? username : `${username}@example.com`;

        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { username, role: 'user' } // Default role
            }
        });

        if (error) return { success: false, message: error.message };
        return { success: true, message: '注册成功！' };
    },

    login: async (username: string, password: string): Promise<{ success: boolean, user?: User, message: string }> => {
        const client = SupabaseManager.getClient();
        if (!client) return { success: false, message: '未连接云端服务' };

        const email = username.includes('@') ? username : `${username}@example.com`;

        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) return { success: false, message: '用户名或密码错误' };
        if (data.user) {
            const user: User = {
                username: data.user.user_metadata.username || email,
                password: '', // Don't store
                role: (data.user.user_metadata.role as UserRole) || 'user',
                createdAt: new Date(data.user.created_at).getTime()
            };
            return { success: true, user, message: '登录成功' };
        }
        return { success: false, message: '未知错误' };
    },

    logout: async () => {
        const client = SupabaseManager.getClient();
        if (client) await client.auth.signOut();
    },

    getCurrentUser: async (): Promise<User | null> => {
        const client = SupabaseManager.getClient();
        if (!client) return null;

        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
            return {
                username: session.user.user_metadata.username || session.user.email || 'User',
                password: '',
                role: (session.user.user_metadata.role as UserRole) || 'user',
                createdAt: new Date(session.user.created_at).getTime()
            };
        }
        return null;
    },

    deleteUser: async (username: string, operator: User): Promise<boolean> => {
        // Stub implementation for client-side demo
        console.log(`User ${operator.username} requesting delete of ${username}`);
        if(operator.role !== 'admin') return false;
        // In real app: Call backend function or use service role
        return true;
    },

    // --- Audit Logging (Cloud Table) ---
    // We assume a table 'audit_logs' exists, or we skip logging if strict tables not set up
    logAction: async (username: string, action: string, details: string) => {
        // Implementation optional for this demo scope
        console.log(`[Audit] ${username} ${action}: ${details}`);
    },

    getLogs: async (): Promise<AuditLog[]> => {
        return [];
    }
};
