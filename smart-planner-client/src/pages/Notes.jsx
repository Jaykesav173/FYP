import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, FileImage, File, Brain,
  Trash2, Clock, Award, BookOpen, Plus, X,
  CheckSquare, Square, History, Calendar,
  PlayCircle, AlignLeft, Search, Filter, Edit2, Eye,
} from 'lucide-react';
import {
  getNotes, uploadNote, deleteNote, updateNote,
  getSubjects, generateQuiz, generateQuizMulti, generateFlashcards,
  getQuizzes, deleteQuiz, toggleQuizSrs, summarizeNotes, summarizeYoutube
} from '../api/client';
import { useToast } from '../components/Toast';

const DIFF_OPTIONS = [
  { value: 'easy',   label: '🟢 Easy',   desc: 'Recall & definitions'     },
  { value: 'medium', label: '🟡 Medium', desc: 'Understanding & concepts' },
  { value: 'hard',   label: '🔴 Hard',   desc: 'Application & analysis'   },
];
const Q_OPTIONS = [5, 10, 15, 20];

function FileIcon({ type, size = 40 }) {
  const cfg = {
    pdf: { bg: '#FEE2E2', color: '#C0483E', Icon: FileText  },
    txt: { bg: '#DBEAFE', color: '#1D4ED8', Icon: FileText  },
    img: { bg: '#DCFCE7', color: '#15803D', Icon: FileImage },
  };
  const { bg, color, Icon } = cfg[type] ?? { bg: 'var(--light)', color: 'var(--muted)', Icon: File };
  return (
    <div style={{ width: size, height: size, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={size * 0.45} color={color} strokeWidth={1.8} />
    </div>
  );
}

// ── All Quizzes Modal ───────────────────────────────────────────────────────
function AllQuizzesModal({ quizzes, loading, onClose, onViewQuiz, hasMore, onLoadMore, onDeleteQuiz, onToggleSrs }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedQuizzes(new Set());
  };

  const handleSelectQuiz = (quizId) => {
    const newSet = new Set(selectedQuizzes);
    if (newSet.has(quizId)) newSet.delete(quizId);
    else newSet.add(quizId);
    setSelectedQuizzes(newSet);
  };

  const handleDeleteSelected = async () => {
    if (selectedQuizzes.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedQuizzes.size} quizzes?`)) return;
    
    setIsDeleting(true);
    for (const id of Array.from(selectedQuizzes)) {
      await onDeleteQuiz(id);
    }
    setIsDeleting(false);
    setSelectedQuizzes(new Set());
    setSelectMode(false);
  };

  // Group quizzes by note - check note_ids to separate multi-note quizzes
  const groupedByNote = quizzes.reduce((acc, quiz) => {
    // If note_ids is not null, it's a multi-note quiz
    if (quiz.note_ids != null) {
      // Put in "Mixed Notes" category
      if (!acc['mixed']) {
        acc['mixed'] = {
          note_title: 'Mixed Notes Quiz',
          is_mixed: true,
          quizzes: []
        };
      }
      acc['mixed'].quizzes.push(quiz);
    } else {
      // note_ids is null - treat as normal single note quiz
      if (!acc[quiz.note_id]) {
        acc[quiz.note_id] = {
          note_title: quiz.note_title,
          is_mixed: false,
          quizzes: []
        };
      }
      acc[quiz.note_id].quizzes.push(quiz);
    }
    return acc;
  }, {});
 
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
      padding: '40px 20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: 20, maxWidth: 700, width: '90%',
        maxHeight: '85vh', overflow: 'auto', padding: 24,
        margin: 'auto',
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>All Quizzes</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{quizzes.length} total quizzes across all notes</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {quizzes.length > 0 && (
              <button 
                onClick={toggleSelectMode}
                style={{
                  background: selectMode ? 'var(--card-alt)' : 'transparent',
                  color: 'var(--text)',
                  border: `1px solid ${selectMode ? 'var(--primary)' : 'var(--border)'}`,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {selectMode ? 'Cancel Selection' : 'Select Quizzes'}
              </button>
            )}
            {selectMode && selectedQuizzes.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                style={{
                  background: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isDeleting ? 'wait' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedQuizzes.size})`}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color="var(--muted)" />
            </button>
          </div>
        </div>
 
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>Loading quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No quizzes generated yet</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Generate your first quiz by clicking Generate on any note above</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(groupedByNote).map(([noteId, group]) => (
              <div key={noteId}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--primary)',
                  marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid var(--primary)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <FileText size={14} /> {group.note_title}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                    ({group.quizzes.length} quiz{group.quizzes.length !== 1 ? 'zes' : ''})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.quizzes.map((quiz, idx) => (
                    <div key={quiz.id} style={{
                      padding: 14, borderRadius: 10, background: 'var(--card-alt)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {selectMode && (
                          <div style={{ marginRight: 12, marginTop: 4 }}>
                            <input 
                              type="checkbox" 
                              checked={selectedQuizzes.has(quiz.id)}
                              onChange={() => handleSelectQuiz(quiz.id)}
                              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                            QUIZ #{group.quizzes.length - idx}
                          </div>
                          
                          {/* Show source label for mixed notes quizzes */}
                          {group.is_mixed && quiz.source_label && (
                            <div style={{ 
                              fontSize: 11, 
                              color: 'var(--primary)', 
                              marginBottom: 6,
                              fontWeight: 500,
                              fontStyle: 'italic'
                            }}>
                              📚 {quiz.source_label}
                            </div>
                          )}
                          
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                            {quiz.num_questions} questions · {quiz.difficulty} difficulty
                            {quiz.best_score && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: quiz.best_score >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                                · Best: {quiz.best_score}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onViewQuiz(quiz.id)}
                          style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'var(--primary)', color: 'white', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <Award size={12} /> Take Quiz
                        </button>
                      </div>
 
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Calendar size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          Created: {quiz.created_at}
                          {quiz.attempts_count > 0 && (
                            <span style={{ marginLeft: 12 }}>
                              🎯 {quiz.attempts_count} attempt{quiz.attempts_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {quiz.srs_next_review && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => onToggleSrs(quiz.id)}
                              title={quiz.srs_enabled ? 'Disable Spaced Repetition review for this quiz' : 'Enable Spaced Repetition review for this quiz'}
                              style={{
                                background: quiz.srs_enabled ? 'rgba(47, 158, 105, 0.12)' : 'rgba(140, 140, 140, 0.12)',
                                color: quiz.srs_enabled ? '#2F9E69' : 'var(--muted)',
                                border: `1px solid ${quiz.srs_enabled ? 'rgba(47, 158, 105, 0.25)' : 'rgba(140, 140, 140, 0.25)'}`,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                            >
                              🔄 SRS: {quiz.srs_enabled ? 'ON' : 'OFF'}
                            </button>

                            {quiz.srs_enabled && (
                              <span style={{
                                background: 'rgba(216, 137, 69, 0.15)',
                                color: '#D88945',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                📅 Next: {quiz.srs_next_review}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {hasMore && (
              <button
                onClick={onLoadMore}
                style={{
                  padding: '12px', borderRadius: 10, background: 'var(--light)', color: 'var(--primary)',
                  border: '1px solid var(--border)', fontWeight: 600, cursor: 'pointer',
                  marginTop: 10, width: '100%', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--light)'}
              >
                Load More Quizzes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Modal ───────────────────────────────────────────────────────────
function SummaryModal({ data, onClose }) {
  if (!data) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)', padding: '40px 20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: 20, maxWidth: 800, width: '100%',
        maxHeight: '85vh', overflow: 'auto', padding: 32, margin: 'auto',
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary)15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlignLeft size={20} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', serif" }}>
                {data.title || 'Summary & Insights'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--light)', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>
            <X size={18} color="var(--text)" />
          </button>
        </div>

        {/* ── Summary Text ── */}
        <div style={{ marginBottom: 24, lineHeight: 1.6, fontSize: 15, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
          {data.summary}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* ── Key Points ── */}
          {data.key_points && data.key_points.length > 0 && (
            <div style={{ background: 'var(--card-alt)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={16} /> Key Takeaways
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.key_points.map((pt, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Topics ── */}
          {data.topics && data.topics.length > 0 && (
            <div style={{ background: 'var(--card-alt)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={16} /> Topics Covered
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.topics.map((t, i) => (
                  <span key={i} style={{ background: 'var(--teal)15', color: 'var(--teal)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── YouTube Recommendations ── */}
        {data.youtube_recommendations && data.youtube_recommendations.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlayCircle size={20} color="#FF0000" /> Recommended Videos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {data.youtube_recommendations.slice(0, 3).map((vid, i) => (
                <a key={i} href={vid.search_url} target="_blank" rel="noreferrer" style={{
                  display: 'block', textDecoration: 'none', background: 'var(--card-alt)', padding: 16, borderRadius: 16,
                  border: '1px solid var(--border)', transition: 'all 0.2s', color: 'inherit'
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{vid.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>📺 {vid.channel}</div>
                  
                  {vid.key_takeaways && vid.key_takeaways.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {vid.key_takeaways.slice(0, 2).map((takeaway, j) => (
                        <div key={j} style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6 }}>
                          <span style={{ color: 'var(--primary)' }}>•</span> {takeaway}
                        </div>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Notes() {
  const [notes,      setNotes]      = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationType, setGenerationType] = useState('quiz');
  const [genSingle,  setGenSingle]  = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  
  // ── Edit Note state ────────────────────────────────────────────────────────
  const [editingNote, setEditingNote] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', subject_id: '' });
  const [updating, setUpdating] = useState(false);
  
  // ── Summary state ────────────────────────────────────────────────────────
  const [summaryData, setSummaryData] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [sumSingle, setSumSingle] = useState(null);
  
  // ── Search & Filter state ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  // ── All Quizzes Modal state ───────────────────────────────────────────────
  const [showAllQuizzesModal, setShowAllQuizzesModal] = useState(false);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Pagination state
  const [notesPage, setNotesPage] = useState(1);
  const [hasMoreNotes, setHasMoreNotes] = useState(false);
  const [quizzesPage, setQuizzesPage] = useState(1);
  const [hasMoreQuizzes, setHasMoreQuizzes] = useState(false);

  // ── Multi-select state ───────────────────────────────────────────────────
  const [selected,   setSelected]   = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const [form, setForm] = useState({
    title: '', subject_id: '', file: null,
    num_questions: 10, difficulty: 'medium',
  });

  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const nav           = useNavigate();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load notes and subjects
  useEffect(() => {
    Promise.all([
      getNotes(1).then(r => { setNotes(r.notes); setHasMoreNotes(r.pagination?.has_more); }),
      getSubjects().then(r => setSubjects(r.subjects)),
      getQuizzes(1).then(r => { setAllQuizzes(r.quizzes || []); setHasMoreQuizzes(r.pagination?.has_more); }).catch(e => console.error('Failed to load quizzes:', e)),
    ]).catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch all quizzes using the new endpoint
  const fetchAllQuizzes = async () => {
    setLoadingQuizzes(true);
    setQuizzesPage(1);
    try {
      const res = await getQuizzes(1);
      setAllQuizzes(res.quizzes || []);
      setHasMoreQuizzes(res.pagination?.has_more);
    } catch (e) {
      addToast(e.message, 'error');
      console.error('Failed to fetch quizzes:', e);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const loadMoreQuizzes = async () => {
    try {
      const res = await getQuizzes(quizzesPage + 1);
      setAllQuizzes(prev => [...prev, ...(res.quizzes || [])]);
      setQuizzesPage(p => p + 1);
      setHasMoreQuizzes(res.pagination?.has_more);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const loadMoreNotes = async () => {
    try {
      const res = await getNotes(notesPage + 1);
      setNotes(prev => [...prev, ...res.notes]);
      setNotesPage(p => p + 1);
      setHasMoreNotes(res.pagination?.has_more);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Handle opening the modal
  const handleOpenAllQuizzes = () => {
    setShowAllQuizzesModal(true);
    fetchAllQuizzes();
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) { addToast('Only PDF, TXT, JPG, PNG files allowed.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { addToast('File must be under 10MB.', 'error'); return; }
    set('file', file);
    if (!form.title) set('title', file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!form.title.trim()) { addToast('Title is required.', 'error'); return; }
    if (!form.file)          { addToast('Please select a file.', 'error'); return; }
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('file',  form.file);
    if (form.subject_id) fd.append('subject_id', form.subject_id);
    setUploading(true);
    try {
      const res = await uploadNote(fd);
      setNotes(prev => [res.note, ...prev]);
      addToast('Note uploaded! 📄', 'success');
      setForm({ title:'', subject_id:'', file:null, num_questions:10, difficulty:'medium' });
      setShowForm(false);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Toggle selection ──────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelected(new Set(notes.map(n => n.id)));
  const clearSelect = () => { setSelected(new Set()); setSelectMode(false); };

  // ── Generate quiz — single note ───────────────────────────────────────────
  const handleGenerateSingle = async (note) => {
    setGenSingle(note.id);
    setGenerationType('quiz');
    setGenerating(true);
    try {
      const res = await generateQuiz(note.id, {
        num_questions: form.num_questions,
        difficulty:    form.difficulty,
      });
      addToast('Quiz generated! 🎯', 'success', 3000);
      // Refresh quizzes count
      const quizzesRes = await getQuizzes();
      setAllQuizzes(quizzesRes.quizzes || []);
      nav(`/quiz/${res.quiz_id}`);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setGenSingle(null);
      setGenerating(false);
    }
  };

  // ── Generate quiz — multiple notes ────────────────────────────────────────
  const handleGenerateMulti = async () => {
    if (selected.size === 0) return;
    setGenerationType('quiz');
    setGenerating(true);
    try {
      const res = await generateQuizMulti({
        note_ids:       Array.from(selected),
        num_questions:  form.num_questions,
        difficulty:     form.difficulty,
      });
      addToast(`Quiz from ${res.note_count} notes generated! 🎯`, 'success', 3000);
      // Refresh quizzes count
      const quizzesRes = await getQuizzes();
      setAllQuizzes(quizzesRes.quizzes || []);
      clearSelect();
      nav(`/quiz/${res.quiz_id}`);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── Generate Flashcards — multiple notes ──────────────────────────────────
  const handleGenerateFlashcardsMulti = async () => {
    if (selected.size === 0) return;
    setGenerationType('flashcards');
    setGenerating(true);
    try {
      const res = await generateFlashcards({
        note_ids:       Array.from(selected),
        num_cards:      form.num_questions,
      });
      addToast(`Flashcards from selected notes generated! 🃏`, 'success', 3000);
      clearSelect();
      nav(`/flashcards/${res.set_id}`);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── Summarize — single note ──────────────────────────────────────────────
  const handleSummarizeSingle = async (note) => {
    setSumSingle(note.id);
    setSummarizing(true);
    try {
      const res = await summarizeNotes({ note_ids: [note.id] });
      setSummaryData(res.summary_data);
      addToast('Summary generated! 📝', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSumSingle(null);
      setSummarizing(false);
    }
  };

  // ── Summarize — multiple notes ───────────────────────────────────────────
  const handleSummarizeMulti = async () => {
    if (selected.size === 0) return;
    setSummarizing(true);
    try {
      const res = await summarizeNotes({ note_ids: Array.from(selected) });
      setSummaryData(res.summary_data);
      addToast('Summary from selected notes generated! 📝', 'success');
      clearSelect();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSummarizing(false);
    }
  };

  // ── Summarize — YouTube ──────────────────────────────────────────────────
  const handleSummarizeYoutube = async () => {
    if (!youtubeUrl.trim()) { addToast('Enter a YouTube URL', 'error'); return; }
    setSummarizing(true);
    try {
      const res = await summarizeYoutube({ url: youtubeUrl });
      setSummaryData(res.summary_data);
      setYoutubeUrl('');
      addToast('YouTube video summarized! 🎥', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSummarizing(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this note and all its quizzes?')) return;
    setDeleting(id);
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      // Refresh quizzes count
      const quizzesRes = await getQuizzes();
      setAllQuizzes(quizzesRes.quizzes || []);
      addToast('Note deleted.', 'info');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  // ── Edit Note ─────────────────────────────────────────────────────────────
  const openEditModal = (note) => {
    setEditingNote(note);
    setEditForm({
      title: note.title,
      subject_id: note.subject ? note.subject.id : '',
      file: null,
    });
  };

  const handleUpdateNote = async () => {
    if (!editForm.title.trim()) { addToast('Title is required.', 'error'); return; }
    setUpdating(true);
    try {
      let payload;
      if (editForm.file) {
        payload = new FormData();
        payload.append('title', editForm.title);
        if (editForm.subject_id) payload.append('subject_id', editForm.subject_id);
        payload.append('file', editForm.file);
      } else {
        payload = { title: editForm.title, subject_id: editForm.subject_id };
      }
      
      const res = await updateNote(editingNote.id, payload);
      setNotes(prev => prev.map(n => n.id === editingNote.id ? res.note : n));
      addToast('Note updated successfully.', 'success');
      setEditingNote(null);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const selectedNotes = notes.filter(n => selected.has(n.id));

  // ── Filtered notes (search + subject filter) ────────────────────────────
  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q
      || n.title.toLowerCase().includes(q)
      || (n.original_filename && n.original_filename.toLowerCase().includes(q));
    const matchesSubject = !filterSubject
      || (n.subject && String(n.subject.id) === filterSubject);
    return matchesSearch && matchesSubject;
  });

  // ── Delete quiz ───────────────────────────────────────────────────────────
  const handleDeleteQuiz = async (quizId) => {
    try {
      await deleteQuiz(quizId);
      // Refresh quizzes list
      const quizzesRes = await getQuizzes();
      setAllQuizzes(quizzesRes.quizzes || []);
      addToast('Quiz deleted.', 'info');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // ── Toggle quiz SRS ──────────────────────────────────────────────────────────
  const handleToggleQuizSrs = async (quizId) => {
    try {
      const res = await toggleQuizSrs(quizId);
      addToast(res.message, 'success', 2000);
      setAllQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, srs_enabled: res.srs_enabled } : q));
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="page fade-up" style={{ paddingBottom: selected.size > 0 ? 120 : 32 }}>

      {/* ── All Quizzes Modal ── */}
      {showAllQuizzesModal && (
        <AllQuizzesModal
          quizzes={allQuizzes}
          loading={loadingQuizzes}
          hasMore={hasMoreQuizzes}
          onLoadMore={loadMoreQuizzes}
          onClose={() => setShowAllQuizzesModal(false)}
          onViewQuiz={(quizId) => {
            setShowAllQuizzesModal(false);
            nav(`/quiz/${quizId}`);
          }}
          onDeleteQuiz={handleDeleteQuiz}
          onToggleSrs={handleToggleQuizSrs}
        />
      )}

      {/* ── Summary Modal ── */}
      {summaryData && (
        <SummaryModal data={summaryData} onClose={() => setSummaryData(null)} />
      )}

      {/* ── Edit Note Modal ── */}
      {editingNote && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px',
        }} onClick={() => setEditingNote(null)}>
          <div style={{
            background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 400,
            padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Edit Note</h3>
              <button onClick={() => setEditingNote(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>TITLE *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>SUBJECT</label>
              <select
                value={editForm.subject_id}
                onChange={e => setEditForm({ ...editForm, subject_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
              >
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>REPLACE FILE (optional)</label>
              <input
                type="file"
                accept=".pdf,.txt,.jpg,.jpeg,.png"
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) setEditForm({ ...editForm, file: f });
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
              />
              {editForm.file ? (
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>Selected: {editForm.file.name}</div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Current file: {editingNote.original_filename}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditingNote(null)} disabled={updating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateNote} disabled={updating}>
                {updating ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Generation overlay ── */}
      {(generating || summarizing) && (
        <div style={{ position:'fixed', inset:0, background:'rgba(62,31,0,0.93)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(6px)' }}>
          <div style={{ textAlign:'center', color:'white', padding:40, maxWidth:360 }}>
            <div style={{ fontSize:56, marginBottom:20, animation:'pulse 1.4s ease infinite' }}>
              {summarizing ? '📝' : '🧠'}
            </div>
            <h2 style={{ color:'white', fontFamily:"'Playfair Display',serif", marginBottom:10 }}>
              {summarizing ? 'Summarizing...' : (generationType === 'flashcards' ? 'Generating Flashcards' : (selected.size > 1 ? `Combining ${selected.size} Notes` : 'Generating Quiz'))}
            </h2>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:14, marginBottom:8 }}>
              {summarizing 
                ? 'Analyzing content to extract key points and find related YouTube videos...'
                : (generationType === 'flashcards' ? 'Reading your notes and extracting key concepts for flashcards…' : (selected.size > 1 ? 'Reading all selected notes and crafting comprehensive questions…' : 'Reading your notes and crafting questions…'))}
            </p>
            {selected.size > 1 && !summarizing && (
              <div style={{ marginBottom:16 }}>
                {selectedNotes.map((n, i) => (
                  <div key={n.id} style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:3, animation:`fadeUp 0.3s ease ${i*0.1}s both` }}>
                    📄 {n.title}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:'#E8A870', animation:`pulse 1.2s ease ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Notes & Quizzes</h1>
          <p>Upload notes — select one or more to generate a combined AI quiz.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selected.size > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                <CheckSquare size={14} /> Select All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={clearSelect}>
                <X size={14} /> Clear ({selected.size})
              </button>
            </>
          )}
          
          {/* All Quizzes button - only one at the top */}
          <button
            className="btn btn-ghost"
            onClick={handleOpenAllQuizzes}
            style={{ gap: 6, display: 'flex', alignItems: 'center' }}
            title={`View all ${allQuizzes.length} quizzes`}
          >
            <History size={14} /> 
            All Quizzes 
            {allQuizzes.length > 0 && (
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                marginLeft: 4,
              }}>
                {allQuizzes.length}
              </span>
            )}
          </button>
          
          <button
            className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => { setShowForm(!showForm); clearSelect(); }}
          >
            {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Upload Note</>}
          </button>
        </div>
      </div>

      {/* ── Upload Form ── */}
      {showForm && (
        <div className="card slide-in" style={{ marginBottom:22, border:'2px solid var(--primary)' }}>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Upload Study Note</h3>
          <p style={{ fontSize:12, color:'var(--muted)', marginBottom:18 }}>
            Supported: PDF, TXT, JPG, PNG · Max 10MB
          </p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver ? 'var(--primary)' : form.file ? 'var(--success)' : 'var(--border)'}`,
              borderRadius:10, padding:'28px 20px', textAlign:'center',
              background: dragOver ? 'var(--primary)10' : form.file ? '#DCFCE730' : 'var(--bg)',
              cursor:'pointer', marginBottom:16, transition:'all 0.2s',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png"
              onChange={e => handleFileSelect(e.target.files[0])}
              style={{ display:'none' }} />
            {form.file ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
                <FileIcon type={form.file.type.includes('pdf') ? 'pdf' : form.file.type.includes('text') ? 'txt' : 'img'} />
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{form.file.name}</div>
                  <div style={{ fontSize:12, color:'var(--success)', fontWeight:600 }}>
                    ✓ Ready · {(form.file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); set('file', null); }}
                  style={{ marginLeft:8, background:'#FEE2E2', color:'var(--danger)', border:'none', borderRadius:6, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} color="var(--muted)" strokeWidth={1.5} style={{ marginBottom:10 }} />
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Drag & drop or click to browse</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>PDF, TXT, JPG, PNG up to 10MB</div>
              </>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:4, letterSpacing:'0.8px' }}>NOTE TITLE *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Chapter 3 — Data Structures" />
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:4, letterSpacing:'0.8px' }}>SUBJECT (optional)</label>
              <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><span className="spinner" /> Uploading…</> : <><Upload size={14} /> Upload Note</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── YouTube Video Summarizer ── */}
      {!showForm && (
        <div className="card fade-up" style={{ marginBottom:18, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', background:'var(--card)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:200 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255, 0, 0, 0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <PlayCircle size={18} color="#FF0000" />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>YouTube Summarizer</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>Paste a link to extract key points</div>
            </div>
          </div>
          <div style={{ flex:1, display:'flex', gap:10, minWidth:280 }}>
            <input 
              type="url" 
              placeholder="https://youtube.com/watch?v=..." 
              value={youtubeUrl} 
              onChange={e => setYoutubeUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSummarizeYoutube()}
              style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:14 }}
            />
            <button 
              onClick={handleSummarizeYoutube} 
              disabled={summarizing || !youtubeUrl.trim()}
              style={{
                padding:'0 16px', borderRadius:10, border:'none', background:'var(--primary)', color:'white', fontWeight:600, fontSize:13,
                cursor: summarizing || !youtubeUrl.trim() ? 'not-allowed' : 'pointer', transition:'all 0.15s', opacity: summarizing || !youtubeUrl.trim() ? 0.6 : 1,
                display:'flex', alignItems:'center', gap:6
              }}
            >
              {summarizing ? <><span className="spinner" style={{ width:12, height:12, borderWidth:2, borderColor:'white', borderTopColor:'transparent' }} /> ...</> : 'Summarize'}
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      {!showForm && notes.length > 0 && (
        <div className="card fade-up" style={{ marginBottom: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Search input */}
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={15} color="var(--muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search notes by title or filename…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 13, transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Subject filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="var(--muted)" />
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                cursor: 'pointer', minWidth: 150,
              }}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {filterSubject && (
              <button
                onClick={() => setFilterSubject('')}
                style={{ background: 'var(--light)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Result count */}
          {(searchQuery || filterSubject) && (
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {filteredNotes.length} of {notes.length} notes
            </span>
          )}
        </div>
      )}

      {/* ── Quiz Settings Bar ── */}
      {!showForm && notes.length > 0 && (
        <div className="card" style={{ marginBottom:18, padding:'12px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.8px' }}>
              QUIZ SETTINGS:
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Questions:</span>
              <div style={{ display:'flex', gap:4 }}>
                {Q_OPTIONS.map(n => (
                  <button key={n} type="button" onClick={() => set('num_questions', n)}
                    style={{ padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700, border:`2px solid ${form.num_questions === n ? 'var(--primary)' : 'var(--border)'}`, background: form.num_questions === n ? 'var(--primary)' : 'var(--bg)', color: form.num_questions === n ? 'white' : 'var(--muted)', cursor:'pointer', transition:'all 0.15s' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Difficulty:</span>
              <div style={{ display:'flex', gap:4 }}>
                {DIFF_OPTIONS.map(d => (
                  <button key={d.value} type="button" onClick={() => set('difficulty', d.value)}
                    title={d.desc}
                    style={{ padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:600, border:`2px solid ${form.difficulty === d.value ? 'var(--primary)' : 'var(--border)'}`, background: form.difficulty === d.value ? 'var(--primary)' : 'var(--bg)', color: form.difficulty === d.value ? 'white' : 'var(--muted)', cursor:'pointer', transition:'all 0.15s' }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Note cards ── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ display:'flex', gap:14, padding:'16px 18px', alignItems:'center' }}>
              <div className="skeleton" style={{ width:44, height:44, borderRadius:8 }} />
              <div style={{ flex:1 }}>
                <div className="skeleton" style={{ height:14, width:'40%', marginBottom:8 }} />
                <div className="skeleton" style={{ height:11, width:'60%' }} />
              </div>
              <div className="skeleton" style={{ width:120, height:34, borderRadius:8 }} />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><BookOpen size={48} color="var(--light)" /></div>
          <h3>No notes yet</h3>
          <p>Upload lecture notes, textbook pages, or study materials to generate AI-powered quizzes.</p>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowForm(true)}>
            <Upload size={14} /> Upload First Note
          </button>
        </div>
      ) : filteredNotes.length === 0 && (searchQuery || filterSubject) ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="icon"><Search size={48} color="var(--light)" /></div>
          <h3>No notes match your search</h3>
          <p>Try adjusting your search term or clearing the subject filter.</p>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => { setSearchQuery(''); setFilterSubject(''); }}>
            <X size={14} /> Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filteredNotes.map(note => {
            const isSelected = selected.has(note.id);
            return (
              <div key={note.id}
                className="card"
                style={{
                  padding:'14px 18px',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary)06' : 'var(--card)',
                  transition:'all 0.15s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <button
                    onClick={() => { toggleSelect(note.id); if (!selectMode) setSelectMode(true); }}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:2, flexShrink:0, color: isSelected ? 'var(--primary)' : 'var(--border)', transition:'color 0.15s' }}
                    title={isSelected ? 'Deselect' : 'Select for combined quiz'}
                  >
                    {isSelected ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--border)" />}
                  </button>

                  <FileIcon type={note.type_group} size={40} />

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{note.title}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{note.original_filename}</span>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>· {note.file_size}</span>
                      {note.subject && (
                        <span style={{ fontSize:11, padding:'1px 7px', borderRadius:4, background:'var(--primary)15', color:'var(--primary)', fontWeight:600 }}>
                          {note.subject.name}
                        </span>
                      )}
                      {note.quiz_count > 0 && (
                        <span style={{ fontSize:11, color:'var(--teal)', fontWeight:600 }}>
                          · {note.quiz_count} quiz{note.quiz_count !== 1 ? 'zes' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      <Clock size={10} style={{ marginRight:4, verticalAlign:'middle' }} />
                      {note.created_at}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                    {note.latest_quiz && (
                      <button onClick={() => nav(`/quiz/${note.latest_quiz}`)}
                        className="btn btn-ghost btn-sm" style={{ gap:5 }}>
                        <Award size={13} /> Latest Quiz
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateSingle(note)}
                      disabled={generating}
                      style={{
                        display:'flex', alignItems:'center', gap:6,
                        padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                        background: genSingle === note.id ? 'var(--teal)' : 'var(--primary)',
                        color:'white', border:'none', cursor: generating ? 'wait' : 'pointer',
                        opacity: generating && genSingle !== note.id ? 0.5 : 1,
                        transition:'all 0.15s',
                      }}
                    >
                      {genSingle === note.id
                        ? <><span className="spinner" style={{ width:13, height:13, borderWidth:2 }} /> Generating…</>
                        : <><Brain size={13} /> Generate Quiz</>}
                    </button>

                    <button
                      onClick={() => handleSummarizeSingle(note)}
                      disabled={summarizing || generating}
                      style={{
                        display:'flex', alignItems:'center', gap:6,
                        padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                        background: sumSingle === note.id ? 'var(--primary)' : 'var(--card-alt)',
                        color: sumSingle === note.id ? 'white' : 'var(--primary)', 
                        border:'1px solid var(--primary)', cursor: (summarizing || generating) ? 'wait' : 'pointer',
                        opacity: (summarizing || generating) && sumSingle !== note.id ? 0.5 : 1,
                        transition:'all 0.15s',
                      }}
                    >
                      {sumSingle === note.id
                        ? <><span className="spinner" style={{ width:13, height:13, borderWidth:2, borderColor:'white', borderTopColor:'transparent' }} /> ...</>
                        : <><AlignLeft size={13} /> Summarize</>}
                    </button>

                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width:34, height:34, borderRadius:8, background:'var(--light)', color:'var(--text)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--light)'}
                      title="View Note File"
                    >
                      <Eye size={14} />
                    </a>

                    <button
                      onClick={() => openEditModal(note)}
                      disabled={deleting === note.id}
                      style={{
                        width:34, height:34, borderRadius:8, background:'var(--light)', color:'var(--text)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--light)'}
                      title="Edit Note"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button onClick={() => handleDelete(note.id)} disabled={deleting === note.id}
                      style={{ width:34, height:34, borderRadius:8, background:'#FEE2E2', color:'var(--danger)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                      onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
                    >
                      {deleting === note.id ? '…' : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasMoreNotes && (
            <button
              onClick={loadMoreNotes}
              style={{
                padding: '14px', borderRadius: 10, background: 'var(--card)', color: 'var(--primary)',
                border: '1px solid var(--border)', fontWeight: 600, cursor: 'pointer',
                width: '100%', marginTop: 4, transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
            >
              Load More Notes
            </button>
          )}
        </div>
      )}

      {/* Floating Action Bar */}
      {selected.size > 0 && (
        <div
          className="fade-up"
          style={{
            position: 'fixed',
            bottom: 24,
            left: 'calc(var(--sidebar-w) + 24px)',
            right: '24px',
            transform: 'none',
            width: 'auto',
            maxWidth: '1200px',
            background: 'rgba(74, 42, 20, 0.97)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '18px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            zIndex: 300,
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Top Row: Note Info & Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {selected.size} note{selected.size !== 1 ? 's' : ''} selected:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedNotes.map(n => (
                  <div key={n.id} style={{
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: 160,
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📄 {n.title}
                    </span>
                    <button onClick={() => toggleSelect(n.id)} style={{
                      border: 'none', background: 'none', color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                    }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={clearSelect} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              flexShrink: 0
            }}>
              <X size={14} />
            </button>
          </div>

          {/* Separation Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

          {/* Bottom Row: Settings & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            
            {/* Left part: Configurations */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              
              {/* Questions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  Questions:
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Q_OPTIONS.map(n => (
                    <button key={n} onClick={() => set('num_questions', n)} style={{
                      width: 36, height: 36, borderRadius: 8,
                      border: form.num_questions === n ? '2px solid #FFBE7B' : '1px solid rgba(255,255,255,0.12)',
                      background: form.num_questions === n ? 'rgba(255,190,123,0.18)' : 'rgba(255,255,255,0.04)',
                      color: form.num_questions === n ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontWeight: 700, cursor: 'pointer', fontSize: 12, transition: 'all 0.15s'
                    }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  Difficulty:
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {DIFF_OPTIONS.map(d => (
                    <button key={d.value} onClick={() => set('difficulty', d.value)} style={{
                      padding: '0 12px', height: 36, borderRadius: 8,
                      border: form.difficulty === d.value ? '2px solid #FFBE7B' : '1px solid rgba(255,255,255,0.12)',
                      background: form.difficulty === d.value ? 'rgba(255,190,123,0.18)' : 'rgba(255,255,255,0.04)',
                      color: form.difficulty === d.value ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                    }}>
                      {d.value === 'easy' && '🟢 Easy'}
                      {d.value === 'medium' && '🟡 Medium'}
                      {d.value === 'hard' && '🔴 Hard'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right part: Actions */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={handleSummarizeMulti} disabled={summarizing || generating} style={{
                height: 38, padding: '0 18px', borderRadius: 10, border: 'none',
                background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: (summarizing || generating) ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap', transition: 'background 0.15s'
              }}>
                {summarizing ? <><span className="spinner" style={{ width:12, height:12 }} /> Summarizing...</> : <><AlignLeft size={14} /> Summarize Notes</>}
              </button>

              <button onClick={handleGenerateFlashcardsMulti} disabled={generating} style={{
                height: 38, padding: '0 18px', borderRadius: 10, border: 'none',
                background: '#2F9E69', color: 'white', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: generating ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap', transition: 'background 0.15s'
              }}>
                {generating ? <><span className="spinner" style={{ width:12, height:12 }} /> Generating...</> : <>🃏 Flashcards</>}
              </button>

              <button onClick={handleGenerateMulti} disabled={generating} style={{
                height: 38, padding: '0 18px', borderRadius: 10, border: 'none',
                background: '#D88945', color: 'white', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: generating ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap', transition: 'background 0.15s'
              }}>
                {generating ? <><span className="spinner" style={{ width:12, height:12 }} /> Generating...</> : <><Brain size={14} /> Generate Quiz</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}