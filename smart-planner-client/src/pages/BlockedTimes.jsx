import React, { useEffect, useState } from 'react';
import {
  getBlockedTimes, addBlockedTime, updateBlockedTime,
  deleteBlockedTime, toggleBlockedTime,
} from '../api/client';
import { useToast } from '../components/Toast';

const DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ICONS   = ['🚫','📚','💪','🏃','🍽️','😴','🎮','💼','🏫','⚽','🎵','🧘'];
const COLORS  = [
  '#C0483E','#C97D1A','#3D9B6A','#6B3A1F',
  '#8B5A2B','#35695C','#7C3AED','#1D4ED8',
];

const PRESETS = [
  { label: 'Morning Class',  icon: '🏫', days: ['Mon','Tue','Wed','Thu','Fri'], start_time: '08:00', end_time: '10:00', color: '#1D4ED8' },
  { label: 'Afternoon Class',icon: '🏫', days: ['Mon','Wed','Fri'],             start_time: '14:00', end_time: '16:00', color: '#1D4ED8' },
  { label: 'Gym / Workout',  icon: '💪', days: ['Mon','Wed','Fri'],             start_time: '06:00', end_time: '07:30', color: '#3D9B6A' },
  { label: 'Lunch Break',    icon: '🍽️', days: ['Mon','Tue','Wed','Thu','Fri'], start_time: '12:00', end_time: '13:00', color: '#C97D1A' },
  { label: 'Sleep / Rest',   icon: '😴', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], start_time: '22:00', end_time: '07:00', color: '#7C3AED' },
  { label: 'Part-time Work', icon: '💼', days: ['Sat','Sun'],                   start_time: '09:00', end_time: '17:00', color: '#6B3A1F' },
];

const INITIAL = {
  label: '', icon: '🚫', days: [],
  start_time: '08:00', end_time: '10:00', color: '#C0483E',
};

