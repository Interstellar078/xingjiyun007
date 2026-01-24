import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User } from './types';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { useCloudStorage } from './hooks/useCloudStorage';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useTripManagement } from './hooks/useTripManagement';

// Import views
import { PlannerViewOriginal } from './views/PlannerViewOriginal';
import { MyTripsView } from './views/MyTripsView';
import { ResourcesView } from './views/ResourcesView';
import { UsersView } from './views/UsersView';
import { DashboardView } from './views/DashboardView';
import { SystemSettingsView } from './views/SystemSettingsView';

/**
 * Main App Component - Framework Only
 */
export default function App() {
    // ==================== Router Hooks ====================
    const navigate = useNavigate();
    const location = useLocation();

    // ==================== Auth State ====================
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

    // Derive current view from path (strip leading slash)
    // defaulting to 'planner' or 'dashboard' is handled by redirects
    const currentView = location.pathname.substring(1) || 'planner';

    // ==================== Hooks ====================
    const cloudStorage = useCloudStorage(currentUser);
    const tripPlanner = useTripPlanner(
        currentUser,
        cloudStorage.data.locationHistory,
        cloudStorage.actions.setLocationHistory
    );
    const tripManagement = useTripManagement(
        currentUser,
        cloudStorage.data.savedTrips,
        cloudStorage.actions.setSavedTrips,
        cloudStorage.data.publicTrips,
        cloudStorage.actions.setPublicTrips,
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
                // If at root path, redirect based on role
                if (location.pathname === '/' || location.pathname === '') {
                    if (user.role === 'admin') {
                        navigate('/dashboard', { replace: true });
                    } else {
                        navigate('/planner', { replace: true });
                    }
                }
                await cloudStorage.loadCloudData(user);
            } else {
                // Not logged in? Landing page handles it, 
                // but if we are at deeply nested path? 
                // We might want to persist it or redirect to home.
                // For now, Landing Page is shown conditionally below.
            }

            cloudStorage.setIsAppLoading(false);
        };

        checkAuth();
    }, []); // Run once on mount

    // ==================== Auth Handlers ====================
    const handleLoginSuccess = async (user: User) => {
        setCurrentUser(user);
        setShowAuthModal(false);

        // Redirect logic
        if (user.role === 'admin') {
            navigate('/dashboard');
        } else {
            navigate('/planner');
        }

        cloudStorage.setIsAppLoading(true);
        await cloudStorage.loadCloudData(user);
        cloudStorage.setIsAppLoading(false);
    };

    const handleLogout = async () => {
        await AuthService.logout();
        setCurrentUser(null);
        navigate('/');
    };

    const handleViewChange = (view: string) => {
        navigate(`/${view}`);
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
                <Routes>
                    <Route path="*" element={<LandingPage
                        onLoginClick={() => {
                            setAuthModalMode('login');
                            setShowAuthModal(true);
                        }}
                        onRegisterClick={() => {
                            setAuthModalMode('register');
                            setShowAuthModal(true);
                        }}
                    />} />
                </Routes>

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
            onViewChange={handleViewChange}
            currentUser={currentUser}
            onLogout={handleLogout}
        >
            <Routes>
                <Route path="/planner" element={
                    <PlannerViewOriginal
                        currentUser={currentUser}
                        tripPlanner={tripPlanner}
                        tripManagement={tripManagement}
                        cloudStorage={cloudStorage}
                        onViewChange={(view) => navigate(`/${view}`)}
                    />
                } />

                <Route path="/my-trips" element={
                    <MyTripsView
                        currentUser={currentUser}
                        savedTrips={cloudStorage.data.savedTrips}
                        publicTrips={cloudStorage.data.publicTrips}
                        onLoadTrip={(trip) => {
                            tripManagement.loadTrip(trip);
                            navigate('/planner');
                        }}
                        onDeleteTrip={(id, isPublic) => tripManagement.deleteTrip(id, isPublic)}
                        onPromoteTrip={(trip) => tripManagement.promoteToPublic(trip)}
                    />
                } />

                <Route path="/resources" element={
                    <ResourcesView
                        currentUser={currentUser}
                        cloudStorage={cloudStorage}
                    />
                } />

                {/* Admin Routes */}
                {currentUser.role === 'admin' && (
                    <>
                        <Route path="/users" element={<UsersView currentUser={currentUser} />} />
                        <Route path="/dashboard" element={<DashboardView />} />
                        <Route path="/settings" element={<SystemSettingsView />} />
                    </>
                )}

                {/* Default Redirect */}
                <Route path="*" element={<Navigate to={currentUser.role === 'admin' ? "/dashboard" : "/planner"} replace />} />
            </Routes>
        </DashboardLayout>
    );
}
