
import React from 'react';
import { TripSettings } from '../types';
import { Users, Calendar, Globe, Sparkles } from 'lucide-react';
import { MultiSelect } from './MultiSelect';

interface GlobalSettingsProps {
  settings: TripSettings;
  updateSettings: (s: Partial<TripSettings>) => void;
  availableCountries: string[];
  onAutoGenerate?: () => void;
  validationErrors?: { destinations?: boolean; startDate?: boolean };
  tripDays: number;
  onTripDaysChange: (days: number) => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ settings, updateSettings, availableCountries, onAutoGenerate, validationErrors, tripDays, onTripDaysChange }) => {
  return (
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-4 no-print text-sm">

      {/* Planner Name */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Users size={15} className="text-gray-400" />
        <input
          type="text"
          value={settings.plannerName}
          onChange={(e) => updateSettings({ plannerName: e.target.value })}
          className="w-36 transition-all hover:border-blue-400 focus:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1.5 px-3 border placeholder:text-gray-400 font-medium text-gray-700"
          placeholder="定制师/用户名"
        />
      </div>

      <div className="h-5 w-px bg-gray-200 mx-1 flex-shrink-0"></div>

      {/* Date */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Calendar size={15} className="text-gray-400" />
        <input
          type="date"
          value={settings.startDate}
          onChange={(e) => updateSettings({ startDate: e.target.value })}
          className={`w-32 rounded-md shadow-sm text-xs py-1.5 px-2 border text-gray-600 font-mono ${validationErrors?.startDate ? 'border-red-500 ring-1 ring-red-200 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
        />
      </div>

      <div className="h-5 w-px bg-gray-200 mx-1 flex-shrink-0"></div>

      {/* Duration */}
      <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <div className="relative">
          <select
            value={tripDays}
            onChange={(e) => onTripDaysChange(parseInt(e.target.value))}
            className="block w-20 rounded border-0 bg-white ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 text-xs py-1.5 pl-2 pr-6 text-center font-medium appearance-none cursor-pointer"
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} 天</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      </div>

      <div className="h-5 w-px bg-gray-200 mx-1 flex-shrink-0"></div>

      {/* People Group */}
      <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <div className="relative w-16">
          <input
            type="number"
            min="1"
            value={settings.peopleCount}
            onChange={(e) => updateSettings({ peopleCount: parseInt(e.target.value) || 0 })}
            className="block w-full rounded border-0 bg-white ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 text-xs py-1 px-1.5 pr-5 text-center font-medium"
            placeholder="0"
          />
          <span className="absolute right-1.5 top-1 text-gray-400 text-[10px] pointer-events-none">人</span>
        </div>
        <div className="relative w-16">
          <input
            type="number"
            min="0"
            value={settings.roomCount}
            onChange={(e) => updateSettings({ roomCount: parseInt(e.target.value) || 0 })}
            className="block w-full rounded border-0 bg-white ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 text-xs py-1 px-1.5 pr-5 text-center font-medium"
            placeholder="0"
          />
          <span className="absolute right-1.5 top-1 text-gray-400 text-[10px] pointer-events-none">间</span>
        </div>
      </div>

      <div className="h-5 w-px bg-gray-200 mx-1 flex-shrink-0"></div>

      {/* Destination - Flexible Width */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        {/* <Globe size={15} className="text-blue-500 flex-shrink-0" /> */}
        <div className="flex-1">
          <MultiSelect
            options={availableCountries}
            value={settings.destinations}
            onChange={(vals) => updateSettings({ destinations: vals })}
            placeholder="选择目的地国家..."
            className="w-full text-xs"
            variant="bordered"
            isError={validationErrors?.destinations}
          />
        </div>
      </div>

      <div className="flex-1"></div>

      {/* AI Auto Generate Button */}
      {onAutoGenerate && (
        <button
          onClick={onAutoGenerate}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md text-xs font-medium hover:opacity-90 shadow-sm transition-all active:scale-95 flex-shrink-0"
        >
          <div className="animate-pulse"><Sparkles size={14} /></div>
          AI 一键定制
        </button>
      )}

    </div>
  );
};
