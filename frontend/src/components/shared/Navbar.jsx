import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle';
import {
  LayoutDashboard,
  FileCheck,
  Link2,
  Server,
  Lock,
  Globe,
  Search,
  Activity,
  Radio,
  Bot,
  Award,
  FileText,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

const SCANNER_TOOLS = [
  { path: '/file-analyzer', label: 'File Analyzer', icon: FileCheck, desc: 'Malware & hash inspection' },
  { path: '/url-scanner', label: 'URL Scanner', icon: Link2, desc: 'Phishing & link reputation' },
  { path: '/port-scanner', label: 'Port Scanner', icon: Server, desc: 'Open ports & active services' },
  { path: '/ssl-scanner', label: 'SSL Scanner', icon: Lock, desc: 'TLS cert & ciphers audit' },
  { path: '/whois', label: 'WHOIS Lookup', icon: Globe, desc: 'Domain registrar & DNS info' },
  { path: '/scan', label: 'Quick Scan', icon: Search, desc: 'Automated perimeter sweep' },
];

export default function Navbar() {
  const { user, logoutUser } = useContext(AuthContext);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scannersOpen, setScannersOpen] = useState(false);
  const scannersRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const isScannerActive = SCANNER_TOOLS.some(tool => tool.path === location.pathname);

  // Close dropdowns on route change or click outside
  useEffect(() => {
    setScannersOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (scannersRef.current && !scannersRef.current.contains(e.target)) {
        setScannersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinkStyle = (active) => ({
    padding: '0.45rem 0.75rem',
    borderRadius: '7px',
    textDecoration: 'none',
    color: active ? '#ffffff' : 'var(--text-muted)',
    background: active ? 'var(--accent-color)' : 'transparent',
    fontWeight: '600',
    fontSize: '0.84rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    cursor: 'pointer'
  });

  return (
    <header className="glass-panel" style={{
      margin: '0.85rem 1rem 1.5rem 1rem',
      padding: '0.7rem 1.15rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      position: 'relative',
      zIndex: 100,
      background: 'var(--panel-bg)',
      boxShadow: 'var(--panel-shadow)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', justifyContent: 'space-between' }}>
        
        {/* Brand Logo & Portal Tag */}
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00c9a7 0%, #0077b6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 201, 167, 0.3)'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              margin: 0,
              color: 'var(--text-main)',
              fontSize: '1.15rem',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              lineHeight: 1.15
            }}>
              CyberGuardian
            </span>
            <span style={{
              fontSize: '0.62rem',
              color: '#00c9a7',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              Security Suite
            </span>
          </div>
        </Link>

        {/* Organized Desktop Navigation Links */}
        <nav className="desktop-only-nav" style={{
          display: 'flex',
          gap: '0.3rem',
          alignItems: 'center',
          flexWrap: 'nowrap'
        }}>
          {/* 1. Dashboard */}
          <Link to="/dashboard" style={navLinkStyle(isActive('/dashboard'))}>
            <LayoutDashboard size={14} />
            Dashboard
          </Link>

          {/* 2. Scanners & Tools Dropdown */}
          <div
            ref={scannersRef}
            style={{ position: 'relative' }}
            onMouseEnter={() => setScannersOpen(true)}
            onMouseLeave={() => setScannersOpen(false)}
          >
            <button
              onClick={() => setScannersOpen(!scannersOpen)}
              style={{
                ...navLinkStyle(isScannerActive),
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              <Search size={14} />
              <span>Scanners</span>
              <ChevronDown size={13} style={{
                transition: 'transform 0.2s ease',
                transform: scannersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                opacity: 0.8
              }} />
            </button>

            {/* Dropdown Menu Panel */}
            {scannersOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                minWidth: '280px',
                background: 'var(--panel-solid-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.5rem',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
                backdropFilter: 'blur(16px)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}>
                <div style={{
                  padding: '0.35rem 0.65rem 0.25rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.6px'
                }}>
                  Perimeter & Threat Scanners
                </div>

                {SCANNER_TOOLS.map((tool) => {
                  const ToolIcon = tool.icon;
                  const current = isActive(tool.path);
                  return (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        background: current ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                        color: current ? 'var(--accent-color)' : 'var(--text-main)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!current) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        if (!current) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: current ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.06)',
                        color: current ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ToolIcon size={14} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, lineHeight: 1.2 }}>
                          {tool.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {tool.desc}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. SOC Analysis */}
          <Link to="/soc-analysis" style={navLinkStyle(isActive('/soc-analysis'))}>
            <Activity size={14} />
            SOC Analysis
          </Link>

          {/* 4. Threat Intel */}
          <Link to="/threat-intel" style={navLinkStyle(isActive('/threat-intel'))}>
            <Radio size={14} />
            Threat Intel
          </Link>

          {/* 5. AI Agent */}
          <Link to="/ai-agent" style={navLinkStyle(isActive('/ai-agent'))}>
            <Bot size={14} />
            <span>AI Agent</span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '4px',
              background: isActive('/ai-agent') ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 201, 167, 0.15)',
              color: isActive('/ai-agent') ? '#ffffff' : '#00c9a7'
            }}>
              PRO
            </span>
          </Link>

          {/* 6. Reports */}
          <Link to="/reports" style={navLinkStyle(isActive('/reports'))}>
            <FileText size={14} />
            Reports
          </Link>

          {/* 7. My History */}
          <Link to="/history" style={navLinkStyle(isActive('/history'))}>
            <History size={14} />
            History
          </Link>

          {/* 8. Certificates - Highlighted Accreditation Pill */}
          <Link
            to="/certificates"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              background: isActive('/certificates')
                ? 'linear-gradient(135deg, #00c9a7 0%, #0077b6 100%)'
                : 'rgba(0, 201, 167, 0.1)',
              color: isActive('/certificates') ? '#ffffff' : '#00c9a7',
              border: isActive('/certificates')
                ? '1px solid #00c9a7'
                : '1px solid rgba(0, 201, 167, 0.35)',
              boxShadow: isActive('/certificates')
                ? '0 0 14px rgba(0, 201, 167, 0.4)'
                : 'none'
            }}
          >
            <Award size={15} />
            <span>Certificates</span>
          </Link>
        </nav>

        {/* Desktop User Controls & Actions */}
        <div className="desktop-only-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          {/* Theme Mode Toggle (Single Instance) */}
          <ThemeToggle />

          {/* Settings Shortcut */}
          <Link
            to="/settings"
            title="Account & System Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              textDecoration: 'none',
              color: isActive('/settings') ? 'var(--accent-color)' : 'var(--text-muted)',
              background: isActive('/settings') ? 'rgba(88, 166, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={16} />
          </Link>

          {/* User Profile Pill */}
          <Link
            to="/profile"
            title="View Profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '7px',
              textDecoration: 'none',
              background: isActive('/profile') ? 'rgba(88, 166, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00c9a7 0%, #0077b6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              {user ? user.username : 'User'}
            </span>
          </Link>

          {/* Logout Action */}
          <button
            onClick={logoutUser}
            title="Sign Out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.42rem 0.75rem',
              background: 'rgba(248, 81, 73, 0.12)',
              border: '1px solid rgba(248, 81, 73, 0.35)',
              color: 'var(--danger-color)',
              borderRadius: '7px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button (Hidden on Desktop via CSS) */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
          style={{
            display: 'none',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: '1.2rem',
            padding: '0.4rem 0.65rem',
            borderRadius: '8px',
            cursor: 'pointer',
            minHeight: '40px',
            minWidth: '40px'
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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
            background: 'rgba(10, 13, 18, 0.92)',
            backdropFilter: 'blur(20px)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          {/* Drawer Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                CyberGuardian
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ThemeToggle />
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '0.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Section: Core Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 0.5rem' }}>
              Overview & Operations
            </div>
            {[
              ['/dashboard', 'Dashboard', LayoutDashboard],
              ['/soc-analysis', 'SOC Analysis', Activity],
              ['/threat-intel', 'Threat Intel', Radio],
              ['/ai-agent', 'AI Security Agent', Bot],
            ].map(([path, label, Icon]) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '7px',
                  textDecoration: 'none',
                  color: isActive(path) ? '#ffffff' : 'var(--text-main)',
                  background: isActive(path) ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.04)',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Section: Scanners */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 0.5rem' }}>
              Security Scanners
            </div>
            {SCANNER_TOOLS.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '7px',
                    textDecoration: 'none',
                    color: isActive(tool.path) ? '#ffffff' : 'var(--text-main)',
                    background: isActive(tool.path) ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.04)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}
                >
                  <ToolIcon size={16} />
                  <span>{tool.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Section: Compliance & Records */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 0.5rem' }}>
              Compliance & Audit
            </div>
            <Link
              to="/certificates"
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '7px',
                textDecoration: 'none',
                color: '#ffffff',
                background: isActive('/certificates')
                  ? 'linear-gradient(135deg, #00c9a7 0%, #0077b6 100%)'
                  : 'rgba(0, 201, 167, 0.25)',
                fontWeight: '700',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                border: '1px solid #00c9a7'
              }}
            >
              <Award size={16} />
              <span>Certificates Hub</span>
            </Link>
            <Link
              to="/reports"
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '7px',
                textDecoration: 'none',
                color: isActive('/reports') ? '#ffffff' : 'var(--text-main)',
                background: isActive('/reports') ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.04)',
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <FileText size={16} />
              <span>Security Reports</span>
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '7px',
                textDecoration: 'none',
                color: isActive('/history') ? '#ffffff' : 'var(--text-main)',
                background: isActive('/history') ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.04)',
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <History size={16} />
              <span>Audit History</span>
            </Link>
          </div>

          {/* Section: Account & Logout */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '7px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                👤 {user ? user.username : 'Profile'}
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '7px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Settings size={15} /> Settings
              </Link>
            </div>

            <button
              onClick={() => { setMobileOpen(false); logoutUser(); }}
              style={{
                padding: '0.75rem',
                background: 'rgba(248, 81, 73, 0.18)',
                border: '1px solid var(--danger-color)',
                color: 'var(--danger-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem'
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
