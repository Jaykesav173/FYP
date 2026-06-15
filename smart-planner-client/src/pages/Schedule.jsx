import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSchedule, toggleCompletion, generateSchedule, getProgress, exportICal, getProfile } from '../api/client';
import { useToast } from '../components/Toast';
import ScheduleDay from '../components/ScheduleDay';
import { exportSchedulePDF } from '../utils/exportPDF';

const GEN_STEPS = [
  '🔍 Analyzing your subjects and deadlines…',
  '🧠 Running adaptive ML model…',
  '📅 Building your 7-day schedule…',
  '💡 Generating personalized insights…',
  '✨ Almost ready…',
];

// Function to calculate stress from schedule data
const calculateStressFromSchedule = (scheduleData) => {
  if (!scheduleData || !scheduleData.days) return { score: 0, level: 'low' };

  // Get all sessions across all days
  const allSessions = scheduleData.days.flatMap(day => day.sessions);
  const total = allSessions.length;

  if (total === 0) return { score: 0, level: 'low' };

  const completed = allSessions.filter(s => s.is_completed).length;
  const incomplete = total - completed;

  // Stress = percentage of tasks NOT completed
  const stressScore = Math.round((incomplete / total) * 100);

  // Determine stress level
  let stressLevel = 'low';
  if (stressScore <= 35) stressLevel = 'low';
  else if (stressScore <= 60) stressLevel = 'moderate';
  else if (stressScore <= 80) stressLevel = 'high';
  else stressLevel = 'critical';

  return { score: stressScore, level: stressLevel };
};

