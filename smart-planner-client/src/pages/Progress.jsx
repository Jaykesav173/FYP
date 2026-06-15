import { useEffect, useState } from 'react';
import { getProgress, getSchedule }   from '../api/client';
import { useToast }      from '../components/Toast';
import StressCard        from '../components/StressCard';
import ProgressBar       from '../components/ProgressBar';
import StudyHoursChart   from '../components/StudyHoursChart';
import CompletionTrendChart from '../components/CompletionTrendChart';
import SubjectComparisonChart from '../components/SubjectComparisonChart';

const DIFF_COLORS = { 1:'#3D9B6A', 2:'#7AB84A', 3:'#C97D1A', 4:'#E06020', 5:'#C0483E' };
const DIFF_LABELS = { 1:'Easy',    2:'Moderate', 3:'Medium', 4:'Hard',    5:'Expert'   };

export default function Progress() {
  const [stats,    setStats]    = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [progressRes, scheduleRes] = await Promise.all([
          getProgress(),
          getSchedule(),
        ]);
        setStats(progressRes.stats);
        setSubjects(progressRes.subjects);
        setSchedule(scheduleRes.schedule);
      } catch (e) {
        addToast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rate = stats?.completion_rate ?? 0;

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1>Progress & Analytics</h1>
          <p>ML-powered insights into your study performance and stress patterns.</p>
        </div>
      </div>

      {/* ── Top row skeleton ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 90, height: 90, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 30, width: '50%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 13, width: '70%' }} />
            </div>
          </div>
          <div className="card">
            <div className="skeleton" style={{ height: 13, width: '40%', marginBottom: 14 }} />
            <div className="skeleton" style={{ height: 30, width: '30%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 13 }} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>

          {/* Completion ring */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="45" cy="45" r="36" fill="none" stroke="var(--light)"  strokeWidth="8" />
                <circle cx="45" cy="45" r="36" fill="none" stroke="var(--teal)"   strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - rate / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                />
              </svg>
              <div className="mono" style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: 'var(--primary)',
              }}>
                {rate}%
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>
                {stats?.completed_sessions ?? 0}
                <span style={{ fontSize: 16, color: 'var(--muted)' }}>/{stats?.total_sessions ?? 0}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Sessions Completed</div>
              <div style={{
                fontSize: 12, marginTop: 10, fontWeight: 600,
                color: rate >= 75 ? 'var(--success)' : rate >= 40 ? 'var(--warning)' : 'var(--accent)',
              }}>
                {rate >= 75 ? '🏆 Excellent work!' :
                 rate >= 40 ? '📈 Good progress'  :
                 rate > 0   ? '⚡ Keep pushing!'  : '🚀 Get started!'}
              </div>
            </div>
          </div>

          {/* Stress card */}
          <StressCard
            level={stats?.stress_level}
            score={stats?.stress_score}
            message={stats?.stress_message}
            tips={stats?.stress_tips}
          />
        </div>
      )}

      {/* ── Analytics Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <StudyHoursChart stats={stats} schedule={schedule} loading={loading} />
        <CompletionTrendChart schedule={schedule} loading={loading} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <SubjectComparisonChart subjects={subjects} loading={loading} />
      </div>

      {/* ── Per-subject breakdown ── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          Per-Subject Progress & AI Time Predictions
        </h3>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1,2,3].map((i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '30%' }} />
                  <div className="skeleton" style={{ height: 14, width: '20%' }} />
                </div>
                <div className="skeleton" style={{ height: 6 }} />
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No subjects added yet.</p>
        ) : (
          subjects.map((s, idx) => {
            const pct   = s.completion_percentage ?? 0;
            const color = pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--teal)' : 'var(--accent)';
            const dLeft = s.days_until_deadline;
            const dCol  = dLeft <= 0 ? 'var(--danger)' : dLeft <= 7 ? 'var(--warning)' : 'var(--muted)';

            return (
              <div key={s.id} style={{
                marginBottom: idx < subjects.length - 1 ? 20 : 0,
                paddingBottom: idx < subjects.length - 1 ? 20 : 0,
                borderBottom: idx < subjects.length - 1 ? '1px solid var(--light)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: DIFF_COLORS[s.difficulty] + '18', color: DIFF_COLORS[s.difficulty] }}>
                      {DIFF_LABELS[s.difficulty]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)' }}>
                      {s.completed_sessions}/{s.total_sessions} tasks
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: dCol }}>
                      {dLeft <= 0 ? '⚠ Overdue' : `${dLeft}d to deadline`}
                    </span>
                  </div>
                </div>
                <ProgressBar value={pct} color={color} height={6} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pct}% complete</span>
                  {s.predicted_hours && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      🤖 AI Prediction: {s.predicted_hours}h · {Math.round((s.prediction_confidence ?? 0) * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── AI Recommendations ── */}
      {!loading && (stats?.stress_tips?.length > 0 || stats?.ai_insight) && (
        <div className="card" style={{ background: 'var(--primary)', border: 'none' }}>
          <h3 style={{ color: 'white', marginBottom: 14 }}>AI Recommendations</h3>
          {stats.stress_tips?.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 10, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--accent-light)', flexShrink: 0, fontWeight: 700 }}>→</span>
              {tip}
            </div>
          ))}
          {stats.ai_insight && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginBottom: 8 }}>
                PERSONALIZED INSIGHT
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.8 }}>
                {stats.ai_insight}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}