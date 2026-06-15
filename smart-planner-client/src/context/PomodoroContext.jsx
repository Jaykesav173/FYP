import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from './AuthContext';
import { getSchedule, toggleCompletion } from '../api/client';

const PomodoroContext = createContext();

export function PomodoroProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('study'); // 'study' or 'break'
  const [selectedTask, setSelectedTask] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const { addToast } = useToast();

  const fetchTodaySessions = async () => {
    try {
      const res = await getSchedule();
      if (res.schedule && res.schedule.days) {
        // Find today's date in local time YYYY-MM-DD
        const todayStr = new Date().toISOString().split('T')[0];
        // Match day with date todayStr, or fallback to first day with sessions
        const todayDay = res.schedule.days.find(d => d.date === todayStr) || res.schedule.days[0];
        if (todayDay && todayDay.sessions) {
          setTodaySessions(todayDay.sessions);
          
          // Re-sync selected task details if its completion state changed
          if (selectedTask) {
            const updated = todayDay.sessions.find(s => s.id === selectedTask.id);
            if (updated) {
              setSelectedTask(updated);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load Pomodoro tasks:', e);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setTodaySessions([]);
      setSelectedTask(null);
      return;
    }

    fetchTodaySessions();
    
    // Listen for schedule regenerations or manual progress toggles to keep sessions synced
    const handleSync = () => {
      fetchTodaySessions();
    };
    window.addEventListener('schedule-sync-needed', handleSync);
    return () => window.removeEventListener('schedule-sync-needed', handleSync);
  }, [isLoggedIn]);

  const logTaskCompleted = async (sessionId) => {
    try {
      const res = await toggleCompletion(sessionId);
      if (res.success) {
        addToast(`✓ Focus logged to: ${selectedTask?.subject || 'Session'}! Progress updated. ⚡`, 'success', 4000);
        fetchTodaySessions();
        // Propagate updates to all active UI elements
        window.dispatchEvent(new CustomEvent('study-progress-updated', { detail: res }));
      }
    } catch (e) {
      addToast('Failed to auto-log Pomodoro: ' + e.message, 'error');
    }
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Timer finished
      setIsActive(false);
      if (mode === 'study') {
        addToast('Pomodoro complete! Time for a 5-minute break. 🧠', 'success', 5000);
        
        // Auto-log task completion!
        if (selectedTask && !selectedTask.is_completed) {
          logTaskCompleted(selectedTask.id);
        }
        
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        addToast('Break over! Ready to focus again?', 'info', 5000);
        setMode('study');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, addToast, selectedTask]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = async () => {
    setIsActive(false);
    setTimeLeft(mode === 'study' ? 25 * 60 : 5 * 60);
    
    if (selectedTask) {
      const taskToUncheck = selectedTask;
      setSelectedTask(null); // Clear selection instantly for immediate UI response
      
      if (taskToUncheck.is_completed) {
        try {
          const res = await toggleCompletion(taskToUncheck.id);
          if (res.success) {
            addToast('Session unmarked incomplete. ⚡', 'info', 2000);
            window.dispatchEvent(new CustomEvent('study-progress-updated'));
            fetchTodaySessions(); // Sync today sessions list to update completion checkmarks
          }
        } catch (e) {
          console.error('Failed to uncheck session on reset:', e);
        }
      }
    }
  };

  const setStudyMode = () => {
    setMode('study');
    setTimeLeft(25 * 60);
    setIsActive(false);
  };

  const setBreakMode = () => {
    setMode('break');
    setTimeLeft(5 * 60);
    setIsActive(false);
  };

  return (
    <PomodoroContext.Provider value={{
      timeLeft, isActive, mode,
      selectedTask, setSelectedTask, todaySessions, fetchTodaySessions, logTaskCompleted,
      toggleTimer, resetTimer, setStudyMode, setBreakMode
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export const usePomodoro = () => useContext(PomodoroContext);
