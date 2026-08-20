import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

const navItems = [
  { section: 'OVERVIEW' },
  { path: '/admin/dashboard',     label: 'SOC Overview',          icon: '🏠' },

  { section: 'USERS' },
  { path: '/admin/users',         label: 'User Management',       icon: '👥' },

  { section: 'SECURITY' },
  { path: '/admin/scans',         label: 'Security Monitoring',   icon: '🔍' },
  { path: '/admin/threats',       label: 'Threat Intelligence',   icon: '🚨' },
  { path: '/admin/file-analysis', label: 'File Analysis',         icon: '📁' },
  { path: '/admin/ssl-scanner',   label: 'SSL Scanner',           icon: '🔒' },
  { path: '/admin/whois',         label: 'WHOIS & Domains',       icon: '🌐' },
  { path: '/admin/url-scanner',   label: 'URL Scanner',           icon: '🔗' },
  { path: '/admin/port-scanner',  label: 'Port Scanner',          icon: '🔌' },
  { path: '/admin/soc-analysis',  label: 'SOC Engine',            icon: '🧠' },
  { path: '/admin/incidents',     label: 'Incident Management',   icon: '🔥' },

  { section: 'TOOLS' },
  { path: '/admin/ai-agent',      label: 'AI Agent Monitor',      icon: '🧠' },
  { path: '/admin/reports',       label: 'Reports',               icon: '📋' },
  { path: '/admin/analytics',     label: 'Analytics',             icon: '📊' },

  { section: 'SYSTEM' },
  { path: '/admin/system-health', label: 'System Health',         icon: '💻' },
  { path: '/admin/api-health',    label: 'API Health',            icon: '⚡' },
  { path: '/admin/audit-logs',    label: 'Audit Logs',            icon: '📜' },
  { path: '/admin/settings',      label: 'Settings',              icon: '⚙️' },
];

const roleColors = {
  ADMIN:       { bg: 'rgba(248,81,73,0.2)',   color: '#f85149',  label: 'ADMIN' },
  SOC_ANALYST: { bg: 'rgba(56,139,253,0.2)',  color: '#388bfd',  label: 'SOC ANALYST' },
  SUPER_ADMIN: { bg: 'rgba(163,113,247,0.2)', color: '#a371f7',  label: 'SUPER ADMIN' },
};

export default function AdminSidebar({ children }) {
  const { user, logoutUser } = useContext(AuthContext);
  const { isDark } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const rc = roleColors[user?.role] || roleColors['ADMIN'];

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: '100vh',
      background: 'var(--bg-color)',
      color: 'var(--text-main)',
      fontFamily: "system-ui, -apple-system, sans-serif",
      transition: 'background-color 300ms ease, color 300ms ease'
    }}>

      {/* ── Mobile Top Header ─────────────────────────────── */}
      {isMobile && (
        <header className="glass-panel" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1rem',
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          position: 'sticky',
          top: 0,
          zIndex: 105,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🛡️</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>CyberGuardian SOC</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="glass-panel"
              style={{
                color: 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>
      )}

      {/* ── Mobile Backdrop Overlay ───────────────────────── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 100
          }}
        />
      )}

      {/* ── Sidebar (Desktop Sticky / Mobile Floating Drawer) ─ */}
      <aside
        className="glass-panel"
        style={{
          width: isMobile ? '280px' : (collapsed ? '68px' : '250px'),
          minWidth: isMobile ? '280px' : (collapsed ? '68px' : '250px'),
          borderRadius: 0,
          borderLeft: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: (collapsed && !isMobile) ? '1.25rem 0.5rem' : '1.25rem 0.85rem',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          bottom: isMobile ? 0 : 'auto',
          left: isMobile ? (mobileOpen ? 0 : '-300px') : 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 101,
          boxShadow: (isMobile && mobileOpen) ? '4px 0 24px rgba(0,0,0,0.35)' : 'var(--panel-shadow)'
        }}
      >
        <div>
          {/* Logo & Header */}
          <div style={{
            padding: (collapsed && !isMobile) ? '0 0.25rem 1.25rem' : '0 0.5rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: (collapsed && !isMobile) ? 'center' : 'space-between',
          }}>
            {(!collapsed || isMobile) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '0.3px' }}>
                    CyberGuardian
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--danger-color)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
                  SOC Admin Portal
                </span>
              </div>
            )}
            {(collapsed && !isMobile) && <span style={{ fontSize: '1.4rem' }}>🛡️</span>}
            
            {!isMobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? '›' : '‹'}
              </button>
            )}
          </div>

          {/* Nav Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {navItems.map((item, idx) => {
              if (item.section) {
                if (collapsed && !isMobile) return null;
                return (
                  <div key={idx} style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px',
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    padding: '0.9rem 0.75rem 0.3rem', marginTop: idx === 0 ? 0 : '0.4rem'
                  }}>
                    {item.section}
                  </div>
                );
              }

              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={(collapsed && !isMobile) ? item.label : ''}
                  onClick={() => { if (isMobile) setMobileOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: (collapsed && !isMobile) ? 0 : '0.65rem',
                    justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
                    padding: (collapsed && !isMobile) ? '0.7rem' : '0.65rem 0.85rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: active ? (isDark ? '#fff' : 'var(--accent-color)') : 'var(--text-muted)',
                    background: active
                      ? (isDark ? 'linear-gradient(90deg, rgba(88,166,255,0.2), rgba(88,166,255,0.05))' : 'rgba(37,99,235,0.12)')
                      : 'transparent',
                    borderLeft: active ? '3px solid var(--accent-color)' : '3px solid transparent',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <span style={{ fontSize: '1rem', minWidth: '1.1rem', textAlign: 'center' }}>{item.icon}</span>
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── User Footer with Theme Toggle ────────────────── */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
          {(!collapsed || isMobile) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-color), #60a5fa)',
                  color: '#fff',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
                }}>
                  {(user?.username || 'A')[0].toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.username || 'Admin'}
                  </div>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.8px',
                    color: rc.color, textTransform: 'uppercase',
                    background: rc.bg, padding: '0.1rem 0.4rem', borderRadius: '3px', display: 'inline-block', marginTop: '0.15rem'
                  }}>
                    {rc.label}
                  </div>
                </div>
              </div>

              {!isMobile && <ThemeToggle style={{ width: '34px', height: '34px', padding: '6px' }} />}
            </div>
          )}

          <button
            onClick={logoutUser}
            className="btn-fluid"
            style={{
              width: '100%',
              padding: (collapsed && !isMobile) ? '0.6rem' : '0.55rem 0.75rem',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--danger-color)',
              borderRadius: '7px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: (collapsed && !isMobile) ? 0 : '0.5rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          >
            <span>⏻</span>
            {(!collapsed || isMobile) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content Container ─────────────────────────── */}
      <main style={{
        flex: 1,
        padding: isMobile ? '1rem 0.75rem' : '2rem',
        overflowY: 'auto',
        maxHeight: isMobile ? 'calc(100vh - 54px)' : '100vh',
        minWidth: 0,
        width: '100%',
        transition: 'color 300ms ease'
      }}>
        {children}
      </main>
    </div>
  );
}
