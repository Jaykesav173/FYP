import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function CompletionTrendChart({ schedule, loading }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (loading) return;

    // Build a lookup of date → sessions from the schedule
    const dayMap = {};
    if (schedule?.days) {
      schedule.days.forEach(day => {
        if (day.date) {
          dayMap[day.date] = day.sessions || [];
        }
      });
    }

    // Always show the last 7 calendar days (like StudyHoursChart)
    const labels = [];
    const rates = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      labels.push(dayLabel);

      const sessions = dayMap[dateStr] || [];
      const total = sessions.length;
      const completed = sessions.filter(s => s.is_completed).length;
      rates.push(total > 0 ? Math.round((completed / total) * 100) : 0);
    }

    setChartData({
      labels,
      datasets: [
        {
          label: 'Daily Completion Rate (%)',
          data: rates,
          borderColor: 'rgba(79, 172, 254, 1)',
          backgroundColor: 'rgba(79, 172, 254, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: 'rgba(79, 172, 254, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    });
  }, [schedule, loading]);

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ height: 250, marginBottom: 12 }} />
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
          Daily Completion Trend (Last 7 Days)
        </h3>
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Generate a schedule to see your daily trend.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
        Daily Completion Trend (Last 7 Days)
      </h3>
      <div style={{ height: 250, position: 'relative' }}>
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 13, weight: 600 },
                bodyFont: { size: 13 },
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                cornerRadius: 6,
                callbacks: {
                  label: (context) => `${context.parsed.y}% completed`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#999', font: { size: 10 }, maxRotation: 45, minRotation: 25 },
              },
              y: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: {
                  color: '#999',
                  font: { size: 12 },
                  stepSize: 25,
                  callback: (value) => `${value}%`,
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}