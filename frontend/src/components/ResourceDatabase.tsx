
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, X, Car, Hotel, Globe, MapPin, Search, Ticket, Palmtree, RotateCcw, FileSpreadsheet, Upload, Loader2, Check, AlertCircle, Info, Lock, FileText, Image as ImageIcon, Paperclip, Eye, Download, File as FileIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile } from '../types';
import { generateUUID } from '../utils/dateUtils';
import { generateSeedData } from '../utils/seedData';

interface ResourceDatabaseProps {
    isOpen: boolean;
    onClose: () => void;
    // Data
    carDB: CarCostEntry[];
    poiCities: PoiCity[];
    poiSpots: PoiSpot[];
    poiHotels: PoiHotel[];
    poiActivities: PoiActivity[];
    countryFiles: CountryFile[]; // New prop
    // Updaters
    onUpdateCarDB: (db: CarCostEntry[]) => void;
    onUpdatePoiCities: (db: PoiCity[]) => void;
    onUpdatePoiSpots: (db: PoiSpot[]) => void;
    onUpdatePoiHotels: (db: PoiHotel[]) => void;
    onUpdatePoiActivities: (db: PoiActivity[]) => void;
    onUpdateCountryFiles: (files: CountryFile[]) => void; // New prop
    // Permissions
    isReadOnly?: boolean;
    isAdmin?: boolean;
    // Layout Mode
    variant?: 'modal' | 'page';
}

