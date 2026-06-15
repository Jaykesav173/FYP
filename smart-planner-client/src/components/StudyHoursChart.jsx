import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

export default function StudyHoursChart({ stats, loading, schedule }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (loading || (!stats && !schedule)) return;

    // Calculate study hours from schedule data (from completed sessions)
    let studyHoursByDay = {};

    // If API provides study_hours_by_day, use that
    if (stats?.study_hours_by_day) {
      studyHoursByDay = stats.study_hours_by_day;
    } 
    // Otherwise, calculate from schedule days
    else if (schedule?.days) {
      schedule.days.forEach((day) => {
        if (day.sessions && day.date) {
          // Sum up completed session minutes and convert to hours
          const completedMinutes = day.sessions
            .filter((s) => s.is_completed)
            .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          
          const hours = completedMinutes / 60;
          if (hours > 0) {
            studyHoursByDay[day.date] = parseFloat(hours.toFixed(1));
          }
        }
      });
    }
    
    const days = [];
    const hoursData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      days.push(dayName);

      // Get actual hours from calculated data, default to 0
      const hours = studyHoursByDay[dateStr] || 0;
      hoursData.push(hours);
    }

    setChartData({
      labels: days,
      datasets: [
        {
          label: 'Study Hours',
          data: hoursData,
          backgroundColor: 'rgba(127, 184, 81, 0.7)',
          borderColor: 'rgba(127, 184, 81, 1)',
          borderRadius: 6,
          borderWidth: 0,
          barThickness: 'flex',
          maxBarThickness: 40,
        },
      ],
    });
  }, [stats, schedule, loading]);

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ height: 250, marginBottom: 12 }} />
      </div>
    );
  }

  const hasData = chartData && chartData.datasets[0]?.data.some((h) => h > 0);

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
        Study Hours (Last 7 Days)
      </h3>
      {hasData ? (
        <div style={{ height: 250, position: 'relative' }}>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'x',
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 12,
                  titleFont: { size: 13, weight: 600 },
                  bodyFont: { size: 13 },
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  cornerRadius: 6,
                  callbacks: {
                    label: (context) => `${context.parsed.y}h`,
                  },
                },
              },
              scales: {
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    color: 'var(--muted)',
                    font: { size: 12 },
                  },
                },
                y: {
                  beginAtZero: true,
                  max: 12,
                  ticks: {
                    color: 'var(--muted)',
                    font: { size: 12 },
                    stepSize: 2,
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No study hours tracked yet. Complete sessions to see your study time here.</p>
        </div>
      )}
    </div>
  );
}
