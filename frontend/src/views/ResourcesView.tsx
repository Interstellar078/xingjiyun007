import React from 'react';
import { User } from '../types';
import { ResourceDatabase } from '../components/ResourceDatabase';
import { CloudStorageData, CloudStorageActions } from '../hooks/useCloudStorage';

interface ResourcesViewProps {
    currentUser: User;
    cloudStorage: {
        data: CloudStorageData;
        actions: CloudStorageActions;
    };
}

/**
 * ResourcesView - Manage POI resources
 */
export function ResourcesView({ currentUser, cloudStorage }: ResourcesViewProps) {
    const { data, actions } = cloudStorage;

    return (
        <div className="h-full w-full">
            <ResourceDatabase
                isOpen={true}
                variant="page"
                onClose={() => { }}
                carDB={data.carDB}
                onUpdateCarDB={actions.setCarDB}
                poiCities={data.poiCities}
                onUpdatePoiCities={actions.setPoiCities}
                poiSpots={data.poiSpots}
                onUpdatePoiSpots={actions.setPoiSpots}
                poiHotels={data.poiHotels}
                onUpdatePoiHotels={actions.setPoiHotels}
                poiActivities={data.poiActivities}
                onUpdatePoiActivities={actions.setPoiActivities}
                countryFiles={data.countryFiles}
                onUpdateCountryFiles={actions.setCountryFiles}
                isReadOnly={currentUser.role !== 'admin'}
            />
        </div>
    );
}
