import axios from 'axios';

// Base URL of the deployed LavaLust API (no trailing slash)
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

// ---- token storage ----
export const tokens = {
  get access() { return localStorage.getItem('access_token'); },
  get refresh() { return localStorage.getItem('refresh_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  },
  save({ access_token, refresh_token, user }) {
    if (access_token) localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

export const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach "Authorization: Bearer <token>" to every request
http.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

// If the access token expired (401), try ONE refresh, then retry the request
let refreshing = null;
http.interceptors.response.use(
  (res) => {
    // LavaLust error pages come back as HTML with status 200 — treat them as errors
    if (typeof res.data === 'string') {
      const err = new Error('Non-JSON response from API');
      err.response = { ...res, data: { error: 'Server error. Check DevTools > Network > Response for the PHP error.' } };
      return Promise.reject(err);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/api/auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthCall && tokens.refresh) {
      original._retry = true;
      try {
        refreshing ??= axios
          .post(`${API_URL}/api/auth/refresh`, { refresh_token: tokens.refresh })
          .finally(() => { refreshing = null; });
        const { data } = await refreshing;
        tokens.save(data.tokens || data);
        original.headers.Authorization = `Bearer ${tokens.access}`;
        return http(original);
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event('auth:logout'));
      }
    } else if (error.response?.status === 401 && !isAuthCall) {
      tokens.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// Turn any API error into a readable message
export function errorMessage(err, fallback = 'Something went wrong.') {
  if (!err.response) return 'Cannot reach the API. Check VITE_API_URL and that the server is running.';
  return err.response.data?.error || err.response.data?.message || fallback;
}

// ---- endpoints ----
export const authApi = {
  login: (username, password) => http.post('/api/auth/login', { username, password }),
  register: (payload) => http.post('/api/auth/register', payload),
  logout: () => http.post('/api/auth/logout', { refresh_token: tokens.refresh }),
};

export const productApi = {
  list: () => http.get('/api/products'),
  create: (p) => http.post('/api/products', p),
  update: (id, p) => http.put(`/api/products/${id}`, p),
  remove: (id) => http.delete(`/api/products/${id}`),
};
