import React, { useMemo } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { PoiHotel } from '../../types';
import { TableInput } from '../common/TableInput';

interface HotelTableProps {
    hotels: PoiHotel[];
    onUpdate: (id: string, diff: Partial<PoiHotel>) => void;
    onBatchUpdateName: (oldName: string, newName: string) => void;
    onDelete: (id: string) => void;
    onDeleteGroup: (hotelName: string) => void;
    onAddRoom: (hotelName: string) => void;
    onAddHotel: () => void;
    isReadOnly: boolean;
    isAdmin: boolean;
}

export const HotelTable: React.FC<HotelTableProps> = React.memo(({
    hotels,
    onUpdate,
    onBatchUpdateName,
    onDelete,
    onDeleteGroup,
    onAddRoom,
    onAddHotel,
    isReadOnly,
    isAdmin
}) => {
    // Group logic
    const groupedHotels = useMemo(() => {
        const groups: Record<string, PoiHotel[]> = {};
        hotels.forEach(h => {
            const name = h.name || "未命名酒店";
            if (!groups[name]) groups[name] = [];
            groups[name].push(h);
        });
        return Object.entries(groups);
    }, [hotels]);

    // @ts-ignore
    const isLocked = (item: PoiHotel) => (item.isPublic && !isAdmin);

    return (
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
                    {groupedHotels.map(([hotelName, rows]) => {
                        const isGroupLocked = rows.some(r => r.isPublic) && !isAdmin;
                        return (
                            <tr key={hotelName}>
                                <td className="px-4 py-2 align-top">
                                    <div className="flex items-center gap-2">
                                        <TableInput
                                            disabled={isReadOnly || isGroupLocked}
                                            className="w-full text-sm font-medium border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                            value={hotelName === "未命名酒店" ? "" : hotelName}
                                            onChange={(val) => onBatchUpdateName(hotelName, val as string)}
                                            placeholder="酒店名称"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <div className="flex flex-wrap gap-2">
                                        {rows.map(item => (
                                            <div key={item.id} className="flex items-center bg-blue-50 border border-blue-100 rounded px-2 py-1 gap-2">
                                                <TableInput
                                                    disabled={isReadOnly || isLocked(item)}
                                                    className="w-20 text-xs bg-transparent border-0 border-b border-blue-200 focus:ring-0 p-0 text-gray-700 disabled:border-transparent"
                                                    value={item.roomType}
                                                    onChange={(val) => onUpdate(item.id, { roomType: val as string })}
                                                    placeholder="房型"
                                                />
                                                <span className="text-gray-400 text-xs">:</span>
                                                <TableInput
                                                    disabled={isReadOnly || isLocked(item)}
                                                    type="number"
                                                    className="w-14 text-xs bg-transparent border-0 border-b border-blue-200 focus:ring-0 p-0 font-medium text-blue-700 disabled:border-transparent disabled:text-gray-500"
                                                    value={item.price}
                                                    onChange={(val) => onUpdate(item.id, { price: val as number })}
                                                />
                                                {!item.isPublic && <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded transform scale-90 origin-left">私有</span>}
                                                {item.isPublic && isAdmin && <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1 rounded transform scale-90 origin-left">公共</span>}
                                                {!isReadOnly && !isLocked(item) && <button onClick={() => onDelete(item.id)} className="text-blue-300 hover:text-red-500 ml-1"><X size={12} /></button>}
                                            </div>
                                        ))}
                                        {!isReadOnly && !isGroupLocked && <button onClick={() => onAddRoom(hotelName)} className="px-2 py-1 text-xs border border-dashed border-gray-300 rounded text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors">+ 房型</button>}
                                    </div>
                                </td>
                                <td className="px-4 text-center align-middle">
                                    {!isReadOnly && !isGroupLocked && <button onClick={() => onDeleteGroup(hotelName)} title="删除整家酒店"><Trash2 size={16} className="text-gray-300 hover:text-red-500" /></button>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {!isReadOnly && <button onClick={onAddHotel} className="m-3 text-xs text-blue-600 flex items-center gap-1"><Plus size={14} /> 添加新酒店</button>}
        </div>
    );
});
