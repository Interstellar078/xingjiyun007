import { PoiCountry, PoiCity, PoiSpot, PoiHotel, PoiActivity, CarCostEntry } from '../types';
import { getAuthToken } from './apiClient';

const API_BASE = '/api/resources';

// Generic Fetcher
const fetchJson = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
};

export const resourceApi = {
    // Countries
    listCountries: (params: { search?: string; page?: number; size?: number } = {}) => {
        const q = new URLSearchParams();
        if (params.search) q.set('search', params.search);
        q.set('page', (params.page || 1).toString());
        q.set('size', (params.size || 100).toString());
        return fetchJson(`${API_BASE}/countries?${q.toString()}`);
    },
    createCountry: (data: Partial<PoiCountry>) => fetchJson(`${API_BASE}/countries`, { method: 'POST', body: JSON.stringify(data) }),
    updateCountry: (id: string, data: Partial<PoiCountry>) => fetchJson(`${API_BASE}/countries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCountry: (id: string) => fetchJson(`${API_BASE}/countries/${id}`, { method: 'DELETE' }),

    // Cities
    listCities: (params: { country?: string; search?: string; page?: number; size?: number }) => {
        const q = new URLSearchParams();
        if (params.country) q.set('country', params.country);
        if (params.search) q.set('search', params.search);
        q.set('page', (params.page || 1).toString());
        q.set('size', (params.size || 100).toString());
        return fetchJson(`${API_BASE}/cities?${q.toString()}`);
    },
    createCity: (data: Partial<PoiCity>) => fetchJson(`${API_BASE}/cities`, { method: 'POST', body: JSON.stringify(data) }),
    updateCity: (id: string, name: string) => fetchJson(`${API_BASE}/cities?${new URLSearchParams({ id: id })}`, { method: 'PUT', body: JSON.stringify({ name }) }), // Wait, RESTful URL is /cities/{id}
    // WRONG URL above. Fixing.
    deleteCity: (id: string) => fetchJson(`${API_BASE}/cities/${id}`, { method: 'DELETE' }),


    // RESTful Fixed
    updateCityReal: (id: string, data: Partial<PoiCity>) => fetchJson(`${API_BASE}/cities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),


    // Spots
    listSpots: (params: { city_id?: string; city_name?: string[]; search?: string; page?: number; size?: number }) => {
        const q = new URLSearchParams();
        if (params.city_id) q.set('city_id', params.city_id);
        if (params.city_name) params.city_name.forEach(n => q.append('city_name', n));
        if (params.search) q.set('search', params.search);
        q.set('page', (params.page || 1).toString());
        q.set('size', (params.size || 20).toString());
        return fetchJson(`${API_BASE}/spots?${q.toString()}`);
    },
    createSpot: (data: Partial<PoiSpot>) => fetchJson(`${API_BASE}/spots`, { method: 'POST', body: JSON.stringify(data) }),
    updateSpot: (id: string, data: Partial<PoiSpot>) => fetchJson(`${API_BASE}/spots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSpot: (id: string) => fetchJson(`${API_BASE}/spots/${id}`, { method: 'DELETE' }),

    // Hotels
    listHotels: (params: { city_id?: string; city_name?: string[]; search?: string; page?: number; size?: number }) => {
        const q = new URLSearchParams();
        if (params.city_id) q.set('city_id', params.city_id);
        if (params.city_name) params.city_name.forEach(n => q.append('city_name', n));
        if (params.search) q.set('search', params.search);
        q.set('page', (params.page || 1).toString());
        q.set('size', (params.size || 50).toString()); // Hotels need larger page for grouping?
        return fetchJson(`${API_BASE}/hotels?${q.toString()}`);
    },
    createHotel: (data: Partial<PoiHotel>) => fetchJson(`${API_BASE}/hotels`, { method: 'POST', body: JSON.stringify(data) }),
    updateHotel: (id: string, data: Partial<PoiHotel>) => fetchJson(`${API_BASE}/hotels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteHotel: (id: string) => fetchJson(`${API_BASE}/hotels/${id}`, { method: 'DELETE' }),

    // Activities
    listActivities: (params: { city_id?: string; city_name?: string[]; search?: string; page?: number; size?: number }) => {
        const q = new URLSearchParams();
        if (params.city_id) q.set('city_id', params.city_id);
        if (params.city_name) params.city_name.forEach(n => q.append('city_name', n));
        if (params.search) q.set('search', params.search);
        q.set('page', (params.page || 1).toString());
        q.set('size', (params.size || 20).toString());
        return fetchJson(`${API_BASE}/activities?${q.toString()}`);
    },
    createActivity: (data: Partial<PoiActivity>) => fetchJson(`${API_BASE}/activities`, { method: 'POST', body: JSON.stringify(data) }),
    updateActivity: (id: string, data: Partial<PoiActivity>) => fetchJson(`${API_BASE}/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteActivity: (id: string) => fetchJson(`${API_BASE}/activities/${id}`, { method: 'DELETE' }),

    // Transports
    listTransports: (params: { region?: string; search?: string; page?: number; size?: number }) => {
        const q = new URLSearchParams();
        if (params.region) q.set('region', params.region);
        if (params.search) q.set('search', params.search);
        q.set('page', (params.page || 1).toString());
        q.set('size', (params.size || 50).toString());
        return fetchJson(`${API_BASE}/transports?${q.toString()}`);
    },
    createTransport: (data: Partial<CarCostEntry>) => fetchJson(`${API_BASE}/transports`, { method: 'POST', body: JSON.stringify(data) }),
    updateTransport: (id: string, data: Partial<CarCostEntry>) => fetchJson(`${API_BASE}/transports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTransport: (id: string) => fetchJson(`${API_BASE}/transports/${id}`, { method: 'DELETE' }),
};
