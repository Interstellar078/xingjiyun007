import React, { useEffect, useState } from 'react';
import { Users, Map, Car, MapPin, Building2, FolderOpen, Loader2, Database } from 'lucide-react';
import { StorageService, KEYS } from '../services/storageService';
import { AuthService } from '../services/authService';

/**
 * DashboardView - Admin Statistics Dashboard
 */
export function DashboardView() {
    const [stats, setStats] = useState({
        userCount: 0,
        publicTripsCount: 0,
        privateTripsCount: 0,
        resources: {
            cars: 0,
            spots: 0,
            hotels: 0
        }
    });
    const [loading, setLoading] = useState(true);

    const safeGetPublicData = async <T,>(key: string): Promise<T[]> => {
        try {
            const data = await StorageService.getPublicData<T[]>(key);
            // If data is null/undefined (fallback), return []
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // 1. Fetch Users
                const users = await AuthService.getUsers();

                // 2. Fetch Public Trips
                const publicTrips = await safeGetPublicData<any>(KEYS.PUBLIC_TRIPS);

                // 3. Fetch All User Private Trips (Admin only)
                // We wrap this in try/catch to avoid crashing if admin API fails
                let totalPrivateTrips = 0;
                try {
                    const allPrivateTrips = await StorageService.adminGetAllKeys(KEYS.HISTORY);
                    if (Array.isArray(allPrivateTrips)) {
                        allPrivateTrips.forEach(item => {
                            if (Array.isArray(item.value)) {
                                totalPrivateTrips += item.value.length;
                            }
                        });
                    }
                } catch (e) {
                    console.error("Failed to fetch private trips", e);
                }

                // 4. Fetch Public Resources
                const cars = await safeGetPublicData<any>(KEYS.DB_CARS);
                const spots = await safeGetPublicData<any>(KEYS.DB_SPOTS);
                const hotels = await safeGetPublicData<any>(KEYS.DB_HOTELS);

                setStats({
                    userCount: Array.isArray(users) ? users.length : 0,
                    publicTripsCount: publicTrips.length,
                    privateTripsCount: totalPrivateTrips,
                    resources: {
                        cars: cars.length,
                        spots: spots.length,
                        hotels: hotels.length
                    }
                });

            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin mb-2" />
                    <p>Loading stats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Users"
                    value={stats.userCount}
                    icon={Users}
                    color="bg-blue-100 text-blue-600"
                />

                <StatCard
                    label="Public Trips"
                    value={stats.publicTripsCount}
                    icon={Map}
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    label="Total Private Trips"
                    value={stats.privateTripsCount}
                    icon={FolderOpen}
                    color="bg-yellow-100 text-yellow-600"
                />
            </div>

            <h3 className="text-xl font-semibold mb-4 text-gray-700">Public Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Cars"
                    value={stats.resources.cars}
                    icon={Car}
                    color="bg-purple-100 text-purple-600"
                />
                <StatCard
                    label="Spots"
                    value={stats.resources.spots}
                    icon={MapPin}
                    color="bg-pink-100 text-pink-600"
                />
                <StatCard
                    label="Hotels"
                    value={stats.resources.hotels}
                    icon={Building2}
                    color="bg-indigo-100 text-indigo-600"
                />
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-full mr-4 ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
