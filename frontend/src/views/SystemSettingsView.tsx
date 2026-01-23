import React, { useState, useEffect, useRef } from 'react';
import { Activity, HardDrive, Download, Upload, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storageService';
import { AuditLog } from '../types';

export function SystemSettingsView() {
    const [activeTab, setActiveTab] = useState<'logs' | 'system'>('logs');
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Backup State
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const restoreInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab === 'logs') {
            loadLogs();
        }
    }, [activeTab]);

    const loadLogs = async () => {
        setLogs(await AuthService.getLogs());
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
            if (restoreInputRef.current) restoreInputRef.current.value = '';
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
                if (restoreInputRef.current) restoreInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const filteredLogs = logs.filter(l =>
        l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.details.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex bg-white">
            {/* Sidebar Navigation for Settings */}
            <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col pt-6">
                <div className="px-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800">系统设置</h2>
                </div>
                <nav className="flex-1 space-y-1">
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`w-full px-6 py-3 text-sm font-medium text-left flex items-center gap-3 transition-colors ${activeTab === 'logs' ? 'bg-white border-r-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Activity size={18} />
                        <span>操作日志</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`w-full px-6 py-3 text-sm font-medium text-left flex items-center gap-3 transition-colors ${activeTab === 'system' ? 'bg-white border-r-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <HardDrive size={18} />
                        <span>备份维护</span>
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeTab === 'logs' && (
                    <>
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">系统操作日志</h3>
                                <p className="text-sm text-gray-500 mt-1">查看所有用户的敏感操作记录</p>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none w-64 transition-all"
                                    placeholder="搜索日志..."
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
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">时间</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">用户</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">动作</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">详情</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {log.username}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                    <span className={`px-2.5 py-1 rounded-full font-medium ${log.action.includes('DELETE') ? 'bg-red-50 text-red-700' :
                                                            log.action.includes('CREATE') || log.action.includes('ADD') ? 'bg-green-50 text-green-700' :
                                                                'bg-blue-50 text-blue-700'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate" title={log.details}>
                                                    {log.details}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredLogs.length === 0 && (
                                    <div className="p-12 text-center text-gray-400 text-sm">暂无日志数据</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'system' && (
                    <div className="p-8 max-w-4xl mx-auto w-full">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-gray-900">数据备份与恢复</h3>
                            <p className="text-gray-500 mt-2">定期备份可防止数据意外丢失，恢复操作将覆盖当前数据。</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Backup Card */}
                            <div className="bg-white border boundary-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                    <Download size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-2">全量备份 (Export)</h4>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                    将当前的行程库、资源库、用户配置等所有数据打包下载为 JSON 文件。建议在版本更新前执行。
                                </p>
                                <button
                                    onClick={handleBackup}
                                    disabled={isBackupLoading}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-blue-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isBackupLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                    开始备份
                                </button>
                            </div>

                            {/* Restore Card */}
                            <div className="bg-white border boundary-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6">
                                    <Upload size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-2">数据恢复 (Restore)</h4>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    上传备份文件覆盖云端。
                                    <br />
                                    <span className="text-orange-600 text-xs bg-orange-50 px-2 py-1 rounded mt-2 inline-block">
                                        <AlertTriangle size={10} className="inline mr-1" />
                                        警告：此操作将覆盖所有当前数据
                                    </span>
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
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-orange-300 hover:text-orange-600 transition-all disabled:opacity-50"
                                >
                                    {isBackupLoading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                    选择备份文件
                                </button>
                            </div>
                        </div>

                        {/* Status Bar */}
                        {backupStatus && (
                            <div className="mt-8 p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center gap-2 animate-fade-in text-sm font-medium text-gray-700">
                                {backupStatus}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
