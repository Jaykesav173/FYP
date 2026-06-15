import axios from 'axios';

// ── Base instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 60000,
  withCredentials: false,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      // Don't redirect for login/register — let the error show on the form
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/login') || url.includes('/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    const msg = error.response?.data?.message || error.message || 'Something went wrong.';
    return Promise.reject(new Error(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : msg));
  }
);


// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser = (data) => api.post('/register', data);
export const loginUser    = (data) => api.post('/login',    data);
export const logoutUser   = ()     => api.post('/logout');
export const getMe        = ()     => api.get('/me');

// ── Flashcards ───────────────────────────────────────────────────────────────
export const generateFlashcards = (data) => api.post(`/flashcards/generate-multi`, data, { timeout: 120000 });
export const getFlashcardSet = (id) => api.get(`/flashcards/${id}`);

// ── Subjects ──────────────────────────────────────────────────────────────────
export const getSubjects   = ()          => api.get('/subjects');
export const addSubject    = (data)      => api.post('/subjects', data);
export const updateSubject = (id, data)  => api.put(`/subjects/${id}`, data);
export const deleteSubject = (id)        => api.delete(`/subjects/${id}`);

// ── Schedule ──────────────────────────────────────────────────────────────────
export const getSchedule       = ()     => api.get('/schedule');
export const generateSchedule  = ()     => api.post('/schedule/generate', null, { timeout: 120000 });
export const exportICal = async () => {
    const res = await api.get('/schedule/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'smartplanner-schedule.ics');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

// ── Completions ───────────────────────────────────────────────────────────────
export const toggleCompletion = (id) => api.post(`/sessions/${id}/toggle`);



// ── Progress ──────────────────────────────────────────────────────────────────
export const getProgress = () => api.get('/progress');

// ── Blocked Times ─────────────────────────────────────────────────────────────
export const getBlockedTimes    = ()          => api.get('/blocked-times');
export const addBlockedTime     = (data)      => api.post('/blocked-times', data);
export const updateBlockedTime  = (id, data)  => api.put(`/blocked-times/${id}`, data);
export const deleteBlockedTime  = (id)        => api.delete(`/blocked-times/${id}`);
export const toggleBlockedTime  = (id)        => api.post(`/blocked-times/${id}/toggle`);

// ── Password Reset ────────────────────────────────────────────────────────────
export const forgotPassword = (data) => api.post('/forgot-password', data);
export const resetPassword  = (data) => api.post('/reset-password',  data);

// ── Notes ─────────────────────────────────────────────────────────────────────
export const getNotes    = (page = 1)  => api.get(`/notes?page=${page}`);
export const uploadNote  = (formData)  => api.post('/notes', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 30000,
});
export const updateNote  = (id, data)  => api.put(`/notes/${id}`, data);
export const deleteNote  = (id)        => api.delete(`/notes/${id}`);
export const summarizeNotes   = (data) => api.post('/notes/summarize', data, { timeout: 120000 });
export const summarizeYoutube = (data) => api.post('/notes/summarize-youtube', data, { timeout: 120000 });

// ── Quizzes ───────────────────────────────────────────────────────────────────
export const getQuizzes      = (page = 1)   => api.get(`/quizzes?page=${page}`);
export const getDueQuizzes   = ()           => api.get('/quizzes/due');
export const getQuiz         = (id)         => api.get(`/quizzes/${id}`);
export const deleteQuiz      = (id)         => api.delete(`/quizzes/${id}`);
export const generateQuiz    = (noteId, d)  => api.post(`/notes/${noteId}/generate-quiz`, d, { timeout: 120000 });
export const generateQuizMulti = (d)        => api.post(`/quizzes/generate-multi`, d, { timeout: 120000 });
export const submitQuizAttempt = (id, d)    => api.post(`/quizzes/${id}/attempt`, d);
export const toggleQuizSrs     = (id)         => api.post(`/quizzes/${id}/toggle-srs`);

// ── Quiz Sharing ─────────────────────────────────────────────────────────────
export const toggleQuizShare   = (id)       => api.post(`/quizzes/${id}/share`);
export const getPublicQuiz     = (token)    => api.get(`/public/quizzes/${token}`);
export const attemptPublicQuiz = (token, d) => api.post(`/public/quizzes/${token}/attempt`, d);

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile        = ()     => api.get('/profile');
export const updateProfileInfo = (data) => api.put('/profile/info', data);
export const updatePassword    = (data) => api.put('/profile/password', data);
export const deleteAccount     = (data) => api.delete('/profile', { data });

export const getStressHistory = () => api.get('/stress/history');
export const logMindsetStress = (data) => api.post('/stress', data);

