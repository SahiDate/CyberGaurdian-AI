import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound404() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0d12', color: '#fff' }}>
      <div className="glass-panel" style={{ padding: '3.5rem', width: '480px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h1 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>404 - Page Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          The path you requested does not exist or has been relocated.
        </p>

        <Link to="/" style={{
          padding: '0.75rem 2rem',
          background: 'var(--accent-color)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          display: 'inline-block'
        }}>
          Return to Portal
        </Link>
      </div>
    </div>
  );
}
