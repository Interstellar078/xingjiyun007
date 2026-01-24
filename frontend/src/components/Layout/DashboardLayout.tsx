import React, { useState } from 'react';
import { UserRole, User } from '../../types';
import {
    LogOut,
    User as UserIcon,
    Bell,
    Rocket,
    Map,
    Database,
    Settings,
    Users,
    LayoutDashboard,
    FolderOpen
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    userRole: UserRole;
    currentView: string;
    onViewChange: (view: string) => void;
    currentUser: User | null;
    onLogout: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    userRole,
    currentView,
    onViewChange,
    currentUser,
    onLogout
}) => {

    // Define menu items based on role
    const menuItems = userRole === 'admin' ? [
        { id: 'dashboard', label: '数据看板', icon: LayoutDashboard },
        { id: 'planner', label: '行程规划', icon: Map },
        { id: 'my-trips', label: '我的行程', icon: FolderOpen },
        { id: 'users', label: '用户管理', icon: Users },
        { id: 'resources', label: '资源库', icon: Database },
        { id: 'settings', label: '系统设置', icon: Settings },
    ] : [
        { id: 'planner', label: '行程规划', icon: Map },
        { id: 'my-trips', label: '我的行程', icon: FolderOpen },
        { id: 'resources', label: '资源库', icon: Database },
    ];

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Top Header */}
            <header className="h-16 bg-slate-900 border-b border-gray-800 flex items-center justify-between px-6 shadow-md shrink-0 z-20 text-white">

                {/* Left: Logo & Navigation */}
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
                            <Rocket size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            星际云旅行
                        </span>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex items-center gap-1">
                        {menuItems.map(item => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onViewChange(item.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Right: User Profile & Actions */}
                <div className="flex items-center gap-4">
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
                    </button>

                    <div className="h-6 w-[1px] bg-gray-700 mx-1"></div>

                    <div className="flex items-center gap-3 pl-2">
                        <div className="flex flex-col items-end justify-center">
                            <span className="text-sm font-medium text-gray-200">{currentUser?.username || 'User'}</span>
                        </div>
                        <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-blue-400">
                            <UserIcon size={18} />
                        </div>

                        <button
                            onClick={onLogout}
                            className="ml-2 p-2 text-gray-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="退出登录"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className={`flex-1 bg-[#f8fafc] w-full ${(currentView === 'planner' || currentView === 'resources' || currentView === 'users' || currentView === 'settings') ? 'p-0 overflow-hidden relative' : 'p-6 overflow-auto'}`}>
                {children}
            </main>
        </div>
    );
};