export default function Schedule({ onStressUpdate }) {
  const [schedule, setSchedule] = useState(null);
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [genStep, setGenStep] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { addToast } = useToast();
  const nav = useNavigate();

  const load = async () => {
    try {
      const [scheduleRes, progressRes, profileRes] = await Promise.all([
        getSchedule(),
        getProgress(),
        getProfile(),
      ]);
      setSchedule(scheduleRes.schedule);
      setStats(progressRes.stats);
      setSubjects(progressRes.subjects);
      setProfile(profileRes.user);

      // Calculate and update stress from schedule
      if (scheduleRes.schedule) {
        const stress = calculateStressFromSchedule(scheduleRes.schedule);
        onStressUpdate?.({ level: stress.level, score: stress.score });
      }
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handleProgressUpdate = () => {
      load();
    };
    window.addEventListener('study-progress-updated', handleProgressUpdate);
    return () => window.removeEventListener('study-progress-updated', handleProgressUpdate);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    let i = 0;
    setGenStep(GEN_STEPS[0]);
    const interval = setInterval(() => {
      i = (i + 1) % GEN_STEPS.length;
      setGenStep(GEN_STEPS[i]);
    }, 3500);

    try {
      const [res, progressRes] = await Promise.all([
        generateSchedule(),
        getProgress(),
      ]);
      setSchedule(res.schedule);
      setStats(progressRes.stats);
      setSubjects(progressRes.subjects);

      // Calculate and update stress
      const stress = calculateStressFromSchedule(res.schedule);
      onStressUpdate?.({ level: stress.level, score: stress.score });

      addToast('Schedule generated successfully! 🎉', 'success', 5000);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      clearInterval(interval);
      setGenerating(false);
      setGenStep('');
    }
  };

  const handleToggle = async (sessionId) => {
    setToggling(sessionId);
    
    if (!schedule) return;
    
    let isCurrentlyCompleted = false;

    // Optimistically update
    const updatedSchedule = {
      ...schedule,
      days: schedule.days.map(day => ({
        ...day,
        sessions: day.sessions.map(session => {
          if (session.id === sessionId) {
            isCurrentlyCompleted = session.is_completed;
            return { ...session, is_completed: !session.is_completed };
          }
          return session;
        }),
      })),
    };

    const stress = calculateStressFromSchedule(updatedSchedule);
    onStressUpdate?.({ level: stress.level, score: stress.score });
    setSchedule(updatedSchedule);

    try {
      const res = await toggleCompletion(sessionId);
      addToast(
        res.is_completed ? '✓ Session marked complete!' : 'Session unmarked.',
        res.is_completed ? 'success' : 'info',
        2000
      );
      window.dispatchEvent(new CustomEvent('schedule-sync-needed'));
    } catch (e) {
      addToast(e.message, 'error');
      
      // Revert on failure
      const revertedSchedule = {
        ...updatedSchedule,
        days: updatedSchedule.days.map(day => ({
          ...day,
          sessions: day.sessions.map(session => 
            session.id === sessionId ? { ...session, is_completed: isCurrentlyCompleted } : session
          ),
        })),
      };
      const revertedStress = calculateStressFromSchedule(revertedSchedule);
      onStressUpdate?.({ level: revertedStress.level, score: revertedStress.score });
      setSchedule(revertedSchedule);
    } finally {
      setToggling(null);
    }
  };

  const handleDownloadICal = async () => {
    setDownloading(true);
    try {
      const response = await exportICal();
      const blob = new Blob([response.data], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'smartplanner-schedule.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('iCal calendar downloaded! 📅', 'success', 3000);
    } catch (e) {
      addToast('Download failed: ' + e.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page fade-up">
      {/* AI Generation Overlay */}
      {generating && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(62,31,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, backdropFilter: 'blur(6px)',
        }}>
          <div style={{ textAlign: 'center', color: 'white', padding: 40, maxWidth: 380 }}>
            <div style={{ fontSize: 56, marginBottom: 20, animation: 'pulse 1.4s ease infinite' }}>🧠</div>
            <h2 style={{ color: 'white', marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>
              Generating Your Plan
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              {genStep}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--accent-light)',
                  animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <div style={{ marginTop: 28, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                animation: 'shimmer 2s ease infinite',
                backgroundSize: '200% 100%',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>7-Day Study Schedule</h1>
          {schedule?.summary && <p>{schedule.summary}</p>}
          {schedule?.generated_at && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Generated: {schedule.generated_at}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {schedule && (
            <button
              className="btn btn-accent"
              onClick={() => exportSchedulePDF(schedule, stats, subjects)}
              title="Download as PDF"
              style={{
                background: '#b91c1c',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ef4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#b91c1c';
              }}
            >
              📄 Export PDF
            </button>
          )}
          {schedule && (
            <button
              className="btn"
              onClick={() => setShowSyncModal(true)}
              title="Download iCal for Google Calendar/Apple Calendar"
              style={{
                background: '#4285F4',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#3367D6'}
              onMouseLeave={e => e.currentTarget.style.background = '#4285F4'}
            >
              📅 Calendar Sync
            </button>
          )}
          <button
            className="btn btn-accent"
            onClick={handleGenerate}
            disabled={generating || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: generating || loading ? 'not-allowed' : 'pointer',
              opacity: generating || loading ? 0.7 : 1,
            }}
          >
            {generating
              ? <><span className="spinner" /> Generating…</>
              : schedule ? '⟳ Regenerate Plan' : '✦ Generate Plan'}
          </button>
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="skeleton" style={{ height: 44, borderRadius: 0 }} />
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="skeleton" style={{ height: 13 }} />
                <div className="skeleton" style={{ height: 13, width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !schedule && !generating && (
        <div className="empty-state">
          <div className="icon">🗓</div>
          <h3>No schedule yet</h3>
          <p style={{ marginBottom: 20 }}>
            Click "Generate Plan" to create your AI-powered study schedule.
          </p>
          <button className="btn btn-primary" onClick={() => nav('/subjects')}>
            Add Subjects First
          </button>
        </div>
      )}

      {/* Schedule days */}
      {!loading && schedule && schedule.days && schedule.days.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedule.days.map((day, idx) => (
            <ScheduleDay
              key={idx}
              day={day}
              onToggle={handleToggle}
              loadingId={toggling}
            />
          ))}
        </div>
      )}

      {/* Empty schedule days state */}
      {!loading && schedule && (!schedule.days || schedule.days.length === 0) && !generating && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="icon">⚠️</div>
          <h3>Plan Empty</h3>
          <p style={{ marginBottom: 20 }}>
            The AI generated a schedule, but it seems there were no valid study sessions matched with your subjects. Try regenerating.
          </p>
        </div>
      )}

      {/* Calendar sync modal */}
      <CalendarSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        profile={profile}
        onDownload={handleDownloadICal}
        downloading={downloading}
      />
    </div>
  );
}

// ── CALENDAR SYNC MODAL COMPONENT ──────────────────────────────────────────
function CalendarSyncModal({ isOpen, onClose, profile, onDownload, downloading }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('download'); // 'download' or 'sync'

  if (!isOpen) return null;

  const syncUrl = profile?.email_hash 
    ? `${window.location.protocol}//${window.location.host}/api/public/schedule/export/${profile.email_hash}` 
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div className="card fade-up" style={{
        width: '100%', maxWidth: 460, background: 'var(--card)',
        border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)', padding: 0
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
            📅 Calendar Integration
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1
          }}>&times;</button>
        </div>

        {/* Content Container */}
        <div style={{ padding: 24 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            marginBottom: 20, gap: 12
          }}>
            <button 
              onClick={() => setActiveTab('download')}
              style={{
                background: 'none', border: 'none', 
                padding: '8px 12px 12px 12px', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: activeTab === 'download' ? 'var(--accent)' : 'var(--muted)',
                borderBottom: activeTab === 'download' ? '2px solid var(--accent)' : 'none'
              }}
            >
              📥 Manual Download
            </button>
            <button 
              onClick={() => setActiveTab('sync')}
              style={{
                background: 'none', border: 'none', 
                padding: '8px 12px 12px 12px', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: activeTab === 'sync' ? 'var(--accent)' : 'var(--muted)',
                borderBottom: activeTab === 'sync' ? '2px solid var(--accent)' : 'none'
              }}
            >
              🔄 Live Auto-Sync Feed
            </button>
          </div>

          {activeTab === 'download' ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Download a standard `.ics` snapshot of your current study schedule to manually import it into Google Calendar, Apple Calendar, or Microsoft Outlook.
              </p>
              <button 
                onClick={onDownload}
                disabled={downloading}
                className="btn btn-accent"
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  fontWeight: 600, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8
                }}
              >
                {downloading ? 'Downloading...' : '📥 Download .ics Calendar File'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
                Subscribe to your schedule directly in your calendar app. Any changes you make on SmartPlanner will automatically update on your calendar feed in real-time!
              </p>

              {/* Feed URL Field */}
              <div style={{
                display: 'flex', gap: 8, background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', alignItems: 'center', marginBottom: 20
              }}>
                <input 
                  type="text" 
                  readOnly 
                  value={syncUrl} 
                  style={{
                    flex: 1, background: 'none', border: 'none',
                    fontSize: 12, color: 'var(--text)', outline: 'none',
                    textOverflow: 'ellipsis'
                  }}
                />
                <button 
                  onClick={handleCopy}
                  style={{
                    background: copied ? '#22c55e' : 'var(--accent)',
                    color: 'white', border: 'none', borderRadius: 6,
                    padding: '6px 12px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                  }}
                >
                  {copied ? 'Copied! ✓' : 'Copy URL'}
                </button>
              </div>

              {/* Instructions */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)',
                borderRadius: 8, padding: 14
              }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
                  How to setup:
                </h4>
                <ol style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 16, margin: 0, lineHeight: 1.6 }}>
                  <li>Open <strong>Google Calendar</strong> on your desktop browser.</li>
                  <li>In the left sidebar, click the <strong>+</strong> icon next to "Other calendars".</li>
                  <li>Select <strong>From URL</strong> and paste the copied feed URL above.</li>
                  <li>Click <strong>Add calendar</strong> to subscribe!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}