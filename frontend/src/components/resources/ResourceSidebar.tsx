import React, { useState, useMemo } from 'react';
import { Globe, Search, Trash2, FileSpreadsheet, Download, Plus } from 'lucide-react';
import { PoiCountry } from '../../types';

interface ResourceSidebarProps {
    countries: PoiCountry[];
    selectedCountry: string; // Name
    onSelectCountry: (name: string) => void;
    onAddCountry: (name: string) => void;
    onDeleteCountry: (id: string) => void;
    isReadOnly: boolean;
    isAdmin: boolean;
}

export const ResourceSidebar: React.FC<ResourceSidebarProps> = React.memo(({
    countries,
    selectedCountry,
    onSelectCountry,
    onAddCountry,
    onDeleteCountry,
    isReadOnly,
    isAdmin
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [newCountryName, setNewCountryName] = useState('');
    const [isAddingCountry, setIsAddingCountry] = useState(false);

    const displayCountries = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return countries
            .filter(c => c.name.toLowerCase().includes(lower))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [countries, searchTerm]);

    const handleAdd = () => {
        if (newCountryName.trim()) {
            onAddCountry(newCountryName.trim());
            setNewCountryName('');
            setIsAddingCountry(false);
        }
    };

    const isLocked = (c: PoiCountry) => c.isPublic && !isAdmin;

    return (
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
                        <div key={country.id} onClick={() => onSelectCountry(country.name)} className={`px-4 py-3 cursor-pointer flex justify-between items-center group transition-all duration-200 border-l-4 ${selectedCountry === country.name ? 'bg-white border-blue-600 shadow-sm' : 'hover:bg-white hover:border-blue-200 border-transparent text-gray-600'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm font-medium truncate ${selectedCountry === country.name ? 'text-blue-700' : ''}`}>{country.name}</span>
                                {!country.isPublic && <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded transform scale-90">私有</span>}
                                {country.isPublic && isAdmin && <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1 rounded transform scale-90">公共</span>}
                            </div>
                            {!isReadOnly && !isLocked(country) && <button onClick={(e) => { e.stopPropagation(); onDeleteCountry(country.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 size={12} /></button>}
                        </div>
                    ))
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-xs text-gray-400 mb-4">暂无数据</p>
                    </div>
                )}
            </div>
            <div className="p-3 border-t bg-white space-y-2">
                {!isReadOnly ? (
                    <>

                        {isAddingCountry ? (
                            <div className="flex items-center gap-1">
                                <input autoFocus type="text" className="w-full text-xs border border-blue-300 rounded px-1 py-1" placeholder="新国家名称" value={newCountryName} onChange={(e) => setNewCountryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                                <button onClick={handleAdd}><Plus size={16} className="text-blue-600" /></button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAddingCountry(true)} className="w-full py-1.5 text-xs text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 flex justify-center items-center gap-1"><Plus size={14} /> 添加国家</button>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
});
