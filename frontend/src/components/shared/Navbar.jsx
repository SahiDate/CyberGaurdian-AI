import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logoutUser } = useContext(AuthContext);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass-panel" style={{
      margin: '1rem 1rem 1.5rem 1rem',
      padding: '0.85rem 1.25rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--border-color)',
      borderRadius: '12px',
      position: 'relative',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', justifyContent: 'space-between' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🛡️ CyberGuardian <span style={{ fontSize: '0.72rem', color: '#fff', opacity: 0.8, fontWeight: 400, letterSpacing: '0.5px' }}>USER PORTAL</span>
          </h2>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-only-nav" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/dashboard" style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/dashboard') ? '#fff' : 'var(--text-muted)',
            background: isActive('/dashboard') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>Dashboard</Link>
          
          <Link to="/scan" style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/scan') ? '#fff' : 'var(--text-muted)',
            background: isActive('/scan') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>Quick Scan</Link>

          <Link to="/history" style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/history') ? '#fff' : 'var(--text-muted)',
            background: isActive('/history') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>My History</Link>

          <Link to="/reports" style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: isActive('/reports') ? '#fff' : 'var(--text-muted)',
            background: isActive('/reports') ? 'var(--accent-color)' : 'transparent',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>Reports</Link>
        </nav>

        {/* Desktop Controls */}
        <div className="desktop-only-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/profile" style={{
            textDecoration: 'none',
            color: isActive('/profile') ? 'var(--accent-color)' : 'var(--text-main)',
            fontWeight: '500',
            fontSize: '0.875rem'
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
              padding: '0.4rem 0.85rem',
              background: 'rgba(248, 81, 73, 0.15)',
              border: '1px solid var(--danger-color)',
              color: 'var(--danger-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.82rem'
            }}
          >
            Logout
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
          style={{
            display: 'none',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '1.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            minHeight: '44px',
            minWidth: '44px'
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(10, 13, 18, 0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '1.2rem' }}>
              🛡️ CyberGuardian
            </h2>
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', minWidth: '44px', minHeight: '44px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              ['/dashboard', '📊 Dashboard'],
              ['/scan', '🔍 Quick Scan'],
              ['/history', '📜 My History'],
              ['/reports', '📑 Reports'],
              ['/profile', `👤 Profile (${user ? user.username : 'User'})`],
              ['/settings', '⚙️ Settings'],
            ].map(([path, label]) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive(path) ? '#fff' : 'var(--text-main)',
                  background: isActive(path) ? 'var(--accent-color)' : 'rgba(255,255,255,0.04)',
                  fontWeight: '600',
                  fontSize: '1rem',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {label}
              </Link>
            ))}

            <button
              onClick={() => { setMobileOpen(false); logoutUser(); }}
              style={{
                marginTop: '1.5rem',
                padding: '0.85rem',
                background: 'rgba(248, 81, 73, 0.2)',
                border: '1px solid var(--danger-color)',
                color: 'var(--danger-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                minHeight: '44px'
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

