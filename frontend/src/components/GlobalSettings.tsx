
import React from 'react';
import { TripSettings } from '../types';
import { Users, Calendar, Globe, Coins } from 'lucide-react';
import { MultiSelect } from './MultiSelect';

interface GlobalSettingsProps {
  settings: TripSettings;
  updateSettings: (s: Partial<TripSettings>) => void;
  availableCountries: string[];
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ settings, updateSettings, availableCountries }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 no-print">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Planner Name */}
        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">定制师 / 用户名</label>
             <input
              type="text"
              value={settings.plannerName}
              onChange={(e) => updateSettings({ plannerName: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="输入您的名字"
            />
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Calendar size={14} /> 出发日期
          </label>
          <input
            type="date"
            value={settings.startDate}
            onChange={(e) => updateSettings({ startDate: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        {/* People & Rooms */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Users size={14} /> 人数 / 房间
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
                 <input
                    type="number"
                    min="1"
                    value={settings.peopleCount}
                    onChange={(e) => updateSettings({ peopleCount: parseInt(e.target.value) || 0 })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border pr-8"
                    placeholder="人数"
                />
                <span className="absolute right-2 top-2 text-gray-400 text-xs">人</span>
            </div>
            <div className="relative flex-1">
                <input
                    type="number"
                    min="0"
                    value={settings.roomCount}
                    onChange={(e) => updateSettings({ roomCount: parseInt(e.target.value) || 0 })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border pr-8"
                    placeholder="间"
                />
                 <span className="absolute right-2 top-2 text-gray-400 text-xs">间</span>
            </div>
          </div>
        </div>

        {/* Currency & Destinations */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Globe size={14} /> 目的地 (国家)
          </label>
          <MultiSelect 
            options={availableCountries}
            value={settings.destinations}
            onChange={(vals) => updateSettings({ destinations: vals })}
            placeholder="选择国家..."
            className="w-full text-sm"
          />
        </div>

         {/* Currency Rate */}
        <div className="space-y-2">
           <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Coins size={14} /> 货币 / 汇率
          </label>
          <div className="flex gap-2">
             <input 
                type="text"
                value={settings.currency}
                onChange={(e) => {
                    const val = e.target.value;
                    const isCNY = val.toUpperCase() === 'CNY' || val === '人民币';
                    updateSettings({ 
                        currency: val, 
                        exchangeRate: isCNY ? 1 : settings.exchangeRate 
                    })
                }}
                className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="货币"
             />
             <input
                type="number"
                step="0.01"
                disabled={settings.currency.toUpperCase() === 'CNY' || settings.currency === '人民币'}
                value={settings.exchangeRate}
                onChange={(e) => updateSettings({ exchangeRate: parseFloat(e.target.value) || 1 })}
                className="block w-2/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border disabled:bg-gray-100"
                placeholder="对人民币汇率"
             />
          </div>
        </div>

      </div>
    </div>
  );
};
