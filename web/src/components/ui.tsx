import React from 'react';

export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ tone, dot, children }: {
  tone?: 'green' | 'red' | 'amber' | 'blue'; dot?: boolean; children: React.ReactNode;
}) {
  return (
    <span className={`badge ${tone ? `badge-${tone}` : ''}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function EmptyState({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div style={{ fontSize: 44 }}>🪄</div>
      <h3>{title}</h3>
      {subtitle && <p style={{ margin: '0 auto', maxWidth: 420 }}>{subtitle}</p>}
      {action && <div className="mt16">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <div className="small muted">{label ?? 'Loading…'}</div>;
}

export function AppIcon({ icon, color, size }: { icon: string; color: string; size?: number }) {
  return (
    <div className="app-icon" style={{ background: color, width: size, height: size, fontSize: (size || 46) * 0.5 }}>
      {icon}
    </div>
  );
}
