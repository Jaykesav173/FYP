import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getSubjects, addSubject, updateSubject, deleteSubject, generateSchedule } from '../api/client';
import { useToast }   from '../components/Toast';
import SubjectForm    from '../components/SubjectForm';
import SubjectCard    from '../components/SubjectCard';

const GEN_STEPS = [
  '🔍 Analyzing your subjects and deadlines…',
  '🧠 Running adaptive ML model…',
  '📅 Building your 7-day schedule…',
  '💡 Generating personalized insights…',
  '✨ Almost ready…',
];

export default function Subjects() {
  const [subjects,    setSubjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [adding,      setAdding]      = useState(false);
  const [updating,    setUpdating]    = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [generating,  setGenerating]  = useState(false);
  const [genStep,     setGenStep]     = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [editSubject, setEditSubject] = useState(null);

  const { addToast } = useToast();
  const nav           = useNavigate();

  const load = async () => {
    try {
      const res = await getSubjects();
      setSubjects(res.subjects);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Add ──────────────────────────────────────────────────────────────────────
  const handleAdd = async (form) => {
    setAdding(true);
    try {
      await addSubject(form);
      addToast('Subject added successfully! 🎉', 'success');
      setShowForm(false);
      await load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = (subject) => {
    setEditSubject(subject);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = async (form) => {
    setUpdating(true);
    try {
      await updateSubject(editSubject.id, form);
      addToast('Subject updated successfully! ✓', 'success');
      setEditSubject(null);
      await load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this subject? Its scheduled sessions will also be removed.')) return;
    setDeleting(id);
    try {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (editSubject?.id === id) setEditSubject(null);
      addToast('Subject deleted.', 'info');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  // ── Generate Schedule + Redirect ─────────────────────────────────────────────
  const handleGenerateAndRedirect = async () => {
    setGenerating(true);
    let i = 0;
    setGenStep(GEN_STEPS[0]);
    const interval = setInterval(() => {
      i = (i + 1) % GEN_STEPS.length;
      setGenStep(GEN_STEPS[i]);
    }, 3500);

    try {
      await generateSchedule();
      addToast('Schedule generated successfully! 🎉', 'success', 5000);
      nav('/schedule');           // ← redirect AFTER generation done
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      clearInterval(interval);
      setGenerating(false);
      setGenStep('');
    }
  };

  return (
    <div className="page fade-up">

      {/* ── AI Generation Overlay ── */}
      {generating && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(62,31,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, backdropFilter: 'blur(6px)',
        }}>
          <div style={{ textAlign: 'center', color: 'white', padding: 40, maxWidth: 380 }}>
            <div style={{ fontSize: 56, marginBottom: 20, animation: 'pulse 1.4s ease infinite' }}>
              🧠
            </div>
            <h2 style={{ color: 'white', marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>
              Generating Your Plan
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              {genStep}
            </p>
            {/* Animated dots */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#E8A870',
                  animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #C97941, #E8A870)',
                width: '70%',
                animation: 'shimmer 2s ease infinite',
                backgroundSize: '200% 100%',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>My Subjects</h1>
          <p>Manage your subjects — the AI uses these to build your study schedule.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {subjects.length > 0 && (
            <button
              className="btn btn-accent"
              onClick={handleGenerateAndRedirect}
              disabled={generating || loading}
            >
              {generating
                ? <><span className="spinner" /> Generating…</>
                : '🧠 Generate Schedule'}
            </button>
          )}
          <button
            className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => {
              setShowForm(!showForm);
              setEditSubject(null);
            }}
          >
            {showForm ? '✕ Cancel' : '+ Add Subject'}
          </button>
        </div>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <SubjectForm
          onSubmit={handleAdd}
          loading={adding}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Edit Form ── */}
      {editSubject && (
        <SubjectForm
          key={editSubject.id}
          initial={{
            name:            editSubject.name,
            deadline:        editSubject.deadline,
            difficulty:      editSubject.difficulty,
            estimated_hours: editSubject.estimated_hours,
          }}
          onSubmit={handleUpdate}
          loading={updating}
          onCancel={() => setEditSubject(null)}
        />
      )}

      {/* ── Info banner when empty ── */}
      {!loading && subjects.length === 0 && !showForm && (
        <div className="alert alert-info">
          💡 <strong>Total Study Hours</strong> = the total hours you plan to study
          this subject before the deadline (e.g. 30h for a full semester subject).
        </div>
      )}

      {/* ── Skeleton loading ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 11, width: '55%' }} />
              </div>
              <div className="skeleton" style={{ width: 70, height: 14 }} />
              <div className="skeleton" style={{ width: 60, height: 26, borderRadius: 6 }} />
            </div>
          ))}
        </div>

      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📚</div>
          <h3>No subjects yet</h3>
          <p>Click "+ Add Subject" above to get started.</p>
        </div>

      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · sorted by deadline
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subjects.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                onDelete={handleDelete}
                onEdit={handleEdit}
                deleting={deleting}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}