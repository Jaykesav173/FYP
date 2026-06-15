import { useState } from 'react';

const DIFF_LABELS = { 1:'Easy', 2:'Medium', 3:'Hard', 4:'Critical' };
const DIFF_COLORS = { 1:'#3D9B6A', 2:'#C97D1A', 3:'#E06020', 4:'#C0483E' };

const TYPE_ICONS  = {
  quiz: '📝', midterm: '📋', final: '🎯', assignment: '📌', other: '📅',
};
const TYPE_COLORS = {
  quiz: '#3D9B6A', midterm: '#C97D1A', final: '#C0483E',
  assignment: '#8B5A2B', other: '#6B3A1F',
};

export default function SubjectCard({ subject, onDelete, onEdit, deleting }) {
  const [showDates, setShowDates] = useState(false);
  const { id, name, deadline, difficulty, estimated_hours, days_until_deadline, upcoming_dates = [] } = subject;

  const urgColor   = days_until_deadline <= 0 ? 'var(--danger)' : days_until_deadline <= 3 ? 'var(--danger)' : days_until_deadline <= 7 ? 'var(--warning)' : 'var(--success)';
  const diffColor  = DIFF_COLORS[difficulty] ?? '#C97D1A';

  // Count upcoming (not past) important dates
  const upcomingCount = upcoming_dates.filter((d) => !d.is_past).length;
  const soonCount     = upcoming_dates.filter((d) => d.is_soon).length;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Main row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>

        {/* Icon */}
        <div style={{ width: 44, height: 44, borderRadius: 10, background: diffColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          📖
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {estimated_hours}h total · {DIFF_LABELS[difficulty]}
            {upcomingCount > 0 && (
              <span style={{ marginLeft: 8, color: soonCount > 0 ? 'var(--danger)' : 'var(--teal)', fontWeight: 600 }}>
                · {upcomingCount} upcoming date{upcomingCount !== 1 ? 's' : ''}
                {soonCount > 0 && ` (${soonCount} soon!)`}
              </span>
            )}
          </div>
        </div>

        {/* Deadline */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: urgColor }}>
            {days_until_deadline <= 0 ? '⚠ Overdue' : `${days_until_deadline}d left`}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{deadline}</div>
        </div>

        {/* Difficulty badge */}
        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: diffColor + '1A', color: diffColor, flexShrink: 0 }}>
          {DIFF_LABELS[difficulty]}
        </span>

        {/* Dates toggle button */}
        {upcoming_dates.length > 0 && (
          <button
            onClick={() => setShowDates(!showDates)}
            title="Show important dates"
            style={{
              width: 32, height: 32, borderRadius: 7,
              background: soonCount > 0 ? '#FEF3C7' : 'var(--card-alt)',
              color: soonCount > 0 ? 'var(--warning)' : 'var(--muted)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, position: 'relative',
            }}
          >
            📅
            {soonCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--danger)', color: 'white',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {soonCount}
              </span>
            )}
          </button>
        )}

        {/* Edit */}
        <button onClick={() => onEdit(subject)}
          style={{ width: 32, height: 32, borderRadius: 7, background: '#FEF3C7', color: 'var(--warning)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#FDE68A'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FEF3C7'}
          title="Edit subject"
        >✎</button>

        {/* Delete */}
        <button onClick={() => onDelete(id)} disabled={deleting === id}
          style={{ width: 32, height: 32, borderRadius: 7, background: '#FEE2E2', color: 'var(--danger)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#FECACA'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FEE2E2'}
          title="Delete subject"
        >
          {deleting === id ? '…' : '×'}
        </button>
      </div>

      {/* ── Important dates panel ── */}
      {showDates && upcoming_dates.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', background: 'var(--card-alt)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.8px' }}>
            IMPORTANT DATES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {upcoming_dates.map((d, idx) => {
              const typeColor = TYPE_COLORS[d.type] ?? '#6B3A1F';
              const urgCol    = d.is_past ? 'var(--muted)' : d.is_soon ? 'var(--danger)' : 'var(--teal)';
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: d.is_soon ? '#FEF3C7' : d.is_past ? 'var(--bg)' : typeColor + '0F',
                  border: `1px solid ${d.is_soon ? '#FDE68A' : typeColor + '25'}`,
                  opacity: d.is_past ? 0.55 : 1,
                }}>
                  <span style={{ fontSize: 16 }}>{TYPE_ICONS[d.type] ?? '📅'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.label}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{d.date}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: urgCol, flexShrink: 0 }}>
                    {d.is_past ? 'Done' : d.days_left === 0 ? 'Today!' : `${d.days_left}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}