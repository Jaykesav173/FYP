import axios from 'axios';

// ── Base instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  timeout: 60000,
});

// ── Attach token to every request automatically ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Handle responses + errors ─────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If 401 Unauthorized — token expired or invalid → force logout
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    return Promise.reject(new Error(
      typeof message === 'object'
        ? Object.values(message).flat().join(' ')
        : message
    ));
  }
);

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
export const registerUser = (data) => api.post('/register', data);
export const loginUser    = (data) => api.post('/login', data);
export const logoutUser   = ()     => api.post('/logout');
export const getMe        = ()     => api.get('/me');

// ════════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ════════════════════════════════════════════════════════════════════════════
export const getSubjects   = ()     => api.get('/subjects');
export const addSubject    = (data) => api.post('/subjects', data);
export const deleteSubject = (id)   => api.delete(`/subjects/${id}`);

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULE
// ════════════════════════════════════════════════════════════════════════════
export const getSchedule      = () => api.get('/schedule');
export const generateSchedule = () => api.post('/schedule/generate');

// ════════════════════════════════════════════════════════════════════════════
// COMPLETIONS
// ════════════════════════════════════════════════════════════════════════════
export const toggleCompletion = (sessionId) =>
  api.post(`/sessions/${sessionId}/toggle`);

// ════════════════════════════════════════════════════════════════════════════
// PROGRESS
// ════════════════════════════════════════════════════════════════════════════
export const getProgress = () => api.get('/progress');

