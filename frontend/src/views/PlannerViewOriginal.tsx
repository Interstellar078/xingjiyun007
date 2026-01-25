import React, { useState, useRef, useMemo } from 'react';
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
import { resourceApi, aiApi } from '../services/resourceApi';

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
    const [aiError, setAiError] = useState<string | null>(null);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ type: 'user' | 'ai'; text: string }[]>([]);

    // Description Modal State
    const [descModal, setDescModal] = useState<{
        rowIndex: number;
        text: string;
    } | null>(null);

    // Handle Description Save
    const handleSaveDescription = () => {
        if (descModal) {
            const n = [...rows];
            n[descModal.rowIndex].description = descModal.text;
            setRows(n);
            setDescModal(null);
        }
    };

    // Quick Save Modal State
    const [qsModal, setQsModal] = useState<{
        type: 'route' | 'hotel' | 'ticket' | 'activity';
        rowIndex: number;
        itemsDisplay: string;
        smartCountry: string;
    } | null>(null);
    const [qsSelectedCountry, setQsSelectedCountry] = useState('');
    const [validationErrors, setValidationErrors] = useState<{ destinations?: boolean; startDate?: boolean }>({});
    const [costModal, setCostModal] = useState<{ rowIndex: number } | null>(null);

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

    // --- AI Generator Handler ---
    // --- AI Generator Handler ---
    const availableCountries = useMemo(
        () => Array.from(new Set(cloudData.poiCities.map(c => c.country).filter(Boolean))),
        [cloudData.poiCities]
    );

    const handleSendChat = async (manualMsg?: string) => {
        const textToSend = typeof manualMsg === 'string' ? manualMsg : aiPromptInput;
        if (!textToSend.trim()) return;
        if (!settings.destinations?.length) {
            setAiError('请先在上方选择目的地国家/城市');
            return;
        }
        setAiError(null);

        setIsGenerating(true);
        // Add User Message
        setChatHistory(prev => [...prev, { type: 'user', text: textToSend }]);

        // Clear input only if it was used (or just always clear it to reset state)
        setAiPromptInput('');

        const currentPrompt = textToSend;

        try {
            const compactRows = rows
                .filter(r => r.route)
                .map(r => ({
                    date: r.date,
                    route: r.route,
                    transport: r.transport,
                    hotelName: r.hotelName,
                    ticketName: r.ticketName,
                    activityName: r.activityName,
                    description: r.description
                }));
            // Build Context Payload
            const payload = {
                currentDestinations: settings.destinations || [],
                currentDays: rows.length,
                availableCountries: availableCountries as string[],
                userPrompt: currentPrompt,
                currentRows: compactRows,
                historyTrips: [], // Required by backend schema
            };

            // request from aiApi directly
            const res = await aiApi.generateItinerary(payload);

            if (res.itinerary && Array.isArray(res.itinerary) && res.itinerary.length > 0) {
                // Map response to rows
                const newRows: DayRow[] = res.itinerary.map((item: any, idx: number) => ({
                    id: `day-${Date.now()}-${idx}`, // Generate unique ID
                    date: item.date || '',
                    route: item.route || '',
                    transport: item.transport || [],
                    hotelName: item.hotelName || '',
                    ticketName: item.ticketName || [],
                    activityName: item.activityName || [],
                    description: item.description || '',
                    rooms: item.rooms || 0,

                    // Costs - Backend might return them
                    transportCost: item.transportCost || 0,
                    hotelCost: item.hotelCost || 0,
                    ticketCost: item.ticketCost || 0,
                    activityCost: item.activityCost || 0,
                    otherCost: item.otherCost || 0,
                }));

                if (newRows.length > 0) {
                    setRows(newRows);

                    if (res.detectedDestinations && res.detectedDestinations.length > 0) {
                        setSettings(prev => ({ ...prev, destinations: res.detectedDestinations }));
                    }

                    // Add AI Success Message
                    setChatHistory(prev => [...prev, { type: 'ai', text: '行程已更新！您可以继续让我修改细节。' }]);
                }
            } else {
                setChatHistory(prev => [...prev, { type: 'ai', text: '抱歉，生成的结果似乎不完整，请重试。' }]);
            }

        } catch (error) {
            console.error("AI Generation Failed:", error);
            setChatHistory(prev => [...prev, { type: 'ai', text: '生成失败，请检查网络或配置。' }]);
            setAiError('AI 生成失败，请稍后重试或检查配置');
        } finally {
            setIsGenerating(false);
        }
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

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Handle Days Change
    const handleDaysChange = (newDays: number) => {
        if (newDays < 1) return;
        if (newDays > rows.length) {
            // Add rows
            const toAdd = newDays - rows.length;
            const newRows = [...rows, ...Array.from({ length: toAdd }).map((_, i) => createEmptyRow(rows.length + 1 + i))];
            setRows(newRows);
        } else if (newDays < rows.length) {
            // Remove rows (ask confirmation if data exists?)
            if (window.confirm(`确定要减少天数吗？第 ${newDays + 1} 天之后的内容将被删除。`)) {
                setRows(rows.slice(0, newDays));
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <input type="file" ref={fileInputItineraryRef} className="hidden" accept=".json" />

            {/* 1. Header & Toolbar - Refined */}
            <div className="bg-white border-b border-gray-200 shadow-sm no-print py-2 px-4 z-20 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">

                    {/* Left: Global Settings Summary or Title */}
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-800">{settings.plannerName || '未命名行程'}</span>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${isSidebarOpen ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <Sparkles size={14} className={isSidebarOpen ? "text-purple-600 fill-purple-100" : "text-gray-400"} />
                            {isSidebarOpen ? '隐藏助手' : 'AI 助手'}
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <button onClick={() => onViewChange('resources')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-transparent hover:bg-gray-50 hover:text-blue-600 transition-colors">
                            <Database size={14} /> 资源库
                        </button>
                        <button onClick={() => onViewChange('my-trips')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-transparent hover:bg-gray-50 hover:text-blue-600 transition-colors">
                            <Library size={14} /> 行程库
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <button onClick={handleNewTrip} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                            <PlusCircle size={14} className="text-green-600" /> 新建
                        </button>
                        <button onClick={handleOpenSaveModal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">
                            <Save size={14} /> 保存
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - Split Layout */}
            <div className="flex-1 flex gap-0 min-h-0 overflow-hidden relative">

                {/* LEFT: Itinerary Table & Cost - Vertical Split */}
                <div className="flex-1 flex flex-col bg-white border-r border-gray-200 overflow-hidden z-10 min-w-0 transition-all duration-300">

                    {/* Global Settings - Compact Bar (Moved Inside) */}
                    <GlobalSettings
                        settings={settings}
                        updateSettings={(s) => setSettings(prev => ({ ...prev, ...s }))}
                        availableCountries={availableCountries as string[]}
                        validationErrors={validationErrors}
                        tripDays={rows.length}
                        onTripDaysChange={handleDaysChange}
                        onAutoGenerate={() => {
                            setIsSidebarOpen(true); // Auto-open sidebar
                            const errors: { destinations?: boolean; startDate?: boolean } = {};
                            if (settings.destinations.length === 0) errors.destinations = true;
                            if (!settings.startDate) errors.startDate = true;

                            if (Object.keys(errors).length > 0) {
                                setValidationErrors(errors);
                                setTimeout(() => setValidationErrors({}), 2000);
                                return;
                            }

                            const prompt = `帮我规划一个去 ${settings.destinations.join('、')} 的行程，` +
                                `出发日期是 ${settings.startDate}，` +
                                `一共 ${rows.length > 0 ? rows.length : '7'} 天，` +
                                `${settings.peopleCount}人出行。` +
                                `请推荐合适的路线、酒店和景点。`;

                            handleSendChat(prompt);
                        }}
                    />

                    {/* Top: Table */}
                    <div className="flex-1 overflow-auto relative custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200 border-collapse table-fixed">
                            <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm text-xs uppercase tracking-wider font-semibold text-gray-600 h-10">
                                <tr>
                                    {Th('day', 'Day', 'bg-gray-100', 'text-gray-600', true)}
                                    {Th('date', '日期')}
                                    {Th('route', '行程路线 (出发-到达)')}
                                    {Th('transport', '交通方式')}
                                    {Th('hotel', '酒店住宿')}
                                    {Th('ticket', '景点门票')}
                                    {Th('activity', '娱乐活动')}
                                    {/* Removed Description Column Header */}
                                    {Th('rooms', '房间数')}
                                    {Th('totalCostEstimate', '预估成本', 'bg-blue-50/50', 'text-blue-600')}
                                    <th className="w-10 px-2 py-3 bg-gray-100"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-50">
                                {rows.map((row, index) => (
                                    <React.Fragment key={row.id}>
                                        {/* Row 1: Logistics */}
                                        <tr className="bg-white group/row">
                                            <td rowSpan={2} className="px-2 py-3 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] align-top pt-4 border-b-4 border-gray-100">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center justify-center font-bold text-gray-500 bg-gray-100/80 rounded-lg w-8 h-8 text-sm shadow-sm">D{index + 1}</div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <input type="date" value={row.date} onChange={(e) => { const n = [...rows]; n[index].date = e.target.value; setRows(n); }} className="w-full text-xs border-transparent border-b border-gray-100 focus:border-blue-500 focus:ring-0 bg-transparent p-1.5 text-gray-700 font-mono rounded hover:bg-gray-50 transition-colors" />
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <div className="flex items-center gap-1">
                                                    <div className="flex-1">
                                                        <MultiSelect
                                                            options={cloudData.poiCities.filter(c => settings.destinations.length === 0 || settings.destinations.includes(c.country)).map(c => c.name)}
                                                            value={extractCitiesFromRoute(row.route)}
                                                            onChange={(val) => handleRouteUpdate(index, val)}
                                                            placeholder="选择路线..."
                                                            className="text-xs border-transparent hover:bg-gray-50 rounded"
                                                            displaySeparator="-"
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-2 py-2 align-top">
                                                <MultiSelect options={Object.values(TransportType) as string[]} value={row.transport} onChange={(v) => { const n = [...rows]; n[index].transport = v; setRows(n) }} className="text-xs w-full border-transparent hover:bg-gray-50 rounded" />
                                            </td>
                                            <td className="px-2 py-2 align-top">
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
                                                    className="text-xs border-transparent hover:bg-gray-50 rounded"
                                                />
                                            </td>
                                            <td className="px-2 py-2 align-top">
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
                                                    className="text-xs border-transparent hover:bg-gray-50 rounded"
                                                />
                                            </td>
                                            <td className="px-2 py-2 align-top">
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
                                                    className="text-xs border-transparent hover:bg-gray-50 rounded"
                                                />
                                            </td>

                                            <td className="px-2 py-2 align-top"><input type="number" min="0" className="w-full text-xs border-transparent text-center bg-transparent hover:bg-gray-50 rounded p-1.5 focus:ring-1 focus:ring-blue-500" value={row.rooms} onChange={(e) => { const n = [...rows]; n[index].rooms = parseInt(e.target.value) || 0; setRows(n) }} /></td>

                                            <td className="px-2 py-2 align-top">
                                                <div
                                                    className="w-full text-xs text-right text-blue-600 cursor-pointer hover:bg-blue-50 rounded px-1 py-1.5 font-mono font-medium"
                                                    onClick={() => setCostModal({ rowIndex: index })}
                                                >
                                                    {(row.transportCost + row.hotelCost + row.ticketCost + row.activityCost + row.otherCost).toLocaleString()}
                                                </div>
                                            </td>

                                            <td className="px-2 py-2 text-center border-b-4 border-gray-100 bg-white" rowSpan={2}>
                                                <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                        {/* Row 2: Description (Merged visually) */}
                                        <tr className="bg-white border-b-4 border-gray-100">
                                            <td colSpan={8} className="px-3 pb-3 pt-0 align-top">
                                                <div className="relative group/desc w-full">
                                                    <div className="absolute left-0 top-3 bottom-0 w-0.5 bg-blue-500/20 rounded-full"></div>
                                                    <textarea
                                                        className="w-full text-xs border-0 bg-gray-50/50 rounded-r-lg rounded-bl-lg px-3 py-2 resize-y min-h-[50px] focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-400 leading-relaxed text-gray-600 block pl-4"
                                                        placeholder="在此输入行程详情、推荐理由、注意事项..."
                                                        value={row.description}
                                                        onChange={(e) => { const n = [...rows]; n[index].description = e.target.value; setRows(n) }}
                                                    />
                                                    <button
                                                        onClick={() => setDescModal({ rowIndex: index, text: row.description })}
                                                        className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover/desc:opacity-100 transition-opacity bg-white/80 rounded p-1 shadow-sm"
                                                        title="全屏编辑"
                                                    >
                                                        <FileUp size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
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

                    {/* Bottom: Cost & Quote Configuration */}
                    <div className="border-t border-gray-200 bg-white p-4 flex gap-6 h-48 flex-shrink-0 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                        {/* Stats */}
                        <div className="w-1/3 bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex flex-col justify-center gap-2">
                            <div className="flex justify-between items-center"><span className="text-xs text-gray-500">基础成本</span><span className="font-mono text-sm">¥ {totalCost.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center"><span className="text-xs text-gray-500">预估利润 ({settings.marginPercent}%)</span><span className="font-mono text-sm text-green-600">+ ¥ {Math.round((totalCost / (1 - settings.marginPercent / 100)) - totalCost).toLocaleString()}</span></div>
                            <div className="flex justify-between items-center pt-2 border-t border-blue-200/50"><span className="font-bold text-gray-800 text-sm">总报价</span><span className="font-bold text-lg text-blue-600">¥ {Math.round(totalCost / (1 - settings.marginPercent / 100)).toLocaleString()}</span></div>

                            <div className="mt-2 text-xs flex items-center gap-2">
                                <span className="text-gray-400">利润率</span>
                                <input type="range" min="0" max="50" value={settings.marginPercent} onChange={(e) => setSettings(p => ({ ...p, marginPercent: parseInt(e.target.value) }))} className="flex-1 accent-blue-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>

                        {/* Text Config */}
                        <div className="flex-1 flex gap-4">
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-gray-700 mb-1">费用包含</label>
                                <textarea className="flex-1 p-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 resize-none" value={settings.manualInclusions} onChange={(e) => setSettings(p => ({ ...p, manualInclusions: e.target.value }))} placeholder="请输入费用包含项目..."></textarea>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-gray-700 mb-1">费用不含</label>
                                <textarea className="flex-1 p-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 resize-none" value={settings.manualExclusions} onChange={(e) => setSettings(p => ({ ...p, manualExclusions: e.target.value }))} placeholder="请输入费用不含项目..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: AI Chat - Fixed Width but Collapsible */}
                <div
                    className={`flex-shrink-0 bg-white border-l border-gray-200 flex flex-col z-20 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[350px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden border-l-0'}`}
                >
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><Sparkles size={16} className="text-purple-600" /> AI 智能助手</h3>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col p-4 w-[350px]">
                        <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-4 mb-4 overflow-y-auto text-sm text-gray-600">
                            <p className="mb-2">我是您的智能行程规划助手。</p>
                            <p>您可以直接告诉我需求，例如：</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                <li>"帮我生成一个日本5天行程"</li>
                                <li>"把第一天的酒店换成便宜点的"</li>
                                <li>"在第三天增加一个景点"</li>
                            </ul>
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`my-2 p-2 rounded-lg ${msg.type === 'user' ? 'bg-blue-100 text-blue-800 self-end' : 'bg-gray-200 text-gray-800 self-start'}`}>
                                    {msg.text}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <textarea
                                value={aiPromptInput}
                                onChange={(e) => setAiPromptInput(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none h-32"
                                placeholder="输入您的要求..."
                            />
                            {aiError && <div className="text-xs text-red-500">{aiError}</div>}
                            <button
                                onClick={() => handleSendChat()}
                                disabled={isGenerating || !aiPromptInput.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                {isGenerating ? '思考中...' : '发送指令'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {descModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-800">编辑行程详情 (第 {descModal.rowIndex + 1} 天)</h3>
                            <button onClick={() => setDescModal(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <textarea
                                autoFocus
                                className="w-full h-64 p-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none leading-relaxed"
                                placeholder="请输入详细的行程安排、景点介绍、注意事项等..."
                                value={descModal.text}
                                onChange={(e) => setDescModal({ ...descModal, text: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                            <button onClick={() => setDescModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">取消</button>
                            <button onClick={handleSaveDescription} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">保存详情</button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Removed Legacy AI Modal */}


            {/* Simple Cost Modal */}
            {costModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded p-4 max-w-xs w-full shadow-xl">
                        <h3 className="font-bold mb-4 text-center">编辑第 {costModal.rowIndex + 1} 天成本</h3>
                        <div className="space-y-3">
                            <div><label className="text-xs text-gray-500">交通费</label><input type="number" className="w-full border p-1 rounded" value={rows[costModal.rowIndex].transportCost} onChange={(e) => { const n = [...rows]; n[costModal.rowIndex].transportCost = parseFloat(e.target.value) || 0; setRows(n) }} /></div>
                            <div><label className="text-xs text-gray-500">酒店费</label><input type="number" className="w-full border p-1 rounded" value={rows[costModal.rowIndex].hotelCost} onChange={(e) => { const n = [...rows]; n[costModal.rowIndex].hotelCost = parseFloat(e.target.value) || 0; setRows(n) }} /></div>
                            <div><label className="text-xs text-gray-500">门票费</label><input type="number" className="w-full border p-1 rounded" value={rows[costModal.rowIndex].ticketCost} onChange={(e) => { const n = [...rows]; n[costModal.rowIndex].ticketCost = parseFloat(e.target.value) || 0; setRows(n) }} /></div>
                            <div><label className="text-xs text-gray-500">活动费</label><input type="number" className="w-full border p-1 rounded" value={rows[costModal.rowIndex].activityCost} onChange={(e) => { const n = [...rows]; n[costModal.rowIndex].activityCost = parseFloat(e.target.value) || 0; setRows(n) }} /></div>
                            <div><label className="text-xs text-gray-500">其它费</label><input type="number" className="w-full border p-1 rounded" value={rows[costModal.rowIndex].otherCost} onChange={(e) => { const n = [...rows]; n[costModal.rowIndex].otherCost = parseFloat(e.target.value) || 0; setRows(n) }} /></div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setCostModal(null)} className="px-4 py-2 bg-blue-600 text-white rounded w-full">完成</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
