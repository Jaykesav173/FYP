export default function StatCard({
  icon: Icon,
  label,
  value,
  color = '#8B5E3C',
  bgColor,
}) {
  return (
    <div
      className="hover-lift"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '22px 24px',
        borderRadius: 22,
        background: '#F8F5F1',
        border: '1px solid #E7D8C9',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: bgColor ?? '#EFE7DF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} color={color} strokeWidth={2} />
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          className="mono"
          style={{
            fontSize: 34,
            fontWeight: 700,
            color,
            lineHeight: 1,
            letterSpacing: '-1px',
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: 15,
            color: '#8A6A50',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}