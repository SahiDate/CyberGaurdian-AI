import React, { useContext, useState } from 'react';
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

  const rc = roleColors[user?.role] || roleColors['ADMIN'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080b10', color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? '64px' : '240px',
        minWidth: collapsed ? '64px' : '240px',
        background: 'linear-gradient(180deg, #0d1117 0%, #0a0f1a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: collapsed ? '1rem 0.5rem' : '1.25rem 0.75rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'all 0.25s ease',
        zIndex: 100,
      }}>
        <div>
          {/* Logo */}
          <div style={{
            padding: collapsed ? '0 0.25rem 1.25rem' : '0 0.5rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}>
            {!collapsed && (
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
            {collapsed && <span style={{ fontSize: '1.4rem' }}>🛡️</span>}
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '›' : '‹'}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {navItems.map((item, idx) => {
              if (item.section) {
                if (collapsed) return null;
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
                  title={collapsed ? item.label : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : '0.65rem',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '0.7rem' : '0.65rem 0.85rem',
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
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── User Footer ──────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          {!collapsed && (
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
            style={{
              width: '100%',
              padding: collapsed ? '0.6rem' : '0.55rem 0.75rem',
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
              gap: collapsed ? 0 : '0.5rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.08)'; }}
          >
            <span>⏻</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxHeight: '100vh', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
