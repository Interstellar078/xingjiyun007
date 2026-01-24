import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { PoiSpot } from '../../types';
import { TableInput } from '../common/TableInput';

interface SpotTableProps {
    spots: PoiSpot[];
    onUpdate: (id: string, diff: Partial<PoiSpot>) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
    isReadOnly: boolean;
    isAdmin: boolean;
}

export const SpotTable: React.FC<SpotTableProps> = React.memo(({
    spots,
    onUpdate,
    onDelete,
    onAdd,
    isReadOnly,
    isAdmin
}) => {
    // @ts-ignore
    const isLocked = (item: PoiSpot) => (item.isPublic && !isAdmin);

    return (
        <div className="bg-white border rounded shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">景点名称</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">门票单人价</th><th className="w-12"></th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                    {spots.map(item => (
                        <tr key={item.id}>
                            <td className="px-4 py-2">
                                <div className='flex items-center gap-1'>
                                    <TableInput
                                        autoWidth
                                        disabled={isReadOnly || isLocked(item)}
                                        className="text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                        value={item.name}
                                        onChange={(val) => onUpdate(item.id, { name: val as string })}
                                        placeholder="景点名称"
                                    />
                                    {!item.isPublic && <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded scale-90 origin-left">私有</span>}
                                    {item.isPublic && isAdmin && <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1 rounded scale-90 origin-left">公共</span>}
                                </div>
                            </td>
                            <td className="px-4 py-2">
                                <TableInput
                                    disabled={isReadOnly || isLocked(item)}
                                    type="number"
                                    className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                    value={item.price}
                                    onChange={(val) => onUpdate(item.id, { price: val as number })}
                                />
                            </td>
                            <td className="px-4 text-center">
                                {!isReadOnly && !isLocked(item) && (
                                    <button onClick={() => onDelete(item.id)}>
                                        <Trash2 size={14} className="text-gray-300 hover:text-red-500" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!isReadOnly && (
                <button onClick={onAdd} className="m-3 text-xs text-blue-600 flex items-center gap-1">
                    <Plus size={14} /> 添加景点
                </button>
            )}
        </div>
    );
});
