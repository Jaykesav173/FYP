import { usePomodoro } from '../context/PomodoroContext';
import { useAuth } from '../context/AuthContext';
import { Play, Pause, RotateCcw, Coffee, BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function PomodoroWidget() {
  const { isLoggedIn } = useAuth();
  const { 
    timeLeft, isActive, mode, 
    selectedTask, setSelectedTask, todaySessions, logTaskCompleted,
    toggleTimer, resetTimer, setStudyMode, setBreakMode 
  } = usePomodoro();
  const [expanded, setExpanded] = useState(false);

  if (!isLoggedIn) return null;

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  
  const pct = mode === 'study' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100 
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  if (!expanded) {
    return (
      <div 
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          background: 'var(--card)', padding: '10px 16px', borderRadius: 999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          color: mode === 'study' ? 'var(--primary)' : 'var(--teal)',
          fontWeight: 700, fontSize: 16
        }}
      >
        {mode === 'study' ? <BookOpen size={16} /> : <Coffee size={16} />}
        {mins}:{secs}
        {selectedTask && !selectedTask.is_completed && (
          <span style={{
            fontSize: 11, background: 'var(--accent)', color: 'white',
            padding: '2px 8px', borderRadius: 10, marginLeft: 4,
            fontWeight: 600, animation: 'pulse 1.5s ease infinite'
          }}>
            {selectedTask.subject}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      background: 'var(--card)', borderRadius: 16, width: 290,
      boxShadow: '0 12px 36px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', borderBottom: '1px solid var(--border)', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: mode === 'study' ? 'rgba(216,137,69,0.1)' : 'rgba(47,158,105,0.1)'
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: mode === 'study' ? 'var(--primary)' : 'var(--teal)' }}>
          {mode === 'study' ? <BookOpen size={14} /> : <Coffee size={14} />}
          {mode === 'study' ? 'Pomodoro' : 'Short Break'}
        </div>
        <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
      </div>

      {/* Timer */}
      <div style={{ padding: '20px 24px 16px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--text)', fontFamily: "'Inter', sans-serif", letterSpacing: '-1px', lineHeight: 1 }}>
          {mins}:{secs}
        </div>
        
        {/* Progress bar */}
        <div style={{ width: '100%', height: 6, background: 'var(--bg)', borderRadius: 4, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: mode === 'study' ? 'var(--primary)' : 'var(--teal)', transition: 'width 1s linear' }} />
        </div>
      </div>

      {/* Focus Task Selector Panel */}
      {mode === 'study' && (
        <div style={{ padding: '0 20px 16px 20px' }}>
          <label style={{ 
            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', 
            color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', 
            marginBottom: 6 
          }}>
            🎯 Focus Subject
          </label>
          
          {todaySessions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
              No sessions scheduled for today.
            </div>
          ) : (
            <select
              value={selectedTask?.id || ''}
              onChange={(e) => {
                const task = todaySessions.find(s => s.id === parseInt(e.target.value));
                setSelectedTask(task || null);
              }}
              disabled={isActive}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, cursor: isActive ? 'not-allowed' : 'pointer',
                outline: 'none', transition: 'border-color 0.15s ease',
                marginBottom: 10
              }}
            >
              <option value="">-- Select focus subject --</option>
              {todaySessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.is_completed ? '✓ ' : ''}{session.subject} ({session.duration_minutes}m)
                </option>
              ))}
            </select>
          )}

          {/* Selected Task Details & Manual Complete */}
          {selectedTask && (
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 12px', display: 'flex', 
              justifyContent: 'space-between', alignItems: 'center',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: selectedTask.is_completed ? '#22c55e' : 'var(--accent)'
                  }} />
                  {selectedTask.subject}
                </div>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {selectedTask.start_time} • {selectedTask.priority.toUpperCase()} priority
                </span>
              </div>
              
              {!selectedTask.is_completed ? (
                <button
                  onClick={() => logTaskCompleted(selectedTask.id)}
                  title="Log this study block completed now!"
                  style={{
                    background: 'rgba(216,137,69,0.1)', color: 'var(--accent)',
                    border: '1px solid rgba(216,137,69,0.2)', padding: '6px 10px',
                    borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(216,137,69,0.1)';
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                >
                  ✓ Log
                </button>
              ) : (
                <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Completed ✓</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: 20 }}>
        <button onClick={resetTimer} style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RotateCcw size={18} />
        </button>
        <button onClick={toggleTimer} style={{ width: 56, height: 56, borderRadius: 28, border: 'none', background: mode === 'study' ? 'var(--primary)' : 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 4 }} />}
        </button>
        <button onClick={mode === 'study' ? setBreakMode : setStudyMode} title={`Switch to ${mode === 'study' ? 'Break' : 'Study'}`} style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {mode === 'study' ? <Coffee size={18} /> : <BookOpen size={18} />}
        </button>
      </div>
    </div>
  );
}
