
import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Activity, Trash2, Search, ShieldAlert, HardDrive, Download, Upload, AlertTriangle, CheckCircle, Loader2, UserCheck, Database, Clock, User as UserIcon, Settings as SettingsIcon, Save } from 'lucide-react';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storageService';
import { User, AuditLog, UserRole, ResourceMetadata } from '../types';

interface AdminDashboardProps {
  currentUser: User;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'system'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // System Info State
  const [resourceMeta, setResourceMeta] = useState<ResourceMetadata | null>(null);
  const [systemConfig, setSystemConfig] = useState<{ defaultMargin: number }>({ defaultMargin: 20 });
  const [configSaved, setConfigSaved] = useState(false);

  // Backup State
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const refreshData = async () => {
    if (activeTab === 'logs') {
        setLogs(await AuthService.getLogs());
    } else if (activeTab === 'users') {
        setUsers(await AuthService.getUsers());
    } else if (activeTab === 'system') {
        setResourceMeta(await StorageService.getResourceMetadata());
        setSystemConfig(await StorageService.getSystemConfig());
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

  const handleUpdateRole = async (username: string, newRole: UserRole) => {
      if (username === 'admin') {
          alert("无法修改超级管理员权限");
          return;
      }
      if (window.confirm(`确定将用户 "${username}" 的权限修改为 "${newRole === 'admin' ? '管理员' : '普通用户'}" 吗?`)) {
          const success = await AuthService.updateUserRole(username, newRole, currentUser);
          if (success) {
              refreshData();
          } else {
              alert("修改失败，请检查网络或权限。");
          }
      }
  };

  const handleSaveConfig = async () => {
      await StorageService.saveSystemConfig(systemConfig);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleBackup = async () => {
      try {
          setIsBackupLoading(true);
          setBackupStatus('正在从云端下载数据...');
          const data = await StorageService.createBackup();
          
          // Create Blob and Download
          const jsonString = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `travel_builder_backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setBackupStatus('✅ 备份下载成功');
          setTimeout(() => setBackupStatus(''), 3000);
      } catch (e) {
          console.error(e);
          setBackupStatus('❌ 备份失败，请检查网络');
      } finally {
          setIsBackupLoading(false);
      }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.confirm("警告：恢复操作将覆盖当前云端的同名数据。\n建议先进行一次备份。\n\n是否继续？")) {
          if(restoreInputRef.current) restoreInputRef.current.value = '';
          return;
      }

      setIsBackupLoading(true);
      setBackupStatus('正在读取文件...');

      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const json = JSON.parse(evt.target?.result as string);
              if (!Array.isArray(json)) throw new Error("Invalid format");
              
              setBackupStatus('正在上传至云端...');
              await StorageService.restoreBackup(json);
              
              setBackupStatus('✅ 恢复成功！请刷新页面以加载新数据。');
              setTimeout(() => window.location.reload(), 2000);
          } catch (e) {
              console.error(e);
              setBackupStatus('❌ 恢复失败：文件格式错误或网络中断');
          } finally {
              setIsBackupLoading(false);
              if(restoreInputRef.current) restoreInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
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
                <button 
                    onClick={() => setActiveTab('system')}
                    className={`px-6 py-3 text-sm font-medium text-left flex items-center gap-2 ${activeTab === 'system' ? 'bg-white border-r-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <HardDrive size={16}/> 系统维护
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col bg-white">
                {activeTab !== 'system' && (
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
                )}

                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'logs' && (
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
                    )}

                    {activeTab === 'users' && (
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
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center w-fit gap-1"><ShieldAlert size={10}/> 管理员</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">普通用户</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.username !== 'admin' && (
                                                <div className="flex justify-end gap-2 items-center">
                                                    {u.role !== 'admin' ? (
                                                        <button 
                                                            onClick={() => handleUpdateRole(u.username, 'admin')} 
                                                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1 text-xs px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                                            title="提升为管理员"
                                                        >
                                                            <UserCheck size={14}/> 设为管理
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleUpdateRole(u.username, 'user')} 
                                                            className="text-orange-600 hover:text-orange-900 flex items-center gap-1 text-xs px-2 py-1 hover:bg-orange-50 rounded transition-colors"
                                                            title="降级为普通用户"
                                                        >
                                                            <ShieldAlert size={14}/> 取消管理
                                                        </button>
                                                    )}
                                                    <div className="w-px h-4 bg-gray-300"></div>
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.username)} 
                                                        className="text-red-600 hover:text-red-900 flex items-center gap-1 text-xs px-2 py-1 hover:bg-red-50 rounded transition-colors"
                                                        title="删除用户"
                                                    >
                                                        <Trash2 size={14}/> 删除
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'system' && (
                        <div className="max-w-3xl mx-auto py-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <HardDrive size={24} className="text-blue-600"/> 系统维护与配置
                            </h2>
                            
                            {/* Resource Database Status */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Database size={18} className="text-purple-600"/> 资源库状态
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">云端资源数据库 (POI, 车型, 酒店等)</p>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        <Clock size={16} className="text-gray-400"/>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">最近更新</span>
                                            <span className="text-sm font-medium text-gray-700">
                                                {resourceMeta ? new Date(resourceMeta.lastUpdated).toLocaleString() : '暂无记录'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        <UserIcon size={16} className="text-gray-400"/>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">更新人</span>
                                            <span className="text-sm font-medium text-gray-700">
                                                {resourceMeta?.updatedBy || '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Global Config Card */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <SettingsIcon size={18} className="text-blue-600"/> 全局默认参数
                                    </h3>
                                    <button 
                                        onClick={handleSaveConfig}
                                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${configSaved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    >
                                        {configSaved ? <CheckCircle size={14}/> : <Save size={14}/>}
                                        {configSaved ? '已保存' : '保存配置'}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">默认报价利润率 (%)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={systemConfig.defaultMargin} 
                                            onChange={(e) => setSystemConfig({...systemConfig, defaultMargin: parseInt(e.target.value)})}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className="text-lg font-bold text-blue-600 w-12 text-right">{systemConfig.defaultMargin}%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        说明：普通用户无法调节利润率，系统将强制使用此默认值进行报价计算。
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Backup Card */}
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                            <Download size={24}/>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">全量备份 (Export)</h3>
                                            <p className="text-sm text-gray-500">下载当前云端所有数据</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-6 flex-1">
                                        将当前的行程库、资源库、用户配置等所有数据打包下载为 JSON 文件。建议在版本更新前执行。
                                    </p>
                                    <button 
                                        onClick={handleBackup} 
                                        disabled={isBackupLoading}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {isBackupLoading ? <Loader2 className="animate-spin"/> : <Download size={18}/>}
                                        开始备份
                                    </button>
                                </div>

                                {/* Restore Card */}
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                                            <Upload size={24}/>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">数据恢复 (Restore)</h3>
                                            <p className="text-sm text-gray-500">上传备份文件覆盖云端</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-6">
                                        <AlertTriangle size={14} className="inline mr-1 text-orange-500"/>
                                        警告：此操作将使用备份文件中的数据<span className="font-bold text-red-600">覆盖</span>当前云端数据库。请谨慎操作。
                                    </p>
                                    <input 
                                        type="file" 
                                        ref={restoreInputRef}
                                        accept=".json"
                                        onChange={handleRestore}
                                        className="hidden"
                                    />
                                    <button 
                                        onClick={() => restoreInputRef.current?.click()} 
                                        disabled={isBackupLoading}
                                        className="w-full py-2.5 bg-white border border-orange-300 text-orange-700 font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors disabled:opacity-50"
                                    >
                                        {isBackupLoading ? <Loader2 className="animate-spin"/> : <Upload size={18}/>}
                                        选择备份文件
                                    </button>
                                </div>
                            </div>

                            {/* Status Bar */}
                            {backupStatus && (
                                <div className="mt-8 p-4 bg-gray-100 rounded-lg flex items-center justify-center gap-2 animate-fade-in">
                                    <span className="font-medium text-gray-700">{backupStatus}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
