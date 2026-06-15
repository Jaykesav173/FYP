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
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SubjectComparisonChart({ subjects, loading }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (loading || !subjects || subjects.length === 0) return;

    // Sort by deadline and limit to top 6
    const sorted = [...subjects].sort(
      (a, b) => new Date(a.deadline) - new Date(b.deadline)
    ).slice(0, 6);

    const colors = [
      'rgba(122, 184, 74, 0.7)',
      'rgba(79, 172, 254, 0.7)',
      'rgba(217, 119, 6, 0.7)',
      'rgba(168, 85, 247, 0.7)',
      'rgba(244, 63, 94, 0.7)',
      'rgba(34, 197, 94, 0.7)',
    ];

    setChartData({
      labels: sorted.map((s) => s.name),
      datasets: [
        {
          label: 'Completion %',
          data: sorted.map((s) => s.completion_percentage || 0),
          backgroundColor: colors.slice(0, sorted.length),
          borderRadius: 6,
          borderWidth: 0,
          barThickness: 'flex',
          maxBarThickness: 50,
        },
      ],
    });
  }, [subjects, loading]);

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ height: 250, marginBottom: 12 }} />
      </div>
    );
  }

  if (!subjects || subjects.length === 0) {
    return (
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
          Subject Comparison
        </h3>
        <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>No subjects yet. Add subjects to see comparison.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
        Subject Comparison
      </h3>
      {chartData ? (
        <div style={{ height: 250, position: 'relative' }}>
          <Bar
            data={chartData}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
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
                    label: (context) => `${context.parsed.x}% complete`,
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    color: 'var(--muted)',
                    font: { size: 12 },
                    stepSize: 25,
                    callback: (value) => `${value}%`,
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                  },
                },
                y: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    color: 'var(--muted)',
                    font: { size: 12 },
                  },
                },
              },
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
