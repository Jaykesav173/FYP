import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Award, RotateCcw, ChevronRight, BookOpen, Brain } from 'lucide-react';
import { getQuiz, submitQuizAttempt, toggleQuizShare }  from '../api/client';
import { useToast }                    from '../components/Toast';

const DIFF_COLORS = { easy:'#15803D', medium:'#92400E', hard:'#991B1B' };

// ── Score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ percentage }) {
  const r   = 54;
  const c   = 2 * Math.PI * r;
  const off = c * (1 - percentage / 100);
  const col = percentage >= 80 ? '#15803D' : percentage >= 50 ? '#C97D1A' : '#C0483E';

  return (
    <div style={{ position:'relative', width:130, height:130, margin:'0 auto' }}>
      <svg width="130" height="130" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--light)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={col} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.5s ease' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div className="mono" style={{ fontSize:28, fontWeight:700, color:col, lineHeight:1 }}>{percentage}%</div>
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Score</div>
      </div>
    </div>
  );
}

export default function QuizPlayer() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const { addToast } = useToast();

  const [quiz,      setQuiz]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [phase,     setPhase]     = useState('intro');   // intro | playing | results
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState([]);
  const [selected,  setSelected]  = useState(null);     // index selected for current Q
  const [results,   setResults]   = useState(null);
  const [submitting,setSubmitting]= useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [showReview,setShowReview]= useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    getQuiz(id)
      .then(r => {
        setQuiz(r.quiz);
        // Load saved state
        const saved = localStorage.getItem(`quiz_${id}_state`);
        if (saved) {
          try {
            const s = JSON.parse(saved);
            if (s.phase === 'playing') {
              setAnswers(s.answers);
              setCurrent(s.current);
              setElapsed(s.elapsed);
              setPhase(s.phase);
              setSelected(s.answers[s.current] !== -1 ? s.answers[s.current] : null);
            }
          } catch (e) {}
        }
      })
      .catch(e => { addToast(e.message, 'error'); nav('/notes'); })
      .finally(() => setLoading(false));
  }, [id]);

  // Save progress
  useEffect(() => {
    if (phase === 'playing') {
      localStorage.setItem(`quiz_${id}_state`, JSON.stringify({ answers, current, elapsed, phase }));
    }
  }, [answers, current, elapsed, phase, id]);

  // Timer
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const startQuiz = () => {
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setPhase('playing');
    setCurrent(0);
    setSelected(null);
    setElapsed(0);
  };

  const handleSelect = (idx) => {
    if (selected !== null) return; // already answered
    setSelected(idx);
    setAnswers(prev => {
      const next = [...prev];
      next[current] = idx;
      return next;
    });
  };

  const handleNext = async () => {
    if (current < quiz.questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
    } else {
      // Submit
      setSubmitting(true);
      try {
        const finalAnswers = [...answers];
        finalAnswers[current] = selected ?? -1;
        const res = await submitQuizAttempt(id, {
          answers: finalAnswers,
          time_taken_seconds: elapsed,
        });
        localStorage.removeItem(`quiz_${id}_state`); // Clear on finish
        setResults(res);
        setPhase('results');
      } catch (e) {
        addToast(e.message, 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const retake = () => {
    localStorage.removeItem(`quiz_${id}_state`); // Clear on retake
    setPhase('intro');
    setResults(null);
    setShowReview(false);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setElapsed(0);
  };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
        <div style={{ textAlign:'center', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:12, animation:'pulse 1.4s ease infinite' }}>🧠</div>
          <p>Loading quiz…</p>
        </div>
      </div>
    );
  }

  const questions   = quiz?.questions ?? [];
  const currentQ    = questions[current];
  const progress    = questions.length > 0 ? ((current + (selected !== null ? 1 : 0)) / questions.length) * 100 : 0;

  // ── INTRO SCREEN ─────────────────────────────────────────────────────────────
if (phase === 'intro') {
  return (
    <div className="page fade-up" style={{ padding:'32px 36px', maxWidth:1100 }}>
      <div className="card" style={{ textAlign:'center', padding:48 }}>
        {/* Icon */}
        <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--primary)15', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <Brain size={38} color="var(--primary)" strokeWidth={1.5} />
        </div>

        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, marginBottom:12, color:'var(--text)' }}>
          {quiz.title}
        </h1>
        <p style={{ color:'var(--muted)', fontSize:15, marginBottom:28 }}>
          From: <strong>{quiz.note_title}</strong>
        </p>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:36 }}>
          {[
            { icon: <BookOpen size={22} />, label:'Questions', value: quiz.num_questions },
            { icon: <Award size={22} />,    label:'Difficulty', value: <span style={{ textTransform:'capitalize', color: DIFF_COLORS[quiz.difficulty] }}>{quiz.difficulty}</span> },
            { icon: <Clock size={22} />,    label:'Best Score', value: quiz.best_score !== null ? `${quiz.best_score}%` : '—' },
          ].map((s, i) => (
            <div key={i} style={{ padding:'20px 16px', borderRadius:12, background:'var(--card-alt)', textAlign:'center' }}>
              <div style={{ color:'var(--primary)', marginBottom:10 }}>{s.icon}</div>
              <div style={{ fontSize:24, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{s.value}</div>
              <div style={{ fontSize:13, color:'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Attempt history */}
        {quiz.attempts?.length > 0 && (
          <div style={{ background:'var(--card-alt)', borderRadius:12, padding:'18px 24px', marginBottom:32, textAlign:'left' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:12, letterSpacing:'0.8px' }}>PREVIOUS ATTEMPTS</div>
            {quiz.attempts.slice(0,3).map((a, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14, color:'var(--muted)', padding:'8px 0', borderBottom: i < quiz.attempts.slice(0,3).length-1 ? '1px solid var(--border)' : 'none' }}>
                <span>{a.completed_at}</span>
                <span style={{ fontWeight:700, color: a.percentage >= 80 ? 'var(--success)' : a.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                  {a.score}/{a.total} ({a.percentage}%)
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={startQuiz}
            style={{
              flex: 1, padding:'18px 0', borderRadius:12, fontSize:16, fontWeight:700,
              background:'linear-gradient(135deg,var(--primary),var(--teal))',
              color:'white', border:'none', cursor:'pointer',
              boxShadow:'0 4px 20px rgba(107,58,31,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            }}>
            Start Quiz <ChevronRight size={18} />
          </button>
          
          <button onClick={async () => {
            try {
              const res = await toggleQuizShare(id);
              addToast(res.is_public ? 'Quiz is now public!' : 'Quiz is private again.', 'info');
              setQuiz(prev => ({ ...prev, is_public: res.is_public, share_token: res.share_token }));
            } catch (e) {
              addToast('Failed to toggle sharing: ' + e.message, 'error');
            }
          }}
            style={{
              flex: 1, padding:'18px 0', borderRadius:12, fontSize:16, fontWeight:700,
              background: quiz.is_public ? 'var(--card)' : 'var(--bg)',
              color: quiz.is_public ? 'var(--primary)' : 'var(--text)', border:'1px solid var(--border)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            }}>
            {quiz.is_public ? 'Unshare Quiz' : 'Make Public'}
          </button>
        </div>

        {quiz.is_public && quiz.share_token && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(216, 137, 69, 0.1)', borderRadius: 8, border: '1px dashed var(--primary)', fontSize: 13, color: 'var(--primary)', cursor: 'pointer', overflowWrap: 'break-word' }}
            onClick={() => {
              const url = `${window.location.origin}/public/quiz/${quiz.share_token}`;
              navigator.clipboard.writeText(url);
              addToast('Link copied to clipboard!', 'success');
            }}>
            Public Link: <strong>{window.location.origin}/public/quiz/{quiz.share_token}</strong> (Click to copy)
          </div>
        )}

        <button onClick={() => nav('/notes')}
          style={{ marginTop:16, fontSize:14, color:'var(--muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
          ← Back to Notes
        </button>
      </div>
    </div>
  );
}

  // ── RESULTS SCREEN ────────────────────────────────────────────────────────────
  if (phase === 'results' && results) {
    const { score, total, percentage } = results;
    const grade = percentage >= 90 ? '🏆 Excellent!' : percentage >= 75 ? '🌟 Great job!' : percentage >= 50 ? '📈 Keep going!' : '💪 Keep studying!';

    return (
      <div className="page fade-up" style={{ padding:'32px 36px', maxWidth:1100 }}>
        <div className="card" style={{ marginBottom:18 }}>
          {/* Header */}
          <div style={{ textAlign:'center', padding:'10px 0 24px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{grade.split(' ')[0]}</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:4 }}>{grade.slice(2)}</h2>
            <p style={{ color:'var(--muted)', fontSize:13 }}>{quiz.title}</p>
          </div>

          {/* Score ring */}
          <ScoreRing percentage={percentage} />

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, margin:'24px 0' }}>
            {[
              { label:'Correct',  value:`${score}/${total}`,         color:'var(--success)' },
              { label:'Score',    value:`${percentage}%`,             color: percentage >= 70 ? 'var(--success)' : 'var(--danger)' },
              { label:'Time',     value:formatTime(elapsed),          color:'var(--teal)'    },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'center', padding:'14px 10px', background:'var(--card-alt)', borderRadius:10 }}>
                <div className="mono" style={{ fontSize:22, fontWeight:700, color:s.color, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={retake} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
              <RotateCcw size={14} /> Retake Quiz
            </button>
            <button onClick={() => setShowReview(!showReview)} className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}>
              {showReview ? 'Hide Review' : '📋 Review Answers'}
            </button>
            <button onClick={() => nav('/notes')} className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Answer review */}
        {showReview && (
          <div className="fade-up">
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:14, color:'var(--text)' }}>Answer Review</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {results.results.map((r, i) => (
                <div key={i} className="card" style={{ border:`2px solid ${r.is_correct ? '#BBF7D0' : '#FECACA'}`, padding:'16px 18px' }}>
                  {/* Question */}
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background: r.is_correct ? '#DCFCE7' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {r.is_correct
                        ? <CheckCircle2 size={15} color="#15803D" />
                        : <XCircle size={15} color="#C0483E" />}
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:3 }}>QUESTION {i+1}</div>
                      <div style={{ fontSize:14, fontWeight:500, color:'var(--text)', lineHeight:1.5 }}>{r.question}</div>
                    </div>
                  </div>

                  {/* Options */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                    {r.options.map((opt, oi) => {
                      const isCorrect  = oi === r.correct_index;
                      const isSelected = oi === r.selected;
                      let bg     = 'var(--bg)';
                      let border = 'var(--border)';
                      let color  = 'var(--text)';
                      if (isCorrect)            { bg = '#DCFCE7'; border = '#86EFAC'; color = '#15803D'; }
                      else if (isSelected && !r.is_correct) { bg = '#FEE2E2'; border = '#FCA5A5'; color = '#991B1B'; }
                      return (
                        <div key={oi} style={{ padding:'8px 10px', borderRadius:7, background:bg, border:`1.5px solid ${border}`, fontSize:12, color, fontWeight: isCorrect || (isSelected && !r.is_correct) ? 600 : 400 }}>
                          <span style={{ fontSize:10, fontWeight:700, marginRight:6 }}>
                            {['A','B','C','D'][oi]}.
                          </span>
                          {opt}
                          {isCorrect  && <span style={{ float:'right' }}>✓</span>}
                          {isSelected && !r.is_correct && <span style={{ float:'right' }}>✗</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {r.explanation && (
                    <div style={{ padding:'8px 12px', borderRadius:7, background:'#FEF3C7', border:'1px solid #FDE68A', fontSize:12, color:'#92400E', lineHeight:1.6 }}>
                      💡 {r.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PLAYING SCREEN ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'32px 36px', maxWidth:1100 }}>

      {/* ── Top bar ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ fontSize:13, color:'var(--muted)' }}>
          <span className="mono" style={{ fontWeight:700, color:'var(--primary)', fontSize:15 }}>
            {current + 1}
          </span>
          <span style={{ color:'var(--muted)' }}>/{questions.length}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--muted)' }}>
          <Clock size={14} />
          <span className="mono">{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height:5, background:'var(--light)', borderRadius:3, marginBottom:28, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,var(--primary),var(--teal))', borderRadius:3, transition:'width 0.4s ease' }} />
      </div>

      {/* ── Question card ── */}
      <div className="card" style={{ marginBottom:18, padding:'28px 28px' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', letterSpacing:'1.5px', marginBottom:14 }}>
          QUESTION {current + 1} OF {questions.length}
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'var(--text)', lineHeight:1.5, marginBottom:0 }}>
          {currentQ?.question}
        </h2>
      </div>

      {/* ── Options ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
        {currentQ?.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect  = selected !== null && idx === currentQ.correct_index;
          const isWrong    = isSelected && idx !== currentQ.correct_index;

          let bg     = 'var(--card)';
          let border = 'var(--border)';
          let color  = 'var(--text)';
          let cursor = selected !== null ? 'default' : 'pointer';

          if (selected !== null) {
            if (isCorrect) { bg = '#DCFCE7'; border = '#86EFAC'; color = '#14532D'; }
            else if (isWrong) { bg = '#FEE2E2'; border = '#FCA5A5'; color = '#7F1D1D'; }
            else { bg = 'var(--bg)'; color = 'var(--muted)'; }
          } else if (isSelected) {
            bg = 'var(--primary)'; border = 'var(--primary)'; color = 'white';
          }

          return (
            <button key={idx}
              onClick={() => handleSelect(idx)}
              style={{
                padding:'14px 18px', borderRadius:10, textAlign:'left',
                background:bg, border:`2px solid ${border}`, color,
                fontSize:13, fontWeight: isSelected || isCorrect ? 600 : 400,
                cursor, transition:'all 0.2s', display:'flex', alignItems:'center', gap:12,
                boxShadow: isSelected && selected === null ? '0 2px 12px rgba(107,58,31,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (selected === null) e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { if (selected === null) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {/* Letter */}
              <div style={{
                width:28, height:28, borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700,
                background: isCorrect ? '#15803D' : isWrong ? '#C0483E' : isSelected ? 'rgba(255,255,255,0.25)' : 'var(--light)',
                color: isCorrect || isWrong || (isSelected && selected === null) ? 'white' : 'var(--muted)',
              }}>
                {isCorrect  ? <CheckCircle2 size={15} />  :
                 isWrong    ? <XCircle size={15} />        :
                 ['A','B','C','D'][idx]}
              </div>
              <span style={{ flex:1, lineHeight:1.5 }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* ── Explanation (shown after answering) ── */}
      {selected !== null && currentQ?.explanation && (
        <div className="slide-in" style={{
          padding:'12px 16px', borderRadius:10, marginBottom:18,
          background: selected === currentQ.correct_index ? '#DCFCE7' : '#FEF3C7',
          border: `1px solid ${selected === currentQ.correct_index ? '#86EFAC' : '#FDE68A'}`,
          fontSize:13, color: selected === currentQ.correct_index ? '#15803D' : '#92400E',
          lineHeight:1.7,
        }}>
          💡 {currentQ.explanation}
        </div>
      )}

      {/* ── Next / Submit button ── */}
      <button
        onClick={handleNext}
        disabled={selected === null || submitting}
        style={{
          width:'100%', padding:'13px 0', borderRadius:10, fontSize:14, fontWeight:700,
          background: selected === null ? 'var(--light)' : 'linear-gradient(135deg,var(--primary),var(--teal))',
          color: selected === null ? 'var(--muted)' : 'white',
          border:'none', cursor: selected === null ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          transition:'all 0.2s',
          boxShadow: selected !== null ? '0 4px 16px rgba(107,58,31,0.25)' : 'none',
        }}
      >
        {submitting
          ? <><span className="spinner" /> Submitting…</>
          : current < questions.length - 1
            ? <>Next Question <ChevronRight size={16} /></>
            : <>Submit Quiz <Award size={16} /></>}
      </button>
    </div>
  );
}