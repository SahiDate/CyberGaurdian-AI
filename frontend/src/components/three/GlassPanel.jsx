import React from 'react';

// Static, translucent glass panel component with no hover tilt or movement
export default function GlassPanel({
  children,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`glass-panel stat-glass-card ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem',
        borderRadius: 'var(--radius-md, 12px)',
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle)',
        borderTop: '1px solid var(--border-color)',
        boxShadow: 'var(--panel-shadow, 0 8px 32px 0 rgba(0, 0, 0, 0.2))',
        transform: 'none !important',
        transition: 'background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
        ...style
      }}
    >
      {children}
    </div>
  );
}
