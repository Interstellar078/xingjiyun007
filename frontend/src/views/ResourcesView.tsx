import React from 'react';
import { User } from '../types';
import { ResourceDatabase } from '../components/ResourceDatabase';

interface ResourcesViewProps {
    currentUser: User;
    // cloudStorage not needed anymore for this view, but might be passed from App.tsx
    // We keep the prop definition compatible with App.tsx but ignore it.
    cloudStorage: any;
}

/**
 * ResourcesView - Manage POI resources with Pagination
 */
export function ResourcesView({ currentUser }: ResourcesViewProps) {
    return (
        <div className="h-full w-full">
            <ResourceDatabase
                isOpen={true}
                variant="page"
                onClose={() => { }}
                isAdmin={currentUser.role === 'admin'}
                isReadOnly={false}
            />
        </div>
    );
}

