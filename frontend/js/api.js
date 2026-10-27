/**
 * FlowLock Centralized API Client Module
 * Authoritative connection to Express & MongoDB backend
 */

import { ENV, envReady } from '../env.js';

// Configurable API Base URL (driven by frontend/.env via env.js or runtime overrides)
const resolveBaseUrl = () => {
  // 1. Check window-level overrides (injected scripts or tests)
  if (typeof window !== 'undefined') {
    if (window.FLOWLOCK_API_URL) return window.FLOWLOCK_API_URL.replace(/\/+$/, '');
    if (window.__ENV__?.API_BASE_URL) return window.__ENV__.API_BASE_URL.replace(/\/+$/, '');

    // 2. Check localStorage override (allows dynamic testing without rebuilding)
    const stored = localStorage.getItem('flowlock_api_url');
    if (stored) return stored.replace(/\/+$/, '');
  }

  // 3. Environment configuration from frontend/.env via env.js
  if (ENV?.API_BASE_URL) {
    return ENV.API_BASE_URL.replace(/\/+$/, '');
  }

  // 4. Default fallback for local development
  return 'http://localhost:5000/api';
};

export let API_BASE_URL = resolveBaseUrl();

// Automatically update API_BASE_URL once frontend/.env finishes loading
if (envReady) {
  envReady.then(() => {
    API_BASE_URL = resolveBaseUrl();
  });
}

/**
 * Low-level HTTP request dispatcher with error normalization
 */
async function apiRequest(endpoint, options = {}) {
  if (envReady) {
    try {
      await envReady;
    } catch (_) {}
  }
  const currentBaseUrl = resolveBaseUrl();
  const url = `${currentBaseUrl}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Automatically attach authenticated JWT Bearer token if present
  if (typeof window !== 'undefined') {
    try {
      const rawSession = sessionStorage.getItem('flowlock_session_user') || localStorage.getItem('flowlock_session_user');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session?.token && !options?.headers?.['Authorization'] && !options?.headers?.['authorization']) {
          defaultHeaders['Authorization'] = `Bearer ${session.token}`;
        }
      }
    } catch (_) {}
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    console.error('[API Network Error]', networkError);
    const error = new Error(`Cannot connect to FlowLock backend at ${currentBaseUrl}. Ensure the backend service is running and CORS is permitted.`);
    error.isNetworkError = true;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error(`Invalid JSON response from server (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Health API
export const checkHealth = async () => {
  return apiRequest('/health', { method: 'GET' });
};

// Tasks API
export const getTasksAPI = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.filterStatus && filters.filterStatus !== 'all') params.append('status', filters.filterStatus);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/tasks${query}`, { method: 'GET' });
};

export const getTaskByIdAPI = async (id) => {
  return apiRequest(`/tasks/${encodeURIComponent(id)}`, { method: 'GET' });
};

export const createTaskAPI = async (taskData) => {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
};

export const updateTaskAPI = async (id, fields) => {
  return apiRequest(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields)
  });
};

export const deleteTaskAPI = async (id, force = false) => {
  const query = force ? '?force=true' : '';
  return apiRequest(`/tasks/${encodeURIComponent(id)}${query}`, {
    method: 'DELETE'
  });
};

export const resetDemoTasksAPI = async () => {
  return apiRequest('/tasks/reset-demo', {
    method: 'POST'
  });
};

export const importTasksAPI = async (tasks) => {
  return apiRequest('/tasks/import', {
    method: 'POST',
    body: JSON.stringify({ tasks })
  });
};

// Activity API
export const getActivityAPI = async (limit = 50) => {
  return apiRequest(`/activity?limit=${limit}`, { method: 'GET' });
};

export const logActivityAPI = async (text, type = 'info') => {
  return apiRequest('/activity', {
    method: 'POST',
    body: JSON.stringify({ text, type })
  });
};

export const clearActivityAPI = async () => {
  return apiRequest('/activity', { method: 'DELETE' });
};

// Authentication API
export const signupAPI = async (userData) => {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const loginAPI = async (credentials) => {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

export const getMeAPI = async (token) => {
  return apiRequest('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const updateProfileAPI = async (profileData, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return apiRequest('/auth/profile', {
    method: 'PUT',
    headers,
    body: JSON.stringify(profileData)
  });
};

export const changePasswordAPI = async (passwordData, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return apiRequest('/auth/password', {
    method: 'PUT',
    headers,
    body: JSON.stringify(passwordData)
  });
};
