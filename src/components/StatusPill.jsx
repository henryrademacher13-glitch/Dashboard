const STATUS = {
  active: { label: 'Active', className: 'status-active' },
  onboarding: { label: 'Onboarding', className: 'status-onboarding' },
  paused: { label: 'Paused', className: 'status-paused' },
};

// Colored dot + text label — status never carried by color alone.
export default function StatusPill({ status }) {
  const s = STATUS[status] ?? { label: status, className: '' };
  return (
    <span className={`status-pill ${s.className}`}>
      <span className="status-dot" />
      {s.label}
    </span>
  );
}
