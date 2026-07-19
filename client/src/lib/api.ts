import axios from 'axios';

export const API_URL = '';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30001,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const apiKey = localStorage.getItem('api_key');
    if (apiKey) config.headers['X-API-Key'] = apiKey;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Let individual pages/components decide whether to redirect.
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; statusCode: number };
}

export interface PaginatedResponse<T> {
  videos: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default api;
