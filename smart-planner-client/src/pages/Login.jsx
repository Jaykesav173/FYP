import { useState, useMemo } from 'react';
import { useNavigate }        from 'react-router-dom';
import { loginUser, registerUser, forgotPassword } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Eye Icons ─────────────────────────────────────────────────────────────────
function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function PasswordInput({ placeholder, value, onChange, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={{ width:'100%', padding:'10px 42px 10px 14px', borderRadius:8, fontSize:13, border:'1.5px solid #D4B896', background:'#FFFDF9', outline:'none', boxSizing:'border-box' }}
        onFocus={e => e.target.style.borderColor = '#8B5A2B'}
        onBlur={e  => e.target.style.borderColor = '#D4B896'}
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color: show ? '#8B5A2B' : '#B09070', padding:2, display:'flex', alignItems:'center', transition:'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#6B3A1F'}
        onMouseLeave={e => e.currentTarget.style.color = show ? '#8B5A2B' : '#B09070'}
      >
        {show ? <EyeOpen /> : <EyeOff />}
      </button>
    </div>
  );
}

// ── Password Rules ─────────────────────────────────────────────────────────────
const RULES = [
  { id:'length',  label:'At least 8 characters',               test: p => p.length >= 8           },
  { id:'number',  label:'At least 1 number (0–9)',              test: p => /[0-9]/.test(p)         },
  { id:'special', label:'At least 1 special character (!@#...)',test: p => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }) {
  const passed = RULES.filter(r => r.test(password)).length;
  const colors = ['#E5E7EB','#EF4444','#F59E0B','#22C55E'];
  const labels = ['','Weak','Fair','Strong'];
  const color  = password.length === 0 ? colors[0] : colors[passed];
  const label  = password.length === 0 ? ''         : labels[passed];
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[1,2,3].map(seg => (
          <div key={seg} style={{ flex:1, height:4, borderRadius:4, background: passed >= seg && password.length > 0 ? color : '#E8D5BC', transition:'background 0.3s' }} />
        ))}
      </div>
      {label && <div style={{ fontSize:11, fontWeight:600, color, textAlign:'right', marginBottom:8 }}>{label}</div>}
    </div>
  );
}

function RuleItem({ label, passed, touched }) {
  const color  = !touched ? '#9B8070' : passed ? '#16A34A' : '#DC2626';
  const bg     = !touched ? '#F5EDE3' : passed ? '#DCFCE7' : '#FEE2E2';
  const border = !touched ? '#E8D5BC' : passed ? '#BBF7D0' : '#FECACA';
  const icon   = !touched ? '○'       : passed ? '✓'       : '✕';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:7, background:bg, border:`1px solid ${border}`, transition:'all 0.25s' }}>
      <span style={{ fontSize:12, fontWeight:700, color, width:16, textAlign:'center' }}>{icon}</span>
      <span style={{ fontSize:12, color, fontWeight: passed ? 600 : 400 }}>{label}</span>
    </div>
  );
}

