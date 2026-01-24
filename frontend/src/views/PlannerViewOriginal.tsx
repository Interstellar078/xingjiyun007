import React, { useState, useRef } from 'react';
import {
    Plus, Trash2, Save, FolderOpen, Sparkles, Database,
    Calendar, MapPin, Clock, X, FileUp, PlusCircle,
    FileSpreadsheet, Calculator, Library, Wand2, Loader2,
    Upload, LogOut, ShieldAlert
} from 'lucide-react';
import {
    DayRow, TransportType, User,
    CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile
} from '../types';
import { GlobalSettings } from '../components/GlobalSettings';
import { Autocomplete } from '../components/Autocomplete';
import { MultiSelect } from '../components/MultiSelect';
import { AsyncAutocomplete } from '../components/AsyncAutocomplete';
import { AsyncMultiSelect } from '../components/AsyncMultiSelect';
import { resourceApi } from '../services/resourceApi';

import { CloudStorageData, CloudStorageActions } from '../hooks/useCloudStorage';
import { useTripPlanner } from '../hooks/useTripPlanner';
import { useTripManagement } from '../hooks/useTripManagement';
import { extractCitiesFromRoute, createEmptyRow } from '../utils/tripHelpers';
import { createResizableHeader } from '../utils/tableHelpers';
import * as XLSX from 'xlsx';

interface PlannerViewOriginalProps {
    currentUser: User;
    tripPlanner: ReturnType<typeof useTripPlanner>;
    tripManagement: ReturnType<typeof useTripManagement>;
    cloudStorage: {
        data: CloudStorageData;
        actions: CloudStorageActions;
        cloudStatus: 'idle' | 'syncing' | 'synced' | 'error';
    };
    onViewChange: (view: string) => void;
}

