
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './context/AuthContext';
import { ToastProvider }   from './components/Toast';
import ProtectedRoute      from './components/ProtectedRoute';
import ErrorBoundary       from './components/ErrorBoundary';
import Layout              from './components/Layout';
import Login               from './pages/Login';
import Dashboard           from './pages/Dashboard';
import Subjects            from './pages/Subjects';
import Schedule            from './pages/Schedule';
import Progress            from './pages/Progress';
import ResetPassword from './pages/ResetPassword';
import BlockedTimes from './pages/BlockedTimes';
import Profile from './pages/Profile';
import Notes      from './pages/Notes';
import QuizPlayer from './pages/QuizPlayer';
import FlashcardPlayer from './pages/FlashcardPlayer';
import PublicQuizPlayer from './pages/PublicQuizPlayer';

import { PomodoroProvider } from './context/PomodoroContext';
import PomodoroWidget from './components/PomodoroWidget';

export default function App() {


  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <PomodoroProvider>
            <BrowserRouter>
              <PomodoroWidget />
              <Routes>

            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/public/quiz/:token" element={<PublicQuizPlayer />} />

            {/* Protected */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }/>
            <Route path="/subjects" element={
              <ProtectedRoute>
                <Layout>
                  <Subjects />
                </Layout>
              </ProtectedRoute>
            }/>
            <Route path="/schedule" element={
              <ProtectedRoute>
                <Layout>
                  <Schedule />
                </Layout>
              </ProtectedRoute>
            }/>
            <Route path="/progress" element={
              <ProtectedRoute>
                <Layout>
                  <Progress />
                </Layout>
              </ProtectedRoute>
            }/>
            <Route
              path="/blocked-times"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BlockedTimes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/notes" element={
            <ProtectedRoute>
              <Layout><Notes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/quiz/:id" element={
            <ProtectedRoute>
              <Layout><QuizPlayer /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/flashcards/:id" element={
            <ProtectedRoute>
              <Layout><FlashcardPlayer /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
  <ProtectedRoute>
    <Layout><Profile /></Layout>
  </ProtectedRoute>
} />
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        </PomodoroProvider>
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}