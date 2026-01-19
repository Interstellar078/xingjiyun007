
import React, { useState, useEffect } from 'react';
import { X, Users, Activity, Trash2, Search, ShieldAlert } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User, AuditLog } from '../types';

interface AdminDashboardProps {
  currentUser: User;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'users'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const refreshData = async () => {
    if (activeTab === 'logs') {
        setLogs(await AuthService.getLogs());
    } else {
        setUsers(await AuthService.getUsers());
    }
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

  const filteredLogs = logs.filter(l => 
      l.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-900 text-white flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert size={20} className="text-red-400"/> 管理员控制台
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 bg-gray-50 border-r border-gray-200 pt-4 flex flex-col">
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 text-sm font-medium text-left flex items-center gap-2 ${activeTab === 'logs' ? 'bg-white border-r-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <Activity size={16}/> 操作日志
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 text-sm font-medium text-left flex items-center gap-2 ${activeTab === 'users' ? 'bg-white border-r-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <Users size={16}/> 用户管理
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h4 className="font-bold text-gray-700">{activeTab === 'logs' ? '系统操作日志' : '注册用户列表'}</h4>
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400"/>
                        <input 
                            type="text" 
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="搜索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'logs' ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">动作</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {log.username}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                                            <span className={`px-2 py-1 rounded-full font-medium ${
                                                log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                                log.action.includes('CREATE') || log.action.includes('ADD') ? 'bg-green-100 text-green-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500 max-w-md truncate" title={log.details}>
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map(u => (
                                    <tr key={u.username} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                            {u.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {u.role === 'admin' ? (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">管理员</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">普通用户</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.username !== 'admin' && (
                                                <button onClick={() => handleDeleteUser(u.username)} className="text-red-600 hover:text-red-900 flex items-center justify-end gap-1 w-full">
                                                    <Trash2 size={16}/> 删除
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
