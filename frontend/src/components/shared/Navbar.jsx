import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logoutUser } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass-panel" style={{
      margin: '1.5rem 2rem 2rem 2rem',
      padding: '1rem 2rem',
      display: 'flex',
      justify: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--border-color)',
      borderRadius: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '1.4rem' }}>
            🛡️ CyberGuardian <span style={{ fontSize: '0.8rem', color: '#fff', opacity: 0.8 }}>USER PORTAL</span>
          </h2>
        </Link>

        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/dashboard" style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/dashboard') ? '#fff' : 'var(--text-muted)',
            background: isActive('/dashboard') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>Dashboard</Link>
          
          <Link to="/scan" style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/scan') ? '#fff' : 'var(--text-muted)',
            background: isActive('/scan') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>Quick Scan</Link>

          <Link to="/history" style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/history') ? '#fff' : 'var(--text-muted)',
            background: isActive('/history') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>My History</Link>

          <Link to="/reports" style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/reports') ? '#fff' : 'var(--text-muted)',
            background: isActive('/reports') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>Reports</Link>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to="/profile" style={{
          textDecoration: 'none',
          color: isActive('/profile') ? 'var(--accent-color)' : 'var(--text-main)',
          fontWeight: '500',
          fontSize: '0.9rem'
        }}>
          👤 <strong>{user ? user.username : 'User'}</strong>
        </Link>
        
        <Link to="/settings" style={{
          textDecoration: 'none',
          color: isActive('/settings') ? 'var(--accent-color)' : 'var(--text-muted)',
          fontSize: '1.1rem'
        }} title="Settings">⚙️</Link>

        <button 
          onClick={logoutUser}
          style={{
            padding: '0.4rem 1rem',
            background: 'rgba(248, 81, 73, 0.15)',
            border: '1px solid var(--danger-color)',
            color: 'var(--danger-color)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
