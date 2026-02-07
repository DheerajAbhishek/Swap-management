import axios from 'axios';

// API base URL from environment
const API_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('supply_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('supply_user');
            localStorage.removeItem('supply_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
