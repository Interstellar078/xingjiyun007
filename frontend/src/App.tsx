import React, { useState, useEffect } from 'react';
import { User } from './types';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { useCloudStorage } from './hooks/useCloudStorage';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useTripManagement } from './hooks/useTripManagement';

// Import views (will be created/exist)
import { PlannerViewOriginal } from './views/PlannerViewOriginal';
import { MyTripsView } from './views/MyTripsView';
import { ResourcesView } from './views/ResourcesView';
import { UsersView } from './views/UsersView';
import { DashboardView } from './views/DashboardView';
import { SystemSettingsView } from './views/SystemSettingsView';

/**
 * Main App Component - Framework Only
 * 
 * Responsibilities:
 * - Authentication management
 * - Top-level routing between views
 * - Cloud storage coordination via hooks
 * 
 * All view-specific logic is delegated to view components.
 */
export default function App() {
    // ==================== Auth State ====================
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
    const [currentView, setCurrentView] = useState('planner');

    // ==================== Hooks ====================
    const cloudStorage = useCloudStorage();
    const tripPlanner = useTripPlanner(
        currentUser,
        cloudStorage.data.locationHistory,
        cloudStorage.actions.setLocationHistory
    );
    const tripManagement = useTripManagement(
        currentUser,
        cloudStorage.data.savedTrips,
        cloudStorage.actions.setSavedTrips,
        tripPlanner.settings,
        tripPlanner.rows,
        tripPlanner.customColumns,
        tripPlanner.setSettings,
        tripPlanner.setRows,
        tripPlanner.setCustomColumns
    );

    // ==================== Auth Effects ====================
    useEffect(() => {
        const checkAuth = async () => {
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);

            if (user) {
                await cloudStorage.loadCloudData();
            }

            cloudStorage.setIsAppLoading(false);
        };

        checkAuth();
    }, []);

    // ==================== Auth Handlers ====================
    const handleLoginSuccess = async (user: User) => {
        setCurrentUser(user);
        setShowAuthModal(false);
        cloudStorage.setIsAppLoading(true);
        await cloudStorage.loadCloudData();
        cloudStorage.setIsAppLoading(false);
    };

    const handleLogout = async () => {
        await AuthService.logout();
        setCurrentUser(null);
        setCurrentView('planner');
    };

    // ==================== Loading State ====================
    if (cloudStorage.isAppLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">加载中...</p>
                </div>
            </div>
        );
    }

    // ==================== Landing Page (Not Logged In) ====================
    if (!currentUser) {
        return (
            <>
                <LandingPage
                    onLoginClick={() => {
                        setAuthModalMode('login');
                        setShowAuthModal(true);
                    }}
                    onRegisterClick={() => {
                        setAuthModalMode('register');
                        setShowAuthModal(true);
                    }}
                />
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onLoginSuccess={handleLoginSuccess}
                    initialIsLogin={authModalMode === 'login'}
                />
            </>
        );
    }

    // ==================== Main App (Logged In) ====================
    return (
        <DashboardLayout
            userRole={currentUser.role}
            currentView={currentView}
            onViewChange={setCurrentView}
            currentUser={currentUser}
            onLogout={handleLogout}
        >
            {/* Planner View - Original Implementation */}
            {currentView === 'planner' && (
                <PlannerViewOriginal
                    currentUser={currentUser}
                    tripPlanner={tripPlanner}
                    tripManagement={tripManagement}
                    cloudStorage={cloudStorage}
                    onViewChange={setCurrentView}
                />
            )}

            {/* My Trips View */}
            {currentView === 'my-trips' && (
                <MyTripsView
                    savedTrips={cloudStorage.data.savedTrips}
                    onLoadTrip={(trip) => {
                        tripManagement.loadTrip(trip);
                        setCurrentView('planner');
                    }}
                    onDeleteTrip={tripManagement.deleteTrip}
                />
            )}

            {/* Resources View */}
            {currentView === 'resources' && (
                <ResourcesView
                    currentUser={currentUser}
                    cloudStorage={cloudStorage}
                />
            )}

            {/* Users Management View (Admin Only) */}
            {currentView === 'users' && currentUser.role === 'admin' && (
                <UsersView currentUser={currentUser} />
            )}

            {/* Dashboard View (Admin Only) */}
            {currentView === 'dashboard' && currentUser.role === 'admin' && (
                <DashboardView />
            )}

            {/* System Settings View (Admin Only) */}
            {currentView === 'settings' && currentUser.role === 'admin' && (
                <SystemSettingsView />
            )}
        </DashboardLayout>
    );
}
