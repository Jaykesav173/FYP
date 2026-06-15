import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client';

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

function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:'relative' }}>
      <input type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange}
        style={{ width:'100%', padding:'10px 42px 10px 14px', borderRadius:8, fontSize:13, border:'1.5px solid #D4B896', background:'#FFFDF9', outline:'none', boxSizing:'border-box' }}
        onFocus={e => e.target.style.borderColor = '#8B5A2B'}
        onBlur={e  => e.target.style.borderColor = '#D4B896'}
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color: show ? '#8B5A2B' : '#B09070', padding:2, display:'flex', alignItems:'center' }}>
        {show ? <EyeOpen /> : <EyeOff />}
      </button>
    </div>
  );
}

export default function ResetPassword() {
  const [params]   = useSearchParams();
  const token      = params.get('token') ?? '';
  const email      = params.get('email') ?? '';

  const [password, setPassword]     = useState('');
  const [confirm,  setConfirm]      = useState('');
  const [loading,  setLoading]      = useState(false);
  const [error,    setError]        = useState('');
  const [success,  setSuccess]      = useState(false);
  const nav = useNavigate();

  const handleReset = async () => {
    setError('');
    if (!password)            { setError('Enter a new password.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (!/[0-9]/.test(password))         { setError('Password must include a number.'); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError('Password must include a special character.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await resetPassword({ token, email, password, password_confirmation: confirm });
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#3E1F00,#6B3A1F,#8B5A2B,#A0522D)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:'white' }}>
            Smart<span style={{ color:'#F4C07A' }}>Planner</span>
          </div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginTop:5, letterSpacing:'2px' }}>
            ADAPTIVE AI STUDY PLANNER
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:18, padding:36, boxShadow:'0 24px 64px rgba(0,0,0,0.35)' }}>

          {success ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'#6B3A1F', marginBottom:10 }}>
                Password Reset!
              </h3>
              <p style={{ fontSize:13, color:'#5C3D1E', lineHeight:1.7, marginBottom:24 }}>
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <button onClick={() => nav('/login')}
                style={{
                  width:'100%', padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:700,
                  background:'linear-gradient(135deg,#6B3A1F,#8B5A2B)',
                  color:'white', border:'none', cursor:'pointer',
                  boxShadow:'0 4px 16px rgba(107,58,31,0.4)',
                }}>
                Sign In Now →
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🔐</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#6B3A1F', marginBottom:6 }}>
                  Set New Password
                </h3>
                <p style={{ fontSize:13, color:'#8B6040' }}>
                  Create a strong password for <strong>{email}</strong>
                </p>
              </div>

              {error && (
                <div style={{ padding:'11px 14px', borderRadius:8, background:'#FEE2E2', color:'#C0483E', border:'1px solid #FECACA', fontSize:13, marginBottom:16 }}>
                  ⚠ {error}
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:24 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', display:'block', marginBottom:6, letterSpacing:'0.8px' }}>NEW PASSWORD</label>
                  <PasswordInput placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#7A4F2E', display:'block', marginBottom:6, letterSpacing:'0.8px' }}>CONFIRM PASSWORD</label>
                  <PasswordInput placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                  {confirm.length > 0 && (
                    <div style={{ marginTop:6, fontSize:12, fontWeight:600, color: password === confirm ? '#16A34A' : '#DC2626' }}>
                      {password === confirm ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </div>
                  )}
                </div>
              </div>

              {/* Password requirements */}
              <div style={{ background:'#F9F1E8', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:12, color:'#8B6040' }}>
                Password must have: 8+ characters · 1 number · 1 special character
              </div>

              <button onClick={handleReset} disabled={loading}
                style={{
                  width:'100%', padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:700,
                  background: loading ? '#B08060' : 'linear-gradient(135deg,#6B3A1F,#8B5A2B)',
                  color:'white', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow:'0 4px 16px rgba(107,58,31,0.4)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                {loading
                  ? <><span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Resetting…</>
                  : 'Reset Password →'}
              </button>

              <div style={{ textAlign:'center', marginTop:16 }}>
                <button onClick={() => nav('/login')}
                  style={{ fontSize:13, color:'#6B3A1F', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontWeight:600 }}>
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
          Smart Study Planner · FYP · B032410882
        </div>
      </div>
    </div>
  );
}