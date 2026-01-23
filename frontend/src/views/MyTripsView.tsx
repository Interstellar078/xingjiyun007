import React from 'react';
import { MapPin, Calendar, Clock, Trash2 } from 'lucide-react';
import { SavedTrip } from '../types';

interface MyTripsViewProps {
    savedTrips: SavedTrip[];
    onLoadTrip: (trip: SavedTrip) => void;
    onDeleteTrip: (id: string) => void;
}

/**
 * MyTripsView - Display and manage saved trips
 */
export function MyTripsView({ savedTrips, onLoadTrip, onDeleteTrip }: MyTripsViewProps) {
    return (
        <div className="h-full p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">我的行程</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedTrips.map(trip => (
                    <div
                        key={trip.id}
                        onClick={() => onLoadTrip(trip)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group relative"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTrip(trip.id);
                                }}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-2 truncate pr-6">{trip.name}</h3>
                        <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} /> {trip.settings.destinations.join(', ') || '未定目的地'}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} /> {trip.rows.length} 天
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} /> {new Date(trip.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
                {savedTrips.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        还没有保存的行程
                    </div>
                )}
            </div>
        </div>
    );
}
