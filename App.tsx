import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Download, Save, FolderOpen, Rocket, Sparkles, Database, Filter, Calendar, MapPin, Clock, Copy, Edit3, X, FileDown, FileUp, HardDrive, PlusCircle, CheckCircle, RotateCcw, ArrowRightCircle, Search, LogOut, ShieldAlert, FileSpreadsheet, Calculator, Info, Library, Wand2, Loader2, Upload, Cloud, RefreshCw, Settings, AlertTriangle, User as UserIcon } from 'lucide-react';
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
import { suggestHotels, generateFileName, generateComprehensiveItinerary, ItineraryItem, AIPlanningResult } from './services/geminiService';
import { generateSeedData } from './utils/seedData';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { SupabaseManager } from './services/supabaseClient';

const INITIAL_ROWS = 8;

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- App State ---
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [notification, setNotification] = useState<{show: boolean, message: string}>({ show: false, message: '' });

  // 1. Settings & UI State
  const [settings, setSettings] = useState<TripSettings>({
    plannerName: '',
    customerName: '',
    peopleCount: 2,
    roomCount: 1,
    currency: 'CNY',
    exchangeRate: 1,
    destinations: [],
    startDate: new Date().toISOString().split('T')[0], 
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
  const [tripSearchTerm, setTripSearchTerm] = useState('');

  // 4. App Operational State
  const [rows, setRows] = useState<DayRow[]>(() => Array.from({ length: INITIAL_ROWS }).map((_, i) => ({
      id: generateUUID(),
      dayIndex: i + 1,
      date: '',
      route: '',
      transport: ['包车'],
      carModel: '',
      hotelName: '',
      hotelRoomType: '',
      ticketName: [],
      activityName: [],
      description: '',
      rooms: 1,
      transportCost: 0,
      hotelPrice: 0,
      hotelCost: 0,
      ticketCost: 0,
      activityCost: 0,
      otherCost: 0,
      customCosts: {},
  })));
  
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
  
  // Save Trip Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Column Width State
  const [colWidths, setColWidths] = useState<Record<string, number>>({
      day: 48, date: 110, route: 180, transport: 140, hotel: 160, 
      ticket: 140, activity: 140, description: 250, rooms: 50, 
      transportCost: 90, hotelPrice: 90, hotelCost: 90, 
      ticketCost: 90, activityCost: 90, otherCost: 90
  });

  const totalCost = useMemo(() => rows.reduce((acc, r) => acc + r.transportCost + r.hotelCost + r.ticketCost + r.activityCost + r.otherCost, 0), [rows]);

  // Pre-calculate valid cities based on selected countries
  // Rule: If destinations are selected, only show cities from those countries.
  const allowedCityNames = useMemo(() => {
    if (settings.destinations.length === 0) return poiCities.map(c => c.name);
    return poiCities
       .filter(c => settings.destinations.includes(c.country))
       .map(c => c.name);
  }, [poiCities, settings.destinations]);

  // --- Effects ---
  useEffect(() => {
      const initApp = async () => {
          setIsAppLoading(true);
          const user = await AuthService.getCurrentUser();
          if (user) setCurrentUser(user);
          await loadCloudData();
          setIsAppLoading(false);
      };
      initApp();
  }, []);

  const loadCloudData = async () => {
      try {
            await StorageService.ensureAdminProfile();
            const [cars, cities, spots, hotels, activities, files, trips, locs, settings] = await Promise.all([
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
            setCarDB(cars);
            setPoiCities(cities);
            setPoiSpots(spots);
            setPoiHotels(hotels);
            setPoiActivities(activities);
            setCountryFiles(files);
            setSavedTrips(trips);
            setLocationHistory(locs);
            if (settings && Object.keys(settings).length > 0) setColWidths(settings);
            setCloudStatus('synced');
      } catch (e) {
          console.error("Load failed", e);
          setCloudStatus('error');
      }
  };

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
  useDebouncedSave(colWidths, StorageService.saveAppSettings);

  function createEmptyRow(dayIndex: number): DayRow {
    return {
      id: generateUUID(),
      dayIndex,
      date: settings.startDate ? addDays(settings.startDate, dayIndex - 1) : '',
      route: '',
      transport: ['包车'],
      carModel: '',
      hotelName: '',
      hotelRoomType: '',
      ticketName: [],
      activityName: [],
      description: '',
      rooms: settings.roomCount || 1,
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
        <th key={id} style={{ width: w, minWidth: w }} className={`px-2 py-3 text-left text-xs font-bold uppercase group ${textClass} ${bgClass} sticky top-0 ${sticky ? 'left-0 z-30 shadow-[1px_0_2px_rgba(0,0,0,0.05)]' : 'z-20'} border-b border-gray-200`}>
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
  const handleRefreshCosts = () => {
      const newRows = rows.map(row => {
          const r = { ...row };

          // Sync Rooms
          if (settings.roomCount && settings.roomCount > 0) {
              r.rooms = settings.roomCount;
          }

          // Get Valid Cities for this row (From Route, or Fallback to Country)
          const routeCities = extractCitiesFromRoute(r.route);
          const destinationCityIds = getDestinationCityIds(r.route); // Last city for Hotel (Fuzzy Matched)
          
          let relevantCityIds: string[] = [];
          if (routeCities.length > 0) {
              // Fuzzy Match all cities in route
              relevantCityIds = routeCities.flatMap(name => getMatchingCityIds(name, poiCities));
          } else {
               // Fallback: All cities in selected countries
              relevantCityIds = poiCities
                .filter(c => settings.destinations.includes(c.country))
                .map(c => c.id);
          }
          // Dedupe
          relevantCityIds = Array.from(new Set(relevantCityIds));

          // 1. Hotel Logic
          // Rule: Hotel must be in Destination City (last in route)
          if (r.hotelName) {
              let hotels = [];
              if (destinationCityIds.length > 0) {
                  hotels = poiHotels.filter(h => h.name === r.hotelName && destinationCityIds.includes(h.cityId));
              } else {
                  // If no specific destination city (or route empty), check allowed countries
                  hotels = poiHotels.filter(h => h.name === r.hotelName && relevantCityIds.includes(h.cityId));
              }

              // Fallback to name match if specific location match failed (e.g. city name typo)
              if (hotels.length === 0) {
                  hotels = poiHotels.filter(h => h.name === r.hotelName);
              }
              
              if (hotels.length > 0) {
                  let matched = hotels.find(h => h.roomType === r.hotelRoomType);
                  if (!matched) matched = hotels[0]; 
                  
                  if (matched) {
                      if (!r.hotelRoomType || matched.roomType !== r.hotelRoomType) {
                           r.hotelRoomType = matched.roomType;
                      }
                      r.hotelPrice = matched.price;
                      r.hotelCost = matched.price * (r.rooms || 0); 
                  }
              }
          } else {
              r.hotelCost = 0;
              r.hotelPrice = 0;
          }

          // 2. Ticket Logic
          // Rule: Spots must be in ANY city in route
          if (r.ticketName.length > 0) {
              let sum = 0;
              r.ticketName.forEach(name => {
                  let s = poiSpots.find(item => item.name === name && relevantCityIds.includes(item.cityId));
                  if (!s) s = poiSpots.find(item => item.name === name); // Fallback
                  if (s) sum += s.price;
              });
              r.ticketCost = sum * (settings.peopleCount || 0);
          } else {
              r.ticketCost = 0;
          }

          // 3. Activity Logic
          // Rule: Activities must be in ANY city in route
          if (r.activityName.length > 0) {
              let sum = 0;
              r.activityName.forEach(actName => {
                  let act = poiActivities.find(a => a.name === actName && relevantCityIds.includes(a.cityId));
                  if (!act) act = poiActivities.find(a => a.name === actName); // Fallback
                  if (act) sum += act.price;
              });
              r.activityCost = sum * (settings.peopleCount || 0);
          } else {
              r.activityCost = 0;
          }

          // 4. Transport Logic
          if (r.carModel) {
               const car = carDB.find(c => c.carModel === r.carModel && (settings.destinations.includes(c.region) || c.region === '通用' || c.region === 'General'));
               if (car) r.transportCost = car.priceLow; 
          }
          return r;
      });
      setRows(newRows);
      setNotification({ show: true, message: '所有费用已根据当前人数、房间数和资源库价格刷新' });
      setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  const updateRow = (index: number, updates: Partial<DayRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    setRows(newRows);
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
        alert("至少保留一天行程");
        return;
    }
    if (window.confirm(`确定删除第 ${index + 1} 天的行程吗？`)) {
        const newRows = rows.filter((_, i) => i !== index);
        // Re-index days and update dates
        const reIndexedRows = newRows.map((row, i) => ({ 
            ...row, 
            dayIndex: i + 1, 
            date: settings.startDate ? addDays(settings.startDate, i) : '' 
        }));
        setRows(reIndexedRows);
    }
  };

  const handleRouteUpdate = (index: number, val: string) => {
      // Direct update of the string value (allows multi-city via separator)
      const newRows = [...rows];
      newRows[index] = { ...newRows[index], route: val };
      
      // Auto-fill next day origin if valid
      const cities = extractCitiesFromRoute(val);
      const currentDest = cities.length > 0 ? cities[cities.length - 1] : null;

      if (currentDest && index < newRows.length - 1) {
          const nextRow = newRows[index + 1];
          const nextRowCities = extractCitiesFromRoute(nextRow.route);
          
          // Only auto-fill if next row is empty
          if (nextRowCities.length === 0) {
               newRows[index + 1] = { ...nextRow, route: `${currentDest}-` };
          }
      }
      setRows(newRows);
      
      const newLocs = cities.filter(v => !locationHistory.includes(v));
      if (newLocs.length > 0) setLocationHistory([...locationHistory, ...newLocs]);
  };

  // Fuzzy matching helper
  const getMatchingCityIds = (name: string, allCities: PoiCity[]): string[] => {
      return allCities.filter(c => {
          // Exact match
          if (c.name === name) return true;
          // Case A: DB has "Beijing (China)", Route has "Beijing"
          if (c.name.includes('(') && c.name.includes(')')) {
               const parts = c.name.match(/^(.+?)\s*\((.+?)\)$/);
               if (parts) {
                   const p1 = parts[1].trim();
                   const p2 = parts[2].trim();
                   if (p1 === name || p2 === name) return true;
               }
          }
          // Case B: DB has "Beijing", Route has "Beijing (China)"
          if (name.includes('(') && name.includes(')')) {
              const parts = name.match(/^(.+?)\s*\((.+?)\)$/);
              if (parts) {
                  const p1 = parts[1].trim();
                  const p2 = parts[2].trim();
                  if (c.name === p1 || c.name === p2) return true;
              }
          }
          return false;
      }).map(c => c.id);
  };

  const getDestinationCityIds = (route: string): string[] => {
      const cities = extractCitiesFromRoute(route);
      if (cities.length === 0) return [];
      const lastCityName = cities[cities.length - 1];
      return getMatchingCityIds(lastCityName, poiCities);
  };

  const handleHotelChange = (index: number, newName: string) => {
      const row = rows[index];
      const cityIds = getDestinationCityIds(row.route);
      
      // 1. Try Strict Match (Name + City)
      let variants = poiHotels.filter(h => h.name === newName && (cityIds.length === 0 || cityIds.includes(h.cityId)));
      
      // 2. Fallback
      if (variants.length === 0) {
          variants = poiHotels.filter(h => h.name === newName);
      }
      
      let updates: Partial<DayRow> = { hotelName: newName };
      
      if (variants.length > 0) {
          const defaultRoom = variants[0];
          updates.hotelRoomType = defaultRoom.roomType;
          updates.hotelPrice = defaultRoom.price;
          updates.hotelCost = defaultRoom.price * (row.rooms || 1);
      } else {
          updates.hotelPrice = 0;
          updates.hotelCost = 0;
      }
      updateRow(index, updates);
  };

  const handleRoomTypeChange = (index: number, newType: string) => {
      const row = rows[index];
      const cityIds = getDestinationCityIds(row.route);
      
      let variant = poiHotels.find(h => 
          h.name === row.hotelName && 
          h.roomType === newType && 
          (cityIds.length === 0 || cityIds.includes(h.cityId))
      );
      
      if (!variant) {
           variant = poiHotels.find(h => h.name === row.hotelName && h.roomType === newType);
      }
      
      if (variant) {
          updateRow(index, {
              hotelRoomType: newType,
              hotelPrice: variant.price,
              hotelCost: variant.price * (row.rooms || 1)
          });
      } else {
          updateRow(index, { hotelRoomType: newType });
      }
  };

  const handleRoomsChange = (index: number, newRooms: number) => {
      const row = rows[index];
      updateRow(index, {
          rooms: newRooms,
          hotelCost: row.hotelPrice * newRooms
      });
  };

  const handleQuickSave = (type: 'route' | 'hotel' | 'ticket' | 'activity', rowIndex: number) => {
    if (!currentUser) { alert("请先登录"); setShowAuthModal(true); return; }
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
    setQsModal({ isOpen: true, type, rowIndex, itemsDisplay, routeCities, targetCityName, smartCountry: detectedCountry || settings.destinations[0] || '' });
    setQsSelectedCountry(detectedCountry || settings.destinations[0] || '');
  };

  const performQuickSave = () => {
      if (!qsModal) return;
      const { type, rowIndex, routeCities, targetCityName } = qsModal;
      const finalCountry = qsSelectedCountry;
      const row = rows[rowIndex];
      if (!finalCountry) { alert("请选择归属国家"); return; }
      
      let addedCount = 0;
      let duplicateCount = 0;
      
      // Temporary list of cities to check against and update.
      let tempCities = [...poiCities];
      let hasCityUpdate = false;

      // Helper to find existing or upgradeable city
      // Logic:
      // 1. Exact match found -> Return ID.
      // 2. New Name contains brackets (Combined) and Existing Name is a subset (Chinese or English) -> Update Existing Name, Return ID.
      // 3. New Name is subset, Existing Name is Combined -> Return ID (implicitly merged).
      const ensureCitySmart = (name: string): string => {
          // 1. Exact match
          const exact = tempCities.find(c => c.country === finalCountry && c.name === name);
          if (exact) return exact.id;

          // 2. Check if we are adding a Composite that matches an existing Simple (Upgrade Scenario)
          // e.g. Input: "Beijing (China)", Existing: "Beijing" -> Update Existing to "Beijing (China)"
          if (name.includes('(') && name.includes(')')) {
              const match = name.match(/^(.+?)\s*\((.+?)\)$/);
              if (match) {
                  const p1 = match[1].trim();
                  const p2 = match[2].trim();
                  const simple = tempCities.find(c => c.country === finalCountry && (c.name === p1 || c.name === p2));
                  if (simple) {
                      // Update name in place
                      simple.name = name; 
                      hasCityUpdate = true;
                      return simple.id;
                  }
              }
          }

          // 3. Check if we are adding a Simple that matches an existing Composite (Alias Scenario)
          // e.g. Input: "Beijing", Existing: "Beijing (China)" -> Use Existing ID
          const composite = tempCities.find(c => {
              if (!c.name.includes('(') || !c.name.includes(')')) return false;
              if (c.country !== finalCountry) return false;
              const match = c.name.match(/^(.+?)\s*\((.+?)\)$/);
              if (!match) return false;
              return match[1].trim() === name || match[2].trim() === name;
          });
          if (composite) return composite.id;

          // 4. Create New
          const newId = generateUUID();
          tempCities.push({ id: newId, country: finalCountry, name });
          hasCityUpdate = true;
          return newId;
      };

      if (type === 'route') {
        const currentNames = new Set(poiCities.map(c => c.name));
        routeCities.forEach(name => {
             // Use Smart Logic
             const id = ensureCitySmart(name);
             // Check if it was effectively a new addition for counting purposes
             if (!currentNames.has(name) && !poiCities.find(c => c.id === id)) {
                 addedCount++;
             } else if (hasCityUpdate) {
                 // Counts as an update/merge
             } else {
                 duplicateCount++;
             }
        });
        if (hasCityUpdate) {
            setPoiCities(tempCities);
        }
      } else {
        // Find or Create City using Smart Logic
        const cityId = ensureCitySmart(targetCityName);
        if (hasCityUpdate) setPoiCities(tempCities);

        if (type === 'hotel') { 
            // Check duplication: Same City + Same Hotel Name
            const exists = poiHotels.some(h => h.cityId === cityId && h.name === row.hotelName);
            if (!exists) {
                setPoiHotels(prev => [...prev, { id: generateUUID(), cityId: cityId!, name: row.hotelName, roomType: '标准间', price: row.hotelPrice || 0 }]); 
                addedCount++;
            } else {
                duplicateCount++;
            }
        } else if (type === 'ticket') { 
            const unitPrice = settings.peopleCount > 0 ? Math.round(row.ticketCost / settings.peopleCount / (row.ticketName.length || 1)) : 0; 
            const toAdd: PoiSpot[] = [];
            
            row.ticketName.forEach(name => {
                const exists = poiSpots.some(s => s.cityId === cityId && s.name === name);
                if (!exists) {
                    toAdd.push({ id: generateUUID(), cityId: cityId!, name, price: unitPrice });
                    addedCount++;
                } else {
                    duplicateCount++;
                }
            });
            setPoiSpots(prev => [...prev, ...toAdd]); 
        } else if (type === 'activity') { 
            const unitPrice = settings.peopleCount > 0 ? Math.round(row.activityCost / settings.peopleCount / (row.activityName.length || 1)) : 0; 
            const toAdd: PoiActivity[] = [];

            row.activityName.forEach(name => {
                 const exists = poiActivities.some(a => a.cityId === cityId && a.name === name);
                 if (!exists) {
                    toAdd.push({ id: generateUUID(), cityId: cityId!, name, price: unitPrice });
                    addedCount++;
                 } else {
                    duplicateCount++;
                 }
            });
            setPoiActivities(prev => [...prev, ...toAdd]); 
        }
      }
      
      let msg = "";
      if (addedCount > 0) msg += `成功添加 ${addedCount} 个资源。`;
      if (hasCityUpdate) msg += ` (已自动合并/更新城市名称)`;
      if (duplicateCount > 0) msg += `有 ${duplicateCount} 个资源已存在，已跳过。`;
      alert(msg || "没有新资源被添加。");
      
      setQsModal(null);
  };

  const handleOpenSaveModal = () => {
    const planner = currentUser?.username || settings.plannerName || '未命名';
    let country = '未定国家';
    if (settings.destinations.length > 0) { country = settings.destinations.join('+'); } else { const allCities = rows.flatMap(r => extractCitiesFromRoute(r.route)); if (allCities.length > 0) { const c = poiCities.find(pc => pc.name === allCities[0]); if (c) country = c.country; } }
    const duration = `${rows.length}天`;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const smartName = `${planner}_${country}_${duration}_${dateStr}`;
    if (activeTripId) { const currentTrip = savedTrips.find(t => t.id === activeTripId); setSaveName(currentTrip ? currentTrip.name : smartName); } else { setSaveName(smartName); }
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
      const nameToCheck = saveName.trim();
      if (!nameToCheck) { alert("请输入行程名称"); return; }
      const existingTripWithSameName = savedTrips.find(t => t.name === nameToCheck);
      const currentEditingTrip = activeTripId ? savedTrips.find(t => t.id === activeTripId) : null;
      const canModify = (trip: SavedTrip) => { if (!currentUser) return false; if (currentUser.role === 'admin') return true; return trip.createdBy === currentUser.username; };
      let targetId: string;
      if (existingTripWithSameName) {
          if (currentEditingTrip && existingTripWithSameName.id === currentEditingTrip.id) {
              if (canModify(currentEditingTrip)) { targetId = currentEditingTrip.id; } else { if (!window.confirm(`您没有权限直接修改行程 "${nameToCheck}" (创建者: ${currentEditingTrip.createdBy || '未知'})。\n\n是否将其保存为您名下的新副本？`)) { return; } targetId = generateUUID(); }
          } else {
              if (!canModify(existingTripWithSameName)) { alert(`行程名称 "${nameToCheck}" 已存在且属于用户 ${existingTripWithSameName.createdBy || '未知'}。\n\n您没有权限覆盖它，请使用其他名称。`); return; }
              if (!window.confirm(`行程名称 "${nameToCheck}" 已存在于行程库中。\n\n是否覆盖该旧行程？`)) { return; }
              targetId = existingTripWithSameName.id;
          }
      } else {
          targetId = generateUUID();
      }

      const newTrip: SavedTrip = {
        id: targetId,
        name: nameToCheck,
        timestamp: Date.now(),
        settings: settings,
        rows: rows,
        customColumns: customColumns,
        createdBy: currentUser?.username || 'anonymous',
        lastModifiedBy: currentUser?.username || 'anonymous'
      };
      
      const updatedTrips = [...savedTrips.filter(t => t.id !== targetId), newTrip];
      setSavedTrips(updatedTrips);
      setActiveTripId(targetId);
      setShowSaveModal(false);
      setNotification({ show: true, message: '行程已保存' });
      setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    setSettings(trip.settings);
    setRows(trip.rows);
    setCustomColumns(trip.customColumns || []);
    setActiveTripId(trip.id);
    setShowSavedList(false);
    setNotification({ show: true, message: `已加载: ${trip.name}` });
    setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  const handleNewTrip = () => {
    if (window.confirm("确定要新建行程吗？当前未保存的内容将丢失。")) {
        setActiveTripId(null);
        setSettings({ ...settings, destinations: [], startDate: new Date().toISOString().split('T')[0] });
        setRows(Array.from({ length: 8 }).map((_, i) => createEmptyRow(i + 1)));
        setCustomColumns([]);
    }
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Table Data
    const headers = ["第几天", "日期", "路线", "交通方式", "车型", "酒店", "房型", "景点", "活动", "行程详情", "交通费", "酒店费", "门票费", "活动费", "其它费"];
    const dataRows = rows.map(r => [
        r.dayIndex, r.date, r.route, r.transport.join(', '), r.carModel,
        r.hotelName, r.hotelRoomType, r.ticketName.join(', '), r.activityName.join(', '),
        r.description, r.transportCost, r.hotelCost, r.ticketCost, r.activityCost, r.otherCost
    ]);

    // 2. Calculate Footer Info
    const quotePrice = Math.round(totalCost * settings.exchangeRate / (1 - settings.marginPercent / 100));

    // 3. Construct Single Sheet Data
    const sheetData = [
        headers,
        ...dataRows,
        [], // spacer
        [], // spacer
        ["总报价 / Total Quote", `${quotePrice.toLocaleString()} ${settings.currency}`],
        [],
        ["费用包含 / Inclusions"],
        [settings.manualInclusions],
        [],
        ["费用不含 / Exclusions"],
        [settings.manualExclusions]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
    XLSX.writeFile(wb, `${settings.customerName || 'Itinerary'}.xlsx`);
  };

  const handleAIPlanning = async () => {
      setIsGenerating(true);
      const availableCountries = Array.from(new Set(poiCities.map(c => c.country))) as string[];
      // NEW: Extract available cities for smart matching
      const availableCities = Array.from(new Set(poiCities.map(c => c.name))) as string[];
      
      const result = await generateComprehensiveItinerary(
          settings.destinations, 
          rows.length, 
          rows, 
          savedTrips, 
          availableCountries, 
          availableCities, // Pass cities
          aiPromptInput
      );
      
      if (result && result.itinerary) {
          const detected = (result.detectedDestinations || []) as string[];
          if (detected.length > 0) {
              setSettings(prev => ({ 
                  ...prev, 
                  destinations: [...new Set([...prev.destinations, ...detected])]
              }));
          }
          
          // --- FULL ROW REPLACEMENT & RESIZING ---
          // Use AI result to fully replace rows, ensuring deleted days are removed
          const generatedLength = result.itinerary.length;
          const newRows = Array.from({ length: generatedLength }).map((_, i) => {
              const existingRow = rows[i] || createEmptyRow(i + 1);
              const item = result.itinerary[i];
              return {
                  ...existingRow,
                  dayIndex: i + 1,
                  date: settings.startDate ? addDays(settings.startDate, i) : '',
                  route: `${item.origin}-${item.destination}`,
                  hotelName: item.hotelName || '',
                  ticketName: item.ticketName ? [item.ticketName] : [],
                  activityName: item.activityName ? [item.activityName] : [],
                  description: item.description || ''
              };
          });
          
          setRows(newRows);
          setNotification({ show: true, message: 'AI 规划完成，行程天数已更新' });
      } else {
          alert('AI 生成失败，请重试');
      }
      setIsGenerating(false);
      setShowAIModal(false);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-40 sticky top-0 no-print">
        <div className="flex items-center gap-4">
           <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
             <Rocket size={24} className="text-blue-600" /> 星际云旅行
           </h1>
           <div className="flex items-center gap-2">
              <button onClick={handleNewTrip} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="新建"><FileUp size={18}/></button>
              <button onClick={() => setShowSavedList(true)} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="打开"><FolderOpen size={18}/></button>
              <button onClick={handleOpenSaveModal} className="p-2 hover:bg-gray-100 rounded text-blue-600" title="保存"><Save size={18}/></button>
              <button onClick={handleExport} className="p-2 hover:bg-gray-100 rounded text-green-600" title="导出"><FileSpreadsheet size={18}/></button>
           </div>
           <div className="h-6 w-px bg-gray-300 mx-2"></div>
           <button onClick={() => setIsResourceOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm font-medium"><Database size={16}/> 资源库</button>
           <button onClick={() => setShowAIModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-sm font-medium"><Sparkles size={16}/> AI 规划</button>
        </div>
        <div className="flex items-center gap-4">
            {notification.show && <div className="text-sm text-green-600 font-medium animate-fade-in bg-green-50 px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle size={14}/> {notification.message}</div>}
            <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${cloudStatus === 'synced' ? 'text-green-600 bg-green-50' : cloudStatus === 'error' ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                <Cloud size={12}/> {cloudStatus === 'synced' ? '已同步' : cloudStatus === 'syncing' ? '同步中...' : '未同步'}
            </div>
            {currentUser ? (
                <div className="flex items-center gap-3">
                   {currentUser.role === 'admin' && <button onClick={() => setShowAdminDashboard(true)} className="text-gray-500 hover:text-red-600" title="管理员后台"><ShieldAlert size={18}/></button>}
                   <span className="text-sm font-medium">{currentUser.username}</span>
                   <button onClick={() => { AuthService.logout(); setCurrentUser(null); }} className="text-gray-400 hover:text-gray-600"><LogOut size={18}/></button>
                </div>
            ) : (
                <button onClick={() => setShowAuthModal(true)} className="text-sm font-medium text-blue-600 hover:underline">登录 / 注册</button>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <GlobalSettings settings={settings} updateSettings={(s) => setSettings(prev => ({...prev, ...s}))} availableCountries={Array.from(new Set(poiCities.map(c => c.country)))} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            {Th('day', 'Day', 'bg-gray-50', 'text-gray-500', true)}
                            {Th('date', '日期')}
                            {Th('route', '路线 (城市-城市)')}
                            {Th('transport', '交通方式')}
                            {Th('hotel', '酒店住宿')}
                            {Th('ticket', '景点门票')}
                            {Th('activity', '娱乐活动')}
                            {Th('description', '行程详情')}
                            {Th('rooms', '间数')}
                            {Th('transportCost', '交通费')}
                            {Th('hotelCost', '酒店费')}
                            {Th('ticketCost', '门票费')}
                            {Th('activityCost', '活动费')}
                            {Th('otherCost', '其它')}
                            <th className="w-10 sticky right-0 bg-gray-50 z-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((row, index) => {
                            const destinationCityIds = getDestinationCityIds(row.route); // Fuzzy Match IDs
                            const routeCities = extractCitiesFromRoute(row.route);
                            
                            // --- STRICT FILTERING LOGIC ---
                            // 1. Identify relevant City IDs based on Route (Fuzzy Match)
                            let relevantCityIds: string[] = [];
                            if (routeCities.length > 0) {
                                // If Route exists, restrict to cities in route
                                relevantCityIds = routeCities.flatMap(name => getMatchingCityIds(name, poiCities));
                            } else {
                                // If Route is empty, restrict to ALL cities in Selected Countries
                                relevantCityIds = poiCities
                                    .filter(c => settings.destinations.includes(c.country))
                                    .map(c => c.id);
                            }
                            relevantCityIds = Array.from(new Set(relevantCityIds));

                            // 2. Filter Hotel Options
                            // Priority: Specific Destination City -> Relevant Cities (Country) -> All
                            let hotelOptions = [];
                            if (destinationCityIds.length > 0) {
                                hotelOptions = poiHotels.filter(h => destinationCityIds.includes(h.cityId));
                            } else {
                                hotelOptions = poiHotels.filter(h => relevantCityIds.includes(h.cityId));
                            }
                            const uniqueHotelNames = Array.from(new Set(hotelOptions.map(h => h.name)));
                            
                            // 3. Filter Room Options for selected hotel
                            let roomOptions = [];
                            if (row.hotelName) {
                                if (destinationCityIds.length > 0) {
                                    roomOptions = poiHotels.filter(h => h.name === row.hotelName && destinationCityIds.includes(h.cityId));
                                } else {
                                    roomOptions = poiHotels.filter(h => h.name === row.hotelName && relevantCityIds.includes(h.cityId));
                                }
                                if (roomOptions.length === 0) {
                                    // Fallback if specific city match fails
                                    roomOptions = poiHotels.filter(h => h.name === row.hotelName);
                                }
                            }

                            // 4. Filter Spots & Activities
                            // Strict: Must match cities in route (or country if route empty)
                            const validSpots = poiSpots.filter(s => relevantCityIds.includes(s.cityId));
                            const validSpotNames = validSpots.map(s => s.name);

                            const validActivities = poiActivities.filter(a => relevantCityIds.includes(a.cityId));
                            const validActivityNames = validActivities.map(a => a.name);

                            return (
                            <tr key={row.id} className="hover:bg-blue-50/30 group">
                                <td className="p-2 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 font-medium text-center text-gray-400">{row.dayIndex}</td>
                                <td className="p-2"><input type="date" className="w-full border-none bg-transparent p-0 text-gray-600 text-xs focus:ring-0" value={row.date} onChange={(e) => updateRow(index, { date: e.target.value })} /></td>
                                <td className="p-2">
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex-1">
                                            <Autocomplete 
                                                value={row.route} 
                                                onChange={(val) => handleRouteUpdate(index, val)} 
                                                suggestions={allowedCityNames} 
                                                placeholder="出发-到达"
                                                separator="-" 
                                            />
                                        </div>
                                        <button tabIndex={-1} onClick={() => handleQuickSave('route', index)} className="opacity-0 group-hover:opacity-100 text-blue-300 hover:text-blue-600 transition-opacity"><PlusCircle size={14}/></button>
                                    </div>
                                </td>
                                <td className="p-2">
                                    <div className="flex flex-col gap-1">
                                        <MultiSelect options={Object.values(TransportType)} value={row.transport} onChange={(v) => updateRow(index, { transport: v })} className="w-full" />
                                        {row.transport.includes('包车') && (
                                            <select className="text-xs border border-gray-200 rounded p-1 w-full mt-1 bg-gray-50" value={row.carModel} onChange={(e) => updateRow(index, { carModel: e.target.value })}>
                                                <option value="">选择车型...</option>
                                                {carDB.filter(c => settings.destinations.includes(c.region) || c.region === '通用').map(c => <option key={c.id} value={c.carModel}>{c.carModel} ({c.priceLow})</option>)}
                                            </select>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2 relative group/cell">
                                    <Autocomplete 
                                        value={row.hotelName} 
                                        onChange={(v) => handleHotelChange(index, v)} 
                                        suggestions={uniqueHotelNames} 
                                        placeholder={destinationCityIds.length > 0 ? "选择酒店" : "选择酒店 (需先定路线)"} 
                                    />
                                    {row.hotelName && (
                                        <select 
                                            className="w-full mt-1 text-xs border border-gray-200 rounded p-1 bg-gray-50 text-gray-600 focus:outline-none focus:border-blue-300"
                                            value={row.hotelRoomType}
                                            onChange={(e) => handleRoomTypeChange(index, e.target.value)}
                                        >
                                            {roomOptions.map(h => (
                                                <option key={h.id} value={h.roomType}>{h.roomType} ({h.price})</option>
                                            ))}
                                            {!roomOptions.some(h => h.roomType === row.hotelRoomType) && row.hotelRoomType && (
                                                <option value={row.hotelRoomType}>
                                                    {row.hotelRoomType} (当前)
                                                </option>
                                            )}
                                        </select>
                                    )}
                                    <button tabIndex={-1} onClick={() => handleQuickSave('hotel', index)} className="absolute right-1 top-2 opacity-0 group-hover/cell:opacity-100 text-blue-300 hover:text-blue-600"><PlusCircle size={14}/></button>
                                </td>
                                <td className="p-2 relative group/cell">
                                    <MultiSelect 
                                        options={validSpotNames} 
                                        value={row.ticketName} 
                                        onChange={(v) => updateRow(index, { ticketName: v })} 
                                        placeholder={validSpotNames.length ? "选择景点..." : "暂无景点"}
                                    />
                                    <button tabIndex={-1} onClick={() => handleQuickSave('ticket', index)} className="absolute right-1 top-2 opacity-0 group-hover/cell:opacity-100 text-blue-300 hover:text-blue-600"><PlusCircle size={14}/></button>
                                </td>
                                <td className="p-2 relative group/cell">
                                    <MultiSelect 
                                        options={validActivityNames} 
                                        value={row.activityName} 
                                        onChange={(v) => updateRow(index, { activityName: v })} 
                                        placeholder={validActivityNames.length ? "选择活动..." : "暂无活动"} 
                                    />
                                    <button tabIndex={-1} onClick={() => handleQuickSave('activity', index)} className="absolute right-1 top-2 opacity-0 group-hover/cell:opacity-100 text-blue-300 hover:text-blue-600"><PlusCircle size={14}/></button>
                                </td>
                                <td className="p-2"><textarea className="w-full border-none bg-transparent p-0 text-sm focus:ring-0 resize-y min-h-[2.5rem]" rows={1} value={row.description} onChange={(e) => updateRow(index, { description: e.target.value })} /></td>
                                <td className="p-2"><input type="number" min="0" className="w-full border-none bg-transparent p-0 text-center focus:ring-0" value={row.rooms} onChange={(e) => handleRoomsChange(index, parseInt(e.target.value)||0)} /></td>
                                <td className="p-2"><input type="number" className="w-full border-none bg-transparent p-0 text-right focus:ring-0 text-gray-500" value={row.transportCost} onChange={(e) => updateRow(index, { transportCost: parseFloat(e.target.value)||0 })} /></td>
                                <td className="p-2"><input type="number" className="w-full border-none bg-transparent p-0 text-right focus:ring-0 text-gray-500" value={row.hotelCost} onChange={(e) => updateRow(index, { hotelCost: parseFloat(e.target.value)||0 })} /></td>
                                <td className="p-2"><input type="number" className="w-full border-none bg-transparent p-0 text-right focus:ring-0 text-gray-500" value={row.ticketCost} onChange={(e) => updateRow(index, { ticketCost: parseFloat(e.target.value)||0 })} /></td>
                                <td className="p-2"><input type="number" className="w-full border-none bg-transparent p-0 text-right focus:ring-0 text-gray-500" value={row.activityCost} onChange={(e) => updateRow(index, { activityCost: parseFloat(e.target.value)||0 })} /></td>
                                <td className="p-2"><input type="number" className="w-full border-none bg-transparent p-0 text-right focus:ring-0 text-gray-500" value={row.otherCost} onChange={(e) => updateRow(index, { otherCost: parseFloat(e.target.value)||0 })} /></td>
                                <td className="p-2 text-center sticky right-0 bg-white group-hover:bg-blue-50/30 z-10"><button onClick={() => handleDeleteRow(index)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></td>
                            </tr>
                        );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold text-gray-700">
                        <tr>
                            <td colSpan={9} className="p-3 text-right">总计成本 ({settings.currency}):</td>
                            <td className="p-3 text-right text-blue-600">{rows.reduce((a,r) => a+r.transportCost, 0).toLocaleString()}</td>
                            <td className="p-3 text-right text-blue-600">{rows.reduce((a,r) => a+r.hotelCost, 0).toLocaleString()}</td>
                            <td className="p-3 text-right text-blue-600">{rows.reduce((a,r) => a+r.ticketCost, 0).toLocaleString()}</td>
                            <td className="p-3 text-right text-blue-600">{rows.reduce((a,r) => a+r.activityCost, 0).toLocaleString()}</td>
                            <td className="p-3 text-right text-blue-600">{rows.reduce((a,r) => a+r.otherCost, 0).toLocaleString()}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td colSpan={9} className="p-3">
                                <div className="flex items-center justify-end gap-4 h-full">
                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                        <span className="text-xs font-medium text-blue-800">利润率</span>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="60" 
                                            step="1" 
                                            value={settings.marginPercent} 
                                            onChange={(e) => setSettings(prev => ({...prev, marginPercent: parseInt(e.target.value) || 0}))}
                                            className="w-24 h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className="text-xs font-bold text-blue-800 w-8 text-right">{settings.marginPercent}%</span>
                                    </div>
                                    <span className="font-bold text-gray-700">总报价:</span>
                                </div>
                            </td>
                            <td colSpan={6} className="p-3 text-left text-xl text-green-600 font-black">
                                {Math.round(totalCost * settings.exchangeRate / (1 - settings.marginPercent / 100)).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="p-3 bg-gray-50 border-t flex justify-center">
                <button onClick={() => setRows([...rows, createEmptyRow(rows.length + 1)])} className="text-blue-600 flex items-center gap-1 hover:bg-blue-100 px-4 py-2 rounded transition-colors font-medium"><Plus size={16}/> 添加一天</button>
                <button onClick={handleRefreshCosts} className="ml-4 text-green-600 flex items-center gap-1 hover:bg-green-100 px-4 py-2 rounded transition-colors font-medium"><RefreshCw size={16}/> 刷新价格</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 no-print">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><CheckCircle size={16} className="text-green-600"/> 费用包含</h3>
                <textarea
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={settings.manualInclusions}
                    onChange={(e) => setSettings({...settings, manualInclusions: e.target.value})}
                    placeholder="请输入费用包含的内容..."
                />
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><X size={16} className="text-red-600"/> 费用不含</h3>
                <textarea
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={settings.manualExclusions}
                    onChange={(e) => setSettings({...settings, manualExclusions: e.target.value})}
                    placeholder="请输入费用不含的内容..."
                />
            </div>
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && <AuthModal onLoginSuccess={(u) => { setCurrentUser(u); setShowAuthModal(false); }} />}
      {showAdminDashboard && currentUser && <AdminDashboard currentUser={currentUser} onClose={() => setShowAdminDashboard(false)} />}
      <ResourceDatabase 
        isOpen={isResourceOpen} 
        onClose={() => setIsResourceOpen(false)}
        carDB={carDB} poiCities={poiCities} poiSpots={poiSpots} poiHotels={poiHotels} poiActivities={poiActivities} countryFiles={countryFiles}
        onUpdateCarDB={setCarDB} onUpdatePoiCities={setPoiCities} onUpdatePoiSpots={setPoiSpots} onUpdatePoiHotels={setPoiHotels} onUpdatePoiActivities={setPoiActivities} onUpdateCountryFiles={setCountryFiles}
        isReadOnly={currentUser?.role !== 'admin'}
      />
      
      {/* Save Modal */}
      {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                  <h3 className="text-lg font-bold mb-4">保存行程</h3>
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">行程名称</label>
                      <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded p-2 focus:border-blue-500 focus:ring-blue-500" 
                          value={saveName} 
                          onChange={(e) => setSaveName(e.target.value)}
                      />
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                      <button onClick={handleConfirmSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">确认保存</button>
                  </div>
              </div>
          </div>
      )}

      {/* Saved List Modal */}
      {showSavedList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Library size={20}/> 我的行程库</h3>
                      <button onClick={() => setShowSavedList(false)}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="p-4 border-b bg-white">
                      <div className="relative">
                          <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
                          <input 
                              type="text" 
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              placeholder="搜索行程名称、目的地、客户名..."
                              value={tripSearchTerm}
                              onChange={(e) => setTripSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4 bg-gray-50">
                      {savedTrips.filter(t => 
                          t.name.toLowerCase().includes(tripSearchTerm.toLowerCase()) || 
                          (t.settings.customerName || '').toLowerCase().includes(tripSearchTerm.toLowerCase()) ||
                          t.settings.destinations.join('').toLowerCase().includes(tripSearchTerm.toLowerCase())
                      ).length === 0 ? (
                          <div className="text-center text-gray-400 mt-20">没有找到相关行程</div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {savedTrips
                                  .filter(t => 
                                      t.name.toLowerCase().includes(tripSearchTerm.toLowerCase()) || 
                                      (t.settings.customerName || '').toLowerCase().includes(tripSearchTerm.toLowerCase()) ||
                                      t.settings.destinations.join('').toLowerCase().includes(tripSearchTerm.toLowerCase())
                                  )
                                  .sort((a,b) => b.timestamp - a.timestamp)
                                  .map(trip => (
                                  <div key={trip.id} onClick={() => handleLoadTrip(trip)} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md cursor-pointer transition-shadow group relative">
                                      <div className="flex justify-between items-start mb-2">
                                          <h4 className="font-bold text-blue-700 line-clamp-1 group-hover:underline">{trip.name}</h4>
                                          {currentUser && (currentUser.role === 'admin' || trip.createdBy === currentUser.username) && (
                                              <button 
                                                  onClick={(e) => { 
                                                      e.stopPropagation(); 
                                                      if(window.confirm(`确认删除行程 "${trip.name}" 吗？`)) {
                                                          const newTrips = savedTrips.filter(t => t.id !== trip.id);
                                                          setSavedTrips(newTrips);
                                                          if(activeTripId === trip.id) {
                                                              handleNewTrip();
                                                          }
                                                      }
                                                  }} 
                                                  className="text-gray-300 hover:text-red-500 p-1"
                                              >
                                                  <Trash2 size={14}/>
                                              </button>
                                          )}
                                      </div>
                                      <div className="text-xs text-gray-500 space-y-1">
                                          <p><span className="font-medium">目的地:</span> {trip.settings.destinations.join(', ') || '未定'}</p>
                                          <p><span className="font-medium">时间:</span> {trip.rows.length}天 / {new Date(trip.settings.startDate).toLocaleDateString()}出发</p>
                                          <p><span className="font-medium">创建:</span> {new Date(trip.timestamp).toLocaleString()}</p>
                                          <p className="text-gray-400 flex items-center gap-1"><UserIcon size={10}/> {trip.createdBy || 'Unknown'}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Quick Save Modal */}
      {qsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Save size={18}/> 快速添加至资源库</h3>
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
                        <p className="font-bold">将添加以下内容:</p>
                        <p className="mt-1">{qsModal.itemsDisplay}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">归属国家 (自动识别)</label>
                        <select 
                            className="w-full border border-gray-300 rounded p-2"
                            value={qsSelectedCountry}
                            onChange={(e) => setQsSelectedCountry(e.target.value)}
                        >
                            <option value="">请选择国家...</option>
                            {Array.from(new Set(poiCities.map(c => c.country))).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {qsModal.smartCountry ? `系统推测: ${qsModal.smartCountry}` : '请手动选择归属国家'}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => setQsModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                    <button onClick={performQuickSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">确认添加</button>
                </div>
            </div>
        </div>
      )}

      {/* AI Planning Modal */}
      {showAIModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-xl w-[600px] relative">
                  <button onClick={() => setShowAIModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X size={20}/>
                  </button>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-600">
                      <Wand2 size={20}/> AI 智能行程规划
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800 border border-purple-100">
                          <p className="font-bold mb-1">💡 提示：</p>
                          <p>请输入您的具体需求，例如：</p>
                          <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-xs">
                              <li>"帮我设计一个日本7天行程，想去东京和京都，喜欢吃日料和看寺庙。"</li>
                              <li>"计划去法国和瑞士10天，两个人，预算充足，想要浪漫一点的安排。"</li>
                              <li>"带孩子去新加坡5天，需要安排亲子活动。"</li>
                          </ul>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">您的需求指令</label>
                          <textarea 
                              className="w-full h-32 border border-gray-300 rounded-lg p-3 focus:ring-purple-500 focus:border-purple-500 text-sm"
                              placeholder="在此输入您的规划要求..."
                              value={aiPromptInput}
                              onChange={(e) => setAiPromptInput(e.target.value)}
                          ></textarea>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button 
                              onClick={() => setShowAIModal(false)} 
                              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
                          >
                              取消
                          </button>
                          <button 
                              onClick={handleAIPlanning} 
                              disabled={!aiPromptInput.trim() || isGenerating}
                              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isGenerating ? (
                                  <><Loader2 size={16} className="animate-spin"/> 正在规划中...</>
                              ) : (
                                  <><Sparkles size={16}/> 开始生成行程</>
                              )}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}