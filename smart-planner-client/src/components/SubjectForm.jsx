import { useState } from 'react';

const today = new Date().toISOString().split('T')[0];

const DIFFICULTIES = [
  { value: 1, label: 'Easy',     color: '#3D9B6A', desc: 'Light workload'              },
  { value: 2, label: 'Medium',   color: '#C97D1A', desc: 'Moderate effort required'    },
  { value: 3, label: 'Hard',     color: '#E06020', desc: 'Heavy, needs focused study'  },
  { value: 4, label: 'Critical', color: '#C0483E', desc: 'Very demanding, top priority'},
];

const DATE_TYPES = [
  { value: 'quiz',       label: '📝 Quiz',       color: '#3D9B6A' },
  { value: 'midterm',    label: '📋 Midterm',    color: '#C97D1A' },
  { value: 'assignment', label: '📌 Assignment', color: '#8B5A2B' },
  { value: 'final',      label: '🎯 Final',      color: '#C0483E' },
  { value: 'other',      label: '📅 Other',      color: '#6B3A1F' },
];

const INITIAL_FORM = {
  name: '', deadline: '', difficulty: 2, estimated_hours: 10, important_dates: [],
};

const INITIAL_DATE = { type: 'quiz', label: '', date: '' };

export default function SubjectForm({ onSubmit, loading, initial = null, onCancel }) {
  const [form,       setForm]       = useState(initial ?? INITIAL_FORM);
  const [error,      setError]      = useState('');
  const [showDates,  setShowDates]  = useState(
    initial?.important_dates?.length > 0
  );
  const [newDate,    setNewDate]    = useState(INITIAL_DATE);
  const [dateError,  setDateError]  = useState('');

  const set    = (k, v)  => setForm((f) => ({ ...f, [k]: v }));
  const setDt  = (k, v)  => setNewDate((d) => ({ ...d, [k]: v }));

  // ── Add important date ────────────────────────────────────────────────────
  const addDate = () => {
    if (!newDate.label.trim()) { setDateError('Label is required.'); return; }
    if (!newDate.date)         { setDateError('Date is required.'); return; }
    setDateError('');

    // Auto-generate label if empty
    const typeInfo = DATE_TYPES.find((t) => t.value === newDate.type);
    const label    = newDate.label.trim() || typeInfo?.label || newDate.type;

    set('important_dates', [...(form.important_dates ?? []), { ...newDate, label }]);
    setNewDate(INITIAL_DATE);
  };

  const removeDate = (idx) => {
    set('important_dates', form.important_dates.filter((_, i) => i !== idx));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim())        { setError('Subject name is required.'); return; }
    if (!form.deadline)           { setError('Deadline is required.'); return; }
    if (form.estimated_hours < 1) { setError('Study hours must be at least 1.'); return; }
    setError('');
    await onSubmit(form);
    if (!initial) setForm(INITIAL_FORM);
  };

  const selectedDiff = DIFFICULTIES.find((d) => d.value === form.difficulty);

  return (
    <div className="card slide-in"
      style={{ border: `2px solid ${selectedDiff?.color ?? 'var(--primary)'}`, marginBottom: 20 }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
        {initial ? '✎ Edit Subject' : '+ New Subject'}
      </h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>
        Fill in your subject details. Important dates are optional but help with reminders.
      </p>

      {/* ── Row 1: Name + Deadline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>
            SUBJECT NAME *
          </label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Data Structures, Machine Learning"
          />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>
            EXAM / DEADLINE *
          </label>
          <input type="date" min={today} value={form.deadline}
            onChange={(e) => set('deadline', e.target.value)} />
        </div>
      </div>

      {/* ── Row 2: Difficulty + Hours ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 18 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8, letterSpacing: '0.8px' }}>
            DIFFICULTY *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {DIFFICULTIES.map((d) => (
              <button key={d.value} type="button" onClick={() => set('difficulty', d.value)}
                title={d.desc}
                style={{
                  padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: `2px solid ${form.difficulty === d.value ? d.color : 'var(--border)'}`,
                  background: form.difficulty === d.value ? d.color + '18' : 'var(--bg)',
                  color: form.difficulty === d.value ? d.color : 'var(--muted)',
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          {selectedDiff && (
            <div style={{ marginTop: 5, fontSize: 11, color: selectedDiff.color }}>
              ℹ {selectedDiff.desc}
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, letterSpacing: '0.8px' }}>
            TOTAL STUDY HOURS *
          </label>
          <input type="number" min="1" max="500" step="0.5"
            value={form.estimated_hours}
            onChange={(e) => set('estimated_hours', Number(e.target.value))} />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            💡 Total hours to study before deadline
          </div>
        </div>
      </div>

      {/* ── Important Dates Section ── */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 10,
        overflow: 'hidden', marginBottom: 16,
      }}>
        {/* Toggle header */}
        <button type="button"
          onClick={() => setShowDates(!showDates)}
          style={{
            width: '100%', padding: '10px 14px',
            background: showDates ? 'var(--card-alt)' : 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            borderBottom: showDates ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
          }}
        >
          <span>
            📅 Important Dates
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>
              (optional — midterms, quizzes, finals)
            </span>
          </span>
          <span style={{ fontSize: 16, color: 'var(--muted)' }}>
            {showDates ? '▲' : '▼'}
          </span>
        </button>

        {showDates && (
          <div style={{ padding: 16 }}>

            {/* Existing dates */}
            {form.important_dates?.length > 0 && (
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.important_dates.map((d, idx) => {
                  const typeInfo = DATE_TYPES.find((t) => t.value === d.type);
                  const daysLeft = Math.ceil((new Date(d.date) - new Date()) / 86400000);
                  const urgColor = daysLeft <= 0 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--teal)';
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: typeInfo?.color + '0F',
                      border: `1px solid ${typeInfo?.color}30`,
                    }}>
                      <span style={{ fontSize: 13 }}>{typeInfo?.label.split(' ')[0]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.date}</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: urgColor,
                        padding: '2px 8px', borderRadius: 4,
                        background: urgColor + '15',
                      }}>
                        {daysLeft <= 0 ? 'Past' : `${daysLeft}d`}
                      </span>
                      <button onClick={() => removeDate(idx)}
                        style={{ background: '#FEE2E2', color: 'var(--danger)', width: 24, height: 24, borderRadius: 5, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new date row */}
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.8px' }}>
                ADD NEW DATE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr auto', gap: 10, alignItems: 'flex-end' }}>

                {/* Type */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>TYPE</label>
                  <select value={newDate.type} onChange={(e) => setDt('type', e.target.value)}>
                    {DATE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Label */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>LABEL *</label>
                  <input
                    value={newDate.label}
                    onChange={(e) => setDt('label', e.target.value)}
                    placeholder="e.g. Quiz 1, Midterm Exam"
                    onKeyDown={(e) => e.key === 'Enter' && addDate()}
                  />
                </div>

                {/* Date */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>DATE *</label>
                  <input type="date" value={newDate.date}
                    onChange={(e) => setDt('date', e.target.value)} />
                </div>

                {/* Add button */}
                <button type="button" onClick={addDate}
                  style={{
                    padding: '9px 14px', borderRadius: 7,
                    background: 'var(--teal)', color: 'white',
                    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                  + Add
                </button>
              </div>
              {dateError && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>{dateError}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><span className="spinner" /> Saving…</>
            : initial ? '✓ Save Changes' : '+ Add Subject'}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
}