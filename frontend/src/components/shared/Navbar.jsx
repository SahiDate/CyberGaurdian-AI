import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  Sparkles,
  LayoutGrid,
  User
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
  const { isDark } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scannersOpen, setScannersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const scannersRef = useRef(null);
  const profileRef = useRef(null);
  const scannersTimeoutRef = useRef(null);
  const profileTimeoutRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const isScannerActive = SCANNER_TOOLS.some(tool => tool.path === location.pathname);

  const handleScannersEnter = () => {
    if (scannersTimeoutRef.current) clearTimeout(scannersTimeoutRef.current);
    setScannersOpen(true);
  };

  const handleScannersLeave = () => {
    scannersTimeoutRef.current = setTimeout(() => {
      setScannersOpen(false);
    }, 220);
  };

  const handleScannersClick = (e) => {
    e.stopPropagation();
    if (scannersTimeoutRef.current) clearTimeout(scannersTimeoutRef.current);
    setScannersOpen(prev => !prev);
  };

  const handleProfileEnter = () => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setProfileOpen(true);
  };

  const handleProfileLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setProfileOpen(false);
    }, 220);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setProfileOpen(prev => !prev);
  };

  // Close dropdowns on route change or click outside
  useEffect(() => {
    setScannersOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Accessibility: Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setScannersOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock background body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Auto-close mobile drawer when window resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1200) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (scannersRef.current && !scannersRef.current.contains(e.target)) {
        setScannersOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (scannersTimeoutRef.current) clearTimeout(scannersTimeoutRef.current);
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    };
  }, []);

  const navLinkStyle = (active) => ({
    padding: '0.38rem 0.52rem',
    borderRadius: '7px',
    textDecoration: 'none',
    color: active ? '#ffffff' : 'var(--text-muted)',
    background: active ? 'var(--accent-color)' : 'transparent',
    fontWeight: '600',
    fontSize: '0.8rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.32rem',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    cursor: 'pointer'
  });

  return (
    <header className="glass-panel user-navbar-header" style={{
      margin: 'clamp(0.5rem, 1.5vw, 0.85rem) clamp(0.4rem, 2vw, 1rem) clamp(0.85rem, 2vw, 1.5rem)',
      padding: 'clamp(0.45rem, 1.5vw, 0.6rem) clamp(0.5rem, 2vw, 1rem)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', justifyContent: 'space-between', minWidth: 0 }}>
        
        {/* Brand Logo & Portal Tag */}
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00c9a7 0%, #0077b6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 201, 167, 0.3)'
          }}>
            <span style={{ fontSize: '1rem' }}>🛡️</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              margin: 0,
              color: 'var(--text-main)',
              fontSize: '1.1rem',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              lineHeight: 1.15
            }}>
              CyberGuardian
            </span>
            <span style={{
              fontSize: '0.6rem',
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
          gap: '0.18rem',
          alignItems: 'center',
          flexWrap: 'nowrap',
          minWidth: 0
        }}>
          {/* 1. Dashboard */}
          <Link to="/dashboard" style={navLinkStyle(isActive('/dashboard'))}>
            <LayoutDashboard size={14} />
            Dashboard
          </Link>

          {/* All Modules */}
          <Link to="/modules" id="nav-all-modules" style={navLinkStyle(isActive('/modules'))}>
            <LayoutGrid size={14} />
            All Modules
          </Link>

          {/* 2. Scanners & Tools Dropdown */}
          <div
            ref={scannersRef}
            style={{ position: 'relative' }}
            onMouseEnter={handleScannersEnter}
            onMouseLeave={handleScannersLeave}
          >
            <button
              onClick={handleScannersClick}
              id="nav-scanners-btn"
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

            {/* Dropdown Menu Panel (with gapless hover bridge) */}
            {scannersOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  paddingTop: '6px',
                  zIndex: 1000
                }}
                onMouseEnter={handleScannersEnter}
                onMouseLeave={handleScannersLeave}
              >
                <div style={{
                  minWidth: '280px',
                  background: 'var(--panel-solid-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.5rem',
                  boxShadow: 'var(--panel-shadow)',
                  backdropFilter: 'blur(16px)',
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
                        onClick={() => setScannersOpen(false)}
                        className="scanner-dropdown-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.7rem',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          background: current ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                          color: current ? 'var(--accent-color)' : 'var(--text-main)'
                        }}
                      >
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: current ? 'var(--accent-color)' : 'var(--hover-bg, rgba(125, 125, 125, 0.1))',
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
              padding: '0.38rem 0.65rem',
              borderRadius: '7px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
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
                ? '0 0 12px rgba(0, 201, 167, 0.4)'
                : 'none'
            }}
          >
            <Award size={14} />
            <span>Certificates</span>
          </Link>
        </nav>

        {/* Desktop User Controls & Actions */}
        <div className="desktop-only-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          {/* Theme Mode Toggle (Single Instance) */}
          <ThemeToggle />

          {/* User Profile Pill with Integrated Dropdown (Settings + Logout) */}
          <div
            ref={profileRef}
            style={{ position: 'relative' }}
            onMouseEnter={handleProfileEnter}
            onMouseLeave={handleProfileLeave}
          >
            <button
              onClick={handleProfileClick}
              id="user-profile-menu-btn"
              title="Account Options"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.32rem 0.55rem',
                borderRadius: '8px',
                background: profileOpen || isActive('/profile') || isActive('/settings')
                  ? 'rgba(88, 166, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                fontFamily: 'inherit'
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
                fontWeight: 800,
                flexShrink: 0
              }}>
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                {user ? user.username : 'User'}
              </span>
              <ChevronDown size={13} style={{
                transition: 'transform 0.2s ease',
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                opacity: 0.75,
                marginLeft: '1px'
              }} />
            </button>

            {/* Profile Dropdown Menu (with gapless hover bridge) */}
            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  paddingTop: '6px',
                  zIndex: 1000
                }}
                onMouseEnter={handleProfileEnter}
                onMouseLeave={handleProfileLeave}
              >
                <div style={{
                  minWidth: '220px',
                  background: 'var(--panel-solid-bg, #1e293b)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.5rem',
                  boxShadow: 'var(--panel-shadow)',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  {/* User Info Header */}
                  <div style={{
                    padding: '0.5rem 0.65rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '0.25rem'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      {user?.username || 'User'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {user?.email || (user?.role ? user.role.toLowerCase() : 'Authenticated User')}
                    </div>
                  </div>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive('/profile') ? 'var(--accent-color)' : 'var(--text-main)',
                    background: isActive('/profile') ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/profile')) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/profile')) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <User size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>My Profile</span>
                </Link>

                {/* Settings Link */}
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive('/settings') ? 'var(--accent-color)' : 'var(--text-main)',
                    background: isActive('/settings') ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/settings')) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/settings')) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Settings size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>Settings</span>
                </Link>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }} />

                {/* Logout Option */}
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logoutUser();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--danger-color, #ef4444)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header Controls: Theme toggle + Hamburger */}
      <div className="mobile-header-controls" style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }}>
          <ThemeToggle />
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '1.2rem',
              padding: '0.4rem 0.65rem',
              borderRadius: '8px',
              cursor: 'pointer',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100dvh',
            backgroundColor: isDark ? '#0b0f17' : '#ffffff',
            color: isDark ? '#f0f6fc' : '#0f172a',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            overflow: 'hidden',
            animation: 'drawerFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* 1. Drawer Header (Fixed at Top) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem clamp(0.75rem, 3vw, 1.25rem)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            backgroundColor: isDark ? '#0b0f17' : '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: isDark ? '#f0f6fc' : '#0f172a',
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ThemeToggle />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                  color: isDark ? '#f0f6fc' : '#0f172a',
                  borderRadius: '8px',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Drawer Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '1rem clamp(0.75rem, 3vw, 1.25rem) 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Section: Overview & Operations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isDark ? '#94a3b8' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                padding: '0 0.5rem 0.2rem'
              }}>
                Overview & Operations
              </div>
              {[
                ['/dashboard', 'Dashboard', LayoutDashboard],
                ['/modules', 'All Modules', LayoutGrid],
                ['/soc-analysis', 'SOC Analysis', Activity],
                ['/threat-intel', 'Threat Intel', Radio],
                ['/ai-agent', 'AI Security Agent', Bot],
              ].map(([path, label, Icon]) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className="mobile-nav-link"
                    style={{
                      padding: '0.72rem 0.9rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: active ? '#ffffff' : (isDark ? '#f0f6fc' : '#1e293b'),
                      background: active
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                      border: active
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : (isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e2e8f0'),
                      boxShadow: active
                        ? (isDark ? '0 4px 14px rgba(37, 99, 235, 0.45)' : '0 4px 14px rgba(37, 99, 235, 0.25)')
                        : 'none',
                      fontWeight: active ? 700 : 600,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon size={18} style={{ color: active ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'), flexShrink: 0 }} />
                      <span>{label}</span>
                    </div>
                    {path === '/ai-agent' && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: active ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(0, 201, 167, 0.15)' : 'rgba(13, 148, 136, 0.12)'),
                        color: active ? '#ffffff' : (isDark ? '#00c9a7' : '#0d9488')
                      }}>
                        PRO
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Section: Security Scanners */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isDark ? '#94a3b8' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                padding: '0 0.5rem 0.2rem'
              }}>
                Security Scanners
              </div>
              {SCANNER_TOOLS.map((tool) => {
                const ToolIcon = tool.icon;
                const active = isActive(tool.path);
                return (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    onClick={() => setMobileOpen(false)}
                    className="mobile-nav-link"
                    style={{
                      padding: '0.68rem 0.9rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: active ? '#ffffff' : (isDark ? '#f0f6fc' : '#1e293b'),
                      background: active
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                      border: active
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : (isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e2e8f0'),
                      boxShadow: active
                        ? (isDark ? '0 4px 14px rgba(37, 99, 235, 0.45)' : '0 4px 14px rgba(37, 99, 235, 0.25)')
                        : 'none',
                      fontWeight: active ? 700 : 600,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <ToolIcon size={18} style={{ color: active ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'), flexShrink: 0 }} />
                      <span>{tool.label}</span>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      color: active ? 'rgba(255, 255, 255, 0.85)' : (isDark ? '#8b949e' : '#64748b')
                    }}>
                      {tool.desc.split('&')[0].trim()}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Section: Compliance & Audit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isDark ? '#94a3b8' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                padding: '0 0.5rem 0.2rem'
              }}>
                Compliance & Audit
              </div>

              {/* Certificates Hub */}
              <Link
                to="/certificates"
                onClick={() => setMobileOpen(false)}
                className="mobile-nav-link"
                style={{
                  padding: '0.72rem 0.9rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/certificates') ? '#ffffff' : (isDark ? '#00c9a7' : '#0d9488'),
                  background: isActive('/certificates')
                    ? 'linear-gradient(135deg, #00c9a7 0%, #0077b6 100%)'
                    : (isDark ? 'rgba(0, 201, 167, 0.12)' : 'rgba(0, 201, 167, 0.08)'),
                  border: isActive('/certificates')
                    ? '1px solid #00c9a7'
                    : (isDark ? '1px solid rgba(0, 201, 167, 0.35)' : '1px solid rgba(13, 148, 136, 0.35)'),
                  boxShadow: isActive('/certificates')
                    ? '0 4px 14px rgba(0, 201, 167, 0.4)'
                    : 'none',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Award size={18} style={{ color: isActive('/certificates') ? '#ffffff' : (isDark ? '#00c9a7' : '#0d9488') }} />
                  <span>Certificates Hub</span>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: isActive('/certificates') ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(0, 201, 167, 0.2)' : 'rgba(13, 148, 136, 0.15)'),
                  color: isActive('/certificates') ? '#ffffff' : (isDark ? '#00c9a7' : '#0d9488'),
                  fontWeight: 700
                }}>
                  VERIFIED
                </span>
              </Link>

              {/* Reports & History */}
              {[
                ['/reports', 'Security Reports', FileText],
                ['/history', 'Audit History', History],
              ].map(([path, label, Icon]) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className="mobile-nav-link"
                    style={{
                      padding: '0.68rem 0.9rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: active ? '#ffffff' : (isDark ? '#f0f6fc' : '#1e293b'),
                      background: active
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                      border: active
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : (isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e2e8f0'),
                      boxShadow: active
                        ? (isDark ? '0 4px 14px rgba(37, 99, 235, 0.45)' : '0 4px 14px rgba(37, 99, 235, 0.25)')
                        : 'none',
                      fontWeight: active ? 700 : 600,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={18} style={{ color: active ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'), flexShrink: 0 }} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Section: Account & Logout */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '1.25rem',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
                    color: isDark ? '#f0f6fc' : '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minHeight: '44px'
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
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>{user ? user.username : 'Profile'}</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
                    color: isDark ? '#f0f6fc' : '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minHeight: '44px'
                  }}
                >
                  <Settings size={16} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                  <span>Settings</span>
                </Link>
              </div>

              <button
                onClick={() => { setMobileOpen(false); logoutUser(); }}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  background: isDark ? 'rgba(248, 81, 73, 0.15)' : '#fee2e2',
                  border: isDark ? '1px solid rgba(248, 81, 73, 0.4)' : '1px solid #fca5a5',
                  color: isDark ? '#ff7b72' : '#dc2626',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  minHeight: '44px',
                  transition: 'background 0.15s ease'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
