
import { User, AuditLog, UserRole } from '../types';
import { SupabaseManager } from './supabaseClient';
import { StorageService } from './storageService';

export const AuthService = {
    init: async () => {
        // No-op for Supabase usually
    },

    // --- User Management ---
    getUsers: async (): Promise<User[]> => {
        // Now fetches real list from DB
        return await StorageService.getUserProfiles();
    },

    register: async (username: string, password: string): Promise<{ success: boolean, message: string }> => {
        const client = SupabaseManager.getClient();
        if (!client) return { success: false, message: '未连接云端服务' };

        const email = username.includes('@') ? username : `${username}@example.com`;

        // 1. Create Auth User
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { username, role: 'user' }
            }
        });

        if (error) return { success: false, message: error.message };

        // 2. Create Public Profile Record (for Admin Dashboard listing)
        if (data.user) {
            const newUser: User = {
                username: username,
                password: '', // Don't store password
                role: 'user',
                createdAt: Date.now()
            };
            await StorageService.saveUserProfile(newUser);
        }

        return { success: true, message: '注册成功！' };
    },

    login: async (username: string, password: string): Promise<{ success: boolean, user?: User, message: string }> => {
        const client = SupabaseManager.getClient();
        if (!client) return { success: false, message: '未连接云端服务' };

        const email = username.includes('@') ? username : `${username}@example.com`;

        // Attempt normal login
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        // --- Admin Bootstrap Logic ---
        // If login failed, but credentials match the seed admin, try to create it on the fly.
        if (error && username === 'admin' && password === 'liuwen') {
            console.log("Attempting to bootstrap Admin account...");
            const { data: signUpData, error: signUpError } = await client.auth.signUp({
                email,
                password,
                options: { data: { username: 'admin', role: 'admin' } }
            });

            if (!signUpError && signUpData.user) {
                const adminUser: User = {
                    username: 'admin',
                    password: '',
                    role: 'admin',
                    createdAt: Date.now()
                };
                await StorageService.saveUserProfile(adminUser);
                return { success: true, user: adminUser, message: '管理员账户初始化成功' };
            }
        }
        // -----------------------------

        if (error) return { success: false, message: '用户名或密码错误' };
        
        if (data.user) {
            const user: User = {
                username: data.user.user_metadata.username || email,
                password: '',
                role: (data.user.user_metadata.role as UserRole) || 'user',
                createdAt: new Date(data.user.created_at).getTime()
            };
            // Ensure profile exists in DB (sync fix for old users)
            await StorageService.saveUserProfile(user);
            
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
        if(operator.role !== 'admin') return false;
        // Only deletes the public profile for display. 
        // Cannot delete Auth User from client side without Service Key.
        await StorageService.deleteUserProfile(username);
        return true;
    },

    logAction: async (username: string, action: string, details: string) => {
        console.log(`[Audit] ${username} ${action}: ${details}`);
    },

    getLogs: async (): Promise<AuditLog[]> => {
        return [];
    }
};
