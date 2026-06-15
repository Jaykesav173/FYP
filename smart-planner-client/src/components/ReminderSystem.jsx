import { useEffect, useState } from 'react';
import { getSubjects, getSchedule } from '../api/client';

// ── Request browser notification permission ────────────────────────────────────
async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

// ── Send browser notification ─────────────────────────────────────────────────
function sendNotification(title, body, icon = '📚') {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/favicon.ico' });
}

// ── Calculate days left including time ────────────────────────────────────────
function getDaysLeft(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getTimeRemaining(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const diffHours = (target - now) / (1000 * 60 * 60);
  return { hours: Math.max(0, diffHours), isPast: diffHours < 0 };
}

// ── Group overdue sessions by subject ─────────────────────────────────────────
const groupOverdueSessions = (sessions) => {
  const grouped = {};
  sessions.forEach(session => {
    if (!grouped[session.subject]) {
      grouped[session.subject] = {
        id: `overdue-${session.subject.replace(/\s/g, '-')}`,
        subject: session.subject,
        count: 0,
        sessions: [],
        totalMinutes: 0,
        priority: session.priority,
        reminderType: 'overdue',
        minutesOverdue: session.minutesOverdue || 0,
      };
    }
    grouped[session.subject].count++;
    grouped[session.subject].sessions.push(session);
    grouped[session.subject].totalMinutes += session.duration;
    // Use the maximum minutes overdue for the group
    if ((session.minutesOverdue || 0) > (grouped[session.subject].minutesOverdue || 0)) {
      grouped[session.subject].minutesOverdue = session.minutesOverdue || 0;
    }
  });
  return Object.values(grouped);
};

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useReminders() {
  const [reminders, setReminders] = useState([]);
  const [studyReminders, setStudyReminders] = useState([]);
  const [sentToday, setSentToday] = useState(new Set());
  const [sentSessionReminders, setSentSessionReminders] = useState(new Set());
  const [hasCheckedOnLogin, setHasCheckedOnLogin] = useState(false);

  // Load sent notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('reminder_sent');
    if (saved) {
      setSentToday(new Set(JSON.parse(saved)));
    }
    const savedSessions = localStorage.getItem('session_reminder_sent');
    if (savedSessions) {
      setSentSessionReminders(new Set(JSON.parse(savedSessions)));
    }
  }, []);

  // Save sent notifications to localStorage
  useEffect(() => {
    localStorage.setItem('reminder_sent', JSON.stringify([...sentToday]));
  }, [sentToday]);
  
  useEffect(() => {
    localStorage.setItem('session_reminder_sent', JSON.stringify([...sentSessionReminders]));
  }, [sentSessionReminders]);

  const checkReminders = async (isLoginCheck = false) => {
    try {
      const [subjectsRes, scheduleRes] = await Promise.all([
        getSubjects(),
        getSchedule(),
      ]);
      
      const subjects = subjectsRes.subjects ?? [];
      const schedule = scheduleRes.schedule;
      const now = new Date();
      const found = [];
      const upcomingSessions = [];
      const overdueSessions = [];

      // ── Check Subject Deadlines ─────────────────────────────────────────────
      for (const subject of subjects) {
        if (!subject.name) continue;

        const deadlineDays = subject.days_until_deadline ?? getDaysLeft(subject.deadline);
        if (deadlineDays >= 0 && deadlineDays <= 7) {
          found.push({
            id:       `deadline-${subject.id}`,
            type:     'deadline',
            subject:  subject.name,
            label:    'Deadline',
            date:     subject.deadline,
            daysLeft: deadlineDays,
            urgent:   deadlineDays <= 2,
          });
        }

        for (const d of subject.upcoming_dates ?? []) {
          if (!d.is_past && d.days_left <= 7) {
            found.push({
              id:       `date-${subject.id}-${d.date}`,
              type:     d.type,
              subject:  subject.name,
              label:    d.label,
              date:     d.date,
              daysLeft: d.days_left,
              urgent:   d.days_left <= 2,
            });
          }
        }
      }

      // ── Check Study Sessions ────────────────────────────────────────────────
      if (schedule?.days) {
        const todayDate = new Date().toISOString().split('T')[0];
        
        for (const day of schedule.days) {
          const isToday = day.date === todayDate;
          const isPast = day.date < todayDate;
          
          for (const session of day.sessions) {
            if (session.is_completed) continue;
            
            const [hours, minutes] = session.time.split(':').map(Number);
            const sessionDateTime = new Date();
            sessionDateTime.setHours(hours, minutes, 0, 0);
            
            const diffMinutes = (sessionDateTime - now) / (1000 * 60);
            
            // Upcoming sessions (within 15 minutes)
            if (isToday && diffMinutes > 0 && diffMinutes <= 15) {
              upcomingSessions.push({
                id: session.id,
                subject: session.subject,
                time: session.time,
                duration: session.duration,
                priority: session.priority,
                minutesLeft: Math.round(diffMinutes),
                reminderType: 'upcoming',
              });
            }
            
            // Overdue sessions (past date or past time today)
            const isOverdue = isPast || (isToday && diffMinutes < -30);
            if (isOverdue) {
              overdueSessions.push({
                id: session.id,
                subject: session.subject,
                time: session.time,
                duration: session.duration,
                priority: session.priority,
                date: day.date,
                day: day.day,
                minutesOverdue: Math.round(Math.abs(diffMinutes)),
                reminderType: 'overdue',
              });
            }
          }
        }
      }

      // Sort deadlines
      found.sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        return a.daysLeft - b.daysLeft;
      });
      
      upcomingSessions.sort((a, b) => a.minutesLeft - b.minutesLeft);
      
      // Group overdue sessions
      const groupedOverdue = groupOverdueSessions(overdueSessions);
      
      setReminders(found);
      setStudyReminders([...upcomingSessions, ...groupedOverdue]);

      // ── Send Browser Notifications ─────────────────────────────────────────
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
      
      const todayKey = new Date().toDateString();
      
      // Send grouped overdue notification on login
      if ((isLoginCheck || !hasCheckedOnLogin) && groupedOverdue.length > 0) {
        const overdueKey = `overdue-summary-${todayKey}`;
        if (!sentSessionReminders.has(overdueKey)) {
          const totalOverdue = groupedOverdue.reduce((sum, g) => sum + g.count, 0);
          const subjectList = groupedOverdue.map(g => `  • ${g.subject}: ${g.count} session${g.count !== 1 ? 's' : ''} (${g.totalMinutes} min)`).join('\n');
          
          sendNotification(
            `⚠ You have ${totalOverdue} missed study session${totalOverdue !== 1 ? 's' : ''}!`,
            `Catch up on:\n${subjectList}`,
          );
          setSentSessionReminders(prev => new Set([...prev, overdueKey]));
        }
        setHasCheckedOnLogin(true);
      }
      
      // Send upcoming session notifications
      for (const session of upcomingSessions) {
        const notificationKey = `upcoming-${session.id}-${todayKey}`;
        if (!sentSessionReminders.has(notificationKey)) {
          const priorityEmoji = session.priority === 'high' ? '🔴' : session.priority === 'medium' ? '🟡' : '🟢';
          sendNotification(
            `📚 Study Time Soon!`,
            `${priorityEmoji} ${session.subject} at ${session.time} (${session.duration} min) - Starting in ${session.minutesLeft} minutes`,
          );
          setSentSessionReminders(prev => new Set([...prev, notificationKey]));
        }
      }
      
      // Send deadline notifications
      for (const r of found.filter((r) => r.urgent)) {
        const notificationKey = `${r.id}-${todayKey}`;
        if (!sentToday.has(notificationKey)) {
          const timeStr = r.daysLeft === 0 ? 'TODAY' : `in ${r.daysLeft} day${r.daysLeft !== 1 ? 's' : ''}`;
          sendNotification(
            `⚠ ${r.label} ${timeStr}!`,
            `${r.subject} — ${r.date}`,
          );
          setSentToday(prev => new Set([...prev, notificationKey]));
        }
      }
      
    } catch (e) {
      console.error('Reminder check failed:', e);
    }
  };

  useEffect(() => {
    checkReminders(true);
    const interval = setInterval(() => checkReminders(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { reminders, studyReminders };
}

// ── Reminder Banner Component ─────────────────────────────────────────────────
export default function ReminderBanner() {
  const { reminders, studyReminders } = useReminders();
  const [dismissed, setDismissed] = useState(() => {
    const saved = localStorage.getItem('reminder_dismissed');
    return saved ? JSON.parse(saved) : [];
  });
  const [collapsed, setCollapsed] = useState(false);
  const [dismissedSessions, setDismissedSessions] = useState(() => {
    const saved = localStorage.getItem('session_dismissed');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('reminder_dismissed', JSON.stringify(dismissed));
  }, [dismissed]);
  
  useEffect(() => {
    localStorage.setItem('session_dismissed', JSON.stringify(dismissedSessions));
  }, [dismissedSessions]);

  const visibleDeadlines = reminders.filter((r) => {
    if (dismissed.includes(r.id)) return false;
    if (r.daysLeft < 0) return false;
    return true;
  });
  
  const visibleSessions = studyReminders.filter((r) => {
    if (dismissedSessions.includes(r.id)) return false;
    return true;
  });

  const allVisible = [...visibleDeadlines, ...visibleSessions];
  
  if (allVisible.length === 0) return null;

  const TYPE_ICONS = {
    quiz: '📝', midterm: '📋', final: '🎯',
    assignment: '📌', deadline: '⏰', other: '📅',
  };

  const getStatusText = (reminder) => {
    if (reminder.daysLeft !== undefined) {
      if (reminder.daysLeft === 0) {
        if (reminder.date) {
          const timeRemaining = getTimeRemaining(reminder.date);
          if (timeRemaining.isPast) return '🔴 OVERDUE!';
          if (timeRemaining.hours <= 2) return '🔴 Due in ' + Math.round(timeRemaining.hours) + 'h!';
        }
        return '🔴 Today!';
      }
      if (reminder.daysLeft === 1) return '🟠 Tomorrow!';
      return `🟡 In ${reminder.daysLeft} days`;
    } else {
      if (reminder.reminderType === 'overdue') {
        if (reminder.count && reminder.count > 1) {
          return `🔴 ${reminder.count} missed sessions (${reminder.totalMinutes} min total)`;
        }
        const mins = reminder.minutesOverdue || 0;
        if (mins > 60) {
          const hours = Math.floor(mins / 60);
          const minutes = mins % 60;
          return `🔴 Missed by ${hours}h ${minutes}m`;
        }
        return `🔴 Missed by ${mins} min`;
      }
      if (reminder.minutesLeft <= 5) {
        return '🔴 Starting VERY soon!';
      }
      return `🟡 Starting in ${reminder.minutesLeft} min`;
    }
  };

  const getReminderIcon = (reminder) => {
    if (reminder.type) {
      return TYPE_ICONS[reminder.type] ?? '📅';
    }
    if (reminder.reminderType === 'overdue') {
      return '⚠️';
    }
    return reminder.priority === 'high' ? '🔴' : reminder.priority === 'medium' ? '🟡' : '🟢';
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #6B3A1F, #8B5A2B)',
      borderRadius: 12, marginBottom: 20,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(107,58,31,0.25)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px', cursor: 'pointer',
      }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
            {allVisible.length} Upcoming Reminder{allVisible.length !== 1 ? 's' : ''}
          </span>
          {visibleSessions.filter(s => s.reminderType === 'upcoming').length > 0 && (
            <span style={{
              background: 'var(--accent)', color: 'white',
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
            }}>
              {visibleSessions.filter(s => s.reminderType === 'upcoming').length} SOON
            </span>
          )}
          {visibleSessions.filter(s => s.reminderType === 'overdue').length > 0 && (
            <span style={{
              background: 'var(--danger)', color: 'white',
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
            }}>
              {visibleSessions.filter(s => s.reminderType === 'overdue').reduce((sum, s) => sum + (s.count || 1), 0)} MISSED
            </span>
          )}
          {visibleDeadlines.some((r) => r.urgent) && (
            <span style={{
              background: 'var(--danger)', color: 'white',
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
            }}>
              DEADLINE
            </span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          
          {/* Study Session Reminders */}
          {visibleSessions.map((r) => (
            <div key={r.id} style={{
              background: r.reminderType === 'overdue' ? 'rgba(192,72,62,0.3)' : 'rgba(122,184,74,0.2)',
              borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${r.reminderType === 'overdue' ? 'rgba(192,72,62,0.5)' : 'rgba(122,184,74,0.4)'}`,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{getReminderIcon(r)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {r.subject}
                  {r.count && r.count > 1 && ` (${r.count} sessions)`}
                </div>
                {r.time ? (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                    🕐 {r.time} • {r.duration} min
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                    📋 {r.count} missed session{r.count !== 1 ? 's' : ''} • {r.totalMinutes} min total
                  </div>
                )}
                <div style={{
                  fontSize: 11, fontWeight: 700, marginTop: 4,
                  color: r.reminderType === 'overdue' ? '#FCA5A5' : '#86EFAC',
                }}>
                  {getStatusText(r)}
                </div>
              </div>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setDismissedSessions((p) => [...p, r.id]);
                }}
                style={{ background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 0, flexShrink: 0, cursor: 'pointer' }}
                title="Dismiss"
              >×</button>
            </div>
          ))}
          
          {/* Deadline Reminders */}
          {visibleDeadlines.map((r) => (
            <div key={r.id} style={{
              background: r.urgent ? 'rgba(192,72,62,0.25)' : 'rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${r.urgent ? 'rgba(192,72,62,0.5)' : 'rgba(255,255,255,0.15)'}`,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{getReminderIcon(r)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                  {r.subject}
                </div>
                <div style={{ fontSize: 10, marginTop: 4, color: 'rgba(255,255,255,0.5)' }}>
                  📅 {r.date}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, marginTop: 2,
                  color: r.daysLeft === 0 ? '#FFD700' : r.urgent ? '#FCA5A5' : '#86EFAC',
                }}>
                  {getStatusText(r)}
                </div>
              </div>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setDismissed((p) => [...p, r.id]);
                }}
                style={{ background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 0, flexShrink: 0, cursor: 'pointer' }}
                title="Dismiss"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}