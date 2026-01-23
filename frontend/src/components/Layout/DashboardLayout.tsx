import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { UserRole, User } from '../../types';
import { LogOut, User as UserIcon, Bell } from 'lucide-react';

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
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                userRole={userRole}
                currentView={currentView}
                onViewChange={onViewChange}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(!collapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                    {/* Left: Breadcrumb / Title (Dynamic based on view) */}
                    <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
                        {currentView === 'planner' ? '行程规划' :
                            currentView === 'my-trips' ? '我的行程' :
                                currentView === 'resources' ? '资源库' :
                                    currentView === 'dashboard' ? '控制台' :
                                        currentView === 'users' ? '用户管理' :
                                            currentView === 'settings' ? '系统设置' : '星际云旅行'}
                    </h2>

                    {/* Right: User Profile & Actions */}
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>

                        <div className="flex items-center gap-3 pl-2">
                            <div className="flex flex-col items-end justify-center">
                                <span className="text-sm font-medium text-gray-800">{currentUser?.username || 'User'}</span>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border border-blue-200 text-blue-600">
                                <UserIcon size={20} />
                            </div>

                            <button
                                onClick={onLogout}
                                className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="退出登录"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Scrollable Main Content */}
                <main className={`flex-1 bg-[#f8fafc] ${(currentView === 'planner' || currentView === 'resources' || currentView === 'users' || currentView === 'settings') ? 'p-0 overflow-hidden' : 'p-6 overflow-auto'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
};
