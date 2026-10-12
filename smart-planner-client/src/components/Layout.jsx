import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Clock,
  BarChart3,
  LogOut,
  UserCircle,
  BrainCircuit,
  FileText,
  Moon,
  Sun,
  Menu,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/subjects',      icon: BookOpen,        label: 'My Subjects' },
  { to: '/blocked-times', icon: Clock,           label: 'Blocked Times' },
  { to: '/schedule',      icon: CalendarDays,    label: 'Study Schedule' },
  { to: '/progress',      icon: BarChart3,       label: 'Progress' },
  { to: '/notes',         icon: FileText,        label: 'Notes & Quizzes' },
  { to: '/profile', icon: UserCircle, label: 'Profile & Settings' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav              = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [window.location.pathname]);

  const handleLogout = async () => {
    await logout();
    nav('/login');
  };



  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/* ── Mobile Overlay ── */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: 'var(--sidebar-w)',
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>

        {/* ── Brand ── */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BrainCircuit size={20} color="var(--accent-light)" strokeWidth={1.8} />
          </div>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18, fontWeight: 700,
              color: 'white', letterSpacing: '-0.3px', lineHeight: 1.1,
            }}>
              Smart<span style={{ color: 'var(--accent-light)' }}>Planner</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: '1.5px' }}>
              ADAPTIVE AI
            </div>
          </div>
        </div>

        {/* ── User info ── */}
        {user && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
            }}>
              {/* Avatar circle */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.48)',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                textDecoration: 'none', transition: 'all 0.15s',
                borderLeft: isActive ? '3px solid var(--accent-light)' : '3px solid transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{ flexShrink: 0 }}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>



        {/* ── Actions ── */}
        <div style={{ padding: '8px 10px 14px' }}>
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 500,
              border: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s', cursor: 'pointer',
              marginBottom: 4,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12, fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s', cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            }}
          >
            <LogOut size={14} strokeWidth={1.8} />
            Sign Out
          </button>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 8, paddingLeft: 4 }}>
            B032410882 · Jaykesav
          </div>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Mobile Header */}
        <div className="mobile-header" style={{
          display: 'none', padding: '16px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrainCircuit size={20} color="var(--primary)" />
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'var(--primary)', fontSize: 18 }}>SmartPlanner</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', display: 'flex' }}>
            <Menu size={24} />
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}