import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Trash2, Globe, Lock, Share, ArrowUpCircle, User as UserIcon } from 'lucide-react';
import { SavedTrip, User } from '../types';
import { StorageService } from '../services/storageService';

interface MyTripsViewProps {
    currentUser: User | null;
    savedTrips: SavedTrip[]; // Private
    publicTrips: SavedTrip[]; // Public
    onLoadTrip: (trip: SavedTrip) => void;
    onDeleteTrip: (id: string, isPublic: boolean) => void;
    onPromoteTrip: (trip: SavedTrip) => void; // Admin Only
}

/**
 * MyTripsView - Display and manage saved trips (Private & Public)
 */
export function MyTripsView({
    currentUser,
    savedTrips,
    publicTrips,
    onLoadTrip,
    onDeleteTrip,
    onPromoteTrip
}: MyTripsViewProps) {
    const [activeTab, setActiveTab] = useState<'private' | 'public' | 'admin_all'>('private');
    const [adminAllTrips, setAdminAllTrips] = useState<{ owner: string, trips: SavedTrip[] }[]>([]);
    const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

    const isAdmin = currentUser?.role === 'admin';

    // Fetch all users' trips for Admin view
    const loadAllUserTrips = async () => {
        if (!isAdmin) return;
        setIsLoadingAdmin(true);
        try {
            // Fetch raw KV rows
            const rows = await StorageService.adminGetAllKeys('travel_builder_history');
            // Parse values
            const parsed = rows.map(row => ({
                owner: row.owner_id,
                trips: Array.isArray(row.value) ? row.value as SavedTrip[] : []
            })).filter(g => g.trips.length > 0);
            setAdminAllTrips(parsed);
        } catch (e) {
            console.error("Failed to load all trips", e);
            alert("加载用户数据失败");
        } finally {
            setIsLoadingAdmin(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'admin_all' && isAdmin) {
            loadAllUserTrips();
        }
    }, [activeTab, isAdmin]);

    interface TripCardProps {
        trip: SavedTrip;
        showOwner?: boolean;
        ownerName?: string;
        isPublicSource?: boolean;
        allowPromote?: boolean;
        allowDelete?: boolean;
    }

    const TripCard: React.FC<TripCardProps> = ({ trip, showOwner = false, ownerName = '', isPublicSource = false, allowPromote = false, allowDelete = true }) => (
        <div
            onClick={() => onLoadTrip(trip)}
            className={`bg-white p-6 rounded-xl shadow-sm border transition-shadow cursor-pointer group relative flex flex-col ${isPublicSource ? 'border-blue-200 hover:border-blue-400' : 'border-gray-200 hover:shadow-md'}`}
        >
            {/* Status Badges */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                    {isPublicSource ? (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <Globe size={10} /> 公有库
                        </span>
                    ) : (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <Lock size={10} /> 私有
                        </span>
                    )}
                    {showOwner && (
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <UserIcon size={10} /> {ownerName || trip.createdBy}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions overlay */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {allowPromote && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPromoteTrip(trip);
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 hover:text-blue-700 shadow-sm"
                        title="发布到公有库"
                    >
                        <ArrowUpCircle size={16} />
                    </button>
                )}
                {allowDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTrip(trip.id, isPublicSource);
                        }}
                        className="p-2 bg-red-50 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-100 shadow-sm"
                        title="删除"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <h3 className="font-bold text-lg text-gray-800 mb-2 truncate pr-16">{trip.name}</h3>

            <div className="space-y-2 text-sm text-gray-500 mt-auto">
                <div className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{trip.settings.destinations.join(', ') || '未定目的地'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="shrink-0" />
                    <span>{trip.rows.length} 天</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={14} className="shrink-0" />
                    <span>{new Date(trip.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header / Tabs */}
            <div className="px-8 pt-8 pb-4 bg-white border-b border-gray-200">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">行程规划库</h2>
                <div className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('private')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'private' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Lock size={16} /> 我的私有行程
                    </button>
                    <button
                        onClick={() => setActiveTab('public')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'public' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Globe size={16} /> 公有行程库
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('admin_all')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'admin_all' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <UserIcon size={16} /> [管理员] 所有用户行程
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                {activeTab === 'private' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savedTrips.map(trip => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                // Standard user can delete their own private trips
                                allowDelete={true}
                                // Standard user cannot promote directly (must ask admin), Admin can promote any
                                allowPromote={isAdmin}
                            />
                        ))}
                        {savedTrips.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                还没有私有行程，快去创建一个吧！
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'public' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {publicTrips.map(trip => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                isPublicSource={true}
                                // Only Admin can delete from Public Lib
                                allowDelete={isAdmin}
                                allowPromote={false} // Already public
                                showOwner={true}
                            />
                        ))}
                        {publicTrips.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                公有库暂无内容
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'admin_all' && isAdmin && (
                    <div className="space-y-8">
                        {isLoadingAdmin ? (
                            <div className="text-center py-10 text-gray-500">加载中...</div>
                        ) : (
                            adminAllTrips.map(group => (
                                <div key={group.owner}>
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                                            {group.owner.charAt(0).toUpperCase()}
                                        </div>
                                        {group.owner} ({group.trips.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {group.trips.map(trip => (
                                            <TripCard
                                                key={trip.id}
                                                trip={trip}
                                                ownerName={group.owner}
                                                // Admin cannot delete USER PRIVATE data directly from here unless we add endpoint
                                                // (Though deleteTrip api checks owners, currently setSavedTrips only updates LOCAL state)
                                                // So AllowDelete=false to avoid confusion or complex implementation
                                                allowDelete={false}
                                                allowPromote={true} // Admin can promote anyone's trip
                                                showOwner={false}
                                            />
                                        ))}
                                    </div>
                                    <hr className="mt-8 border-gray-200" />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
