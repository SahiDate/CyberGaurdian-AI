import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const navItems = [
  { section: 'OVERVIEW' },
  { path: '/admin/dashboard',     label: 'SOC Overview',          icon: '🏠' },

  { section: 'USERS' },
  { path: '/admin/users',         label: 'User Management',       icon: '👥' },

  { section: 'SECURITY' },
  { path: '/admin/scans',         label: 'Security Monitoring',   icon: '🔍' },
  { path: '/admin/threats',       label: 'Threat Intelligence',   icon: '🚨' },
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
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: '#080b10', color: '#fff', fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Mobile Top Header ─────────────────────────────── */}
      {isMobile && (
        <header style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1rem',
          background: '#0d1117',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 105,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🛡️</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>CyberGuardian SOC</span>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
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
        </header>
      )}

      {/* ── Mobile Backdrop Overlay ───────────────────────── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100
          }}
        />
      )}

      {/* ── Sidebar (Desktop Sticky / Mobile Floating Drawer) ─ */}
      <aside style={{
        width: isMobile ? '280px' : (collapsed ? '64px' : '240px'),
        minWidth: isMobile ? '280px' : (collapsed ? '64px' : '240px'),
        background: 'linear-gradient(180deg, #0d1117 0%, #0a0f1a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: (collapsed && !isMobile) ? '1rem 0.5rem' : '1.25rem 0.75rem',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        bottom: isMobile ? 0 : 'auto',
        left: isMobile ? (mobileOpen ? 0 : '-300px') : 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 101,
        boxShadow: (isMobile && mobileOpen) ? '4px 0 24px rgba(0,0,0,0.5)' : 'none'
      }}>
        <div>
          {/* Logo */}
          <div style={{
            padding: (collapsed && !isMobile) ? '0 0.25rem 1.25rem' : '0 0.5rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justify: (collapsed && !isMobile) ? 'center' : 'space-between',
          }}>
            {(!collapsed || isMobile) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', letterSpacing: '0.3px' }}>
                    CyberGuardian
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#f85149', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
                  SOC Admin Portal
                </span>
              </div>
            )}
            {(collapsed && !isMobile) && <span style={{ fontSize: '1.4rem' }}>🛡️</span>}
            
            {!isMobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? '›' : '‹'}
              </button>
            )}
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {navItems.map((item, idx) => {
              if (item.section) {
                if (collapsed && !isMobile) return null;
                return (
                  <div key={idx} style={{
                    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.5px',
                    color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
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
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    background: active
                      ? 'linear-gradient(90deg, rgba(31,111,235,0.25), rgba(31,111,235,0.08))'
                      : 'transparent',
                    borderLeft: active ? '2px solid #388bfd' : '2px solid transparent',
                    fontWeight: active ? 600 : 400,
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                  <span style={{ fontSize: '1rem', minWidth: '1.1rem', textAlign: 'center' }}>{item.icon}</span>
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── User Footer ──────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '1rem' }}>
          {(!collapsed || isMobile) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1f6feb, #388bfd)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
              }}>
                {(user?.username || 'A')[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          )}

          <button
            onClick={logoutUser}
            className="btn-fluid"
            style={{
              width: '100%',
              padding: (collapsed && !isMobile) ? '0.6rem' : '0.55rem 0.75rem',
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.3)',
              color: '#f85149',
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
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.08)'; }}
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
        width: '100%'
      }}>
        {children}
      </main>
    </div>
  );
}
