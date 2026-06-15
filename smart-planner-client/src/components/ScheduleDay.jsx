import TaskItem from './TaskItem';
import ProgressBar from './ProgressBar';

export default function ScheduleDay({ day, onToggle, loadingId }) {
  const { date, day: dayName, sessions = [], totalMinutes } = day;

  const today     = new Date().toISOString().split('T')[0];
  const isToday   = date === today;
  const done      = sessions.filter((s) => s.is_completed).length;
  const pct       = sessions.length ? Math.round((done / sessions.length) * 100) : 0;

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: isToday ? `2px solid var(--teal)` : '1px solid var(--border)',
      }}
    >
      {/* Day header */}
      <div
        style={{
          padding: '10px 18px',
          background: isToday ? 'var(--primary)' : 'var(--card-alt)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 10, color: isToday ? 'rgba(255,255,255,0.4)' : 'var(--muted)' }}
        >
          {date}
        </span>

        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 15,
            fontWeight: 700,
            color: isToday ? 'white' : 'var(--text)',
          }}
        >
          {dayName} {isToday && '· Today'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {sessions.length > 0 && (
            <>
              <span style={{ fontSize: 11, color: isToday ? 'rgba(255,255,255,0.45)' : 'var(--muted)' }}>
                {done}/{sessions.length}
              </span>
              <div style={{ width: 60 }}>
                <ProgressBar
                  value={pct}
                  color={isToday ? 'var(--accent-light)' : 'var(--teal)'}
                  height={4}
                />
              </div>
            </>
          )}
          <span style={{ fontSize: 11, color: isToday ? 'rgba(255,255,255,0.45)' : 'var(--muted)' }}>
            {((totalMinutes || 0) / 60).toFixed(1)}h
          </span>
        </div>
      </div>

      {/* Sessions */}
      <div style={{ padding: '4px 18px 10px' }}>
        {sessions.length === 0 ? (
          <p style={{ padding: '12px 0', fontSize: 12, color: 'var(--muted)' }}>
            Rest day 🌿
          </p>
        ) : (
          sessions.map((session, idx) => (
            <div
              key={session.id}
              style={{
                borderBottom:
                  idx < sessions.length - 1 ? '1px solid var(--light)' : 'none',
              }}
            >
              <TaskItem
                session={session}
                onToggle={onToggle}
                loading={loadingId === session.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}