// ── Forgot Password View ───────────────────────────────────────────────────────
function ForgotPasswordView({ onBack }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign:'center', padding:'8px 0' }}>
        <div style={{ fontSize:52, marginBottom:16 }}>📬</div>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'var(--primary)', marginBottom:8 }}>
          Check your inbox!
        </h3>
        <p style={{ fontSize:13, color:'#5C3D1E', lineHeight:1.7, marginBottom:20 }}>
          If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
          Check your spam folder if you don't see it.
        </p>
        <div style={{ padding:'11px 14px', borderRadius:8, background:'#F9F1E8', border:'1px solid #E8D5BC', fontSize:12, color:'#8B6040', marginBottom:20 }}>
          ⏱ The link expires in <strong>60 minutes</strong>.
        </div>
        <button onClick={onBack}
          style={{ fontSize:13, color:'#6B3A1F', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontWeight:600 }}>
          ← Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:10 }}>🔐</div>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#6B3A1F', marginBottom:6 }}>
          Forgot your password?
        </h3>
        <p style={{ fontSize:13, color:'#8B6040', lineHeight:1.6 }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div style={{ padding:'11px 14px', borderRadius:8, background:'#FEE2E2', color:'#C0483E', border:'1px solid #FECACA', fontSize:13, marginBottom:16 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', display:'block', marginBottom:6, letterSpacing:'0.8px' }}>
          EMAIL ADDRESS
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ width:'100%', padding:'10px 14px', borderRadius:8, fontSize:13, border:'1.5px solid #D4B896', background:'#FFFDF9', outline:'none', boxSizing:'border-box' }}
          onFocus={e => e.target.style.borderColor = '#8B5A2B'}
          onBlur={e  => e.target.style.borderColor = '#D4B896'}
        />
      </div>

      <button onClick={handleSend} disabled={loading}
        style={{
          width:'100%', padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:700,
          background: loading ? '#B08060' : 'linear-gradient(135deg,#6B3A1F,#8B5A2B)',
          color:'#FFFFFF', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow:'0 4px 16px rgba(107,58,31,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          marginBottom:16,
        }}>
        {loading ? (
          <><span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Sending…</>
        ) : 'Send Reset Link →'}
      </button>

      <div style={{ textAlign:'center' }}>
        <button onClick={onBack}
          style={{ fontSize:13, color:'#6B3A1F', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontWeight:600 }}>
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
}

