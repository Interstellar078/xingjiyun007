const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'travel_builder_auth_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const buildHeaders = (headers?: HeadersInit): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {})
  };
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers)
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const payload = await res.json();
      if (payload?.detail) message = payload.detail;
    } catch {
      // ignore
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
};

export const apiGet = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
export const apiPut = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  });
export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });
