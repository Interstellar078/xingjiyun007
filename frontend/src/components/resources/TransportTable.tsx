import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { CarCostEntry } from '../../types';
import { TableInput } from '../common/TableInput';

interface TransportTableProps {
    cars: CarCostEntry[];
    onUpdate: (id: string, diff: Partial<CarCostEntry>) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
    isReadOnly: boolean;
    isAdmin: boolean;
}

export const TransportTable: React.FC<TransportTableProps> = React.memo(({
    cars,
    onUpdate,
    onDelete,
    onAdd,
    isReadOnly,
    isAdmin
}) => {
    // @ts-ignore
    const isLocked = (item: CarCostEntry) => (item.isPublic && !isAdmin);

    return (
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
                    {cars.map(row => (
                        <tr key={row.id}>
                            <td className="px-6 py-2">
                                <div className="flex items-center gap-1">
                                    <TableInput
                                        autoWidth
                                        disabled={isReadOnly || isLocked(row)}
                                        className="text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                        value={row.carModel}
                                        onChange={(val) => onUpdate(row.id, { carModel: val as string })}
                                        placeholder="车型"
                                    />
                                    {!row.isPublic && <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded scale-90 origin-left">私有</span>}
                                    {row.isPublic && isAdmin && <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1 rounded scale-90 origin-left">公共</span>}
                                </div>
                            </td>
                            <td className="px-6 py-2">
                                <select
                                    disabled={isReadOnly || isLocked(row)}
                                    className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                    value={row.serviceType}
                                    onChange={(e) => onUpdate(row.id, { serviceType: e.target.value })}
                                >
                                    <option value="包车">包车</option>
                                    <option value="城际">城际</option>
                                    <option value="拼车">拼车</option>
                                    <option value="接送机">接送机</option>
                                    <option value="其它">其它</option>
                                </select>
                            </td>
                            <td className="px-6 py-2">
                                <TableInput
                                    disabled={isReadOnly || isLocked(row)}
                                    type="number"
                                    min="1"
                                    className="w-full text-sm border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500"
                                    value={row.passengers}
                                    onChange={(val) => onUpdate(row.id, { passengers: val as number })}
                                />
                            </td>
                            <td className="px-6 py-2">
                                <TableInput
                                    disabled={isReadOnly || isLocked(row)}
                                    type="number"
                                    className="w-full text-sm border-gray-300 rounded text-blue-600 disabled:bg-gray-50 disabled:text-gray-500"
                                    value={row.priceLow}
                                    onChange={(val) => onUpdate(row.id, { priceLow: val as number })}
                                />
                            </td>
                            <td className="px-6 py-2">
                                <TableInput
                                    disabled={isReadOnly || isLocked(row)}
                                    type="number"
                                    className="w-full text-sm border-gray-300 rounded text-red-600 disabled:bg-gray-50 disabled:text-gray-500"
                                    value={row.priceHigh}
                                    onChange={(val) => onUpdate(row.id, { priceHigh: val as number })}
                                />
                            </td>
                            <td className="px-6 text-center">
                                {!isReadOnly && !isLocked(row) && (
                                    <button onClick={() => onDelete(row.id)}>
                                        <Trash2 size={16} className="text-gray-300 hover:text-red-500" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!isReadOnly && (
                <button onClick={onAdd} className="m-4 text-sm text-blue-600 flex items-center gap-1">
                    <Plus size={16} /> 添加车型配置
                </button>
            )}
        </div>
    );
});
