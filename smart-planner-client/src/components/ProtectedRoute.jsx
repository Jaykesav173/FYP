import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();

  // Still checking localStorage token — show nothing briefly
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <div
            className="spinner"
            style={{
              borderTopColor: 'var(--teal)',
              borderColor: 'var(--light)',
              width: 28, height: 28, borderWidth: 3,
            }}
          />
          <p style={{ marginTop: 12, fontSize: 13 }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}