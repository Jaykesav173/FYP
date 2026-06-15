import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import {
  User, Mail, Lock, Trash2, Shield,
  BookOpen, FileText, Brain, Target,
  Award, TrendingUp, CheckCircle2, Save,
  Eye, EyeOff, AlertTriangle, Calendar,
} from 'lucide-react';
import {
  getProfile, updateProfileInfo,
  updatePassword, deleteAccount,
} from '../api/client';
import { useAuth }  from '../context/AuthContext';
import { useToast } from '../components/Toast';

// ── Eye toggle password input ──────────────────────────────────────────────────
function PwInput({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5, letterSpacing:'0.8px' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ width:'100%', padding:'10px 40px 10px 12px', borderRadius:8, fontSize:13, border:'1.5px solid var(--border)', background:'var(--bg)', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border)'}
        />
        <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:2, display:'flex', alignItems:'center' }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{hint}</div>}
    </div>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, children, accent = false }) {
  return (
    <div className="card" style={{
      marginBottom: 18,
      borderLeft: accent ? '4px solid var(--danger)' : '4px solid var(--primary)',
      padding: '22px 24px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <div style={{ width:34, height:34, borderRadius:8, background: accent ? '#FEE2E230' : 'var(--primary)12', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={17} color={accent ? 'var(--danger)' : 'var(--primary)'} strokeWidth={1.8} />
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color: accent ? 'var(--danger)' : 'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div style={{ textAlign:'center', padding:'16px 10px', background:'var(--card-alt)', borderRadius:10 }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </div>
      <div className="mono" style={{ fontSize:22, fontWeight:700, color, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--muted)' }}>{label}</div>
    </div>
  );
}

export default function Profile() {
  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(true);

  // Info form
  const [infoForm,    setInfoForm]    = useState({ name:'', email:'' });
  const [savingInfo,  setSavingInfo]  = useState(false);
  const [infoMsg,     setInfoMsg]     = useState(null);

  // Password form
  const [pwForm,      setPwForm]      = useState({ current_password:'', password:'', password_confirmation:'' });
  const [savingPw,    setSavingPw]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState(null);

  // Delete account
  const [showDelete,  setShowDelete]  = useState(false);
  const [deletePass,  setDeletePass]  = useState('');
  const [deleting,    setDeleting]    = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const { login, logout } = useAuth();
  const { addToast }       = useToast();
  const nav                = useNavigate();

  const setInfo = (k, v) => setInfoForm(f => ({ ...f, [k]: v }));
  const setPw   = (k, v) => setPwForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getProfile()
      .then(res => {
        setProfile(res);
        setInfoForm({ name: res.user.name, email: res.user.email });
      })
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Save profile info ────────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!infoForm.name.trim())  { setInfoMsg({ type:'error', text:'Name is required.' }); return; }
    if (!infoForm.email.trim()) { setInfoMsg({ type:'error', text:'Email is required.' }); return; }
    setSavingInfo(true);
    setInfoMsg(null);
    try {
      const res = await updateProfileInfo(infoForm);
      // Update AuthContext so name shows everywhere
      const stored = JSON.parse(localStorage.getItem('user') ?? '{}');
      const updated = { ...stored, name: res.user.name, email: res.user.email };
      localStorage.setItem('user', JSON.stringify(updated));
      login(localStorage.getItem('token'), updated);
      setProfile(prev => ({ ...prev, user: { ...prev.user, ...res.user } }));
      setInfoMsg({ type:'success', text:'Profile updated successfully! ✓' });
      addToast('Profile updated! ✓', 'success');
    } catch (e) {
      setInfoMsg({ type:'error', text: e.message });
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwForm.current_password) { setPwMsg({ type:'error', text:'Enter your current password.' }); return; }
    if (!pwForm.password)         { setPwMsg({ type:'error', text:'Enter a new password.' }); return; }
    if (pwForm.password.length < 8) { setPwMsg({ type:'error', text:'Password must be at least 8 characters.' }); return; }
    if (!/[0-9]/.test(pwForm.password))        { setPwMsg({ type:'error', text:'Password must include a number.' }); return; }
    if (!/[^A-Za-z0-9]/.test(pwForm.password)) { setPwMsg({ type:'error', text:'Password must include a special character.' }); return; }
    if (pwForm.password !== pwForm.password_confirmation) { setPwMsg({ type:'error', text:'Passwords do not match.' }); return; }

    setSavingPw(true);
    try {
      await updatePassword(pwForm);
      setPwMsg({ type:'success', text:'Password changed successfully! ✓' });
      setPwForm({ current_password:'', password:'', password_confirmation:'' });
      addToast('Password changed! 🔐', 'success');
    } catch (e) {
      setPwMsg({ type:'error', text: e.message });
    } finally {
      setSavingPw(false);
    }
  };

  // ── Delete account ───────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      addToast('Type DELETE to confirm.', 'error'); return;
    }
    if (!deletePass) {
      addToast('Enter your password to confirm.', 'error'); return;
    }
    setDeleting(true);
    try {
      await deleteAccount({ password: deletePass });
      await logout();
      nav('/login');
    } catch (e) {
      addToast(e.message, 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
        <div style={{ textAlign:'center', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:12, animation:'pulse 1.4s ease infinite' }}>👤</div>
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  const { user, stats } = profile ?? {};

  return (
   <div
  className="page fade-up"
  style={{
    width: '85%',
    maxWidth: 'none',
  }}
>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Avatar + Name + Stats
      ══════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom:18, padding:0, overflow:'hidden' }}>

        {/* Brown header band */}
        <div style={{ height:80, background:'linear-gradient(135deg,var(--primary),var(--teal))' }} />

        {/* Avatar + name */}
        <div style={{ padding:'0 28px 24px', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginBottom:16 }}>
            {/* Avatar circle */}
            <div style={{
              width:76, height:76, borderRadius:'50%',
              background:'linear-gradient(135deg,var(--primary),var(--teal))',
              border:'4px solid var(--card)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginTop:-38, flexShrink:0,
              boxShadow:'0 4px 16px rgba(27,58,45,0.25)',
            }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'white', letterSpacing:'-1px' }}>
                {user?.initials}
              </span>
            </div>

            <div style={{ paddingBottom:4 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text)', lineHeight:1.1, marginBottom:3 }}>
                {user?.name}
              </h2>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--muted)' }}>
                <Mail size={13} />
                {user?.email}
              </div>
            </div>

            {/* Member badge */}
            <div style={{ marginLeft:'auto', textAlign:'right', paddingBottom:4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)', justifyContent:'flex-end', marginBottom:3 }}>
                <Calendar size={11} />
                Member since
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--teal)' }}>{user?.member_since}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <StatBox icon={BookOpen}    label="Subjects"     value={stats?.subjects ?? 0}        color="var(--primary)" />
            <StatBox icon={FileText}    label="Notes"        value={stats?.notes ?? 0}           color="var(--teal)"    />
            <StatBox icon={Brain}       label="Quizzes"      value={stats?.quizzes_created ?? 0} color="var(--accent)"  />
            <StatBox icon={CheckCircle2}label="Schedule %"   value={`${stats?.completion_rate ?? 0}%`} color="var(--success)" />
          </div>

          {/* Quiz performance row */}
          {stats?.quiz_attempts > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:10 }}>
              <StatBox icon={Target}     label="Quiz Attempts" value={stats.quiz_attempts} color="var(--muted)"   />
              <StatBox icon={Award}      label="Best Score"    value={`${stats.best_score}%`} color={stats.best_score >= 80 ? 'var(--success)' : 'var(--warning)'} />
              <StatBox icon={TrendingUp} label="Avg Score"     value={`${stats.avg_score}%`}  color={stats.avg_score >= 60 ? 'var(--teal)' : 'var(--accent)'}    />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          UPDATE PROFILE INFO
      ══════════════════════════════════════════════════════════════════ */}
      <Section icon={User} title="Personal Information" subtitle="Update your name and email address">

        {infoMsg && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13, fontWeight:500,
            background: infoMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color:      infoMsg.type === 'success' ? '#15803D' : '#991B1B',
            border:     `1px solid ${infoMsg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          }}>
            {infoMsg.text}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5, letterSpacing:'0.8px' }}>
              FULL NAME
            </label>
            <input value={infoForm.name} onChange={e => setInfo('name', e.target.value)}
              placeholder="Your full name"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13, border:'1.5px solid var(--border)', background:'var(--bg)', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5, letterSpacing:'0.8px' }}>
              EMAIL ADDRESS
            </label>
            <input type="email" value={infoForm.email} onChange={e => setInfo('email', e.target.value)}
              placeholder="you@example.com"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13, border:'1.5px solid var(--border)', background:'var(--bg)', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSaveInfo} disabled={savingInfo}>
          {savingInfo
            ? <><span className="spinner" /> Saving…</>
            : <><Save size={14} /> Save Changes</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          CHANGE PASSWORD
      ══════════════════════════════════════════════════════════════════ */}
      <Section icon={Lock} title="Change Password" subtitle="Keep your account secure with a strong password">

        {pwMsg && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13, fontWeight:500,
            background: pwMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color:      pwMsg.type === 'success' ? '#15803D' : '#991B1B',
            border:     `1px solid ${pwMsg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          }}>
            {pwMsg.text}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:16 }}>
          <PwInput
            label="CURRENT PASSWORD"
            value={pwForm.current_password}
            onChange={e => setPw('current_password', e.target.value)}
            placeholder="Your current password"
          />
          <PwInput
            label="NEW PASSWORD"
            value={pwForm.password}
            onChange={e => setPw('password', e.target.value)}
            placeholder="Min 8 chars, 1 number, 1 special"
            hint="Must be at least 8 characters with a number and special character."
          />
          <PwInput
            label="CONFIRM NEW PASSWORD"
            value={pwForm.password_confirmation}
            onChange={e => setPw('password_confirmation', e.target.value)}
            placeholder="Repeat new password"
          />
          {/* Match indicator */}
          {pwForm.password_confirmation.length > 0 && (
            <div style={{ fontSize:12, fontWeight:600, color: pwForm.password === pwForm.password_confirmation ? 'var(--success)' : 'var(--danger)', display:'flex', alignItems:'center', gap:5 }}>
              {pwForm.password === pwForm.password_confirmation
                ? <><CheckCircle2 size={13} /> Passwords match</>
                : '✕ Passwords do not match'}
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={handleChangePassword} disabled={savingPw}>
          {savingPw
            ? <><span className="spinner" /> Updating…</>
            : <><Shield size={14} /> Update Password</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          DANGER ZONE
      ══════════════════════════════════════════════════════════════════ */}
      <Section icon={Trash2} title="Danger Zone" subtitle="Permanently delete your account and all data" accent>

        {!showDelete ? (
          <div>
            <div style={{ padding:'12px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', fontSize:13, color:'#7F1D1D', lineHeight:1.7, marginBottom:16 }}>
              <strong>⚠ Warning:</strong> This action is permanent and cannot be undone.
              Deleting your account will remove all your subjects, schedules, notes, quizzes, and progress data.
            </div>
            <button
              onClick={() => setShowDelete(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:8, background:'#FEE2E2', color:'var(--danger)', border:'1px solid #FECACA', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
              onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
            >
              <Trash2 size={14} /> Delete My Account
            </button>
          </div>
        ) : (
          <div className="slide-in">
            <div style={{ padding:'12px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', fontSize:13, color:'#7F1D1D', marginBottom:16 }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }} />
                <div>
                  <strong>This cannot be undone.</strong> All your data will be permanently deleted including subjects, schedules, notes, and quizzes.
                </div>
              </div>
            </div>

            {/* Type DELETE */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--danger)', display:'block', marginBottom:5, letterSpacing:'0.8px' }}>
                TYPE "DELETE" TO CONFIRM
              </label>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13, border:'1.5px solid #FECACA', background:'#FEF2F2', outline:'none', boxSizing:'border-box', color:'var(--danger)', fontWeight:600, fontFamily:'monospace' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:16 }}>
              <PwInput
                label="YOUR PASSWORD"
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
                placeholder="Confirm with your password"
              />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE' || !deletePass}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:700,
                  background: deleteConfirm === 'DELETE' && deletePass ? 'var(--danger)' : '#FECACA',
                  color: 'white', border:'none',
                  cursor: deleteConfirm === 'DELETE' && deletePass && !deleting ? 'pointer' : 'not-allowed',
                  opacity: deleting ? 0.7 : 1, transition:'all 0.2s',
                }}
              >
                {deleting
                  ? <><span className="spinner" /> Deleting…</>
                  : <><Trash2 size={14} /> Permanently Delete Account</>}
              </button>
              <button className="btn btn-ghost"
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); setDeletePass(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}