// ── Main Login Page ────────────────────────────────────────────────────────────
export default function Login() {
  const [mode,        setMode]        = useState('login');
  const [showForgot,  setShowForgot]  = useState(false);
  const [form,        setForm]        = useState({ name:'', email:'', password:'', password_confirmation:'' });
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [touched,     setTouched]     = useState(false);

  const { login } = useAuth();
  const nav        = useNavigate();
  const set        = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const ruleResults    = useMemo(() => RULES.map(r => ({ ...r, passed: r.test(form.password) })), [form.password]);
  const allRulesPassed = ruleResults.every(r => r.passed);

  const handlePasswordChange = e => {
    set('password', e.target.value);
    if (!touched && e.target.value.length > 0) setTouched(true);
  };

  const handleModeSwitch = m => {
    setMode(m); setError(''); setTouched(false); setShowForgot(false);
    setForm({ name:'', email:'', password:'', password_confirmation:'' });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    if (mode === 'register') {
      if (!form.name.trim())  { setError('Full name is required.'); return; }
      if (!allRulesPassed)    { setError('Please meet all password requirements.'); return; }
      if (form.password !== form.password_confirmation) { setError('Passwords do not match.'); return; }
    }
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await loginUser({ email: form.email, password: form.password })
        : await registerUser(form);
      
      console.log('API Response:', res);
      console.log('Token received:', res.token);
      console.log('User received:', res.user);
      
      if (res.token && res.user) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        
        login(res.token, res.user);
        
        console.log('Saved to localStorage. Token length:', res.token.length);
        console.log('Verification - Token exists:', !!localStorage.getItem('token'));
        
        nav('/');
      } else {
        console.error('Missing token or user in response:', res);
        setError('Invalid server response');
      }
    } catch (e) {
      console.error('Login error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#3E1F00 0%,#6B3A1F 30%,#8B5A2B 60%,#A0522D 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, position:'relative', overflow:'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', top:-150, right:-150, background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', bottom:-100, left:-100, background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:30, backdropFilter:'blur(8px)' }}>
            📚
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:'#FFFFFF', lineHeight:1, textShadow:'0 2px 12px rgba(0,0,0,0.3)' }}>
            Smart<span style={{ color:'#F4C07A' }}>Planner</span>
          </div>
          <div style={{ color:'rgba(255,255,255,0.55)', fontSize:11, marginTop:7, letterSpacing:'2px', fontWeight:500 }}>
            ADAPTIVE AI STUDY PLANNER
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:18, padding:36, boxShadow:'0 24px 64px rgba(0,0,0,0.35)' }}>

          {/* ── Forgot Password View ── */}
          {showForgot ? (
            <ForgotPasswordView onBack={() => setShowForgot(false)} />
          ) : (
            <>
              {/* Tab switcher */}
              <div style={{ display:'flex', background:'#F5EDE3', borderRadius:10, padding:4, marginBottom:26 }}>
                {['login','register'].map(m => (
                  <button key={m} onClick={() => handleModeSwitch(m)}
                    style={{
                      flex:1, padding:'9px 0', borderRadius:7, fontSize:13, fontWeight:600,
                      background: mode === m ? '#6B3A1F' : 'transparent',
                      color:      mode === m ? '#FFFFFF'  : '#9B7355',
                      boxShadow:  mode === m ? '0 2px 8px rgba(107,58,31,0.35)' : 'none',
                      transition:'all 0.2s', border:'none', cursor:'pointer',
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div style={{ padding:'11px 14px', borderRadius:8, background:'#FEE2E2', color:'#C0483E', border:'1px solid #FECACA', fontSize:13, marginBottom:16 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                  {mode === 'register' && (
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', display:'block', marginBottom:6, letterSpacing:'0.8px' }}>FULL NAME</label>
                      <input placeholder="e.g. Jaykesav Menon" value={form.name}
                        onChange={e => set('name', e.target.value)}
                        style={{ width:'100%', padding:'10px 14px', borderRadius:8, fontSize:13, border:'1.5px solid #D4B896', background:'#FFFDF9', outline:'none', boxSizing:'border-box' }}
                        onFocus={e => e.target.style.borderColor = '#8B5A2B'}
                        onBlur={e  => e.target.style.borderColor = '#D4B896'}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', display:'block', marginBottom:6, letterSpacing:'0.8px' }}>EMAIL ADDRESS</label>
                    <input type="email" placeholder="you@example.com" value={form.email}
                      onChange={e => set('email', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                      style={{ width:'100%', padding:'10px 14px', borderRadius:8, fontSize:13, border:'1.5px solid #D4B896', background:'#FFFDF9', outline:'none', boxSizing:'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#8B5A2B'}
                      onBlur={e  => e.target.style.borderColor = '#D4B896'}
                    />
                  </div>

                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', letterSpacing:'0.8px' }}>PASSWORD</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => setShowForgot(true)}
                          style={{ fontSize:11, color:'#8B5A2B', background:'none', border:'none', cursor:'pointer', fontWeight:600, textDecoration:'underline', padding:0 }}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <PasswordInput
                      placeholder={mode === 'register' ? 'Create a strong password' : '••••••••'}
                      value={form.password}
                      onChange={handlePasswordChange}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                    />

                    {mode === 'register' && (
                      <div style={{ marginTop:10 }}>
                        <PasswordStrength password={form.password} />
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {ruleResults.map(rule => (
                            <RuleItem key={rule.id} label={rule.label} passed={rule.passed} touched={touched} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', display:'block', marginBottom:6, letterSpacing:'0.8px' }}>CONFIRM PASSWORD</label>
                      <PasswordInput
                        placeholder="Repeat your password"
                        value={form.password_confirmation}
                        onChange={e => set('password_confirmation', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                      />
                      {form.password_confirmation.length > 0 && (
                        <div style={{ marginTop:6, fontSize:12, fontWeight:600, color: form.password === form.password_confirmation ? '#16A34A' : '#DC2626', display:'flex', alignItems:'center', gap:5 }}>
                          {form.password === form.password_confirmation ? '✓ Passwords match' : '✕ Passwords do not match'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  style={{
                    width:'100%', marginTop:24, padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:700,
                    background: loading ? '#B08060' : 'linear-gradient(135deg,#6B3A1F,#8B5A2B)',
                    color:'#FFFFFF', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow:'0 4px 16px rgba(107,58,31,0.4)',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    transition:'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {loading ? (
                    <><span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                  ) : (
                    mode === 'login' ? 'Sign In →' : 'Create Account →'
                  )}
                </button>
              </form>


            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
          Smart Study Planner · FYP · B032410882 · Jaykesav Menon
        </div>
      </div>
    </div>
  );
}