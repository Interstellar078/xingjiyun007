import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { PoiCity } from '../../types';
import { TableInput } from '../common/TableInput';

interface CitySidebarProps {
    cities: PoiCity[];
    selectedCityId: string;
    onSelectCity: (id: string) => void;
    onUpdateCity: (id: string, name: string) => void;
    onAddCity: (name: string) => void;
    onDeleteCity: (id: string) => void;
    isReadOnly: boolean;
    isAdmin: boolean;
}

export const CitySidebar: React.FC<CitySidebarProps> = React.memo(({
    cities,
    selectedCityId,
    onSelectCity,
    onUpdateCity,
    onAddCity,
    onDeleteCity,
    isReadOnly,
    isAdmin
}) => {
    const [newCityName, setNewCityName] = useState('');
    const [isAddingCity, setIsAddingCity] = useState(false);

    const handleAdd = () => {
        if (newCityName.trim()) {
            onAddCity(newCityName.trim());
            setNewCityName('');
            setIsAddingCity(false);
        }
    };

    // Helper for locking logic
    const isLocked = (item: PoiCity) => (item.isPublic && !isAdmin);

    return (
        <div className="w-48 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden shrink-0">
            <div className="p-3 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">地点列表 (城市/机场等)</div>
            <div className="flex-1 overflow-y-auto">
                {cities.map(city => (
                    <div key={city.id} onClick={() => onSelectCity(city.id)} className={`px-4 py-2 cursor-pointer text-sm flex justify-between items-center group ${selectedCityId === city.id ? 'bg-white text-blue-600 font-medium border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <div className="flex-1 flex items-center gap-1 min-w-0">
                            <TableInput
                                autoWidth
                                disabled={isReadOnly || isLocked(city)}
                                className={`min-w-0 bg-transparent border-none focus:ring-0 p-0 text-sm cursor-pointer disabled:cursor-pointer disabled:text-gray-600 ${selectedCityId === city.id ? 'font-medium text-blue-600 placeholder-blue-400' : 'text-gray-600'}`}
                                value={city.name}
                                onChange={(val) => onUpdateCity(city.id, val as string)}
                                placeholder="地点名称"
                            />
                            {!city.isPublic && <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded transform scale-90 origin-left">私有</span>}
                            {city.isPublic && isAdmin && <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1 rounded transform scale-90 origin-left">公共</span>}
                        </div>
                        {!isReadOnly && !isLocked(city) && <button onClick={(e) => { e.stopPropagation(); onDeleteCity(city.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 ml-2"><Trash2 size={12} /></button>}
                    </div>
                ))}
                {cities.length === 0 && <div className="p-4 text-center text-xs text-gray-400">暂无地点</div>}
            </div>
            <div className="p-2 border-t">
                {!isReadOnly ? (isAddingCity ? (
                    <div className="flex items-center gap-1">
                        <input autoFocus type="text" className="w-full text-xs border border-blue-300 rounded px-1 py-1" placeholder="地点名" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                        <button onClick={handleAdd}><Plus size={16} className="text-blue-600" /></button>
                    </div>
                ) : (
                    <button onClick={() => setIsAddingCity(true)} className="w-full py-1 text-xs text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 flex justify-center items-center gap-1"><Plus size={14} /> 添加地点</button>
                )) : null}
            </div>
        </div>
    );
});
