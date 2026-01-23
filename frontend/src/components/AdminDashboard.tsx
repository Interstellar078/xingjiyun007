
import React, { useState, useEffect } from 'react';
import { Users, Trash2, Search, ShieldAlert, X } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User, AuditLog } from '../types';

interface AdminDashboardProps {
    currentUser: User;
    onClose: () => void;
    variant?: 'modal' | 'page';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose, variant = 'modal' }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setUsers(await AuthService.getUsers());
    };

    const handleDeleteUser = async (username: string) => {
        if (window.confirm(`确定要删除用户 "${username}" 吗? 该操作不可恢复。`)) {
            const success = await AuthService.deleteUser(username, currentUser);
            if (success) {
                refreshData();
            } else {
                alert("删除失败：无法删除管理员或自身。");
            }
        }
    };

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

    const containerClass = variant === 'modal'
        ? "fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
        : "w-full h-full flex flex-col bg-white overflow-hidden";

    const innerClass = variant === 'modal'
        ? "bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        : "w-full h-full flex flex-col overflow-hidden";

    return (
        <div className={containerClass}>
            <div className={innerClass}>
                {/* Header - Only Show in Modal Mode or if desired in Page Mode */}
                {variant === 'modal' && (
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-900 text-white flex justify-between items-center">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <ShieldAlert size={20} className="text-red-400" /> 用户管理
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar - REMOVED since this is now dedicated to one function */}

                    {/* Content */}
                    <div className="flex-1 flex flex-col bg-white">
                        <div className="px-8 py-6 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h4 className="text-2xl font-bold text-gray-900 tracking-tight">用户管理</h4>
                                <p className="text-sm text-gray-500 mt-1">管理系统注册用户与权限</p>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none w-64 transition-all"
                                    placeholder="搜索用户..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">用户名</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">角色</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">注册时间</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredUsers.map(u => (
                                            <tr key={u.username} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                    {u.username}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {u.role === 'admin' ? (
                                                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100">管理员</span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">普通用户</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {u.username !== 'admin' && (
                                                        <button onClick={() => handleDeleteUser(u.username)} className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto">
                                                            <Trash2 size={14} /> 删除
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
