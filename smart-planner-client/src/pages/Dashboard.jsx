import { useEffect, useState } from 'react';
import ReminderBanner from '../components/ReminderSystem';
import { useNavigate }         from 'react-router-dom';
import { getProgress, toggleCompletion, getSchedule, getDueQuizzes } from '../api/client';
import { useToast }   from '../components/Toast';
import StatCard       from '../components/StatCard';
import ProgressBar    from '../components/ProgressBar';
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  Brain,
  Target,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '60%', height: 28, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '80%', height: 12 }} />
    </div>
  );
}

export default function Dashboard({ onStressUpdate }) {
  const [stats,     setStats]     = useState(null);
  const [subjects,  setSubjects]  = useState([]);
  const [schedule,  setSchedule]  = useState(null);
  const [dueQuizzes,setDueQuizzes]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState(null);

  const { addToast } = useToast();
  const nav           = useNavigate();

  const today    = new Date().toISOString().split('T')[0];
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const { user } = useAuth();

  const load = async () => {
    try {
      const [progressRes, scheduleRes, dueRes] = await Promise.all([
        getProgress(),
        getSchedule(),
        getDueQuizzes(),
      ]);
      setStats(progressRes.stats);
      setSubjects(progressRes.subjects);
      setSchedule(scheduleRes.schedule);
      setDueQuizzes(dueRes.quizzes || []);
      onStressUpdate?.({ level: progressRes.stats.stress_level, score: progressRes.stats.stress_score });
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleProgressUpdate = () => {
      load();
    };
    window.addEventListener('study-progress-updated', handleProgressUpdate);
    return () => window.removeEventListener('study-progress-updated', handleProgressUpdate);
  }, []);

  const handleToggle = async (sessionId) => {
    setToggling(sessionId);
    try {
      await toggleCompletion(sessionId);
      addToast('Session updated!', 'success', 2000);
      window.dispatchEvent(new CustomEvent('schedule-sync-needed'));
      await load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setToggling(null);
    }
  };

  const sortedSubjects = [...subjects].sort(
    (a, b) => new Date(a.deadline) - new Date(b.deadline)
  );

  // Get today's completion rate
  const todayTotal = stats?.today_sessions || 0;
  const todayDone = stats?.today_completed || 0;
  const todayRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // Calculate overdue tasks from schedule with date and time
  const calculateOverdueTasks = () => {
    if (!schedule?.days) return { count: 0, tasks: [] };
    
    const todayDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const overdueTasks = [];
    
    schedule.days.forEach(day => {
      // Check if date is in the past
      const isPastDate = day.date < todayDate;
      const isToday = day.date === todayDate;
      
      day.sessions.forEach(session => {
        if (!session.is_completed) {
          let isOverdue = false;
          let overdueReason = '';
          
          if (isPastDate) {
            isOverdue = true;
            overdueReason = `Due on ${day.day}, ${day.date}`;
          } else if (isToday) {
            // Check if time has passed for today
            const sessionTime = session.time;
            const [hours, minutes] = sessionTime.split(':').map(Number);
            const sessionDateTime = new Date();
            sessionDateTime.setHours(hours, minutes, 0, 0);
            
            if (now > sessionDateTime) {
              isOverdue = true;
              overdueReason = `Due today at ${sessionTime}`;
            }
          }
          
          if (isOverdue) {
            overdueTasks.push({
              id: session.id,
              subject: session.subject,
              date: day.date,
              day: day.day,
              time: session.time,
              duration: session.duration,
              priority: session.priority,
              reason: overdueReason,
            });
          }
        }
      });
    });
    
    // Sort by date (oldest first) then by time
    overdueTasks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
    
    // Group by subject for summary
    const subjectCount = {};
    overdueTasks.forEach(t => {
      subjectCount[t.subject] = (subjectCount[t.subject] || 0) + 1;
    });
    
    return { 
      count: overdueTasks.length, 
      tasks: overdueTasks,
      subjects: Object.entries(subjectCount).map(([name, count]) => ({ name, count }))
    };
  };
  
  const overdue = calculateOverdueTasks();

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page fade-up">

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, color: 'var(--text)' }}>
          {greeting}, <span style={{ color: 'var(--primary)' }}>{user?.name?.split(' ')[0] ?? 'there'}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 4 }}>
          {new Date().toLocaleDateString('en-MY', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* ── Reminders ── */}
      <ReminderBanner />

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {loading ? (
          [1,2,3,4].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={BookOpen}
              label="Subjects Enrolled"
              value={stats?.total_subjects ?? 0}
              color="#7A4B2A"
              bgColor="#EFE7DF"
            />
            <StatCard
              icon={CalendarCheck}
              label="Today's Sessions"
              value={stats?.today_sessions ?? 0}
              color="#D97706"
              bgColor="#F4E8DC"
            />
            <StatCard
              icon={CheckCircle2}
              label="Done Today"
              value={`${stats?.today_completed ?? 0}/${stats?.today_sessions ?? 0}`}
              color="#2F9E69"
              bgColor="#E4F3EA"
            />
            <StatCard
              icon={TrendingUp}
              label="Overall Progress"
              value={`${stats?.completion_rate ?? 0}%`}
              color="#8B5E3C"
              bgColor="#EFE7DF"
            />
          </>
        )}
      </div>

      {/* ── 3 Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 18 }}>

        {/* AI Advisor */}
        <div className="card" style={{ background: 'var(--primary)', border: 'none', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: 'white' }}>
              AI Advisor
            </h3>
            <button
              className="btn btn-sm"
              onClick={() => nav('/schedule')}
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              View Schedule →
            </button>
          </div>

          {loading ? (
            <>
              <div className="skeleton" style={{ height: 14, marginBottom: 8, background: 'rgba(255,255,255,0.1)' }} />
              <div className="skeleton" style={{ height: 14, marginBottom: 8, width: '80%', background: 'rgba(255,255,255,0.1)' }} />
              <div className="skeleton" style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.1)' }} />
            </>
          ) : stats?.ai_insight ? (
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}>
              {stats.ai_insight}
            </p>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                Add subjects and generate your AI-powered schedule to get personalized advice here.
              </p>
              <button
                className="btn btn-sm"
                onClick={() => nav('/subjects')}
                style={{ marginTop: 12, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                Add Subjects →
              </button>
            </div>
          )}

          {/* Wellness tips */}
          {!loading && stats?.stress_tips?.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', marginBottom: 8 }}>
                WELLNESS TIPS
              </div>
              {stats.stress_tips.slice(0, 2).map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 6, lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--accent-light)', flexShrink: 0 }}>→</span>
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>
            Upcoming Deadlines
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 50, height: 14 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 13, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedSubjects.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p>No subjects yet.{' '}
                <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => nav('/subjects')}>
                  Add one →
                </span>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedSubjects.slice(0, 5).map((s) => {
                const d   = s.days_until_deadline;
                const col = d <= 0 ? 'var(--danger)' : d <= 7 ? 'var(--warning)' : 'var(--teal)';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: col, width: 60, flexShrink: 0 }}>
                      {d <= 0 ? 'OVERDUE' : `${d}d`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.name}</div>
                      <ProgressBar value={s.completion_percentage} height={3} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {s.completion_percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Focus + Overdue Tasks */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} /> Today's Focus
          </h3>

          {loading ? (
            <div className="skeleton" style={{ height: 100 }} />
          ) : (
            <div>
              {/* Overdue Warning with detailed tasks */}
              {overdue.count > 0 && (
                <div style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: 10,
                  padding: '12px',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AlertCircle size={16} color="#C0483E" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#C0483E' }}>
                      {overdue.count} Overdue Task{overdue.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* List of overdue tasks with date and time */}
                  <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 10 }}>
                    {overdue.tasks.map(task => (
                      <div key={task.id} style={{ 
                        fontSize: 11, 
                        color: '#7F1D1D', 
                        marginBottom: 8,
                        paddingBottom: 6,
                        borderBottom: '1px solid #FECACA',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6
                      }}>
                        <Clock size={10} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <strong>{task.subject}</strong>
                          <div style={{ fontSize: 10, opacity: 0.8 }}>
                            {task.reason} • {task.duration} min
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    className="btn btn-sm"
                    onClick={() => nav('/schedule')}
                    style={{ marginTop: 5, width: '100%', background: '#C0483E', color: 'white', padding: '6px', fontSize: 11 }}
                  >
                    Catch Up Now →
                  </button>
                </div>
              )}

              {/* Today's Tasks */}
              {todayTotal === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
                  <p style={{ fontSize: 13 }}>No sessions scheduled for today.</p>
                  <p style={{ fontSize: 12, marginTop: 8 }}>Generate a schedule to see your tasks.</p>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: todayRate >= 80 ? 'var(--success)' : todayRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {todayRate}%
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Today's Completion</div>
                  </div>
                  <ProgressBar value={todayRate} height={6} color={todayRate >= 80 ? '#2F9E69' : todayRate >= 50 ? '#D97706' : '#C0483E'} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12 }}>
                    <span>✅ {todayDone} completed</span>
                    <span>📋 {todayTotal - todayDone} remaining</span>
                  </div>
                  {todayRate < 100 && todayTotal > 0 && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => nav('/schedule')}
                      style={{ marginTop: 16, width: '100%', padding: '8px', fontSize: 12 }}
                    >
                      Continue Studying →
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Spaced Repetition Due Quizzes ── */}
      {!loading && dueQuizzes.length > 0 && (
        <div className="card" style={{ marginBottom: 18, border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <RefreshCw size={18} color="var(--primary)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              Ready for Review (Spaced Repetition)
            </h3>
            <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
              {dueQuizzes.length} Due
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {dueQuizzes.map(quiz => (
              <div key={quiz.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{quiz.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Score: {quiz.best_score ?? 0}% • {quiz.num_questions} Qs</div>
                </div>
                <button
                  onClick={() => nav(`/quiz/${quiz.id}`)}
                  className="btn btn-sm"
                  style={{ background: 'var(--primary)', color: 'white' }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overall progress ── */}
      {!loading && stats?.total_sessions > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Overall Schedule Progress</h3>
            <span className="mono" style={{ fontSize: 13, color: 'var(--teal)' }}>
              {stats.completed_sessions}/{stats.total_sessions} sessions
            </span>
          </div>
          <ProgressBar value={stats.completion_rate} height={8} color="var(--teal)" />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            {stats.completion_rate >= 75 ? '🏆 Excellent progress! Keep it up!' :
             stats.completion_rate >= 40 ? '📈 Good momentum, keep going!' :
             stats.completion_rate > 0   ? '⚡ You\'re getting started!' :
             '📌 Mark sessions complete as you study.'}
          </div>
        </div>
      )}
    </div>
  );
}