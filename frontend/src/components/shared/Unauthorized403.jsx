import React from 'react';
import { Link } from 'react-router-dom';

export default function Unauthorized403() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0d12', color: '#fff' }}>
      <div className="glass-panel" style={{ padding: '3.5rem', width: '480px', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
        <h1 style={{ color: 'var(--danger-color)', marginBottom: '0.5rem' }}>403 - Access Forbidden</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          You do not have the required permissions or role to access this route. Please check your credentials or access portal.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/login" style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--accent-color)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            User Portal Login
          </Link>

          <Link to="/admin/login" style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(248, 81, 73, 0.2)',
            border: '1px solid var(--danger-color)',
            color: '#f85149',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            SOC Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
