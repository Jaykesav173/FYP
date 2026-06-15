export default function TaskItem({ session, onToggle, loading = false }) {
  const { id, subject, time, duration, priority, note, is_completed } = session;

  return (
    <div
      onClick={() => !loading && onToggle(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 4px',
        cursor: loading ? 'wait' : 'pointer',
        borderLeft: is_completed ? '3px solid var(--success)' : '3px solid transparent',
        background: is_completed ? '#3D9B6A08' : 'transparent',
        borderRadius: 4,
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 17,
          height: 17,
          borderRadius: 4,
          border: `2px solid ${is_completed ? 'var(--success)' : 'var(--border)'}`,
          background: is_completed ? 'var(--success)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 10,
          color: 'white',
          transition: 'all 0.15s',
        }}
      >
        {is_completed ? '✓' : ''}
      </div>

      {/* Time */}
      <span
        className="mono"
        style={{ fontSize: 11, color: 'var(--muted)', width: 44, flexShrink: 0 }}
      >
        {time}
      </span>

      {/* Subject + note */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            textDecoration: is_completed ? 'line-through' : 'none',
            opacity: is_completed ? 0.45 : 1,
            transition: 'all 0.15s',
          }}
        >
          {subject}
        </span>
        {note && (
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
            · {note}
          </span>
        )}
      </div>

      {/* Duration */}
      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{duration}m</span>

      {/* Priority badge */}
      <span className={`badge badge-${priority}`}>{priority}</span>
    </div>
  );
}