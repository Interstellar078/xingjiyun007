import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Car, X, Ticket, Hotel, Palmtree, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CarCostEntry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CountryFile, PoiCountry } from '../types';
import { generateUUID } from '../utils/dateUtils';
import { resourceApi } from '../services/resourceApi';
import { usePaginatedResource } from '../hooks/usePaginatedResource';

// Modular Components
import { ResourceSidebar } from './resources/ResourceSidebar';
import { CitySidebar } from './resources/CitySidebar';
import { TransportTable } from './resources/TransportTable';
import { ResourceFileList } from './resources/ResourceFileList';
import { SpotTable } from './resources/SpotTable';
import { HotelTable } from './resources/HotelTable';
import { ActivityTable } from './resources/ActivityTable';
import { ImportSection } from './resources/ImportSection';

interface ResourceDatabaseProps {
    isOpen: boolean;
    onClose: () => void;
    // Permissions
    isReadOnly?: boolean;
    isAdmin?: boolean;
    // Layout Mode
    variant?: 'modal' | 'page';
}

export const ResourceDatabase: React.FC<ResourceDatabaseProps> = ({
    isOpen, onClose,
    isReadOnly = false,
    isAdmin = false,
    variant = 'modal'
}) => {
    // Navigation State
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedCityId, setSelectedCityId] = useState<string>('');
    const [countries, setCountries] = useState<PoiCountry[]>([]);

    // Tab State
    const [mainTab, setMainTab] = useState<'transport' | 'poi'>('poi');
    const [poiTab, setPoiTab] = useState<'spot' | 'hotel' | 'activity'>('spot');

    // Import Status
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importFeedback, setImportFeedback] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Data Load
    useEffect(() => {
        if (isOpen) refreshCountries();
    }, [isOpen]);

    const refreshCountries = () => {
        resourceApi.listCountries({ size: 1000 }).then((list: any) => {
            setCountries(list);
            // Auto select first? Maybe only if empty.
            if (list.length > 0 && !selectedCountry) setSelectedCountry(list[0].name);
        }).catch(err => console.error("Failed to load countries", err));
    };

    // --- Hooks for Data (Paginated) ---
    // Transport
    const {
        items: currentCars,
        loading: loadingCars,
        page: pageCars,
        hasMore: hasMoreCars,
        nextPage: nextCars,
        prevPage: prevCars,
        refresh: refreshCars
    } = usePaginatedResource<CarCostEntry>(
        resourceApi.listTransports,
        { region: selectedCountry },
        20
    );

    // Cities (Sidebar) - Simplified to load all for the country? Or paginated?
    // Sidebar usually needs ALL cities to select.
    // Let's assume listCities with size 100 is enough for one country.
    const [currentCities, setCurrentCities] = useState<PoiCity[]>([]);
    useEffect(() => {
        if (selectedCountry) {
            resourceApi.listCities({ country: selectedCountry, size: 100 }).then(setCurrentCities);
        } else {
            setCurrentCities([]);
        }
    }, [selectedCountry]);
    const refreshCities = () => {
        if (selectedCountry) resourceApi.listCities({ country: selectedCountry, size: 100 }).then(setCurrentCities);
    };


    // Spots
    const {
        items: currentSpots, loading: loadingSpots, page: page1, hasMore: hasMore1, nextPage: next1, prevPage: prev1, refresh: refreshSpots
    } = usePaginatedResource<PoiSpot>(
        resourceApi.listSpots,
        { city_id: selectedCityId },
        20
    );

    // Hotels
    const {
        items: currentHotels, loading: loadingHotels, page: page2, hasMore: hasMore2, nextPage: next2, prevPage: prev2, refresh: refreshHotels
    } = usePaginatedResource<PoiHotel>(
        resourceApi.listHotels,
        { city_id: selectedCityId },
        50
    );

    // Activities
    const {
        items: currentActivities, loading: loadingActivities, page: page3, hasMore: hasMore3, nextPage: next3, prevPage: prev3, refresh: refreshActivities
    } = usePaginatedResource<PoiActivity>(
        resourceApi.listActivities,
        { city_id: selectedCityId },
        20
    );

    // Files (Legacy - not paginated API yet? Or stubbed?)
    const [countryFiles, setCountryFiles] = useState<CountryFile[]>([]);
    const onUpdateCountryFiles = (files: CountryFile[]) => setCountryFiles(files);


    // --- CRUD Handlers ---

    // Country
    const handleAddCountry = async (name: string) => {
        if (countries.some(c => c.name === name)) return;
        await resourceApi.createCountry({ name, isPublic: isAdmin });
        refreshCountries();
        setSelectedCountry(name);
    };
    const handleDeleteCountry = async (id: string) => {
        if (confirm("确定删除此国家?")) {
            await resourceApi.deleteCountry(id);
            // Clear selection logic check
            const target = countries.find(c => c.id === id);
            if (target && selectedCountry === target.name) setSelectedCountry('');
            refreshCountries();
        }
    };

    // City
    const handleAddCity = async (name: string) => {
        await resourceApi.createCity({ country: selectedCountry, name, isPublic: isAdmin } as any);
        refreshCities();
    };
    const handleUpdateCity = async (id: string, name: string) => {
        await resourceApi.updateCityReal(id, { name }); // Use Real
        refreshCities();
    };
    const handleDeleteCity = async (id: string) => {
        if (confirm("确定删除此地点?")) {
            await resourceApi.deleteCity(id);
            refreshCities();
            if (selectedCityId === id) setSelectedCityId('');
        }
    };

    // Transport
    const handleUpdateCar = async (id: string, diff: Partial<CarCostEntry>) => {
        // Optimistic update? No, just call API + Refresh
        await resourceApi.updateTransport(id, diff);
        refreshCars();
    };
    const handleDeleteCar = async (id: string) => {
        if (confirm("Confirm?")) { await resourceApi.deleteTransport(id); refreshCars(); }
    };
    const handleAddCar = async () => {
        await resourceApi.createTransport({ region: selectedCountry, carModel: '新车型', isPublic: isAdmin });
        refreshCars();
    };

    // Spots
    const handleUpdateSpot = async (id: string, diff: Partial<PoiSpot>) => { await resourceApi.updateSpot(id, diff); refreshSpots(); };
    const handleDeleteSpot = async (id: string) => { if (confirm("Del?")) { await resourceApi.deleteSpot(id); refreshSpots(); } };
    const handleAddSpot = async () => { await resourceApi.createSpot({ cityId: selectedCityId, name: '新景点', isPublic: isAdmin }); refreshSpots(); };

    // Hotels
    const handleUpdateHotel = async (id: string, diff: Partial<PoiHotel>) => { await resourceApi.updateHotel(id, diff); refreshHotels(); };
    const handleDeleteHotel = async (id: string) => { await resourceApi.deleteHotel(id); refreshHotels(); };
    const handleAddHotel = async () => { await resourceApi.createHotel({ cityId: selectedCityId, name: '新酒店', roomType: '房型', isPublic: isAdmin }); refreshHotels(); };
    const handleAddRoom = async (hotelName: string) => { await resourceApi.createHotel({ cityId: selectedCityId, name: hotelName, roomType: '新房型', isPublic: isAdmin }); refreshHotels(); };
    const handleBatchUpdateHotelName = async (oldName: string, newName: string) => {
        // Complex: Find all hotels with oldName and update.
        // Backend doesn't support batch update. Frontend must loop.
        // We iterate currentHotels (page only). 
        // Ideally backend should have "rename hotel" endpoint.
        // For now, loop current page items.
        const targets = currentHotels.filter(h => (h.name || '未命名酒店') === oldName);
        for (const h of targets) {
            await resourceApi.updateHotel(h.id, { name: newName });
        }
        refreshHotels();
    };
    const handleDeleteHotelGroup = async (name: string) => {
        if (confirm("Del Group?")) {
            const targets = currentHotels.filter(h => (h.name || '未命名酒店') === name);
            for (const h of targets) await resourceApi.deleteHotel(h.id);
            refreshHotels();
        }
    };

    // Activities
    const handleUpdateAct = async (id: string, diff: Partial<PoiActivity>) => { await resourceApi.updateActivity(id, diff); refreshActivities(); };
    const handleDeleteAct = async (id: string) => { if (confirm("Del?")) { await resourceApi.deleteActivity(id); refreshActivities(); } };
    const handleAddAct = async () => { await resourceApi.createActivity({ cityId: selectedCityId, name: '新活动', isPublic: isAdmin }); refreshActivities(); };


    // Layout Classes
    const containerClass = variant === 'modal' ? "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" : "w-full h-full bg-white flex overflow-hidden";
    const innerClass = variant === 'modal' ? "bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex overflow-hidden" : "w-full h-full flex overflow-hidden";

    if (!isOpen) return null;

    // Pagination Controls Helper
    const PaginationBar = ({ page, hasMore, next, prev, loading }: any) => (
        <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-100 bg-gray-50/50">
            <button onClick={prev} disabled={page <= 1 || loading} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={20} /></button>
            <span className="text-sm text-gray-600 font-medium flex items-center gap-2">
                Page {page} {loading && <Loader2 size={12} className="animate-spin" />}
            </span>
            <button onClick={next} disabled={!hasMore || loading} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={20} /></button>
        </div>
    );

    return (
        <div className={containerClass}>
            <div className={innerClass}>
                <ResourceSidebar
                    countries={countries}
                    selectedCountry={selectedCountry}
                    onSelectCountry={setSelectedCountry}
                    onAddCountry={handleAddCountry}
                    onDeleteCountry={handleDeleteCountry}
                    isReadOnly={isReadOnly}
                    isAdmin={isAdmin}
                />

                <div className="flex-1 flex flex-col bg-white min-w-0">
                    {selectedCountry ? (
                        <>
                            {/* Header */}
                            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedCountry}</h2>
                                    <div className="flex gap-2 mt-4 bg-gray-100/50 p-1 rounded-lg inline-flex">
                                        <button onClick={() => setMainTab('poi')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === 'poi' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}><MapPin size={16} /> 地点与资源</button>
                                        <button onClick={() => setMainTab('transport')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === 'transport' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}><Car size={16} /> 交通配置</button>
                                    </div>
                                </div>
                                {variant === 'modal' && <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600"><X size={24} /></button>}
                            </div>

                            <div className="flex-1 overflow-hidden flex">
                                {mainTab === 'transport' && (
                                    <div className="flex-1 p-6 overflow-auto flex flex-col">
                                        <div className="flex-1">
                                            <TransportTable
                                                cars={currentCars}
                                                onUpdate={handleUpdateCar}
                                                onDelete={handleDeleteCar}
                                                onAdd={handleAddCar}
                                                isReadOnly={isReadOnly}
                                                isAdmin={isAdmin}
                                            />
                                        </div>
                                        <PaginationBar page={pageCars} hasMore={hasMoreCars} next={nextCars} prev={prevCars} loading={loadingCars} />

                                        {/* File List (Mocked/Empty for now as requested by user focus on pagination) */}
                                        <ResourceFileList files={countryFiles} onAddFiles={() => { }} onDeleteFile={() => { }} selectedCountry={selectedCountry} isReadOnly={isReadOnly} />
                                    </div>
                                )}

                                {mainTab === 'poi' && (
                                    <>
                                        <CitySidebar
                                            cities={currentCities}
                                            selectedCityId={selectedCityId}
                                            onSelectCity={setSelectedCityId}
                                            onUpdateCity={handleUpdateCity}
                                            onAddCity={handleAddCity}
                                            onDeleteCity={handleDeleteCity}
                                            isReadOnly={isReadOnly}
                                            isAdmin={isAdmin}
                                        />
                                        <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                            {selectedCityId ? (
                                                <>
                                                    <div className="flex border-b px-4">
                                                        <button onClick={() => setPoiTab('spot')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${poiTab === 'spot' ? 'border-blue-600' : 'border-transparent text-gray-500'}`}><Ticket size={16} /> 景点</button>
                                                        <button onClick={() => setPoiTab('hotel')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${poiTab === 'hotel' ? 'border-blue-600' : 'border-transparent text-gray-500'}`}><Hotel size={16} /> 酒店</button>
                                                        <button onClick={() => setPoiTab('activity')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${poiTab === 'activity' ? 'border-blue-600' : 'border-transparent text-gray-500'}`}><Palmtree size={16} /> 活动</button>
                                                    </div>
                                                    <div className="flex-1 overflow-auto p-4 bg-gray-50/50 flex flex-col">
                                                        {poiTab === 'spot' && (
                                                            <>
                                                                <SpotTable spots={currentSpots} onUpdate={handleUpdateSpot} onDelete={handleDeleteSpot} onAdd={handleAddSpot} isReadOnly={isReadOnly} isAdmin={isAdmin} />
                                                                <PaginationBar page={page1} hasMore={hasMore1} next={next1} prev={prev1} loading={loadingSpots} />
                                                            </>
                                                        )}
                                                        {poiTab === 'hotel' && (
                                                            <>
                                                                <HotelTable hotels={currentHotels} onUpdate={handleUpdateHotel} onBatchUpdateName={handleBatchUpdateHotelName} onDelete={handleDeleteHotel} onDeleteGroup={handleDeleteHotelGroup} onAddRoom={handleAddRoom} onAddHotel={handleAddHotel} isReadOnly={isReadOnly} isAdmin={isAdmin} />
                                                                <PaginationBar page={page2} hasMore={hasMore2} next={next2} prev={prev2} loading={loadingHotels} />
                                                            </>
                                                        )}
                                                        {poiTab === 'activity' && (
                                                            <>
                                                                <ActivityTable activities={currentActivities} onUpdate={handleUpdateAct} onDelete={handleDeleteAct} onAdd={handleAddAct} isReadOnly={isReadOnly} isAdmin={isAdmin} />
                                                                <PaginationBar page={page3} hasMore={hasMore3} next={next3} prev={prev3} loading={loadingActivities} />
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-gray-300 flex-col"><MapPin size={40} className="opacity-20" /><span className="text-sm">选择地点</span></div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-300 flex-col"><MapPin size={48} className="opacity-20" /><span className="text-sm">选择国家</span></div>
                    )}
                </div>
            </div>
        </div>
    );
};
