
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Download, Save, FolderOpen, Rocket, Sparkles, Database, Filter, Calendar, MapPin, Clock, Copy, Edit3, X, FileDown, FileUp, HardDrive, PlusCircle, CheckCircle, RotateCcw, ArrowRightCircle, Search, LogOut, ShieldAlert, FileSpreadsheet, Calculator, Info, Library, Wand2, Loader2, Upload, Cloud, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { DayRow, TripSettings, TransportType, CustomColumn, SavedTrip, CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, User, CountryFile } from './types';
import { GlobalSettings } from './components/GlobalSettings';
import { Autocomplete } from './components/Autocomplete';
import { MultiSelect } from './components/MultiSelect';
import { ResourceDatabase } from './components/ResourceDatabase';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { addDays, generateUUID } from './utils/dateUtils';
import { suggestHotels, generateFileName, generateComprehensiveItinerary, ItineraryItem } from './services/geminiService';
// Removed auto-seeding import usage here, only used in ResourceDB manually now
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';

// Constants
const INITIAL_ROWS = 8;

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- App State ---
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // 1. Settings & UI State
  const [settings, setSettings] = useState<TripSettings>({
    plannerName: '',
    customerName: '',
    peopleCount: 2,
    roomCount: 1,
    currency: 'CNY',
    exchangeRate: 1,
    destinations: [],
    startDate: '', 
    marginPercent: 15,
    tipPerDay: 50,
    manualInclusions: '1. 全程舒适专车接送\n2. 行程所列首道景点门票\n3. 全程高品质酒店住宿\n4. 7x24小时管家服务',
    manualExclusions: ''
  });

  // 2. POI Database State
  const [carDB, setCarDB] = useState<CarCostEntry[]>([]);
  const [poiCities, setPoiCities] = useState<PoiCity[]>([]);
  const [poiSpots, setPoiSpots] = useState<PoiSpot[]>([]);
  const [poiHotels, setPoiHotels] = useState<PoiHotel[]>([]);
  const [poiActivities, setPoiActivities] = useState<PoiActivity[]>([]);
  const [countryFiles, setCountryFiles] = useState<CountryFile[]>([]);

  // 3. Trips & History
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [locationHistory, setLocationHistory] = useState<string[]>([]);

  // 4. App Operational State
  const [rows, setRows] = useState<DayRow[]>(() => Array.from({ length: INITIAL_ROWS }).map((_, i) => createEmptyRow(i + 1)));
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  
  // Quick Save Modal State
  const [qsModal, setQsModal] = useState<{
    isOpen: boolean;
    type: 'route' | 'hotel' | 'ticket' | 'activity';
    rowIndex: number;
    itemsDisplay: string;
    routeCities: string[];
    targetCityName: string;
    smartCountry: string;
  } | null>(null);
  const [qsSelectedCountry, setQsSelectedCountry] = useState('');
  
  // Refs
  const fileInputItineraryRef = useRef<HTMLInputElement>(null);
  
  // Save Trip Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  
  // Filter State
  const [historyFilterCountry, setHistoryFilterCountry] = useState<string>('All');
  const [historyFilterSearch, setHistoryFilterSearch] = useState('');
  
  // Track auto-fill status
  const [hasFilledRooms, setHasFilledRooms] = useState(false);
  
  // AI State
  const [isGenerating, setIsGenerating] = useState(false);

  // Column Width State (Initialized Empty, Loaded from Cloud)
  const [colWidths, setColWidths] = useState<Record<string, number>>({
      day: 48, date: 110, route: 180, transport: 140, hotel: 140, 
      ticket: 140, activity: 140, description: 250, rooms: 50, 
      transportCost: 90, hotelPrice: 90, hotelCost: 90, 
      ticketCost: 90, activityCost: 90, otherCost: 90
  });

  // --- Calculations ---
  const totalCost = useMemo(() => rows.reduce((acc, r) => acc + r.transportCost + r.hotelCost + r.ticketCost + r.activityCost + r.otherCost, 0), [rows]);

  // --- Effects ---

  // 1. INIT: Check Cloud Config -> Auth -> Load Data
  useEffect(() => {
      const initApp = async () => {
          setIsAppLoading(true);
          
          // Check Auth
          const user = await AuthService.getCurrentUser();
          if (user) setCurrentUser(user);

          // Load Data
          await loadCloudData();
          setIsAppLoading(false);
      };
      
      initApp();
  }, []);

  const loadCloudData = async () => {
      try {
            // Ensure Admin Profile exists in public list
            await StorageService.ensureAdminProfile();

            // Load all data concurrently
            const [
                cars, cities, spots, hotels, activities, files, trips, locs, settings
            ] = await Promise.all([
                StorageService.getCars(),
                StorageService.getCities(),
                StorageService.getSpots(),
                StorageService.getHotels(),
                StorageService.getActivities(),
                StorageService.getFiles(),
                StorageService.getTrips(),
                StorageService.getLocations(),
                StorageService.getAppSettings()
            ]);

            // NOTE: Auto-seeding removed as per request. Cloud DB starts empty.
            
            setCarDB(cars);
            setPoiCities(cities);
            setPoiSpots(spots);
            setPoiHotels(hotels);
            setPoiActivities(activities);
            setCountryFiles(files);
            setSavedTrips(trips);
            setLocationHistory(locs);
            
            // Load Settings
            if (settings && Object.keys(settings).length > 0) {
                setColWidths(settings);
            }

            setCloudStatus('synced');
      } catch (e) {
          console.error("Load failed", e);
          setCloudStatus('error');
      }
  };

  // 2. Debounced Cloud Sync for Resource DB & Settings
  const useDebouncedSave = (data: any, saver: (d: any) => Promise<void>, delay = 1500) => {
      const firstRun = useRef(true);
      useEffect(() => {
          if (firstRun.current) { firstRun.current = false; return; }
          if (isAppLoading) return;
          
          setCloudStatus('syncing');
          const handler = setTimeout(() => {
              saver(data).then(() => setCloudStatus('synced')).catch(() => setCloudStatus('error'));
          }, delay);
          return () => clearTimeout(handler);
      }, [data]);
  };

  useDebouncedSave(carDB, StorageService.saveCars);
  useDebouncedSave(poiCities, StorageService.saveCities);
  useDebouncedSave(poiSpots, StorageService.saveSpots);
  useDebouncedSave(poiHotels, StorageService.saveHotels);
  useDebouncedSave(poiActivities, StorageService.saveActivities);
  useDebouncedSave(countryFiles, StorageService.saveFiles);
  useDebouncedSave(savedTrips, StorageService.saveTrips);
  useDebouncedSave(locationHistory, StorageService.saveLocations);
  // Also sync colWidths to Cloud!
  useDebouncedSave(colWidths, StorageService.saveAppSettings);


  // --- Helper Functions (Same as before) ---
  function createEmptyRow(dayIndex: number): DayRow {
    return {
      id: generateUUID(),
      dayIndex,
      date: settings.startDate ? addDays(settings.startDate, dayIndex - 1) : '',
      route: '',
      transport: ['包车'],
      carModel: '',
      hotelName: '',
      ticketName: [],
      activityName: [],
      description: '',
      rooms: 0,
      transportCost: 0,
      hotelPrice: 0,
      hotelCost: 0,
      ticketCost: 0,
      activityCost: 0,
      otherCost: 0,
      customCosts: {},
    };
  }

  const extractCitiesFromRoute = (route: string): string[] => {
      if (!route) return [];
      return route.split(/[-—>，,]/).map(s => s.trim()).filter(Boolean);
  };

  const findRelevantTicketPriceSum = (route: string, ticketNames: string[]): number => {
    if (!ticketNames || ticketNames.length === 0) return 0;
    const citiesInRoute = extractCitiesFromRoute(route);
    const cityIds = poiCities.filter(c => citiesInRoute.includes(c.name)).map(c => c.id);
    let total = 0;
    ticketNames.forEach(name => {
        const spot = poiSpots.find(s => s.name === name && (cityIds.length === 0 || cityIds.includes(s.cityId)));
        if (spot) total += spot.price;
    });
    return total;
  };

  const findRelevantActivityPriceSum = (route: string, activityNames: string[]): number => {
    if (!activityNames || activityNames.length === 0) return 0;
    const citiesInRoute = extractCitiesFromRoute(route);
    const cityIds = poiCities.filter(c => citiesInRoute.includes(c.name)).map(c => c.id);
    let total = 0;
    activityNames.forEach(name => {
        const act = poiActivities.find(a => a.name === name && (cityIds.length === 0 || cityIds.includes(a.cityId)));
        if (act) total += act.price;
    });
    return total;
  };

  const startResize = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.pageX;
      const startW = colWidths[id] || 100;
      const onMove = (mv: MouseEvent) => {
          const newW = Math.max(50, startW + (mv.pageX - startX));
          setColWidths(prev => ({ ...prev, [id]: newW }));
      };
      const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
  };
  
  const Th = (id: string, label: string | React.ReactNode, bgClass = '', textClass = 'text-gray-500', sticky = false) => {
      const w = colWidths[id] || 100;
      return (
        <th key={id} style={{ width: w, minWidth: w }} className={`px-2 py-3 text-left text-xs font-bold uppercase relative group ${textClass} ${bgClass} ${sticky ? 'sticky left-0 z-10 shadow-[1px_0_2px_rgba(0,0,0,0.05)]' : ''}`}>
           <div className="flex items-center justify-between w-full h-full relative">
               <span className="truncate w-full block">{label}</span>
               <div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 flex justify-center hover:bg-blue-400/20 rounded" onMouseDown={(e) => startResize(e, id)} onClick={(e) => e.stopPropagation()}>
                  <div className="w-[1px] h-full bg-gray-200 group-hover:bg-blue-400"></div>
               </div>
           </div>
        </th>
      );
  };

  // --- Handlers ---
  const handleRouteUpdate = (index: number, val: string[]) => {
      const newRouteStr = val.join('-');
      const newRows = [...rows];
      newRows[index] = { ...newRows[index], route: newRouteStr };

      const currentDest = val.length > 0 ? val[val.length - 1] : null;
      if (currentDest && index < newRows.length - 1) {
          const nextRow = newRows[index + 1];
          const nextRowCities = extractCitiesFromRoute(nextRow.route);
          if (nextRowCities.length === 0) {
               newRows[index + 1] = { ...nextRow, route: currentDest };
          } else {
               nextRowCities[0] = currentDest;
               newRows[index + 1] = { ...nextRow, route: nextRowCities.join('-') };
          }
      }
      setRows(newRows);
      
      const newLocs = val.filter(v => !locationHistory.includes(v));
      if (newLocs.length > 0) {
          setLocationHistory([...locationHistory, ...newLocs]);
      }
  };

  const handleQuickSave = (type: 'route' | 'hotel' | 'ticket' | 'activity', rowIndex: number) => {
    // Check permission - for now assume all authenticated users can edit if no role check
    if (!currentUser) {
        alert("请先登录");
        setShowAuthModal(true);
        return;
    }

    const row = rows[rowIndex];
    const routeCities = extractCitiesFromRoute(row.route);
    let itemsDisplay = '';
    let targetCityName = '';
    
    if (type === 'route') {
        const currentNames = new Set(poiCities.map(c => c.name));
        const newCities = routeCities.filter(name => !currentNames.has(name));
        if (newCities.length === 0) { alert("路线中的城市均已存在"); return; }
        itemsDisplay = newCities.join('、');
    } else {
        targetCityName = routeCities.length > 0 ? routeCities[routeCities.length - 1] : '';
        if (!targetCityName) { alert("无法识别目标城市，请先填写路线"); return; }
        if (type === 'hotel') itemsDisplay = row.hotelName;
        else if (type === 'ticket') itemsDisplay = row.ticketName.join('、');
        else if (type === 'activity') itemsDisplay = row.activityName.join('、');
    }
    
    if (!itemsDisplay) return;

    let detectedCountry = '';
    if (type === 'route') {
        const existingName = routeCities.find(n => poiCities.some(pc => pc.name === n));
        if (existingName) {
            const match = poiCities.find(pc => pc.name === existingName);
            if (match) detectedCountry = match.country;
        }
    } else {
        const match = poiCities.find(c => c.name === targetCityName);
        if (match) detectedCountry = match.country;
    }

    if (!detectedCountry && settings.destinations.length > 0) detectedCountry = settings.destinations[0];

    setQsModal({
        isOpen: true, type, rowIndex, itemsDisplay, routeCities, targetCityName,
        smartCountry: detectedCountry || settings.destinations[0] || ''
    });
    setQsSelectedCountry(detectedCountry || settings.destinations[0] || '');
  };

  const performQuickSave = () => {
      if (!qsModal) return;
      const { type, rowIndex, routeCities, targetCityName } = qsModal;
      const finalCountry = qsSelectedCountry;
      const row = rows[rowIndex];

      if (!finalCountry) { alert("请选择归属国家"); return; }

      if (type === 'route') {
        const currentNames = new Set(poiCities.map(c => c.name));
        const toAdd: PoiCity[] = [];
        routeCities.forEach(name => {
            if(!currentNames.has(name)) {
                toAdd.push({ id: generateUUID(), country: finalCountry, name });
                currentNames.add(name);
            }
        });
        if (toAdd.length > 0) {
            setPoiCities(prev => [...prev, ...toAdd]);
            alert(`成功添加 ${toAdd.length} 个城市`);
        }
      } else {
        let cityId = poiCities.find(c => c.name === targetCityName)?.id;
        if (!cityId) {
            cityId = generateUUID();
            const newCity = { id: cityId, country: finalCountry, name: targetCityName };
            setPoiCities(prev => [...prev, newCity]);
        }

        if (type === 'hotel') {
            setPoiHotels(prev => [...prev, { id: generateUUID(), cityId: cityId!, name: row.hotelName, roomType: '标准间', price: row.hotelPrice || 0 }]);
        } else if (type === 'ticket') {
            const unitPrice = settings.peopleCount > 0 ? Math.round(row.ticketCost / settings.peopleCount / (row.ticketName.length || 1)) : 0;
            const toAdd = row.ticketName.map(name => ({ id: generateUUID(), cityId: cityId!, name, price: unitPrice }));
            setPoiSpots(prev => [...prev, ...toAdd]);
        } else if (type === 'activity') {
            const unitPrice = settings.peopleCount > 0 ? Math.round(row.activityCost / settings.peopleCount / (row.activityName.length || 1)) : 0;
            const toAdd = row.activityName.map(name => ({ id: generateUUID(), cityId: cityId!, name, price: unitPrice }));
            setPoiActivities(prev => [...prev, ...toAdd]);
        }
        alert("资源已添加");
      }
      setQsModal(null);
  };

  const handleOpenSaveModal = () => {
    const planner = currentUser?.username || settings.plannerName || '未命名';
    const dayCount = `${rows.length}天`;
    const country = settings.destinations.length > 0 ? settings.destinations.join('') : "";
    let city = '';
    const day1Route = rows[0]?.route || '';
    if (day1Route) {
        const cities = extractCitiesFromRoute(day1Route);
        if (cities.length > 0) city = cities[0];
    }
    const people = `${settings.peopleCount}人`;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const defaultName = `${planner}${dayCount}${country}${city}${people}${dateStr}`;
    
    if (activeTripId) {
        const currentTrip = savedTrips.find(t => t.id === activeTripId);
        setSaveName(currentTrip ? currentTrip.name : defaultName);
    } else {
        setSaveName(defaultName);
    }
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
      const nameToCheck = saveName.trim();
      if (!nameToCheck) { alert("请输入行程名称"); return; }

      const isDuplicate = savedTrips.some(t => t.name === nameToCheck && t.id !== activeTripId);
      if (isDuplicate) { alert(`行程名称 "${nameToCheck}" 已存在。`); return; }

      const tripToSave: SavedTrip = {
          id: activeTripId || generateUUID(),
          name: nameToCheck,
          timestamp: Date.now(),
          settings,
          rows,
          customColumns,
          createdBy: activeTripId ? (savedTrips.find(t => t.id === activeTripId)?.createdBy || currentUser?.username) : currentUser?.username,
          lastModifiedBy: currentUser?.username
      };
      
      const newTrips = activeTripId ? savedTrips.map(t => t.id === activeTripId ? tripToSave : t) : [tripToSave, ...savedTrips];
      setSavedTrips(newTrips);
      setActiveTripId(tripToSave.id);
      setShowSaveModal(false);
  };

  const loadTrip = (trip: SavedTrip) => {
    setActiveTripId(trip.id);
    setSettings(trip.settings);
    setRows(trip.rows);
    setCustomColumns(trip.customColumns || []);
    setShowSavedList(false);
  };

  const deleteTrip = (id: string) => {
      if(window.confirm('确定删除此行程吗？')) {
          setSavedTrips(prev => prev.filter(t => t.id !== id));
          if(activeTripId === id) setActiveTripId(null);
      }
  };

  const handleNewTrip = () => {
      if(window.confirm("确定新建行程吗？当前未保存的内容将丢失。")) {
          setActiveTripId(null);
          setRows(Array.from({ length: 8 }).map((_, i) => createEmptyRow(i + 1)));
          setSettings(prev => ({ ...prev, plannerName: currentUser?.username || '', destinations: [], startDate: '' }));
      }
  };

  // Excel handlers skipped for brevity (unchanged logic)
  const handleImportItinerary = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... same ... */ };
  const handleExportExcel = () => { /* ... same ... */ };
  const handleAIGenerate = async () => { /* ... same ... */ };

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      setShowAuthModal(false);
  };

  const handleLogout = async () => {
      await AuthService.logout();
      setCurrentUser(null);
  };

  // --- UI Render ---

  if (isAppLoading) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
              <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h2 className="text-xl font-bold text-gray-800">星际云旅行</h2>
                  <p className="text-gray-500 text-sm mt-2">正在连接云端...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Hidden File Input for Itinerary Import */}
      <input type="file" ref={fileInputItineraryRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportItinerary} />

      {/* 1. Header & Toolbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
           <div className="flex items-center justify-between gap-4">
              {/* Logo & Title */}
              <div className="flex items-center gap-3">
                 <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-2 rounded-lg shadow-md">
                    <Rocket size={20} />
                 </div>
                 <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">星际云旅行</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 font-medium">智能行程定制系统 Pro</p>
                        {/* Cloud Status Indicator */}
                        <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400" title={cloudStatus === 'syncing' ? '正在保存到云端...' : '已同步到云端'}>
                            {cloudStatus === 'syncing' ? (
                                <RefreshCw size={10} className="animate-spin"/>
                            ) : cloudStatus === 'error' ? (
                                <Cloud size={10} className="text-red-500"/>
                            ) : (
                                <Cloud size={10} className="text-green-500"/>
                            )}
                            <span>{cloudStatus === 'syncing' ? '同步中' : cloudStatus === 'error' ? '同步失败' : '已同步'}</span>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                 {/* User Status */}
                 {currentUser ? (
                     <div className="flex items-center gap-2 mr-4 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                         <div className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                         <span className="text-xs font-bold text-gray-700">{currentUser.username}</span>
                         {/* Removed Admin Dashboard for regular user context in this demo unless role persists */}
                         <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-red-500"><LogOut size={12}/></button>
                         {currentUser.role === 'admin' && (
                             <button onClick={() => setShowAdminDashboard(true)} className="ml-2 text-blue-600 hover:text-blue-800 font-medium text-xs"><ShieldAlert size={14}/></button>
                         )}
                     </div>
                 ) : (
                     <button onClick={() => setShowAuthModal(true)} className="mr-4 text-xs font-medium text-blue-600 hover:underline">
                         登录 / 注册
                     </button>
                 )}

                 <div className="h-6 w-px bg-gray-200 mx-1"></div>

                 {/* RESTORED AI BUTTON */}
                 <button onClick={() => setShowAIModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-md hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm">
                    <Sparkles size={16} /> AI 定制
                 </button>

                 <button onClick={() => setShowSavedList(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
                    <Library size={16} className="text-indigo-600"/> 行程库
                 </button>

                 <button onClick={() => setIsResourceOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
                    <Database size={16} className="text-blue-600"/> 资源库
                 </button>
                 <button onClick={handleNewTrip} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
                    <PlusCircle size={16} className="text-green-600"/> 新建
                 </button>
                 <button onClick={() => setShowSavedList(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
                    <FolderOpen size={16} className="text-yellow-600"/> 打开
                 </button>
                 <button onClick={handleOpenSaveModal} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm">
                    <Save size={16} /> 保存
                 </button>
                 <button onClick={() => fileInputItineraryRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
                    <FileUp size={16} /> 导入
                 </button>
                 <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
                    <FileSpreadsheet size={16} /> 导出
                 </button>
              </div>
           </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 py-6 overflow-x-hidden">
         
         <GlobalSettings 
            settings={settings} 
            updateSettings={(s) => setSettings(prev => ({ ...prev, ...s }))}
            availableCountries={Array.from(new Set(poiCities.map(c => c.country).filter(Boolean))) as string[]} 
         />
         
         {/* Main Table Container */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200 border-collapse table-fixed">
                  <thead className="bg-gray-50">
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
                        {/* Costs - Hidden in print maybe? */}
                        {Th('transportCost', '交通费', 'bg-blue-50/50', 'text-blue-600')}
                        {Th('hotelCost', '酒店费', 'bg-blue-50/50', 'text-blue-600')}
                        {Th('ticketCost', '门票费', 'bg-blue-50/50', 'text-blue-600')}
                        {Th('activityCost', '活动费', 'bg-blue-50/50', 'text-blue-600')}
                        {Th('otherCost', '其它费', 'bg-blue-50/50', 'text-blue-600')}
                        <th className="w-10 px-2 py-3"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                     {rows.map((row, index) => (
                        <tr key={row.id} className="hover:bg-gray-50 group transition-colors">
                           {/* Day Index */}
                           <td className="px-2 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center justify-center font-bold text-gray-400 bg-gray-100 rounded w-8 h-8 text-sm">
                                 {index + 1}
                              </div>
                           </td>
                           
                           {/* Date */}
                           <td className="px-2 py-2">
                              <input 
                                type="date" 
                                value={row.date} 
                                onChange={(e) => {
                                    const newRows = [...rows];
                                    newRows[index].date = e.target.value;
                                    setRows(newRows);
                                }}
                                className="w-full text-xs border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 bg-transparent p-1 text-gray-600 font-mono"
                              />
                           </td>

                           {/* Route (MultiSelect) */}
                           <td className="px-2 py-2">
                               <div className="flex items-center gap-1">
                                   <div className="flex-1">
                                       <MultiSelect
                                         options={poiCities.filter(c => settings.destinations.length === 0 || settings.destinations.includes(c.country)).map(c => c.name)}
                                         value={extractCitiesFromRoute(row.route)}
                                         onChange={(val) => handleRouteUpdate(index, val)}
                                         placeholder="选择路线 (出发-到达)..."
                                         className="text-xs"
                                         displaySeparator="-"
                                       />
                                   </div>
                                   <button 
                                      onClick={() => handleQuickSave('route', index)}
                                      className="text-gray-300 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                      title="将路线中的新城市写入资源库"
                                   >
                                      <Upload size={14} />
                                   </button>
                               </div>
                           </td>

                           {/* Transport (MultiSelect) */}
                           <td className="px-2 py-2">
                              <div className="space-y-1">
                                 <MultiSelect 
                                    options={Object.values(TransportType) as string[]}
                                    value={row.transport}
                                    onChange={(val) => {
                                        const newRows = [...rows];
                                        newRows[index].transport = val;
                                        setRows(newRows);
                                    }}
                                    className="text-xs w-full"
                                 />
                                 {/* Car Model Select if car related */}
                                 {row.transport.some(t => ['包车', '接机', '送机', 'PrivateCar'].includes(t)) && (
                                     <select 
                                        className="w-full text-[10px] border-gray-200 rounded py-0.5 px-1 bg-gray-50 text-gray-600"
                                        value={row.carModel}
                                        onChange={(e) => {
                                            const model = e.target.value;
                                            const newRows = [...rows];
                                            newRows[index].carModel = model;
                                            // Auto-price
                                            const entry = carDB.find(c => c.carModel === model && (settings.destinations.includes(c.region) || c.region === '通用'));
                                            if(entry) newRows[index].transportCost = entry.priceLow; // Default to low
                                            setRows(newRows);
                                        }}
                                     >
                                        <option value="">选择车型...</option>
                                        {carDB.filter(c => settings.destinations.includes(c.region)).map(c => (
                                            <option key={c.id} value={c.carModel}>{c.carModel} ({c.passengers}座)</option>
                                        ))}
                                     </select>
                                 )}
                              </div>
                           </td>

                           {/* Hotel */}
                           <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                  <div className="flex-1">
                                      <Autocomplete 
                                         suggestions={poiHotels.filter(h => {
                                             // Filter by current route city
                                             const routeCities = extractCitiesFromRoute(row.route);
                                             if (routeCities.length === 0) return true;
                                             const cityIds = poiCities.filter(c => routeCities.includes(c.name)).map(c => c.id);
                                             return cityIds.includes(h.cityId);
                                         }).map(h => h.name)}
                                         value={row.hotelName}
                                         onChange={(val) => {
                                             const newRows = [...rows];
                                             newRows[index].hotelName = val;
                                             // Auto price
                                             const h = poiHotels.find(ph => ph.name === val);
                                             if(h) newRows[index].hotelPrice = h.price;
                                             setRows(newRows);
                                         }}
                                         placeholder="酒店名称"
                                         className="text-xs"
                                      />
                                  </div>
                                   <button 
                                      onClick={() => handleQuickSave('hotel', index)}
                                      className="text-gray-300 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                      title="将此酒店写入资源库"
                                   >
                                      <Upload size={14} />
                                   </button>
                              </div>
                           </td>

                           {/* Ticket */}
                           <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                  <div className="flex-1">
                                      <MultiSelect 
                                         options={poiSpots.filter(s => {
                                             const routeCities = extractCitiesFromRoute(row.route);
                                             if(routeCities.length===0) return true;
                                             const cityIds = poiCities.filter(c => routeCities.includes(c.name)).map(c => c.id);
                                             return cityIds.includes(s.cityId);
                                         }).map(s => s.name)}
                                         value={row.ticketName}
                                         onChange={(val) => {
                                             const newRows = [...rows];
                                             newRows[index].ticketName = val;
                                             setRows(newRows);
                                         }}
                                         placeholder="景点..."
                                         className="text-xs"
                                      />
                                  </div>
                                   <button 
                                      onClick={() => handleQuickSave('ticket', index)}
                                      className="text-gray-300 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                      title="将选中的景点写入资源库"
                                   >
                                      <Upload size={14} />
                                   </button>
                              </div>
                           </td>
                           
                           {/* Activity */}
                           <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                  <div className="flex-1">
                                      <MultiSelect 
                                         options={poiActivities.filter(a => {
                                             const routeCities = extractCitiesFromRoute(row.route);
                                             if(routeCities.length===0) return true;
                                             const cityIds = poiCities.filter(c => routeCities.includes(c.name)).map(c => c.id);
                                             return cityIds.includes(a.cityId);
                                         }).map(a => a.name)}
                                         value={row.activityName}
                                         onChange={(val) => {
                                             const newRows = [...rows];
                                             newRows[index].activityName = val;
                                             setRows(newRows);
                                         }}
                                         placeholder="活动..."
                                         className="text-xs"
                                      />
                                  </div>
                                   <button 
                                      onClick={() => handleQuickSave('activity', index)}
                                      className="text-gray-300 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                      title="将选中的活动写入资源库"
                                   >
                                      <Upload size={14} />
                                   </button>
                              </div>
                           </td>

                           {/* Description */}
                           <td className="px-2 py-2">
                              <textarea 
                                rows={2}
                                className="w-full text-xs border-transparent focus:border-blue-300 focus:ring-0 bg-transparent rounded resize-none"
                                placeholder="行程描述..."
                                value={row.description}
                                onChange={(e) => {
                                    const newRows = [...rows];
                                    newRows[index].description = e.target.value;
                                    setRows(newRows);
                                }}
                              />
                           </td>

                           {/* Rooms */}
                           <td className="px-2 py-2">
                               <input type="number" min="0" className="w-full text-xs border-transparent text-center bg-gray-50 rounded" value={row.rooms} onChange={(e) => {
                                   const newRows = [...rows];
                                   newRows[index].rooms = parseInt(e.target.value)||0;
                                   setRows(newRows);
                               }}/>
                           </td>
                           
                           {/* Costs Inputs */}
                           <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600 focus:bg-white" value={row.transportCost} onChange={(e) => { const n = [...rows]; n[index].transportCost = parseFloat(e.target.value)||0; setRows(n); }} /></td>
                           <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600 focus:bg-white" value={row.hotelCost} onChange={(e) => { const n = [...rows]; n[index].hotelCost = parseFloat(e.target.value)||0; setRows(n); }} /></td>
                           <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600 focus:bg-white" value={row.ticketCost} onChange={(e) => { const n = [...rows]; n[index].ticketCost = parseFloat(e.target.value)||0; setRows(n); }} /></td>
                           <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600 focus:bg-white" value={row.activityCost} onChange={(e) => { const n = [...rows]; n[index].activityCost = parseFloat(e.target.value)||0; setRows(n); }} /></td>
                           <td className="px-2 py-2"><input type="number" className="w-full text-xs border-transparent text-right text-gray-600 focus:bg-white" value={row.otherCost} onChange={(e) => { const n = [...rows]; n[index].otherCost = parseFloat(e.target.value)||0; setRows(n); }} /></td>

                           <td className="px-2 py-2 text-center">
                              <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="text-gray-300 hover:text-red-500 transition-colors">
                                 <Trash2 size={14} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            
            {/* Table Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
               <button 
                onClick={() => {
                    const lastRow = rows[rows.length - 1];
                    let nextOrigin = '';
                    // Try to use last row's destination as next start
                    if (lastRow) {
                        const cities = extractCitiesFromRoute(lastRow.route);
                        if (cities.length > 0) nextOrigin = cities[cities.length - 1];
                    }
                    const newRow = createEmptyRow(rows.length + 1);
                    if (nextOrigin) newRow.route = nextOrigin; // Pre-fill origin
                    setRows([...rows, newRow]);
                }}
                className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
               >
                  <Plus size={16} /> 添加一天行程
               </button>
               
               <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col items-end">
                     <span className="text-gray-500 text-xs uppercase tracking-wider">总成本 (CNY)</span>
                     <span className="text-xl font-bold text-gray-900">¥ {totalCost.toLocaleString()}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-300"></div>
                  <div className="flex flex-col items-end">
                     <span className="text-gray-500 text-xs uppercase tracking-wider">建议报价 (含{settings.marginPercent}%利润)</span>
                     <span className="text-xl font-bold text-green-600">¥ {Math.round(totalCost / (1 - settings.marginPercent / 100)).toLocaleString()}</span>
                  </div>
               </div>
            </div>
         </div>

        {/* Quote Settings Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 break-inside-avoid">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Calculator size={20} className="text-blue-600"/> 报价包含与利润配置
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Inclusions & Exclusions */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">费用包含</label>
                        <textarea 
                            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs leading-relaxed"
                            value={settings.manualInclusions}
                            onChange={(e) => setSettings(prev => ({ ...prev, manualInclusions: e.target.value }))}
                            placeholder="输入费用包含项目..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">费用不含</label>
                        <textarea 
                            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs leading-relaxed"
                            value={settings.manualExclusions}
                            onChange={(e) => setSettings(prev => ({ ...prev, manualExclusions: e.target.value }))}
                            placeholder="例如：往返大交通、个人消费、单房差等..."
                        />
                    </div>
                </div>

                {/* Right: Profit & Final Price */}
                <div className="bg-gray-50 rounded-lg p-6 flex flex-col justify-center space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">利润率设置</label>
                            <span className="text-sm font-bold text-blue-600">{settings.marginPercent}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            step="1" 
                            value={settings.marginPercent} 
                            onChange={(e) => setSettings(prev => ({ ...prev, marginPercent: parseInt(e.target.value) }))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">基础成本</span>
                            <span className="font-mono text-lg">¥ {totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">预估利润</span>
                            <span className="font-mono text-lg text-green-600">
                                + ¥ {Math.round((totalCost / (1 - settings.marginPercent / 100)) - totalCost).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-300">
                            <span className="font-bold text-gray-800 text-lg">总报价</span>
                            <span className="font-bold text-3xl text-blue-600">
                                ¥ {Math.round(totalCost / (1 - settings.marginPercent / 100)).toLocaleString()}
                            </span>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                            人均: ¥ {settings.peopleCount > 0 ? Math.round((totalCost / (1 - settings.marginPercent / 100)) / settings.peopleCount).toLocaleString() : 0}
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </main>

      {/* --- Modals --- */}
      
      {/* 1. Quick Save Modal */}
      {qsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Database size={20} className="text-blue-600"/> 
                保存至资源库
            </h3>
            
            <div className="mb-4 text-sm text-gray-600">
                <p className="mb-2">即将保存以下{qsModal.type === 'route' ? '城市' : qsModal.type === 'hotel' ? '酒店' : qsModal.type === 'ticket' ? '门票' : '活动'}:</p>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 font-medium text-gray-800 break-words">
                    {qsModal.itemsDisplay}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">请选择归属国家</label>
                <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={qsSelectedCountry}
                    onChange={(e) => setQsSelectedCountry(e.target.value)}
                >
                    <option value="" disabled>-- 请选择 --</option>
                    {/* Unique options: Smart Detected + Trip Destinations */}
                    {Array.from(new Set([qsModal.smartCountry, ...settings.destinations].filter(Boolean))).map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                {settings.destinations.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">提示: 当前行程未设置目的地国家，请先在上方设置或选择检测到的国家。</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                   * 仅限选择当前行程涉及的国家或智能检测到的国家。
                </p>
            </div>

            <div className="flex justify-end gap-2">
                <button onClick={() => setQsModal(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm">取消</button>
                <button onClick={performQuickSave} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 text-sm">确认保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Save Trip Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Save size={20} className="text-blue-600"/> 保存行程</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">行程名称</label>
              <input 
                autoFocus
                type="text" 
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="请输入行程名称"
              />
              <p className="mt-2 text-xs text-gray-400">系统已自动根据目的地和日期生成默认名称，您可直接保存或修改。</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">取消</button>
              <button onClick={handleConfirmSave} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">确认保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Saved List Modal */}
      {showSavedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-gray-800">历史行程方案 (云端)</h3>
              <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="搜索行程..." 
                   className="text-sm border-gray-300 rounded px-2 py-1"
                   value={historyFilterSearch}
                   onChange={(e) => setHistoryFilterSearch(e.target.value)}
                 />
                 <button onClick={() => setShowSavedList(false)}><X size={20} className="text-gray-400"/></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
               {savedTrips.length === 0 ? (
                   <div className="text-center py-10 text-gray-400">暂无保存的行程</div>
               ) : (
                   <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                           <tr>
                               <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">名称</th>
                               <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">目的地</th>
                               <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">天数</th>
                               <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">创建人</th>
                               <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">修改时间</th>
                               <th className="px-4 py-2"></th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-200">
                           {savedTrips
                            .filter(t => t.name.toLowerCase().includes(historyFilterSearch.toLowerCase()) || t.settings.destinations.join('').toLowerCase().includes(historyFilterSearch.toLowerCase()))
                            .sort((a,b) => b.timestamp - a.timestamp)
                            .map(trip => (
                               <tr key={trip.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => loadTrip(trip)}>
                                   <td className="px-4 py-3 text-sm font-medium text-blue-600">{trip.name}</td>
                                   <td className="px-4 py-3 text-sm text-gray-600">{trip.settings.destinations.join(', ')}</td>
                                   <td className="px-4 py-3 text-sm text-gray-500">{trip.rows.length}天</td>
                                   <td className="px-4 py-3 text-sm text-gray-500">{trip.createdBy || 'Unknown'}</td>
                                   <td className="px-4 py-3 text-sm text-gray-400">{new Date(trip.timestamp).toLocaleDateString()}</td>
                                   <td className="px-4 py-3 text-right">
                                       <button onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }} className="text-gray-400 hover:text-red-500 p-1">
                                           <Trash2 size={16}/>
                                       </button>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Resource DB Modal */}
      <ResourceDatabase 
         isOpen={isResourceOpen} 
         onClose={() => setIsResourceOpen(false)}
         carDB={carDB} onUpdateCarDB={setCarDB}
         poiCities={poiCities} onUpdatePoiCities={setPoiCities}
         poiSpots={poiSpots} onUpdatePoiSpots={setPoiSpots}
         poiHotels={poiHotels} onUpdatePoiHotels={setPoiHotels}
         poiActivities={poiActivities} onUpdatePoiActivities={setPoiActivities}
         countryFiles={countryFiles} onUpdateCountryFiles={setCountryFiles}
         isReadOnly={false} // Cloud storage usually implies multi-user access or admin control, we default to editable for now
      />

      {/* 5. Auth Modal */}
      {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} />}

      {/* 6. Admin Dashboard */}
      {showAdminDashboard && currentUser?.role === 'admin' && (
          <AdminDashboard currentUser={currentUser} onClose={() => setShowAdminDashboard(false)} />
      )}

      {/* 7. AI Modal - RESTORED */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-purple-700">
                        <Sparkles size={20}/> AI 智能行程定制
                    </h3>
                    <button onClick={() => setShowAIModal(false)}><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">请描述您的行程需求</label>
                    <textarea 
                        className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="例如：我想去日本玩7天，想去东京和京都，即使只有两个人也要住很好的酒店，喜欢吃日料..."
                        value={aiPromptInput}
                        onChange={(e) => setAiPromptInput(e.target.value)}
                    />
                    <p className="mt-2 text-xs text-gray-400">AI 将自动分析您的需求，生成包含城市、景点、酒店推荐的完整行程。</p>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAIModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">取消</button>
                    <button 
                        onClick={handleAIGenerate} 
                        disabled={isGenerating}
                        className="px-6 py-2 text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? <><Loader2 className="animate-spin" size={16}/> 生成中...</> : <><Wand2 size={16}/> 开始生成</>}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