export const ResourceDatabase: React.FC<ResourceDatabaseProps> = ({
    isOpen, onClose,
    carDB, poiCities, poiSpots, poiHotels, poiActivities, countryFiles,
    onUpdateCarDB, onUpdatePoiCities, onUpdatePoiSpots, onUpdatePoiHotels, onUpdatePoiActivities, onUpdateCountryFiles,
    isReadOnly = false,
    isAdmin = false,
    variant = 'modal'
}) => {
    // Helper to check if item is locked (Public item for Non-Admin)
    const isLocked = (item: any) => {
        return (item._source === 'public' && !isAdmin);
    };
    // Navigation State
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedCityId, setSelectedCityId] = useState<string>('');

    // Tab State
    const [mainTab, setMainTab] = useState<'transport' | 'poi'>('poi');
    const [poiTab, setPoiTab] = useState<'spot' | 'hotel' | 'activity'>('spot');

    // Input State
    const [newCountryName, setNewCountryName] = useState('');
    const [isAddingCountry, setIsAddingCountry] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newCityName, setNewCityName] = useState('');
    const [isAddingCity, setIsAddingCity] = useState(false);

    // Import Status State
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importFeedback, setImportFeedback] = useState('');

    // Preview Modal State
    const [previewFile, setPreviewFile] = useState<CountryFile | null>(null);

    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docUploadRef = useRef<HTMLInputElement>(null);

    // Computed Lists (Hooks MUST be unconditional)
    const countries = useMemo(() => {
        const s = new Set<string>();
        carDB.forEach(c => c.region && s.add(c.region));
        poiCities.forEach(c => c.country && s.add(c.country));
        countryFiles.forEach(f => f.country && s.add(f.country));
        return Array.from(s).sort();
    }, [carDB, poiCities, countryFiles]);

    // Derived data for hotels
    const currentHotels = poiHotels.filter(h => h.cityId === selectedCityId);

    // Grouped Hotels Logic (Moved BEFORE early return to strictly satisfy React Rules of Hooks)
    const groupedHotels = useMemo(() => {
        const groups: Record<string, PoiHotel[]> = {};
        currentHotels.forEach(h => {
            const name = h.name || "未命名酒店";
            if (!groups[name]) groups[name] = [];
            groups[name].push(h);
        });
        return Object.entries(groups);
    }, [currentHotels]);

    // Derived Data for Files
    const currentFiles = useMemo(() => {
        return countryFiles.filter(f => f.country === selectedCountry);
    }, [countryFiles, selectedCountry]);

    // Effects
    useEffect(() => {
        if (isOpen) {
            if (countries.length > 0) {
                // If no selection, or invalid selection, pick first
                if (!selectedCountry || !countries.includes(selectedCountry)) {
                    setSelectedCountry(countries[0]);
                }
            } else {
                setSelectedCountry('');
            }
        }
    }, [isOpen, countries, selectedCountry]);

    useEffect(() => {
        setSelectedCityId('');
    }, [selectedCountry]);

    // --- EARLY RETURN AFTER ALL HOOKS ---
    if (!isOpen) return null;

    // --- Helpers ---
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly || !selectedCountry) return;
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: CountryFile[] = [];
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit per file for localStorage safety

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > MAX_SIZE) {
                alert(`文件 ${file.name} 过大 (超过5MB)，无法上传到本地存储。`);
                continue;
            }

            try {
                const base64 = await fileToBase64(file);
                newFiles.push({
                    id: generateUUID(),
                    country: selectedCountry,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64,
                    uploadDate: Date.now()
                });
            } catch (err) {
                console.error("Failed to read file", file.name, err);
            }
        }

        if (newFiles.length > 0) {
            onUpdateCountryFiles([...countryFiles, ...newFiles]);
        }

        if (docUploadRef.current) docUploadRef.current.value = '';
    };

    const deleteFile = (id: string) => {
        if (isReadOnly) return;
        if (window.confirm("确定删除此文件吗？")) {
            onUpdateCountryFiles(countryFiles.filter(f => f.id !== id));
        }
    };

    const downloadFile = (file: CountryFile) => {
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openPreview = (file: CountryFile) => {
        // Logic: If image or text, open modal. Else, prompt download.
        if (file.type.startsWith('image/') || file.type === 'text/plain') {
            setPreviewFile(file);
        } else {
            // Trigger download directly for office files
            downloadFile(file);
        }
    };

    // --- Logic Helpers ---
    const handleRestoreDefaults = () => {
        if (isReadOnly) return;
        if (countries.length === 0 || window.confirm("警告：此操作将清空当前的成本库，并恢复为初始演示数据。\n\n是否确定？")) {
            const seed = generateSeedData();
            onUpdateCarDB(seed.cars);
            onUpdatePoiCities(seed.cities);
            onUpdatePoiSpots(seed.spots);
            onUpdatePoiHotels(seed.hotels);
            onUpdatePoiActivities(seed.activities);
            if (countries.length > 0) alert("已恢复默认数据。");
        }
    };

    const handleExportDatabase = () => {
        const wb = XLSX.utils.book_new();

        // 1. Transport
        const carsData = carDB.map(c => ({
            "国家": c.region,
            "车型": c.carModel,
            "服务": c.serviceType,
            "顾客数": c.passengers,
            "淡季价格": c.priceLow,
            "旺季价格": c.priceHigh
        }));
        const wsCars = XLSX.utils.json_to_sheet(carsData);
        XLSX.utils.book_append_sheet(wb, wsCars, "交通配置");

        // Helper to find city/country name
        const getLoc = (cityId: string) => {
            const c = poiCities.find(x => x.id === cityId);
            return c ? { country: c.country, city: c.name } : { country: '', city: '' };
        };

        // 2. Spots
        const spotsData = poiSpots.map(s => {
            const loc = getLoc(s.cityId);
            return {
                "国家": loc.country,
                "城市": loc.city,
                "景点名称": s.name,
                "价格": s.price
            };
        });
        const wsSpots = XLSX.utils.json_to_sheet(spotsData);
        XLSX.utils.book_append_sheet(wb, wsSpots, "景点门票");

        // 3. Hotels
        const hotelsData = poiHotels.map(h => {
            const loc = getLoc(h.cityId);
            return {
                "国家": loc.country,
                "城市": loc.city,
                "酒店名称": h.name,
                "房型": h.roomType,
                "价格": h.price
            };
        });
        const wsHotels = XLSX.utils.json_to_sheet(hotelsData);
        XLSX.utils.book_append_sheet(wb, wsHotels, "酒店住宿");

        // 4. Activities
        const actsData = poiActivities.map(a => {
            const loc = getLoc(a.cityId);
            return {
                "国家": loc.country,
                "城市": loc.city,
                "活动名称": a.name,
                "价格": a.price
            };
        });
        const wsActs = XLSX.utils.json_to_sheet(actsData);
        XLSX.utils.book_append_sheet(wb, wsActs, "娱乐活动");

        XLSX.writeFile(wb, `Resource_Database_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- EXCEL IMPORT HELPERS (SMART DETECTION) ---

    // Fuzzy Column Matching: Returns index of column that matches any keyword
    const getColIndex = (headers: any[], keywords: string[]) => {
        if (!headers || headers.length === 0) return -1;
        const safeHeaders = headers.map(h => String(h).trim());

        // 1. Exact Match (Case-insensitive)
        let idx = safeHeaders.findIndex(h => keywords.some(k => k.toLowerCase() === h.toLowerCase()));
        if (idx >= 0) return idx;

        // 2. Partial Match (Header contains Keyword)
        // Sort keywords by length desc to prioritize specific terms (e.g. "Low Season" > "Low")
        const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
        idx = safeHeaders.findIndex(h => sortedKeywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
        return idx;
    };

    const getValue = (row: any[], index: number) => {
        return index >= 0 && row[index] !== undefined ? String(row[index]).trim() : '';
    };

    const getNumValue = (row: any[], index: number) => {
        return index >= 0 && row[index] !== undefined ? (parseFloat(row[index]) || 0) : 0;
    };

    // Determine Sheet Type by Name or Keyword Scoring
    const detectSheetType = (sheetName: string, headers: any[]): 'transport' | 'spot' | 'hotel' | 'activity' | null => {
        const name = sheetName.toLowerCase();
        // 1. Priority: Sheet Name
        if (name.includes('交通') || name.includes('transport') || name.includes('车')) return 'transport';
        if (name.includes('景点') || name.includes('门票') || name.includes('spot') || name.includes('ticket')) return 'spot';
        if (name.includes('酒店') || name.includes('住宿') || name.includes('hotel')) return 'hotel';
        if (name.includes('活动') || name.includes('娱乐') || name.includes('activity')) return 'activity';

        // 2. Fallback: Header Analysis
        const h = headers.map(s => String(s).trim().toLowerCase());
        let scores = { transport: 0, spot: 0, hotel: 0, activity: 0 };

        const keywords = {
            transport: ['车型', 'car', 'model', 'vehicle', '服务', 'service', '淡季', 'low season', '顾客', 'pax'],
            spot: ['景点', 'spot', 'scenic', '门票', 'ticket', 'sightseeing'],
            hotel: ['酒店', 'hotel', '房型', 'room', 'bed', 'accommodation'],
            activity: ['活动', 'activity', 'experience', 'project', 'fun']
        };

        h.forEach(header => {
            if (keywords.transport.some(k => header.includes(k))) scores.transport++;
            if (keywords.spot.some(k => header.includes(k))) scores.spot++;
            if (keywords.hotel.some(k => header.includes(k))) scores.hotel++;
            if (keywords.activity.some(k => header.includes(k))) scores.activity++;
        });

        const max = Math.max(scores.transport, scores.spot, scores.hotel, scores.activity);
        if (max === 0) return null; // No confident match

        if (scores.transport === max) return 'transport';
        if (scores.hotel === max) return 'hotel';
        if (scores.spot === max) return 'spot';
        if (scores.activity === max) return 'activity';

        return null;
    };

    // --- EXCEL IMPORT HANDLER ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly) return;
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        setImportFeedback('正在智能解析文件，请稍候...');

        // Timeout to allow UI render update before blocking work
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });

                    let totalImported = 0;
                    let summary: string[] = [];

                    // Iterate through all sheets
                    wb.SheetNames.forEach(sheetName => {
                        const ws = wb.Sheets[sheetName];
                        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

                        if (data.length < 2) return; // Skip empty sheets

                        const headers = (data[0] as string[]).map(h => h?.trim());
                        const rows = data.slice(1);

                        const type = detectSheetType(sheetName, headers);

                        if (type) {
                            let count = 0;
                            if (type === 'transport') count = importTransport(rows, headers);
                            else if (type === 'spot') count = importSpots(rows, headers);
                            else if (type === 'hotel') count = importHotels(rows, headers);
                            else if (type === 'activity') count = importActivities(rows, headers);

                            if (count > 0) {
                                totalImported += count;
                                const typeName = { transport: '交通', spot: '景点', hotel: '酒店', activity: '活动' }[type];
                                summary.push(`${typeName}: ${count}`);
                            }
                        }
                    });

                    if (totalImported > 0) {
                        setImportStatus('success');
                        setImportFeedback(`✅ 导入成功！共 ${totalImported} 条 (${summary.join(', ')})`);
                    } else {
                        setImportStatus('error');
                        setImportFeedback("未识别到有效数据，请检查表头或工作表名称。");
                    }

                    // Clear success message after 5s
                    setTimeout(() => {
                        setImportStatus('idle');
                        setImportFeedback('');
                    }, 5000);

                } catch (error) {
                    console.error(error);
                    setImportStatus('error');
                    setImportFeedback("文件解析失败，请检查文件格式。");
                } finally {
                    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
                }
            };
            reader.readAsBinaryString(file);
        }, 100);
    };

    // Helper to find or create IDs
    // NOTE: This modifies local arrays, so we must be careful to pass the latest arrays
    const ensureLocation = (countryName: string, cityName: string | null, currentCities: PoiCity[]): { cityId: string | null, updatedCities: PoiCity[] } => {
        if (!countryName) return { cityId: null, updatedCities: currentCities };

        let updatedList = [...currentCities];

        // We don't need to explicitly create countries as they are derived from cities/cars
        // But we DO need to create the City if it doesn't exist.

        let cityId = null;
        if (cityName) {
            const existingCity = updatedList.find(c => c.country === countryName && c.name === cityName);
            if (existingCity) {
                cityId = existingCity.id;
            } else {
                cityId = generateUUID();
                updatedList.push({ id: cityId, country: countryName, name: cityName });
            }
        }

        return { cityId, updatedCities: updatedList };
    };

    // --- IMPORTERS ---
    const importTransport = (rows: any[], headers: string[]) => {
        const idxCountry = getColIndex(headers, ['国家', '地区', 'Region', 'Country', 'Area']);
        const idxModel = getColIndex(headers, ['车型', '车型及描述', 'Car', 'Model', 'Vehicle']);
        const idxService = getColIndex(headers, ['服务', '服务类型', 'Service', 'Type', 'Category']);
        const idxPax = getColIndex(headers, ['顾客', '人数', 'Passengers', 'Pax', 'Capacity', 'Guest']);

        const idxPriceLow = getColIndex(headers, ['淡季', 'Low', 'Off']);
        const idxPriceHigh = getColIndex(headers, ['旺季', 'High', 'Peak']);
        // Fallback Price
        const idxPrice = getColIndex(headers, ['成本', '价格', 'Cost', 'Price']);

        if (idxCountry < 0 || idxModel < 0) return 0;

        const newCars = [...carDB];
        let count = 0;

        rows.forEach(row => {
            const country = getValue(row, idxCountry);
            const model = getValue(row, idxModel);
            const service = idxService >= 0 ? getValue(row, idxService) : '包车';
            const pax = idxPax >= 0 ? getNumValue(row, idxPax) : 4;

            let priceLow = 0;
            let priceHigh = 0;

            if (idxPriceLow >= 0 && idxPriceHigh >= 0) {
                priceLow = getNumValue(row, idxPriceLow);
                priceHigh = getNumValue(row, idxPriceHigh);
            } else if (idxPrice >= 0) {
                const p = getNumValue(row, idxPrice);
                priceLow = p;
                priceHigh = p;
            }

            if (country && model) {
                // Check duplicate
                const exists = newCars.some(c => c.region === country && c.carModel === model && c.serviceType === service);
                if (!exists) {
                    newCars.push({
                        id: generateUUID(),
                        region: country,
                        carModel: model,
                        serviceType: service,
                        passengers: pax,
                        priceLow: priceLow,
                        priceHigh: priceHigh
                    });
                    count++;
                }
            }
        });
        onUpdateCarDB(newCars);
        return count;
    };

    const importSpots = (rows: any[], headers: string[]) => {
        const idxCountry = getColIndex(headers, ['国家', 'Country']);
        const idxCity = getColIndex(headers, LOCATION_HEADERS);
        const idxName = getColIndex(headers, ['景点名称', '景点', 'Spot', 'Name', 'Scenic']);
        const idxPrice = getColIndex(headers, ['价格', '门票', 'Price', 'Ticket', 'Cost']);

        if (idxCountry < 0 || idxCity < 0 || idxName < 0) return 0;

        let tempCities = [...poiCities];
        let tempSpots = [...poiSpots];
        let count = 0;

        rows.forEach(row => {
            const country = getValue(row, idxCountry);
            const city = getValue(row, idxCity);
            const name = getValue(row, idxName);
            const price = getNumValue(row, idxPrice);

            if (country && city && name) {
                const { cityId, updatedCities } = ensureLocation(country, city, tempCities);
                tempCities = updatedCities;

                if (cityId) {
                    const exists = tempSpots.some(s => s.cityId === cityId && s.name === name);
                    if (!exists) {
                        tempSpots.push({ id: generateUUID(), cityId, name, price });
                        count++;
                    }
                }
            }
        });

        onUpdatePoiCities(tempCities);
        onUpdatePoiSpots(tempSpots);
        return count;
    };

    const importHotels = (rows: any[], headers: string[]) => {
        const idxCountry = getColIndex(headers, ['国家', 'Country']);
        const idxCity = getColIndex(headers, LOCATION_HEADERS);
        const idxName = getColIndex(headers, ['酒店名称', '酒店', 'Hotel', 'Name', 'Accommodation']);
        const idxRoom = getColIndex(headers, ['房型', 'Room', 'Type', 'Bed']);
        const idxPrice = getColIndex(headers, ['价格', 'Price', 'Cost']);

        if (idxCountry < 0 || idxCity < 0 || idxName < 0 || idxRoom < 0) return 0;

        let tempCities = [...poiCities];
        let tempHotels = [...poiHotels];
        let count = 0;

        rows.forEach(row => {
            const country = getValue(row, idxCountry);
            const city = getValue(row, idxCity);
            const name = getValue(row, idxName);
            const room = getValue(row, idxRoom);
            const price = getNumValue(row, idxPrice);

            if (country && city && name && room) {
                const { cityId, updatedCities } = ensureLocation(country, city, tempCities);
                tempCities = updatedCities;

                if (cityId) {
                    const exists = tempHotels.some(h => h.cityId === cityId && h.name === name && h.roomType === room);
                    if (!exists) {
                        tempHotels.push({ id: generateUUID(), cityId, name, roomType: room, price });
                        count++;
                    }
                }
            }
        });

        onUpdatePoiCities(tempCities);
        onUpdatePoiHotels(tempHotels);
        return count;
    };

    const importActivities = (rows: any[], headers: string[]) => {
        const idxCountry = getColIndex(headers, ['国家', 'Country']);
        const idxCity = getColIndex(headers, LOCATION_HEADERS);
        const idxName = getColIndex(headers, ['活动名称', '活动', 'Activity', 'Name', 'Experience']);
        const idxPrice = getColIndex(headers, ['价格', 'Price', 'Cost']);

        if (idxCountry < 0 || idxCity < 0 || idxName < 0) return 0;

        let tempCities = [...poiCities];
        let tempActivities = [...poiActivities];
        let count = 0;

        rows.forEach(row => {
            const country = getValue(row, idxCountry);
            const city = getValue(row, idxCity);
            const name = getValue(row, idxName);
            const price = getNumValue(row, idxPrice);

            if (country && city && name) {
                const { cityId, updatedCities } = ensureLocation(country, city, tempCities);
                tempCities = updatedCities;

                if (cityId) {
                    const exists = tempActivities.some(a => a.cityId === cityId && a.name === name);
                    if (!exists) {
                        tempActivities.push({ id: generateUUID(), cityId, name, price });
                        count++;
                    }
                }
            }
        });

        onUpdatePoiCities(tempCities);
        onUpdatePoiActivities(tempActivities);
        return count;
    };

    const LOCATION_HEADERS = ['城市', 'City', '地点', 'Location', 'Region', 'Place', '区域', '地名'];

    // UI Helper for Import Section
    const ImportSection = ({ title, keywords }: { title: string, keywords: Record<string, string> }) => (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {!isReadOnly && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center gap-2 transition-colors"
                        >
                            <FileSpreadsheet size={16} /> 导入 Excel 配置
                        </button>
                    )}
                    {/* Status Display */}
                    {importStatus !== 'idle' && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm animate-fade-in ${importStatus === 'loading' ? 'bg-blue-50 text-blue-700' :
                            importStatus === 'success' ? 'bg-green-50 text-green-700' :
                                'bg-red-50 text-red-700'
                            }`}>
                            {importStatus === 'loading' && <Loader2 size={14} className="animate-spin" />}
                            {importStatus === 'success' && <Check size={14} />}
                            {importStatus === 'error' && <AlertCircle size={14} />}
                            {importFeedback}
                        </div>
                    )}

                </div>
            </div>

            {!isReadOnly && (
                <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-4 text-xs text-blue-800 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1">Excel 导入格式说明 (支持智能识别)：</p>
                        <p>请确保您的 Excel 文件包含以下表头（列名），支持中/英文及模糊匹配：</p>
                        <div className="flex gap-2 mt-1 flex-wrap font-mono">
                            {Object.entries(keywords).map(([label, tooltip]) => (
                                <span key={label} className="bg-white px-1.5 py-0.5 rounded border border-blue-200" title={tooltip}>{label}</span>
                            ))}
                        </div>
                        <p className="mt-1 text-blue-600/80">提示：系统会自动根据表头关键词识别是导入{title}数据。</p>
                    </div>
                </div>
            )}
        </>
    );


    // Country CRUD
    const handleAddCountry = () => {
        if (isReadOnly) return;
        if (!newCountryName.trim()) return;
        const name = newCountryName.trim();

        // Check if already exists
        if (!countries.includes(name)) {
            // Create default car entry to persist the country immediately
            const newCarEntry: CarCostEntry = {
                id: generateUUID(),
                region: name,
                carModel: '适配车型',
                serviceType: '包车',
                passengers: 4,
                priceLow: 2000,
                priceHigh: 2000,
                // @ts-ignore
                _source: isAdmin ? 'public' : 'private'
            };
            onUpdateCarDB([...carDB, newCarEntry]);
        }

        setSelectedCountry(name);
        setNewCountryName('');
        setIsAddingCountry(false);
    };

    const handleDeleteCountry = (country: string) => {
        if (isReadOnly) return;
        if (window.confirm(`删除 "${country}" 将删除其下所有地点、资源和交通配置。确定吗？`)) {
            onUpdateCarDB(carDB.filter(c => c.region !== country));
            const citiesToDelete = poiCities.filter(c => c.country === country);
            const cityIds = citiesToDelete.map(c => c.id);
            onUpdatePoiCities(poiCities.filter(c => c.country !== country));
            onUpdatePoiSpots(poiSpots.filter(s => !cityIds.includes(s.cityId)));
            onUpdatePoiHotels(poiHotels.filter(h => !cityIds.includes(h.cityId)));
            onUpdatePoiActivities(poiActivities.filter(a => !cityIds.includes(a.cityId)));
            onUpdateCountryFiles(countryFiles.filter(f => f.country !== country)); // Delete files
            if (selectedCountry === country) setSelectedCountry('');
        }
    };

    // City CRUD
    const currentCities = poiCities.filter(c => c.country === selectedCountry);
    const handleAddCity = () => {
        if (isReadOnly) return;
        if (!newCityName.trim() || !selectedCountry) return;
        const newCity: PoiCity = {
            id: generateUUID(),
            country: selectedCountry,
            name: newCityName.trim()
        };
        onUpdatePoiCities([...poiCities, newCity]);
        setSelectedCityId(newCity.id);
        setNewCityName('');
        setIsAddingCity(false);
    };

    const handleDeleteCity = (id: string) => {
        if (isReadOnly) return;
        if (window.confirm("删除此地点将清空其下所有资源数据。")) {
            onUpdatePoiCities(poiCities.filter(c => c.id !== id));
            onUpdatePoiSpots(poiSpots.filter(s => s.cityId !== id));
            onUpdatePoiHotels(poiHotels.filter(h => h.cityId !== id));
            onUpdatePoiActivities(poiActivities.filter(a => a.cityId !== id));
            if (selectedCityId === id) setSelectedCityId('');
        }
    };

    // Generic Item Updates
    const updateItem = <T extends { id: string }>(items: T[], updater: (newItems: T[]) => void, id: string, diff: Partial<T>) => {
        if (isReadOnly) return;
        updater(items.map(i => i.id === id ? { ...i, ...diff } : i));
    };
    const deleteItem = <T extends { id: string }>(items: T[], updater: (newItems: T[]) => void, id: string, itemName: string = '项目') => {
        if (isReadOnly) return;
        if (window.confirm(`确定删除此${itemName}数据吗？`)) {
            updater(items.filter(i => i.id !== id));
        }
    };

    // Filtered lists
    const currentCars = carDB.filter(c => c.region === selectedCountry);
    const currentSpots = poiSpots.filter(s => s.cityId === selectedCityId);
    const currentActivities = poiActivities.filter(a => a.cityId === selectedCityId);

    // Hotel specific actions
    const updateHotelNameGroup = (oldName: string, newName: string) => {
        if (isReadOnly) return;
        onUpdatePoiHotels(poiHotels.map(h =>
            (h.cityId === selectedCityId && (h.name || "未命名酒店") === oldName) ? { ...h, name: newName } : h
        ));
    };
    const addRoomToHotel = (hotelName: string) => {
        if (isReadOnly) return;
        const newRoom: PoiHotel = {
            id: generateUUID(),
            cityId: selectedCityId,
            name: hotelName === "未命名酒店" ? "" : hotelName,
            roomType: '新房型',
            price: 0,
            // @ts-ignore
            _source: isAdmin ? 'public' : 'private'
        };
        onUpdatePoiHotels([...poiHotels, newRoom]);
    };
    const addContentGroup = () => {
        if (isReadOnly) return;
        const newRoom: PoiHotel = {
            id: generateUUID(),
            cityId: selectedCityId,
            name: '新酒店',
            roomType: '标准间',
            price: 0,
            // @ts-ignore
            _source: isAdmin ? 'public' : 'private'
        };
        onUpdatePoiHotels([...poiHotels, newRoom]);
    };
    const deleteHotelGroup = (hotelName: string) => {
        if (isReadOnly) return;
        if (window.confirm(`确定删除酒店 "${hotelName}" 及其所有房型数据吗?`)) {
            onUpdatePoiHotels(poiHotels.filter(h => !(h.cityId === selectedCityId && (h.name || "未命名酒店") === hotelName)));
        }
    };

    // Other Add Actions
    const addCar = () => {
        if (isReadOnly) return;
        // @ts-ignore
        onUpdateCarDB([...carDB, { id: generateUUID(), region: selectedCountry, carModel: '', serviceType: '包车', passengers: 4, priceLow: 0, priceHigh: 0, _source: isAdmin ? 'public' : 'private' }]);
    }
    const addSpot = () => {
        if (isReadOnly) return;
        // @ts-ignore
        onUpdatePoiSpots([...poiSpots, { id: generateUUID(), cityId: selectedCityId, name: '', price: 0, _source: isAdmin ? 'public' : 'private' }]);
    }
    const addActivity = () => {
        if (isReadOnly) return;
        // @ts-ignore
        onUpdatePoiActivities([...poiActivities, { id: generateUUID(), cityId: selectedCityId, name: '', price: 0, _source: isAdmin ? 'public' : 'private' }]);
    }

    // Sidebar List
    const displayCountries = countries.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCountry && !displayCountries.includes(selectedCountry)) displayCountries.push(selectedCountry);



    // Refactoring to use one return with dynamic classes
    const containerClass = variant === 'modal'
        ? "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        : "w-full h-full bg-white flex overflow-hidden";

    const innerClass = variant === 'modal'
        ? "bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex overflow-hidden"
        : "w-full h-full flex overflow-hidden";

    return (
        <div className={containerClass}>
            <div className={innerClass}>

                {/* Hidden File Input for Excel Import */}
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                {/* Hidden File Input for Document Upload */}
                <input type="file" ref={docUploadRef} className="hidden" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*" onChange={handleDocUpload} />

                {/* Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-gray-200 flex flex-col shrink-0 font-sans">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <Globe size={14} className="text-blue-600" /> 国家列表
                        </h2>
                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input type="text" placeholder="搜索国家..." className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {displayCountries.length > 0 ? (
                            displayCountries.map(country => (
                                <div key={country} onClick={() => setSelectedCountry(country)} className={`px-4 py-3 cursor-pointer flex justify-between items-center group transition-all duration-200 border-l-4 ${selectedCountry === country ? 'bg-white border-blue-600 shadow-sm' : 'hover:bg-white hover:border-blue-200 border-transparent text-gray-600'}`}>
                                    <span className={`text-sm font-medium ${selectedCountry === country ? 'text-blue-700' : ''}`}>{country}</span>
                                    {!isReadOnly && <button onClick={(e) => { e.stopPropagation(); handleDeleteCountry(country); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 size={12} /></button>}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-xs text-gray-400 mb-4">暂无数据</p>
                                {!isReadOnly && (
                                    <button onClick={handleRestoreDefaults} className="px-3 py-2 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200 hover:bg-blue-100">
                                        初始化演示数据
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-3 border-t bg-white space-y-2">
                        {!isReadOnly ? (
                            <>
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-1.5 text-xs text-green-700 border border-green-200 bg-green-50 rounded hover:bg-green-100 flex justify-center items-center gap-1">
                                    <FileSpreadsheet size={12} /> Excel 导入
                                </button>
                                <button onClick={handleExportDatabase} className="w-full py-1.5 text-xs text-blue-700 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 flex justify-center items-center gap-1">
                                    <Download size={12} /> 导出 Excel
                                </button>
                                <button onClick={handleRestoreDefaults} className="w-full py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded hover:bg-red-100 flex justify-center items-center gap-1"><RotateCcw size={12} /> 重置/恢复默认</button>
                                {isAddingCountry ? (
                                    <div className="flex items-center gap-1">
                                        <input autoFocus type="text" className="w-full text-xs border border-blue-300 rounded px-1 py-1" placeholder="新国家名称" value={newCountryName} onChange={(e) => setNewCountryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()} />
                                        <button onClick={handleAddCountry}><Plus size={16} className="text-blue-600" /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsAddingCountry(true)} className="w-full py-1.5 text-xs text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 flex justify-center items-center gap-1"><Plus size={14} /> 添加国家</button>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col bg-white min-w-0">
                    {selectedCountry ? (
                        <>
                            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedCountry}</h2>
                                    <div className="flex gap-2 mt-4 bg-gray-100/50 p-1 rounded-lg inline-flex">
                                        <button onClick={() => setMainTab('poi')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === 'poi' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                                            <MapPin size={16} /> 地点与资源
                                        </button>
                                        <button onClick={() => setMainTab('transport')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === 'transport' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                                            <Car size={16} /> 交通配置
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {variant === 'modal' && <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>}
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden flex">
                                {mainTab === 'transport' && (
                                    <div className="flex-1 p-6 overflow-auto">
                                        {/* Import Controls for Transport */}
                                        <ImportSection
                                            title="交通"
                                            keywords={{
                                                "国家": "支持: Country, Region...",
                                                "车型": "支持: Car, Model, Vehicle...",
                                                "服务": "支持: Service, Type...",
                                                "顾客数": "支持: Pax, Capacity...",
                                                "淡季价格": "支持: Low Season, Off...",
                                                "旺季价格": "支持: High Season, Peak..."
                                            }}
                                        />

                                        <div className="bg-white border border-gray-100 rounded-xl shadow-sm mb-8 overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-100">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">车型 (可空白)</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">服务 (包车/拼车/等)</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">顾客数</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">淡季价格</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-red-600 uppercase tracking-wider">旺季价格</th>
                                                        <th className="w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {currentCars.map(row => (
                                                        <tr key={row.id}>
                                                            <td className="px-6 py-2">
                                                                <div className="flex flex-col">
                                                                    <input disabled={isReadOnly || isLocked(row)} className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" value={row.carModel} onChange={(e) => updateItem<CarCostEntry>(carDB, onUpdateCarDB, row.id, { carModel: e.target.value })} placeholder="车型" />
                                                                    {/* @ts-ignore */}
                                                                    <span className={`text-[10px] scale-90 origin-left ${row._source === 'public' ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>{row._source === 'public' ? '公有' : '私有'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-2">
                                                                <select
                                                                    disabled={isReadOnly || isLocked(row)}
                                                                    className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                                                    value={row.serviceType}
                                                                    onChange={(e) => updateItem<CarCostEntry>(carDB, onUpdateCarDB, row.id, { serviceType: e.target.value })}
                                                                >
                                                                    <option value="包车">包车</option>
                                                                    <option value="城际">城际</option>
                                                                    <option value="拼车">拼车</option>
                                                                    <option value="接送机">接送机</option>
                                                                    <option value="其它">其它</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-2"><input disabled={isReadOnly || isLocked(row)} type="number" min="1" className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" value={row.passengers} onChange={(e) => updateItem<CarCostEntry>(carDB, onUpdateCarDB, row.id, { passengers: parseFloat(e.target.value) || 0 })} /></td>
                                                            <td className="px-6 py-2"><input disabled={isReadOnly || isLocked(row)} type="number" className="w-full text-sm border-gray-300 rounded text-blue-600 disabled:bg-gray-50 disabled:text-gray-500" value={row.priceLow} onChange={(e) => updateItem<CarCostEntry>(carDB, onUpdateCarDB, row.id, { priceLow: parseFloat(e.target.value) || 0 })} /></td>
                                                            <td className="px-6 py-2"><input disabled={isReadOnly || isLocked(row)} type="number" className="w-full text-sm border-gray-300 rounded text-red-600 disabled:bg-gray-50 disabled:text-gray-500" value={row.priceHigh} onChange={(e) => updateItem<CarCostEntry>(carDB, onUpdateCarDB, row.id, { priceHigh: parseFloat(e.target.value) || 0 })} /></td>
                                                            <td className="px-6 text-center">{!isReadOnly && !isLocked(row) && <button onClick={() => deleteItem(carDB, onUpdateCarDB, row.id, '车型配置')}><Trash2 size={16} className="text-gray-300 hover:text-red-500" /></button>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {!isReadOnly && <button onClick={addCar} className="m-4 text-sm text-blue-600 flex items-center gap-1"><Plus size={16} /> 添加车型配置</button>}
                                        </div>

                                        {/* FILES SECTION */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <Paperclip size={16} /> 交通参考文档 (文件/图片)
                                                </h3>
                                                {!isReadOnly && (
                                                    <button onClick={() => docUploadRef.current?.click()} className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm flex items-center gap-2 transition-all font-medium">
                                                        <Upload size={14} /> 上传文件
                                                    </button>
                                                )}
                                            </div>

                                            {currentFiles.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded">
                                                    暂无参考文件
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                                    {currentFiles.map(file => (
                                                        <div key={file.id} className="bg-white border border-gray-100 rounded-xl p-3 relative group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                                            <div className="flex flex-col items-center gap-2 mb-2">
                                                                {file.type.startsWith('image/') ? (
                                                                    <div className="h-16 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                                                                        <img src={file.data} alt={file.name} className="h-full w-full object-cover" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-16 w-16 flex items-center justify-center bg-blue-50 text-blue-500 rounded-full">
                                                                        {file.type.includes('sheet') || file.type.includes('excel') ? <FileSpreadsheet size={24} /> :
                                                                            file.type.includes('text') ? <FileText size={24} /> : <FileIcon size={24} />}
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-medium text-gray-700 text-center line-clamp-2 w-full break-all" title={file.name}>{file.name}</span>
                                                            </div>

                                                            <div className="flex items-center justify-center gap-2 pt-2 border-t mt-1">
                                                                <button onClick={() => openPreview(file)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title={file.type.startsWith('image/') ? "预览" : "下载"}>
                                                                    {file.type.startsWith('image/') || file.type === 'text/plain' ? <Eye size={14} /> : <Download size={14} />}
                                                                </button>
                                                                {!isReadOnly && (
                                                                    <button onClick={() => deleteFile(file.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {mainTab === 'poi' && (
                                    <>
                                        {/* City Sidebar */}
                                        <div className="w-48 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
                                            <div className="p-3 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">地点列表 (城市/机场等)</div>
                                            <div className="flex-1 overflow-y-auto">
                                                {currentCities.map(city => (
                                                    <div key={city.id} onClick={() => setSelectedCityId(city.id)} className={`px-4 py-2 cursor-pointer text-sm flex justify-between items-center group ${selectedCityId === city.id ? 'bg-white text-blue-600 font-medium border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                        <div className="flex-1">
                                                            <input
                                                                disabled={isReadOnly || isLocked(city)}
                                                                type="text"
                                                                className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm cursor-pointer disabled:cursor-pointer disabled:text-gray-600 ${selectedCityId === city.id ? 'font-medium text-blue-600 placeholder-blue-400' : 'text-gray-600'}`}
                                                                value={city.name}
                                                                onChange={(e) => updateItem<PoiCity>(poiCities, onUpdatePoiCities, city.id, { name: e.target.value })}
                                                                placeholder="地点名称"
                                                            />
                                                            {/* @ts-ignore */}
                                                            <span className={`text-[9px] ${city._source === 'public' ? 'text-blue-500' : 'text-gray-300'}`}>{city._source === 'public' ? '公' : '私'}</span>
                                                        </div>
                                                        {!isReadOnly && !isLocked(city) && <button onClick={(e) => { e.stopPropagation(); handleDeleteCity(city.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 ml-2"><Trash2 size={12} /></button>}
                                                    </div>
                                                ))}
                                                {currentCities.length === 0 && <div className="p-4 text-center text-xs text-gray-400">暂无地点</div>}
                                            </div>
                                            <div className="p-2 border-t">
                                                {!isReadOnly ? (isAddingCity ? (
                                                    <div className="flex items-center gap-1">
                                                        <input autoFocus type="text" className="w-full text-xs border border-blue-300 rounded px-1 py-1" placeholder="地点名" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCity()} />
                                                        <button onClick={handleAddCity}><Plus size={16} className="text-blue-600" /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setIsAddingCity(true)} className="w-full py-1 text-xs text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 flex justify-center items-center gap-1"><Plus size={14} /> 添加地点</button>
                                                )) : null}
                                            </div>
                                        </div>

                                        {/* POI Content */}
                                        <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                            {selectedCityId ? (
                                                <>
                                                    <div className="flex border-b px-4">
                                                        <button onClick={() => setPoiTab('spot')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${poiTab === 'spot' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Ticket size={16} /> 1. 景点/门票</button>
                                                        <button onClick={() => setPoiTab('hotel')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${poiTab === 'hotel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Hotel size={16} /> 2. 酒店</button>
                                                        <button onClick={() => setPoiTab('activity')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${poiTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Palmtree size={16} /> 3. 活动</button>
                                                    </div>

                                                    <div className="flex-1 overflow-auto p-4 bg-gray-50/50">
                                                        {poiTab === 'spot' && (
                                                            <>
                                                                <ImportSection
                                                                    title="景点"
                                                                    keywords={{
                                                                        "国家": "支持: Country...",
                                                                        "城市": "支持: City, Location...",
                                                                        "景点名称": "支持: Name, Spot, Scenic...",
                                                                        "价格": "支持: Price, Ticket..."
                                                                    }}
                                                                />
                                                                <div className="bg-white border rounded shadow-sm">
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">景点名称</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">门票单人价</th><th className="w-12"></th></tr></thead>
                                                                        <tbody className="divide-y divide-gray-200">
                                                                            {currentSpots.map(item => (
                                                                                <tr key={item.id}>
                                                                                    <td className="px-4 py-2">
                                                                                        <input disabled={isReadOnly || isLocked(item)} className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" value={item.name} onChange={(e) => updateItem<PoiSpot>(poiSpots, onUpdatePoiSpots, item.id, { name: e.target.value })} placeholder="景点名称" />
                                                                                        {/* @ts-ignore */}
                                                                                        <span className={`text-[10px] ${item._source === 'public' ? 'text-blue-500' : 'text-gray-400'}`}>{item._source === 'public' ? '公有' : '私有'}</span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2"><input disabled={isReadOnly || isLocked(item)} type="number" className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" value={item.price} onChange={(e) => updateItem<PoiSpot>(poiSpots, onUpdatePoiSpots, item.id, { price: parseFloat(e.target.value) || 0 })} /></td>
                                                                                    <td className="px-4 text-center">{!isReadOnly && !isLocked(item) && <button onClick={() => deleteItem(poiSpots, onUpdatePoiSpots, item.id, '景点')}><Trash2 size={14} className="text-gray-300 hover:text-red-500" /></button>}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                    {!isReadOnly && <button onClick={addSpot} className="m-3 text-xs text-blue-600 flex items-center gap-1"><Plus size={14} /> 添加景点</button>}
                                                                </div>
                                                            </>
                                                        )}

                                                        {poiTab === 'hotel' && (
                                                            <>
                                                                <ImportSection
                                                                    title="酒店"
                                                                    keywords={{
                                                                        "国家": "支持: Country...",
                                                                        "城市": "支持: City, Location...",
                                                                        "酒店名称": "支持: Name, Hotel...",
                                                                        "房型": "支持: Room, Type, Bed...",
                                                                        "价格": "支持: Price, Cost..."
                                                                    }}
                                                                />
                                                                <div className="bg-white border rounded shadow-sm">
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-1/4">酒店名称</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">房型及价格 (元)</th>
                                                                                <th className="w-12"></th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-200">
                                                                            {groupedHotels.map(([hotelName, rows]) => (
                                                                                <tr key={hotelName}>
                                                                                    <td className="px-4 py-2 align-top">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input
                                                                                                disabled={isReadOnly}
                                                                                                className="w-full text-sm font-medium border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                                                                                value={hotelName === "未命名酒店" ? "" : hotelName}
                                                                                                onChange={(e) => updateHotelNameGroup(hotelName, e.target.value)}
                                                                                                placeholder="酒店名称"
                                                                                            />
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-2">
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {rows.map(item => (
                                                                                                <div key={item.id} className="flex items-center bg-blue-50 border border-blue-100 rounded px-2 py-1 gap-2">
                                                                                                    <input
                                                                                                        disabled={isReadOnly || isLocked(item)}
                                                                                                        className="w-20 text-xs bg-transparent border-0 border-b border-blue-200 focus:ring-0 p-0 text-gray-700 disabled:border-transparent"
                                                                                                        value={item.roomType}
                                                                                                        onChange={(e) => updateItem<PoiHotel>(poiHotels, onUpdatePoiHotels, item.id, { roomType: e.target.value })}
                                                                                                        placeholder="房型"
                                                                                                    />
                                                                                                    <span className="text-gray-400 text-xs">:</span>
                                                                                                    <input
                                                                                                        disabled={isReadOnly || isLocked(item)}
                                                                                                        type="number"
                                                                                                        className="w-14 text-xs bg-transparent border-0 border-b border-blue-200 focus:ring-0 p-0 font-medium text-blue-700 disabled:border-transparent disabled:text-gray-500"
                                                                                                        value={item.price}
                                                                                                        onChange={(e) => updateItem<PoiHotel>(poiHotels, onUpdatePoiHotels, item.id, { price: parseFloat(e.target.value) || 0 })}
                                                                                                    />
                                                                                                    {/* @ts-ignore */}
                                                                                                    <span className={`text-[9px] ${item._source === 'public' ? 'text-blue-500' : 'text-gray-400'}`}>{item._source === 'public' ? '公' : '私'}</span>
                                                                                                    {!isReadOnly && !isLocked(item) && <button onClick={() => deleteItem(poiHotels, onUpdatePoiHotels, item.id, '房型')} className="text-blue-300 hover:text-red-500 ml-1"><X size={12} /></button>}
                                                                                                </div>
                                                                                            ))}
                                                                                            {!isReadOnly && <button onClick={() => addRoomToHotel(hotelName)} className="px-2 py-1 text-xs border border-dashed border-gray-300 rounded text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors">+ 房型</button>}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 text-center align-middle">
                                                                                        {!isReadOnly && <button onClick={() => deleteHotelGroup(hotelName)} title="删除整家酒店"><Trash2 size={16} className="text-gray-300 hover:text-red-500" /></button>}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                    {!isReadOnly && <button onClick={addContentGroup} className="m-3 text-xs text-blue-600 flex items-center gap-1"><Plus size={14} /> 添加新酒店</button>}
                                                                </div>
                                                            </>
                                                        )}

                                                        {poiTab === 'activity' && (
                                                            <>
                                                                <ImportSection
                                                                    title="活动"
                                                                    keywords={{
                                                                        "国家": "支持: Country...",
                                                                        "城市": "支持: City, Location...",
                                                                        "活动名称": "支持: Name, Activity...",
                                                                        "价格": "支持: Price, Cost..."
                                                                    }}
                                                                />
                                                                <div className="bg-white border rounded shadow-sm">
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">活动名称</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">价格</th><th className="w-12"></th></tr></thead>
                                                                        <tbody className="divide-y divide-gray-200">
                                                                            {currentActivities.map(item => (
                                                                                <tr key={item.id}>
                                                                                    <td className="px-4 py-2">
                                                                                        <input disabled={isReadOnly || isLocked(item)} className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" value={item.name} onChange={(e) => updateItem<PoiActivity>(poiActivities, onUpdatePoiActivities, item.id, { name: e.target.value })} placeholder="活动名称" />
                                                                                        {/* @ts-ignore */}
                                                                                        <span className={`text-[10px] ${item._source === 'public' ? 'text-blue-500' : 'text-gray-400'}`}>{item._source === 'public' ? '公有' : '私有'}</span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2"><input disabled={isReadOnly || isLocked(item)} type="number" className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" value={item.price} onChange={(e) => updateItem<PoiActivity>(poiActivities, onUpdatePoiActivities, item.id, { price: parseFloat(e.target.value) || 0 })} /></td>
                                                                                    <td className="px-4 text-center">{!isReadOnly && !isLocked(item) && <button onClick={() => deleteItem(poiActivities, onUpdatePoiActivities, item.id, '活动')}><Trash2 size={14} className="text-gray-300 hover:text-red-500" /></button>}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                    {!isReadOnly && <button onClick={addActivity} className="m-3 text-xs text-blue-600 flex items-center gap-1"><Plus size={14} /> 添加活动</button>}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-gray-300 flex-col gap-2">
                                                    <MapPin size={40} className="opacity-20" />
                                                    <span className="text-sm">请选择左侧地点以管理资源</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-300 flex-col gap-2">
                            <Globe size={48} className="opacity-20" />
                            <span className="text-sm">请选择左侧国家以开始</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[70] flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
                    <div className="bg-white rounded-lg overflow-hidden max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700">{previewFile.name}</h3>
                            <button onClick={() => setPreviewFile(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
                            {previewFile.type.startsWith('image/') ? (
                                <img src={previewFile.data} alt={previewFile.name} className="max-w-full max-h-[75vh] object-contain shadow-sm" />
                            ) : (
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-4 rounded shadow border overflow-auto w-full h-full max-h-[70vh]">
                                    {/* Attempt to decode base64 for text, handling latin1 to utf8 if simple */}
                                    {atob(previewFile.data.split(',')[1])}
                                </pre>
                            )}
                        </div>
                        <div className="p-3 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => downloadFile(previewFile)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2">
                                <Download size={16} /> 下载原文件
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
