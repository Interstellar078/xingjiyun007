import React, { useState } from 'react';
import {
    Rocket,
    Map,
    Database,
    Settings,
    Users,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    FolderOpen
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
    userRole: UserRole;
    currentView: string;
    onViewChange: (view: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    userRole,
    currentView,
    onViewChange,
    collapsed,
    onToggleCollapse
}) => {

    const menuItems = userRole === 'admin' ? [
        { id: 'dashboard', label: '控制台', icon: LayoutDashboard },
        { id: 'users', label: '用户管理', icon: Users },
        { id: 'resources', label: '资源库', icon: Database },
        { id: 'settings', label: '系统设置', icon: Settings },
    ] : [
        { id: 'planner', label: '行程规划', icon: Map },
        { id: 'my-trips', label: '我的行程', icon: FolderOpen },
        { id: 'resources', label: '资源库', icon: Database },
    ];

    return (
        <div
            className={`relative flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
                } border-r border-slate-700 shadow-xl z-20`}
        >
            {/* Logo Header */}
            <div className={`flex items-center h-16 px-4 bg-slate-950/50 ${collapsed ? 'justify-center' : ''}`}>
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-blue-500/20 shrink-0">
                    <Rocket size={20} className="text-white" />
                </div>
                {!collapsed && (
                    <span className="ml-3 font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent whitespace-nowrap">
                        星际云旅行
                    </span>
                )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 py-6 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`w-full flex items-center px-4 py-3 transition-colors relative group ${isActive
                                    ? 'bg-blue-600/20 text-blue-400'
                                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            title={collapsed ? item.label : ''}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            )}

                            <div className={`flex items-center ${collapsed ? 'justify-center w-full' : ''}`}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-md' : ''} />
                                {!collapsed && (
                                    <span className={`ml-3 font-medium ${isActive ? 'text-white' : ''} whitespace-nowrap`}>
                                        {item.label}
                                    </span>
                                )}
                            </div>

                            {/* Tooltip for collapsed mode */}
                            {collapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Collapse Toggle */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={onToggleCollapse}
                    className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 transition-colors"
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
        </div>
    );
};
