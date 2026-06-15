import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Award, RotateCcw, ChevronRight, BookOpen, Brain } from 'lucide-react';
import { getPublicQuiz, attemptPublicQuiz }  from '../api/client';
import { useToast }                    from '../components/Toast';

const DIFF_COLORS = { easy:'#15803D', medium:'#92400E', hard:'#991B1B' };

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

export default function PublicQuizPlayer() {
  const { token } = useParams();
  const nav       = useNavigate();
  const { addToast } = useToast();

  const [quiz,      setQuiz]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [phase,     setPhase]     = useState('intro');
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [results,   setResults]   = useState(null);
  const [submitting,setSubmitting]= useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [showReview,setShowReview]= useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    getPublicQuiz(token)
      .then(r => setQuiz(r.quiz))
      .catch(e => { addToast(e.message, 'error'); nav('/login'); })
      .finally(() => setLoading(false));
  }, [token, addToast, nav]);

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

  const handleNext = async () => {
    if (selected === null) {
      addToast('Please select an answer!', 'warning');
      return;
    }
    if (current < quiz.questions.length - 1) {
      setAnswers(prev => {
        const n = [...prev];
        n[current] = selected;
        return n;
      });
      setCurrent(c => c + 1);
      setSelected(answers[current + 1] !== -1 ? answers[current + 1] : null);
    } else {
      setSubmitting(true);
      try {
        const finalAnswers = [...answers];
        finalAnswers[current] = selected;
        const res = await attemptPublicQuiz(token, { answers: finalAnswers });
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign:'center', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:12, animation:'pulse 1.4s ease infinite' }}>🧠</div>
          <p>Loading public quiz…</p>
        </div>
      </div>
    );
  }

  const questions   = quiz?.questions ?? [];
  const currentQ    = questions[current];
  const progress    = questions.length > 0 ? ((current + (selected !== null ? 1 : 0)) / questions.length) * 100 : 0;

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card fade-up" style={{ textAlign:'center', padding:48, maxWidth: 600, width: '100%' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--primary)15', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
            <Brain size={38} color="var(--primary)" strokeWidth={1.5} />
          </div>

          <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>SHARED QUIZ</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, marginBottom:12, color:'var(--text)' }}>
            {quiz.title}
          </h1>
          <p style={{ color:'var(--muted)', fontSize:15, marginBottom:28 }}>
            Created by: <strong>{quiz.author}</strong>
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20, marginBottom:36 }}>
            <div style={{ padding:'20px 16px', borderRadius:12, background:'var(--card-alt)', textAlign:'center' }}>
              <div style={{ color:'var(--primary)', marginBottom:10 }}><BookOpen size={22} style={{margin:'0 auto'}}/></div>
              <div style={{ fontSize:24, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{quiz.num_questions}</div>
              <div style={{ fontSize:13, color:'var(--muted)' }}>Questions</div>
            </div>
            <div style={{ padding:'20px 16px', borderRadius:12, background:'var(--card-alt)', textAlign:'center' }}>
              <div style={{ color:'var(--primary)', marginBottom:10 }}><Award size={22} style={{margin:'0 auto'}}/></div>
              <div style={{ fontSize:24, fontWeight:700, color:'var(--text)', marginBottom:6, textTransform:'capitalize', color: DIFF_COLORS[quiz.difficulty] }}>{quiz.difficulty}</div>
              <div style={{ fontSize:13, color:'var(--muted)' }}>Difficulty</div>
            </div>
          </div>

          <button onClick={startQuiz}
            style={{
              width:'100%', padding:'18px 0', borderRadius:12, fontSize:16, fontWeight:700,
              background:'linear-gradient(135deg,var(--primary),var(--teal))',
              color:'white', border:'none', cursor:'pointer',
              boxShadow:'0 4px 20px rgba(107,58,31,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            }}>
            Start Quiz <ChevronRight size={18} />
          </button>
          
          <button onClick={() => nav('/login')}
            style={{ marginTop:24, fontSize:14, color:'var(--muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Create your own quizzes on SmartPlanner
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results' && results) {
    const { score, total, percentage } = results;
    const grade = percentage >= 90 ? '🏆 Excellent!' : percentage >= 75 ? '🌟 Great job!' : percentage >= 50 ? '📈 Keep going!' : '💪 Keep studying!';

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px' }}>
        <div className="card fade-up" style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign:'center', padding:'10px 0 24px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{grade.split(' ')[0]}</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:4 }}>{grade.slice(2)}</h2>
            <p style={{ color:'var(--muted)', fontSize:13 }}>{quiz.title}</p>
          </div>

          <ScoreRing percentage={percentage} />

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, margin:'24px 0' }}>
            <div style={{ padding:16, borderRadius:12, background:'var(--card-alt)', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--success)', marginBottom:4 }}>{score}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Correct</div>
            </div>
            <div style={{ padding:16, borderRadius:12, background:'var(--card-alt)', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--danger)', marginBottom:4 }}>{total - score}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Incorrect</div>
            </div>
            <div style={{ padding:16, borderRadius:12, background:'var(--card-alt)', textAlign:'center' }}>
              <div className="mono" style={{ fontSize:20, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{formatTime(elapsed)}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Time</div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <button className="btn" onClick={retake} style={{ flex:1, padding:14 }}>
              <RotateCcw size={16} /> Retake Quiz
            </button>
            <button className="btn btn-primary" onClick={() => setShowReview(!showReview)} style={{ flex:1, padding:14 }}>
              <BookOpen size={16} /> {showReview ? 'Hide Review' : 'Review Answers'}
            </button>
          </div>

          {showReview && (
            <div className="fade-up" style={{ marginTop:32, paddingTop:32, borderTop:'1px solid var(--border)' }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Detailed Review</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {results.results.map((r, i) => (
                  <div key={i} style={{ padding:20, borderRadius:12, border:`1px solid ${r.is_correct ? '#15803D40' : '#991B1B40'}`, background: r.is_correct ? '#15803D08' : '#991B1B08' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
                      {r.is_correct ? <CheckCircle2 color="#15803D" size={20} style={{ flexShrink:0, marginTop:2 }} /> : <XCircle color="#991B1B" size={20} style={{ flexShrink:0, marginTop:2 }} />}
                      <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', lineHeight:1.5 }}>{r.question}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, paddingLeft:30 }}>
                      {r.options.map((opt, oi) => {
                        let bg = 'var(--bg)';
                        let border = '1px solid var(--border)';
                        if (oi === r.correct_index) { bg = '#DCFCE7'; border = '1px solid #22C55E'; }
                        else if (!r.is_correct && oi === r.selected) { bg = '#FEE2E2'; border = '1px solid #EF4444'; }
                        return (
                          <div key={oi} style={{ padding:'10px 14px', borderRadius:8, background:bg, border:border, fontSize:14, color:'var(--text)' }}>
                            {String.fromCharCode(65+oi)}. {opt}
                          </div>
                        );
                      })}
                    </div>
                    {r.explanation && (
                      <div style={{ margin:'16px 0 0 30px', padding:12, background:'var(--card)', borderRadius:8, border:'1px solid var(--border)', fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>
                        <strong style={{ color:'var(--text)' }}>Explanation:</strong> {r.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px' }}>
      <div className="card fade-up" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--muted)' }}>
            Question {current + 1} <span style={{ opacity:0.5 }}>/ {questions.length}</span>
          </div>
          <div className="mono" style={{ fontSize:14, fontWeight:700, color:'var(--primary)', display:'flex', alignItems:'center', gap:6 }}>
            <Clock size={16} /> {formatTime(elapsed)}
          </div>
        </div>

        <div style={{ width:'100%', height:6, background:'var(--bg)', borderRadius:3, marginBottom:32, overflow:'hidden' }}>
          <div style={{ width:`${progress}%`, height:'100%', background:'var(--primary)', transition:'width 0.4s ease' }} />
        </div>

        <h2 style={{ fontSize:22, fontWeight:600, color:'var(--text)', marginBottom:32, lineHeight:1.5 }}>
          {currentQ.question}
        </h2>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
          {currentQ.options.map((opt, i) => (
            <button key={i} onClick={() => setSelected(i)}
              style={{
                textAlign:'left', padding:'16px 20px', borderRadius:12,
                border: selected === i ? '2px solid var(--primary)' : '2px solid var(--border)',
                background: selected === i ? 'var(--primary)05' : 'var(--card)',
                color: selected === i ? 'var(--primary)' : 'var(--text)',
                fontSize:15, fontWeight: selected === i ? 600 : 500, cursor:'pointer',
                transition:'all 0.2s', display:'flex', alignItems:'center', gap:12,
              }}>
              <div style={{ width:26, height:26, borderRadius:'50%', border: selected === i ? 'none' : '1px solid var(--muted)', background: selected === i ? 'var(--primary)' : 'transparent', color: selected === i ? 'white' : 'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                {String.fromCharCode(65+i)}
              </div>
              {opt}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button className="btn btn-ghost" onClick={() => { if(current>0) { setCurrent(c=>c-1); setSelected(answers[current-1]); } }} disabled={current === 0}>
            ← Previous
          </button>
          <button className="btn btn-primary" onClick={handleNext} disabled={selected === null || submitting} style={{ minWidth:140, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {submitting ? <span className="spinner" /> : current === questions.length - 1 ? 'Submit Quiz' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );
}