function TimeVisualizer({ blockedTimes }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.8px' }}>
        WEEKLY TIME MAP
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 600 }}>
          {/* Hour labels */}
          <div style={{ display: 'flex', marginLeft: 40, marginBottom: 4 }}>
            {[0,3,6,9,12,15,18,21].map(h => (
              <div key={h} style={{ flex: 3, fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
                {String(h).padStart(2,'0')}:00
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map(day => {
            const dayBlocked = blockedTimes.filter(
              b => b.is_active && b.days.includes(day)
            );
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ width: 36, fontSize: 11, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
                  {day}
                </div>
                <div style={{ flex: 1, height: 22, background: '#3D9B6A18', borderRadius: 4, position: 'relative', overflow: 'hidden', border: '1px solid #3D9B6A20' }}>
                  {dayBlocked.map((b, idx) => {
                    const toH = (t) => {
                      const [h, m] = t.split(':').map(Number);
                      return h + m / 60;
                    };
                    const startH    = toH(b.start_time);
                    const endH      = toH(b.end_time);
                    const overnight = startH > endH;

                    if (overnight) {
                      // Two segments: start→midnight and midnight→end
                      return (
                        <React.Fragment key={`${day}-${idx}`}>
                          <div title={`${b.label} (overnight)`} style={{
                            position: 'absolute',
                            left: `${(startH / 24) * 100}%`,
                            width: `${((24 - startH) / 24) * 100}%`,
                            top: 0, bottom: 0,
                            background: b.color, opacity: 0.75, borderRadius: '2px 0 0 2px',
                          }} />
                          <div title={`${b.label} (overnight)`} style={{
                            position: 'absolute',
                            left: '0%',
                            width: `${(endH / 24) * 100}%`,
                            top: 0, bottom: 0,
                            background: b.color, opacity: 0.75, borderRadius: '0 2px 2px 0',
                          }} />
                        </React.Fragment>
                      );
                    }

                    return (
                      <div key={idx} title={b.label} style={{
                        position: 'absolute',
                        left: `${(startH / 24) * 100}%`,
                        width: `${((endH - startH) / 24) * 100}%`,
                        top: 0, bottom: 0,
                        background: b.color, opacity: 0.75, borderRadius: 2,
                      }} />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <div style={{ width: 16, height: 10, background: '#3D9B6A18', border: '1px solid #3D9B6A50', borderRadius: 2 }} />
              Available
            </div>
            {blockedTimes.filter(b => b.is_active).map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <div style={{ width: 16, height: 10, background: b.color, opacity: 0.75, borderRadius: 2 }} />
                {b.icon} {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlockedTimes() {
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(INITIAL);

  const { addToast } = useToast();

  const load = async () => {
    try {
      const res = await getBlockedTimes();
      setBlockedTimes(res.blocked_times);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (day) => {
    const days = form.days.includes(day)
      ? form.days.filter(d => d !== day)
      : [...form.days, day];
    set('days', days);
  };

  const applyPreset = (preset) => {
    setForm({ ...INITIAL, ...preset });
    setShowForm(true);
    setEditItem(null);
  };

  const handleEdit = (item) => {
    setForm({
      label:      item.label,
      icon:       item.icon,
      days:       item.days,
      start_time: item.start_time,
      end_time:   item.end_time,
      color:      item.color,
    });
    setEditItem(item);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
  if (!form.label.trim())     { addToast('Label is required.', 'error'); return; }
  if (form.days.length === 0) { addToast('Select at least one day.', 'error'); return; }
  if (!form.start_time)       { addToast('Set a start time.', 'error'); return; }
  if (!form.end_time)         { addToast('Set an end time.', 'error'); return; }
  if (form.start_time === form.end_time) {
    addToast('Start and end time cannot be the same.', 'error'); return;
  }
  // ← removed the after check — overnight times are valid!

  setSaving(true);
  try {
    if (editItem) {
      await updateBlockedTime(editItem.id, form);
      addToast('Updated successfully! ✓', 'success');
    } else {
      await addBlockedTime(form);
      addToast('Blocked time added! 🚫', 'success');
    }
    setShowForm(false);
    setEditItem(null);
    setForm(INITIAL);
    await load();
  } catch (e) {
    addToast(e.message, 'error');
  } finally {
    setSaving(false);
  }
};

  const handleDelete = async (id) => {
    if (!confirm('Delete this blocked time?')) return;
    setDeleting(id);
    try {
      await deleteBlockedTime(id);
      setBlockedTimes(prev => prev.filter(b => b.id !== id));
      addToast('Deleted.', 'info');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleBlockedTime(id);
      setBlockedTimes(prev => prev.map(b =>
        b.id === id ? { ...b, is_active: res.is_active } : b
      ));
      addToast(res.is_active ? 'Enabled ✓' : 'Disabled', 'info', 2000);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="page fade-up">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Blocked Time Slots</h1>
          <p>Set times you're unavailable — the AI will schedule around them.</p>
        </div>
        <button
          className={`btn ${showForm && !editItem ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => { setShowForm(!showForm); setEditItem(null); setForm(INITIAL); }}
        >
          {showForm && !editItem ? '✕ Cancel' : '+ Add Block'}
        </button>
      </div>

      {/* ── Time visualizer ── */}
      {!loading && blockedTimes.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <TimeVisualizer blockedTimes={blockedTimes} />
        </div>
      )}

      {/* ── Presets ── */}
      {!showForm && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.8px' }}>
            QUICK PRESETS — click to add
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {PRESETS.map((p, idx) => (
              <button key={idx} onClick={() => applyPreset(p)}
                style={{
                  padding: '10px 12px', borderRadius: 9,
                  background: p.color + '12',
                  border: `1px solid ${p.color}40`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = p.color + '22'}
                onMouseLeave={e => e.currentTarget.style.background = p.color + '12'}
              >
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {p.start_time}–{p.end_time} · {p.days.slice(0,3).join(', ')}{p.days.length > 3 ? '…' : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Add/Edit Form ── */}
      {showForm && (
        <div className="card slide-in" style={{ marginBottom: 20, border: `2px solid ${form.color}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            {editItem ? '✎ Edit Blocked Time' : '+ New Blocked Time'}
          </h3>

          {/* Row 1: Icon + Label + Color */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, marginBottom: 14, alignItems: 'flex-end' }}>

            {/* Icon picker */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>ICON</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 160 }}>
                {ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => set('icon', icon)}
                    style={{
                      width: 32, height: 32, borderRadius: 6, fontSize: 16,
                      border: `2px solid ${form.icon === icon ? form.color : 'var(--border)'}`,
                      background: form.icon === icon ? form.color + '15' : 'var(--bg)',
                      cursor: 'pointer',
                    }}
                  >{icon}</button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>LABEL *</label>
              <input value={form.label} onChange={e => set('label', e.target.value)}
                placeholder="e.g. Morning Class, Gym, Work" />
            </div>

            {/* Color */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>COLOR</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c, cursor: 'pointer',
                      border: `3px solid ${form.color === c ? 'var(--text)' : 'transparent'}`,
                      transition: 'border 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Days */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8, letterSpacing: '0.8px' }}>
              DAYS *
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Quick select buttons */}
              <button type="button" onClick={() => set('days', ['Mon','Tue','Wed','Thu','Fri'])}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--card-alt)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Weekdays
              </button>
              <button type="button" onClick={() => set('days', ['Sat','Sun'])}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--card-alt)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Weekend
              </button>
              <button type="button" onClick={() => set('days', [...DAYS])}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--card-alt)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Every Day
              </button>
              <button type="button" onClick={() => set('days', [])}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--card-alt)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Clear
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  style={{
                    width: 42, height: 38, borderRadius: 8,
                    fontSize: 12, fontWeight: 700,
                    border: `2px solid ${form.days.includes(day) ? form.color : 'var(--border)'}`,
                    background: form.days.includes(day) ? form.color : 'var(--bg)',
                    color: form.days.includes(day) ? 'white' : 'var(--muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{day}</button>
              ))}
            </div>
          </div>

          {/* Row 3: Time range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>
                START TIME *
              </label>
              <input type="time" value={form.start_time}
                onChange={e => set('start_time', e.target.value)} />
            </div>
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 700, marginTop: 20 }}>→</div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>
                END TIME *
              </label>
              <input type="time" value={form.end_time}
                onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>

          {/* Preview */}
            {form.label && form.days.length > 0 && form.start_time && form.end_time && (
            <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: form.color + '12', border: `1px solid ${form.color}30`,
                fontSize: 13, color: 'var(--text)',
            }}>
                <strong>Preview:</strong> {form.icon} {form.label} blocked on{' '}
                <strong>{form.days.join(', ')}</strong> from{' '}
                <strong>{form.start_time}</strong> to <strong>{form.end_time}</strong>
                {form.start_time > form.end_time && (
                <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 700,
                    color: 'var(--warning)', background: '#FEF3C7',
                    padding: '2px 8px', borderRadius: 4,
                }}>
                    🌙 Overnight block
                </span>
                )}
            </div>
            )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : editItem ? '✓ Save Changes' : '+ Add Block'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditItem(null); setForm(INITIAL); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Info box ── */}
      {!loading && blockedTimes.length === 0 && !showForm && (
        <div className="alert alert-info">
          💡 Add your class schedule, gym sessions, work hours, or any other commitments.
          The AI will automatically schedule your study sessions around them.
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '35%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 11, width: '55%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : blockedTimes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blockedTimes.map(b => (
            <div key={b.id} className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                opacity: b.is_active ? 1 : 0.5,
                border: `1px solid ${b.is_active ? b.color + '40' : 'var(--border)'}`,
                background: b.is_active ? b.color + '06' : 'var(--card)',
                transition: 'all 0.2s',
              }}
            >
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: 10, background: b.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {b.icon}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {b.label}
                  {!b.is_active && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--light)', color: 'var(--muted)', fontWeight: 600 }}>
                      DISABLED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>⏰ {b.start_time} – {b.end_time}</span>
                  <span>·</span>
                  <span>{b.days.join(', ')}</span>
                </div>
              </div>

              {/* Days visual */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    width: 28, height: 24, borderRadius: 5, fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: b.days.includes(d) ? b.color : 'var(--light)',
                    color: b.days.includes(d) ? 'white' : 'var(--muted)',
                  }}>
                    {d[0]}
                  </div>
                ))}
              </div>

              {/* Toggle active */}
              <button onClick={() => handleToggle(b.id)}
                title={b.is_active ? 'Disable' : 'Enable'}
                style={{
                  width: 32, height: 32, borderRadius: 7, fontSize: 14,
                  background: b.is_active ? '#DCFCE7' : 'var(--light)',
                  color: b.is_active ? 'var(--success)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                {b.is_active ? '✓' : '○'}
              </button>

              {/* Edit */}
              <button onClick={() => handleEdit(b)}
                style={{ width: 32, height: 32, borderRadius: 7, background: '#FEF3C7', color: 'var(--warning)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = '#FDE68A'}
                onMouseLeave={e => e.currentTarget.style.background = '#FEF3C7'}
              >✎</button>

              {/* Delete */}
              <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id}
                style={{ width: 32, height: 32, borderRadius: 7, background: '#FEE2E2', color: 'var(--danger)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
              >
                {deleting === b.id ? '…' : '×'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}