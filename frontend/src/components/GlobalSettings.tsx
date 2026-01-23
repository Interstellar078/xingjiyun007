
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
    <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm mb-0 flex items-center flex-wrap gap-4 no-print text-sm">
      {/* Planner Name */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-gray-500 font-medium">
          <Users size={14} />
        </div>
        <input
          type="text"
          value={settings.plannerName}
          onChange={(e) => updateSettings({ plannerName: e.target.value })}
          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2 border placeholder:text-gray-400"
          placeholder="定制师/用户名"
          title="定制师"
        />
      </div>

      <div className="h-4 w-px bg-gray-200"></div>

      {/* Start Date */}
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-gray-500" />
        <input
          type="date"
          value={settings.startDate}
          onChange={(e) => updateSettings({ startDate: e.target.value })}
          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2 border"
          title="出发日期"
        />
      </div>

      <div className="h-4 w-px bg-gray-200"></div>

      {/* People & Rooms */}
      <div className="flex items-center gap-2">
        <div className="relative w-20">
          <input
            type="number"
            min="1"
            value={settings.peopleCount}
            onChange={(e) => updateSettings({ peopleCount: parseInt(e.target.value) || 0 })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2 border pr-6"
            placeholder="人数"
            title="人数"
          />
          <span className="absolute right-1.5 top-1.5 text-gray-400 text-[10px]">人</span>
        </div>
        <div className="relative w-20">
          <input
            type="number"
            min="0"
            value={settings.roomCount}
            onChange={(e) => updateSettings({ roomCount: parseInt(e.target.value) || 0 })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2 border pr-6"
            placeholder="间"
            title="房间数"
          />
          <span className="absolute right-1.5 top-1.5 text-gray-400 text-[10px]">间</span>
        </div>
      </div>

      <div className="h-4 w-px bg-gray-200"></div>

      {/* Currency & Destinations */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Globe size={14} className="text-gray-500" />
        <div className="flex-1">
          <MultiSelect
            options={availableCountries}
            value={settings.destinations}
            onChange={(vals) => updateSettings({ destinations: vals })}
            placeholder="目的地国家..."
            className="w-full text-xs"
          />
        </div>
      </div>

      <div className="h-4 w-px bg-gray-200"></div>

      {/* Currency Rate */}
      <div className="flex items-center gap-2">
        <Coins size={14} className="text-gray-500" />
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
          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2 border text-center"
          placeholder="货币"
          title="货币单位"
        />
        <input
          type="number"
          step="0.01"
          disabled={settings.currency.toUpperCase() === 'CNY' || settings.currency === '人民币'}
          value={settings.exchangeRate}
          onChange={(e) => updateSettings({ exchangeRate: parseFloat(e.target.value) || 1 })}
          className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1 px-2 border disabled:bg-gray-50 text-right"
          placeholder="汇率"
          title="对人民币汇率"
        />
      </div>
    </div>
  );
};
