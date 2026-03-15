import axios from 'axios';

const token = () => localStorage.getItem('token');

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const t = token();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export type User = {
  id: string;
  email: string;
  fullName: string;
  department?: string;
  role: string;
};

export type LicenseInfo = {
  expiryDate?: string;
  startDate?: string;
  customerName?: string;
};

export type LoginRes = {
  access_token: string;
  user: User;
  license?: LicenseInfo;
};
