import ProgressBar from './ProgressBar';

const STRESS_COLORS = {
  low:      '#3D9B6A',
  moderate: '#C97D1A',
  high:     '#E06020',
  critical: '#C0483E',
};

export default function StressCard({ level, score, message, tips = [] }) {
  const color = STRESS_COLORS[level] ?? '#C97D1A';

  if (!level) {
    return (
      <div className="card">
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '1px', marginBottom: 8 }}>
          STRESS PREDICTION (ML)
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Generate a schedule to activate stress prediction.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${color}40`,
        background: `${color}0C`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
            Stress Prediction (ML)
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color, textTransform: 'capitalize' }}>
            {level}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>
          {score}
        </div>
      </div>

      {/* Bar */}
      <ProgressBar value={score} color={color} height={6} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4, marginBottom: 12 }}>
        <span>Low</span><span>Moderate</span><span>High</span><span>Critical</span>
      </div>

      {/* Message */}
      {message && (
        <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, marginBottom: tips.length ? 12 : 0 }}>
          {message}
        </p>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '1px', marginBottom: 8 }}>
            WELLNESS TIPS
          </div>
          {tips.map((tip, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.6 }}
            >
              <span style={{ color, flexShrink: 0, fontWeight: 700 }}>→</span>
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}