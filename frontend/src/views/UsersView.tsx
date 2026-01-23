import React from 'react';
import { User } from '../types';
import { AdminDashboard } from '../components/AdminDashboard';

interface UsersViewProps {
    currentUser: User;
}

/**
 * UsersView - User Management for Administrators
 */
export function UsersView({ currentUser }: UsersViewProps) {
    return (
        <div className="h-full w-full">
            <AdminDashboard currentUser={currentUser} onClose={() => { }} variant="page" />
        </div>
    );
}
