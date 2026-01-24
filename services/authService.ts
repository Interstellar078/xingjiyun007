
import { User, AuditLog, UserRole } from '../types';
import { SupabaseManager } from './supabaseClient';
import { StorageService } from './storageService';

// Helper to generate a consistent, valid email from any username input
// This strategy avoids conflicts with real email addresses and handles special characters safely.
const getEmailFromUsername = (username: string): string => {
    const clean = username.trim();
    // 1. If it looks like a real email, use it directly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(clean)) return clean;

    // 2. Otherwise, construct a fake email.
    // Use encodeURIComponent to handle Unicode (Chinese), spaces, and special chars.
    // Replace '%' with '_' to ensure the local-part is safe for strict email validators.
    const safeName = encodeURIComponent(clean).replace(/%/g, '_');
    return `${safeName}@travel.user`; // Use a dummy domain to prevent conflict with real users
};

export const AuthService = {
    init: async () => {
        // No-op for Supabase usually
    },

    // --- User Management ---
    getUsers: async (): Promise<User[]> => {
        return await StorageService.getUserProfiles();
    },

    updateUserRole: async (targetUsername: string, newRole: UserRole, operator: User): Promise<boolean> => {
        if (operator.role !== 'admin') return false;
        
        const client = SupabaseManager.getClient();
        if (!client) return false;

        // 1. Get existing profile from app_data
        // We interact with the DB profile because we cannot change another user's Auth metadata from the client side.
        const { data } = await client
            .from('app_data')
            .select('value')
            .eq('key', `user_profile_${targetUsername}`)
            .single();
        
        if (!data || !data.value) return false;

        const profile = data.value as User;
        
        // 2. Update role locally
        const updatedProfile = { ...profile, role: newRole };
        
        // 3. Save back to DB
        try {
            await StorageService.saveUserProfile(updatedProfile);
            return true;
        } catch (e) {
            console.error("Failed to update user role", e);
            return false;
        }
    },

    register: async (username: string, password: string): Promise<{ success: boolean, message: string }> => {
        const client = SupabaseManager.getClient();
        if (!client) return { success: false, message: '未连接云端服务，请先配置 Supabase' };

        if (password.length < 6) {
            return { success: false, message: '密码长度至少需6位' };
        }

        const cleanUsername = username.trim();
        const email = getEmailFromUsername(cleanUsername);

        console.log(`[Auth] Registering: User="${cleanUsername}" -> Email="${email}"`);

        // 1. Create Auth User
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                // CHANGE: Default role is now 'user' instead of 'admin'
                data: { username: cleanUsername, role: 'user' } 
            }
        });

        if (error) {
            console.error("Supabase SignUp Error:", error);
            // Translate common errors
            if (error.message.includes('already registered')) return { success: false, message: '该用户名已被注册' };
            if (error.message.includes('invalid')) return { success: false, message: `注册格式错误: ${error.message}` };
            return { success: false, message: `注册失败: ${error.message}` };
        }

        // 2. Create Public Profile Record in app_data
        if (data.user) {
            const newUser: User = {
                username: cleanUsername,
                password: '', // Do not store password in public profile
                // CHANGE: Default role is now 'user' instead of 'admin'
                role: 'user',
                createdAt: Date.now()
            };
            
            try {
                await StorageService.saveUserProfile(newUser);
                console.log(`[Auth] Profile saved for ${cleanUsername}`);
            } catch (storageError: any) {
                console.error("Profile Save Error:", storageError);
                return { success: true, message: '账号创建成功，但用户资料保存失败(可能是网络问题)，请尝试直接登录。' };
            }

            // 3. Check for Email Confirmation requirement
            // If session is null, it means auto-confirm is OFF in Supabase and email verification is required.
            // Since we use fake emails, this MUST be disabled in Supabase.
            if (!data.session) {
                 return { 
                     success: true, 
                     message: '注册成功！【重要提示】检测到未自动登录，请务必在 Supabase 后台 (Authentication -> Providers -> Email) 中关闭 "Confirm email" 选项，否则无法使用此用户名登录。' 
                 };
            }
        }

        return { success: true, message: '注册成功！' };
    },

    login: async (username: string, password: string): Promise<{ success: boolean, user?: User, message: string }> => {
        const client = SupabaseManager.getClient();
        if (!client) return { success: false, message: '未连接云端服务' };

        const cleanUsername = username.trim();
        const email = getEmailFromUsername(cleanUsername);

        console.log(`[Auth] Logging in: User="${cleanUsername}" -> Email="${email}"`);

        // Attempt normal login
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        // --- Admin Bootstrap Logic (Emergency Backdoor for first run) ---
        // If login failed, but credentials match the seed admin, try to create it on the fly.
        if (error && cleanUsername === 'admin' && password === 'liuwen') {
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
            } else if (signUpError) {
                console.warn("Bootstrap failed (User likely exists but password mismatch):", signUpError.message);
            }
        }
        // -----------------------------

        if (error) {
            console.error("Login Error:", error);
            if (error.message.includes('Invalid login credentials')) {
                return { success: false, message: '用户名或密码错误。注意：如果是刚注册，请检查 Supabase 后台是否关闭了邮箱验证 (Confirm Email)。' };
            }
            if (error.message.includes('Email not confirmed')) return { success: false, message: '登录失败：邮箱未验证。请在 Supabase 后台 Authentication -> Providers -> Email 中关闭 "Confirm email" 选项。' };
            return { success: false, message: `登录失败: ${error.message}` };
        }
        
        if (data.user) {
            const username = data.user.user_metadata.username || cleanUsername;
            
            // Fetch Role Priority: 
            // 1. Check 'app_data' profile (Allow admins to change roles)
            // 2. Fallback to Auth Metadata
            let role: UserRole = (data.user.user_metadata.role as UserRole) || 'user';
            
            try {
                const { data: profileData } = await client
                    .from('app_data')
                    .select('value')
                    .eq('key', `user_profile_${username}`)
                    .single();
                
                if (profileData && profileData.value && profileData.value.role) {
                    role = profileData.value.role;
                }
            } catch (e) {
                // Ignore error, keep auth metadata role
            }

            const user: User = {
                username,
                password: '',
                role,
                createdAt: new Date(data.user.created_at).getTime()
            };
            
            // Ensure profile exists in DB (sync fix for old users or missed profile creation)
            try {
                await StorageService.saveUserProfile(user);
            } catch (e) {
                console.warn("Failed to sync profile on login", e);
            }
            
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
            const username = session.user.user_metadata.username || session.user.email || 'User';
            
            // Fetch Role Priority: DB Profile > Auth Metadata
            let role: UserRole = (session.user.user_metadata.role as UserRole) || 'user';
            
            try {
                const { data } = await client
                    .from('app_data')
                    .select('value')
                    .eq('key', `user_profile_${username}`)
                    .single();
                
                if (data && data.value && data.value.role) {
                    role = data.value.role;
                }
            } catch (e) {
                // Ignore error
            }

            return {
                username: username,
                password: '',
                role: role,
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
