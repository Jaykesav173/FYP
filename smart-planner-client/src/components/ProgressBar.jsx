export default function ProgressBar({
  value = 0,       // 0–100
  color = 'var(--teal)',
  height = 6,
  showLabel = false,
  label = '',
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--muted)',
            marginBottom: 5,
          }}
        >
          <span>{label}</span>
          <span className="mono">{clamped}%</span>
        </div>
      )}
      <div
        style={{
          height,
          background: 'var(--light)',
          borderRadius: height,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: color,
            borderRadius: height,
            transition: 'width 0.9s ease',
          }}
        />
      </div>
    </div>
  );
}