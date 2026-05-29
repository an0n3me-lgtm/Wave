import axios from 'axios';

// On Capacitor/Android, localhost:3001 won't work.
// Read server URL from localStorage if set, otherwise fall back to env var.
function getBaseURL() {
  const stored = localStorage.getItem('wave_server_url');
  if (stored) return stored;
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
}

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 10000,
});

// Re-read the base URL on every request so settings changes take effect
api.interceptors.request.use((config) => {
  config.baseURL = getBaseURL();
  const token = localStorage.getItem('wave_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wave_token');
      localStorage.removeItem('wave_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