export function PlannerViewOriginal({
    currentUser,
    tripPlanner,
    tripManagement,
    cloudStorage,
    onViewChange
}: PlannerViewOriginalProps) {
    const {
        settings, setSettings, rows, setRows,
        totalCost, handleRouteUpdate
    } = tripPlanner;

    const {
        showSaveModal, setShowSaveModal, saveName, setSaveName,
        handleOpenSaveModal, handleConfirmSave,
        deleteTrip, loadTrip, activeTripId
    } = tripManagement;

    const { data: cloudData, actions: cloudActions } = cloudStorage;

    // Local state for view-specific modals
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPromptInput, setAiPromptInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Quick Save Modal State
    const [qsModal, setQsModal] = useState<{
        type: 'route' | 'hotel' | 'ticket' | 'activity';
        rowIndex: number;
        itemsDisplay: string;
        smartCountry: string;
    } | null>(null);
    const [qsSelectedCountry, setQsSelectedCountry] = useState('');

    const fileInputItineraryRef = useRef<HTMLInputElement>(null);

    // --- Helper for Quick Save ---
    const handleQuickSave = (type: 'route' | 'hotel' | 'ticket' | 'activity', rowIndex: number) => {
        const row = rows[rowIndex];
        const routeCities = extractCitiesFromRoute(row.route);
        let itemsDisplay = '';
        let targetCityName = '';

        if (type === 'route') {
            const newCities = routeCities.filter(c => !cloudData.poiCities.some(pc => pc.name === c));
            if (newCities.length === 0) { alert("路线中所有城市已存在于资源库。"); return; }
            itemsDisplay = newCities.join(', ');
        } else if (type === 'hotel') {
            if (!row.hotelName) return;
            if (cloudData.poiHotels.some(h => h.name === row.hotelName)) { alert("该酒店已存在于资源库。"); return; }
            itemsDisplay = row.hotelName;
            if (routeCities.length > 0) targetCityName = routeCities[0];
        } else if (type === 'ticket') {
            if (!row.ticketName || row.ticketName.length === 0) return;
            const newItems = row.ticketName.filter(n => !cloudData.poiSpots.some(s => s.name === n));
            if (newItems.length === 0) { alert("所选景点已全部存在。"); return; }
            itemsDisplay = newItems.join(', ');
            if (routeCities.length > 0) targetCityName = routeCities[0];
        } else if (type === 'activity') {
            if (!row.activityName || row.activityName.length === 0) return;
            const newItems = row.activityName.filter(n => !cloudData.poiActivities.some(a => a.name === n));
            if (newItems.length === 0) { alert("所选活动已全部存在。"); return; }
            itemsDisplay = newItems.join(', ');
            if (routeCities.length > 0) targetCityName = routeCities[0];
        }

        // Smart Country Detection
        let detectedCountry = '';
        if (settings.destinations.length > 0) detectedCountry = settings.destinations[0];
        if (targetCityName) {
            const cityObj = cloudData.poiCities.find(c => c.name === targetCityName);
            if (cityObj) detectedCountry = cityObj.country;
        }

        setQsModal({ type, rowIndex, itemsDisplay, smartCountry: detectedCountry });
        setQsSelectedCountry(detectedCountry);
    };

    const performQuickSave = () => {
        if (!qsModal) return;
        if (!qsSelectedCountry) { alert("请选择归属国家"); return; }

        if (qsModal.type === 'route') {
            // Logic to add cities... simplified for brevity, assume similar to App.tsx
            // For now, alerting placeholder
            alert("Quick save implementation pending migration");
        }
        // ... other types
        setQsModal(null);
    };

    // --- Export Handler ---
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        // Simplified export logic
        const wsData = [
            ['Day', 'Date', 'Route', 'Transport', 'Hotel', 'Ticket', 'Activity', 'Description', 'Rooms', 'Costs...'],
            ...rows.map((r, i) => [
                i + 1, r.date, r.route, r.transport.join(','), r.hotelName,
                r.ticketName.join(','), r.activityName.join(','), r.description, r.rooms
            ])
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
        XLSX.writeFile(wb, (settings.plannerName || 'Itinerary') + ".xlsx");
    };

    // --- AI Generator Stub ---
    const handleAIGenerate = async () => {
        setIsGenerating(true);
        // Simulate API call
        setTimeout(() => {
            setIsGenerating(false);
            setShowAIModal(false);
            alert("AI generation simulated. Setup GeminiService in full migration.");
        }, 2000);
    };

    // --- New Trip Handler ---
    const handleNewTrip = () => {
        if (window.confirm("确定要新建行程吗？未保存的内容将丢失。")) {
            setRows(Array.from({ length: 8 }).map((_, i) => createEmptyRow(i + 1)));
            setSettings(prev => ({ ...prev, destinations: [], startDate: '' }));
            // Reset active trip ID? handled in hook?
        }
    };

    // Helper for cost columns
    const Th = (id: string, label: string | React.ReactNode, bgClass = '', textClass = 'text-gray-500', sticky = false) => {
        return createResizableHeader(
            id, label, cloudData.colWidths,
            (id, w) => cloudActions.setColWidths({ ...cloudData.colWidths, [id]: w }),
            bgClass, textClass, sticky
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <input type="file" ref={fileInputItineraryRef} className="hidden" accept=".json" />

            {/* 1. Header & Toolbar */}
            <div className="bg-white border-b border-gray-200 shadow-sm no-print py-2 px-4 z-20 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div></div> {/* Spacer to keep right-aligned items on the right */}

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowAIModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-md hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm">
                            <Sparkles size={16} /> AI 定制
                        </button>
                        <button onClick={() => onViewChange('my-trips')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <Library size={16} className="text-indigo-600" /> 行程库
                        </button>
                        <button onClick={() => onViewChange('resources')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <Database size={16} className="text-blue-600" /> 资源库
                        </button>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <button onClick={handleNewTrip} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <PlusCircle size={16} className="text-green-600" /> 新建
                        </button>
                        <button onClick={() => onViewChange('my-trips')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <FolderOpen size={16} className="text-yellow-600" /> 打开
                        </button>
                        <button onClick={handleOpenSaveModal} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                            <Save size={16} /> 保存
                        </button>

                    </div>
                </div>
            </div>

            {/* Global Settings - Compact Bar */}
            <GlobalSettings
                settings={settings}
                updateSettings={(s) => setSettings(prev => ({ ...prev, ...s }))}
                availableCountries={Array.from(new Set(cloudData.poiCities.map(c => c.country).filter(Boolean))) as string[]}
            />

            {/* Main Content - Split Layout */}
            <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
                {/* LEFT: Itinerary Table */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="flex-1 overflow-auto relative custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200 border-collapse table-fixed">
                            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    {Th('day', 'Day', 'bg-gray-50', 'text-gray-500', true)}
                                    {Th('date', '日期')}
                                    {Th('route', '行程路线 (出发-到达)')}
                                    {Th('transport', '交通方式')}
                                    {Th('hotel', '酒店住宿')}
                                    {Th('ticket', '景点门票')}
                                    {Th('activity', '娱乐活动')}
                                    {Th('description', '行程详情')}
                                    {Th('rooms', '房间数')}
                                    {Th('transportCost', '交通费', 'bg-blue-50/50', 'text-blue-600')}
                                    {Th('hotelCost', '酒店费', 'bg-blue-50/50', 'text-blue-600')}
                                    {Th('ticketCost', '门票费', 'bg-blue-50/50', 'text-blue-600')}
                                    {Th('activityCost', '活动费', 'bg-blue-50/50', 'text-blue-600')}
                                    {Th('otherCost', '其它费', 'bg-blue-50/50', 'text-blue-600')}
                                    <th className="w-10 px-2 py-3 bg-gray-50"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {rows.map((row, index) => (
                                    <tr key={row.id} className="hover:bg-gray-50 group transition-colors">
                                        <td className="px-2 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center justify-center font-bold text-gray-400 bg-gray-100 rounded w-8 h-8 text-sm">{index + 1}</div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="date" value={row.date} onChange={(e) => { const n = [...rows]; n[index].date = e.target.value; setRows(n); }} className="w-full text-xs border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 bg-transparent p-1 text-gray-600 font-mono" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-1">
                                                <div className="flex-1">
                                                    <MultiSelect
                                                        options={cloudData.poiCities.filter(c => settings.destinations.length === 0 || settings.destinations.includes(c.country)).map(c => c.name)}
                                                        value={extractCitiesFromRoute(row.route)}
                                                        onChange={(val) => handleRouteUpdate(index, val)}
                                                        placeholder="选择路线..."
                                                        className="text-xs"
                                                        displaySeparator="-"
                                                    />
                                                </div>
                                                <button onClick={() => handleQuickSave('route', index)} className="text-gray-300 hover:text-blue-600 p-1"><Upload size={14} /></button>
                                            </div>
                                        </td>

                                        <td className="px-2 py-2">
                                            <MultiSelect options={Object.values(TransportType) as string[]} value={row.transport} onChange={(v) => { const n = [...rows]; n[index].transport = v; setRows(n) }} className="text-xs w-full" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-1">
                                                <div className="flex-1">
                                                    <AsyncAutocomplete
                                                        value={row.hotelName}
                                                        onChange={(v) => { const n = [...rows]; n[index].hotelName = v; setRows(n) }}
                                                        fetchSuggestions={async (q) => {
                                                            const cities = extractCitiesFromRoute(row.route);
                                                            const res = await resourceApi.listHotels({
                                                                city_name: cities.length ? cities : undefined,
                                                                search: q,
                                                                size: 20
                                                            });
                                                            return res.map(h => h.name);
                                                        }}
                                                        dependencies={[row.route]}
                                                        placeholder="酒店..."
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <button onClick={() => handleQuickSave('hotel', index)} className="text-gray-300 hover:text-blue-600 p-1"><Upload size={14} /></button>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-1">
                                                <div className="flex-1">
                                                    <AsyncMultiSelect
                                                        value={row.ticketName}
                                                        onChange={(v) => { const n = [...rows]; n[index].ticketName = v; setRows(n) }}
                                                        fetchOptions={async (q) => {
                                                            const cities = extractCitiesFromRoute(row.route);
                                                            const res = await resourceApi.listSpots({
                                                                city_name: cities.length ? cities : undefined,
                                                                search: q,
                                                                size: 20
                                                            });
                                                            return res.map(s => s.name);
                                                        }}
                                                        dependencies={[row.route]}
                                                        placeholder="门票..."
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <button onClick={() => handleQuickSave('ticket', index)} className="text-gray-300 hover:text-blue-600 p-1"><Upload size={14} /></button>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-1">
                                                <div className="flex-1">
                                                    <AsyncMultiSelect
                                                        value={row.activityName}
                                                        onChange={(v) => { const n = [...rows]; n[index].activityName = v; setRows(n) }}
                                                        fetchOptions={async (q) => {
                                                            const cities = extractCitiesFromRoute(row.route);
                                                            const res = await resourceApi.listActivities({
                                                                city_name: cities.length ? cities : undefined,
                                                                search: q,
                                                                size: 20
                                                            });
                                                            return res.map(a => a.name);
                                                        }}
                                                        dependencies={[row.route]}
                                                        placeholder="活动..."
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <button onClick={() => handleQuickSave('activity', index)} className="text-gray-300 hover:text-blue-600 p-1"><Upload size={14} /></button>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <textarea rows={2} className="w-full text-xs border-transparent focus:border-blue-300 bg-transparent rounded resize-none" value={row.description} onChange={(e) => { const n = [...rows]; n[index].description = e.target.value; setRows(n) }} />
                                        </td>
                                        <td className="px-2 py-2"><input type="number" min="0" className="w-full text-xs border-transparent text-center bg-gray-50 rounded" value={row.rooms} onChange={(e) => { const n = [...rows]; n[index].rooms = parseInt(e.target.value) || 0; setRows(n) }} /></td>

                                        <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600" value={row.transportCost} onChange={(e) => { const n = [...rows]; n[index].transportCost = parseFloat(e.target.value) || 0; setRows(n) }} /></td>
                                        <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600" value={row.hotelCost} onChange={(e) => { const n = [...rows]; n[index].hotelCost = parseFloat(e.target.value) || 0; setRows(n) }} /></td>
                                        <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600" value={row.ticketCost} onChange={(e) => { const n = [...rows]; n[index].ticketCost = parseFloat(e.target.value) || 0; setRows(n) }} /></td>
                                        <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600" value={row.activityCost} onChange={(e) => { const n = [...rows]; n[index].activityCost = parseFloat(e.target.value) || 0; setRows(n) }} /></td>
                                        <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600" value={row.otherCost} onChange={(e) => { const n = [...rows]; n[index].otherCost = parseFloat(e.target.value) || 0; setRows(n) }} /></td>

                                        <td className="px-2 py-2 text-center">
                                            <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Table Footer - Add Button Only */}
                    <div className="bg-gray-50 border-t border-gray-200 p-2 flex justify-between items-center flex-shrink-0">
                        <button onClick={() => setRows([...rows, createEmptyRow(rows.length + 1)])} className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                            <Plus size={16} /> 添加一天行程
                        </button>
                    </div>
                </div>

                {/* RIGHT PANEL: Sidebar for Quote & Costs */}
                <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><Calculator size={16} className="text-blue-600" /> 报价配置</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div className="bg-blue-50/50 rounded-lg p-4 space-y-4 border border-blue-100">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">利润率 {settings.marginPercent}%</label>
                                <input type="range" min="0" max="50" value={settings.marginPercent} onChange={(e) => setSettings(p => ({ ...p, marginPercent: parseInt(e.target.value) }))} className="w-full accent-blue-600" />
                            </div>
                            <div className="space-y-2 pt-2 border-t border-blue-200/50 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">基础成本</span><span className="font-mono">¥ {totalCost.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">预估利润</span><span className="font-mono text-green-600">+ ¥ {Math.round((totalCost / (1 - settings.marginPercent / 100)) - totalCost).toLocaleString()}</span></div>
                                <div className="flex justify-between pt-2 border-t border-dashed border-blue-300"><span className="font-bold text-gray-800">总报价</span><span className="font-bold text-xl text-blue-600">¥ {Math.round(totalCost / (1 - settings.marginPercent / 100)).toLocaleString()}</span></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">费用包含</label><textarea className="w-full h-32 p-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500" value={settings.manualInclusions} onChange={(e) => setSettings(p => ({ ...p, manualInclusions: e.target.value }))} placeholder="请输入费用包含项目..."></textarea></div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">费用不含</label><textarea className="w-full h-32 p-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500" value={settings.manualExclusions} onChange={(e) => setSettings(p => ({ ...p, manualExclusions: e.target.value }))} placeholder="请输入费用不含项目..."></textarea></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {qsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded p-6 max-w-sm w-full">
                        <h3 className="font-bold mb-4">快速保存</h3>
                        <p>{qsModal.itemsDisplay}</p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setQsModal(null)} className="px-4 py-2 bg-gray-100 rounded">取消</button>
                            <button onClick={performQuickSave} className="px-4 py-2 bg-blue-600 text-white rounded">确认</button>
                        </div>
                    </div>
                </div>
            )}

            {showSaveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded p-6 max-w-md w-full">
                        <h3 className="font-bold mb-4">保存行程</h3>
                        <input value={saveName} onChange={(e) => setSaveName(e.target.value)} className="w-full border p-2 rounded mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 bg-gray-100 rounded">取消</button>
                            <button onClick={handleConfirmSave} className="px-4 py-2 bg-blue-600 text-white rounded">确认</button>
                        </div>
                    </div>
                </div>
            )}

            {showAIModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded p-6 max-w-lg w-full">
                        <h3 className="font-bold mb-4">AI 定制</h3>
                        <textarea value={aiPromptInput} onChange={(e) => setAiPromptInput(e.target.value)} className="w-full border p-2 rounded mb-4 h-32" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAIModal(false)} className="px-4 py-2 bg-gray-100 rounded">取消</button>
                            <button onClick={handleAIGenerate} disabled={isGenerating} className="px-4 py-2 bg-purple-600 text-white rounded">{isGenerating ? '生成中...' : '开始生成'}</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
