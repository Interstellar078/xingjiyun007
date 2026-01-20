import { User, AuditLog } from '../types';
import { apiGet, apiPost, apiDelete, setAuthToken, getAuthToken } from './apiClient';

export const AuthService = {
    init: async () => {
        // No-op for API client
    },

    // --- User Management ---
    getUsers: async (): Promise<User[]> => {
        try {
            return await apiGet<User[]>(`/api/admin/users`);
        } catch {
            return [];
        }
    },

    register: async (username: string, password: string): Promise<{ success: boolean, message: string }> => {
        try {
            const result = await apiPost<{ success: boolean; message: string }>(`/api/auth/register`, {
                username,
                password
            });
            return { success: result.success, message: result.message };
        } catch (err: any) {
            return { success: false, message: err.message || '注册失败' };
        }
    },

    login: async (username: string, password: string): Promise<{ success: boolean, user?: User, message: string }> => {
        try {
            const result = await apiPost<{ success: boolean; message: string; user?: User; token?: string }>(
                `/api/auth/login`,
                { username, password }
            );
            if (result.success && result.token) {
                setAuthToken(result.token);
            }
            return { success: result.success, user: result.user, message: result.message };
        } catch (err: any) {
            return { success: false, message: err.message || '登录失败' };
        }
    },

    logout: async () => {
        try {
            await apiPost(`/api/auth/logout`);
        } catch {
            // ignore
        }
        setAuthToken(null);
    },

    getCurrentUser: async (): Promise<User | null> => {
        if (!getAuthToken()) return null;
        try {
            return await apiGet<User>(`/api/auth/me`);
        } catch {
            setAuthToken(null);
            return null;
        }
    },

    deleteUser: async (username: string, operator: User): Promise<boolean> => {
        if (operator.role !== 'admin') return false;
        try {
            const result = await apiDelete<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(username)}`);
            return result.success;
        } catch {
            return false;
        }
    },

    logAction: async (username: string, action: string, details: string) => {
        console.log(`[Audit] ${username} ${action}: ${details}`);
    },

    getLogs: async (): Promise<AuditLog[]> => {
        try {
            return await apiGet<AuditLog[]>(`/api/admin/logs`);
        } catch {
            return [];
        }
    }
};
