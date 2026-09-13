import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';
import {
  LayoutDashboard, BarChart3, Users, ShieldAlert, FileText, Lock,
  Globe, Link2, Cpu, Flame, Bot, Activity, FileCheck, Server,
  Settings, LogOut, Search, Sun, Moon, Maximize, Minimize,
  Bell, ChevronDown, ChevronRight, Menu, X, Radio, History, Shield,
  ArrowRight, Award
} from 'lucide-react';


let cachedSidebarScrollTop = 0;

export default function AdminSidebar({ children }) {
  const { user, authTokens, logoutUser } = useContext(AuthContext);
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [activeIncidentCount, setActiveIncidentCount] = useState(0);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [scannersOpen, setScannersOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);

  const navRef = useRef(null);
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preserve sidebar scroll position
  useEffect(() => {
    if (navRef.current) {
      if (cachedSidebarScrollTop > 0) {
        navRef.current.scrollTop = cachedSidebarScrollTop;
      }
    }
  }, [location.pathname]);

  // Handle smooth scrolling and focus highlight when navigating with hash anchor
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.35s ease, border-color 0.35s ease';
          el.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.55)';
          setTimeout(() => {
            if (el) el.style.boxShadow = '';
          }, 2200);
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  // Fetch live security incidents for alerts and badge counts
  const fetchIncidentAlerts = async () => {
    try {
      const token = authTokens?.access || (localStorage.getItem('authTokens') ? JSON.parse(localStorage.getItem('authTokens')).access : null);
      if (!token) return;
      const res = await fetch('http://localhost:8000/api/admin/incidents/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setIncidents(list);
        const active = list.filter(i => !['RESOLVED', 'CLOSED'].includes(String(i.status).toUpperCase()));
        setActiveIncidentCount(active.length);
      }
    } catch (err) {
      console.debug('Failed to fetch incident alerts:', err);
    }
  };

  useEffect(() => {
    fetchIncidentAlerts();
    const unsubscribe = subscribeSecurityEvents((event) => {
      if (
        event?.type === 'INCIDENT_UPDATED' ||
        event?.type === 'INCIDENT_CREATED' ||
        event?.type === 'SCAN_COMPLETED' ||
        event?.type === 'TAB_FOCUSED'
      ) {
        fetchIncidentAlerts();
      }
    });
    const interval = setInterval(fetchIncidentAlerts, 20000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [authTokens?.access]);

  const handleNavScroll = (e) => {
    cachedSidebarScrollTop = e.currentTarget.scrollTop;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Nav item list for search and rendering
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'SECURITY & SOC',
      items: [
        { path: '/admin/scans', label: 'Security Monitoring', icon: Radio },
        { path: '/admin/threats', label: 'Threat Intelligence', icon: ShieldAlert, badge: 'Hot', badgeColor: 'bg-red-500 text-white' },
        {
          path: '/admin/incidents',
          label: 'Incident Management',
          icon: Flame,
          badge: activeIncidentCount > 0 ? String(activeIncidentCount) : null,
          badgeColor: 'bg-red-500 text-white'
        },
        { path: '/admin/soc-analysis', label: 'SOC Engine', icon: Cpu },
        { path: '/admin/ai-agent', label: 'AI Agent Monitor', icon: Bot, badge: 'New', badgeColor: 'bg-emerald-500 text-white' },
      ],
      collapsible: {
        title: 'Forensic Scanners',
        icon: FileText,
        isOpen: scannersOpen,
        onToggle: () => setScannersOpen(!scannersOpen),
        items: [
          { path: '/admin/file-analysis', label: 'File Analysis', icon: FileText },
          { path: '/admin/ssl-scanner', label: 'SSL Scanner', icon: Lock },
          { path: '/admin/whois', label: 'WHOIS & Domains', icon: Globe },
          { path: '/admin/url-scanner', label: 'URL Scanner', icon: Link2 },
          { path: '/admin/port-scanner', label: 'Port Scanner', icon: Cpu },
        ]
      }
    },
    {
      title: 'MANAGEMENT',
      items: [
        { path: '/admin/users', label: 'User Management', icon: Users },
        { path: '/admin/reports', label: 'Reports', icon: FileCheck },
        { path: '/admin/certificates', label: 'Certificates', icon: Award },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { path: '/admin/system-health', label: 'System Health', icon: Activity },
        { path: '/admin/api-health', label: 'API Health', icon: Server },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: History },
        { path: '/admin/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  // Comprehensive Admin Search Database (Pages, Scanners, Tools, and Dashboard Sections)
  const adminSearchDatabase = [
    // ── Pages & Modules ──
    {
      type: 'Page',
      label: 'Dashboard Overview',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      category: 'Overview',
      description: 'Main security dashboard, KPI summary, system state & recent activity',
      keywords: 'home dashboard kpi overview summary metrics performance statistics security admin'
    },
    {
      type: 'Page',
      label: 'Certificates Management',
      path: '/admin/certificates',
      icon: Award,
      category: 'Management',
      description: 'Audit, verify, and manage cybersecurity completion certificates and revocations',
      keywords: 'certificates verify revocation audit ledger completion security awards credentials admin'
    },
    {
      type: 'Page',
      label: 'Security Analytics',
      path: '/admin/analytics',
      icon: BarChart3,
      category: 'Analytics',
      description: 'Deep security analytics, scanning trends, monthly metrics & risk graphs',
      keywords: 'analytics charts trends graphs statistics scans threat volume report rate performance'
    },
    {
      type: 'Page',
      label: 'Security Monitoring',
      path: '/admin/scans',
      icon: Radio,
      category: 'Security & SOC',
      description: 'Real-time security audits, active scan engine feeds & inspection logs',
      keywords: 'scans scanning monitor security real-time live active inspections audit'
    },
    {
      type: 'Page',
      label: 'Threat Intelligence',
      path: '/admin/threats',
      icon: ShieldAlert,
      category: 'Security & SOC',
      description: 'CVE vulnerabilities, active threat signatures, IoC telemetry & severity filters',
      keywords: 'threats intelligence cve vulnerabilities malicious exploit ioc high risk critical alerts'
    },
    {
      type: 'Page',
      label: 'Incident Management',
      path: '/admin/incidents',
      icon: Flame,
      category: 'Security & SOC',
      description: 'Incident triage, breach containment, mitigation workflows & escalation status',
      keywords: 'incidents breach response alert triage resolve tickets emergencies flame'
    },
    {
      type: 'Page',
      label: 'SOC Engine & Analysis',
      path: '/admin/soc-analysis',
      icon: Cpu,
      category: 'Security & SOC',
      description: 'AI-driven SOC Engine, threat verdict, triage heuristics & severity score',
      keywords: 'soc engine analysis ai verdict triage risk score automated evaluation cpu'
    },
    {
      type: 'Page',
      label: 'AI Agent Monitor',
      path: '/admin/ai-agent',
      icon: Bot,
      category: 'Security & SOC',
      description: 'Autonomous AI defense bot, autonomous mitigations & LLM actions history',
      keywords: 'ai agent bot autonomous automation llm cybersec monitor model'
    },
    {
      type: 'Page',
      label: 'File Analysis Scanner',
      path: '/admin/file-analysis',
      icon: FileText,
      category: 'Forensic Scanners',
      description: 'Malware analysis, binary inspection, PE headers & hash verification',
      keywords: 'file analysis malware scan virus pe sha256 binary upload forensic'
    },
    {
      type: 'Page',
      label: 'SSL Scanner',
      path: '/admin/ssl-scanner',
      icon: Lock,
      category: 'Forensic Scanners',
      description: 'SSL/TLS certificate health, certificate chain, expiry & cipher strengths',
      keywords: 'ssl tls certificate https expiration validity cipher encryption'
    },
    {
      type: 'Page',
      label: 'WHOIS & Domain Forensics',
      path: '/admin/whois',
      icon: Globe,
      category: 'Forensic Scanners',
      description: 'WHOIS registry queries, DNS records, nameservers & domain registrar info',
      keywords: 'whois domain registrar dns ip lookup name ownership ns forensic'
    },
    {
      type: 'Page',
      label: 'URL Phishing Scanner',
      path: '/admin/url-scanner',
      icon: Link2,
      category: 'Forensic Scanners',
      description: 'Phishing website detection, malicious redirect tracing & URL reputation',
      keywords: 'url link scanner phishing malicious website redirect domain safety'
    },
    {
      type: 'Page',
      label: 'Port & Network Scanner',
      path: '/admin/port-scanner',
      icon: Cpu,
      category: 'Forensic Scanners',
      description: 'Open port discovery, listening services & network attack surface audit',
      keywords: 'port scanner network service tcp udp open ports socket scan'
    },
    {
      type: 'Page',
      label: 'User Management',
      path: '/admin/users',
      icon: Users,
      category: 'Management',
      description: 'User directory, admin role assignments, privileges & account status',
      keywords: 'users accounts members clients roles permissions ban suspend admin directory'
    },
    {
      type: 'Page',
      label: 'Reports & Compliance',
      path: '/admin/reports',
      icon: FileCheck,
      category: 'Management',
      description: 'SOC audit reports, forensic summaries, PDF/CSV export & risk analytics',
      keywords: 'reports export pdf csv download compliance summary records audits'
    },
    {
      type: 'Page',
      label: 'System Health',
      path: '/admin/system-health',
      icon: Activity,
      category: 'System',
      description: 'Server hardware telemetry, CPU load, RAM utilization & host diagnostics',
      keywords: 'system health cpu ram memory load server hardware uptime status'
    },
    {
      type: 'Page',
      label: 'API Health & Latency',
      path: '/admin/api-health',
      icon: Server,
      category: 'System',
      description: 'Backend REST API endpoint status, latency response metrics & uptime',
      keywords: 'api health latency response server endpoints backend status code 200'
    },
    {
      type: 'Page',
      label: 'Audit Logs',
      path: '/admin/audit-logs',
      icon: History,
      category: 'System',
      description: 'Immutable system audit trails, analyst actions & administrative logs',
      keywords: 'audit logs history events records trace activities analyst timeline'
    },
    {
      type: 'Page',
      label: 'Platform Settings',
      path: '/admin/settings',
      icon: Settings,
      category: 'System',
      description: 'Security thresholds, platform settings, notification preferences & policies',
      keywords: 'settings configuration preferences thresholds security rules system'
    },

    // ── Dashboard Sections (Direct Scroll Jumps) ──
    {
      type: 'Section',
      label: 'Dashboard: KPI Stat Cards',
      path: '/admin/dashboard#admin-kpi-stats',
      icon: LayoutDashboard,
      category: 'Dashboard Section',
      description: 'Jump directly to Total Users, Total Scans, Threat Alerts & CPU Load metric cards',
      keywords: 'kpi stat cards total users scans alerts cpu load numbers dashboard stats'
    },
    {
      type: 'Section',
      label: 'Dashboard: Security Activity Chart',
      path: '/admin/dashboard#admin-security-activity',
      icon: BarChart3,
      category: 'Dashboard Section',
      description: 'Jump to Security Activity spline timeline chart (Scans vs Threat Detections)',
      keywords: 'activity chart spline timeline scans threat detections graph dashboard visual'
    },
    {
      type: 'Section',
      label: 'Dashboard: User Growth & Scans Trend',
      path: '/admin/dashboard#admin-user-growth',
      icon: BarChart3,
      category: 'Dashboard Section',
      description: 'Jump to User Growth & Scanning Volume 7-day bar chart',
      keywords: 'user growth trend bar chart monthly scans volume dashboard 7 days'
    },
    {
      type: 'Section',
      label: 'Dashboard: Threat & Risk Distribution',
      path: '/admin/dashboard#admin-threat-distribution',
      icon: ShieldAlert,
      category: 'Dashboard Section',
      description: 'Jump to live Threat Breakdown donut chart (Critical, High, Medium, Low)',
      keywords: 'threat distribution donut risk breakdown critical high medium low donut chart dashboard'
    },
    {
      type: 'Section',
      label: 'Dashboard: Recent Security Audits',
      path: '/admin/dashboard#admin-recent-scans',
      icon: Radio,
      category: 'Dashboard Section',
      description: 'Jump to Recent Security Audits & Scans table with live statuses & scores',
      keywords: 'recent scans audits table records target domains risk score completed shipped dashboard table'
    },
    {
      type: 'Section',
      label: 'Dashboard: Storage Status & Services',
      path: '/admin/dashboard#admin-storage-status',
      icon: Server,
      category: 'Dashboard Section',
      description: 'Jump to Cloud Storage gauge, database usage & services status',
      keywords: 'storage status gauge cloud disk database gb used free services dashboard'
    }
  ];

  // Quick suggestions shown when search bar is focused before typing
  const quickSuggestions = [
    adminSearchDatabase[0], // Dashboard Overview
    adminSearchDatabase[2], // Security Monitoring
    adminSearchDatabase[3], // Threat Intelligence
    adminSearchDatabase[13], // Reports & Compliance
    adminSearchDatabase[12], // User Management
    adminSearchDatabase[18], // Dashboard: KPI Stat Cards
  ];

  const queryTokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filteredSearchResults = queryTokens.length > 0
    ? adminSearchDatabase.filter(item => {
        const searchableText = `${item.label} ${item.description} ${item.category} ${item.keywords}`.toLowerCase();
        return queryTokens.every(token => searchableText.includes(token));
      })
    : [];

  const displayedSearchResults = queryTokens.length > 0 ? filteredSearchResults : quickSuggestions;

  const handleSearchResultClick = (item) => {
    const targetPath = typeof item === 'string' ? item : item.path;
    setSearchQuery('');
    setSearchFocused(false);
    searchInputRef.current?.blur();

    if (targetPath.includes('#')) {
      const [targetRoute, targetHash] = targetPath.split('#');
      if (location.pathname === targetRoute) {
        // Already on this route: smooth scroll to anchor immediately
        const el = document.getElementById(targetHash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.35s ease, border-color 0.35s ease';
          el.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.55)';
          setTimeout(() => {
            if (el) el.style.boxShadow = '';
          }, 2200);
        }
      } else {
        navigate(targetPath);
      }
    } else {
      navigate(targetPath);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!displayedSearchResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev + 1) % displayedSearchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev - 1 + displayedSearchResults.length) % displayedSearchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedSearchResults[searchSelectedIndex]) {
        handleSearchResultClick(displayedSearchResults[searchSelectedIndex]);
      } else if (displayedSearchResults[0]) {
        handleSearchResultClick(displayedSearchResults[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
  };

  const isActive = (path) => location.pathname === path || (path !== '/admin/dashboard' && location.pathname.startsWith(path));

  return (
    <div className="admin-portal admin-layout" style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: isDark ? '#0f172a' : '#f4f6f9',
      color: isDark ? '#f8fafc' : '#0f172a',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      zIndex: 10,
    }}>

      {/* ═══════════════════════════════════════════════════════════════
          TOP HEADER BAR (Metis Style)
          ═══════════════════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '64px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.03)',
      }}>
        {/* Left: Brand Logo & Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            {/* CyberGuardian Shield Logo */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
              flexShrink: 0
            }}>
              <Shield size={22} strokeWidth={2.4} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1
              }}>
                CG SOC Admin
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#6366f1',
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
                padding: '2px 8px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                CyberGuardian
              </span>
            </div>
          </Link>


          {/* Hamburger Menu Button */}
          <button
            onClick={() => {
              if (isMobile) {
                setMobileOpen(!mobileOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Toggle navigation sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Center: Search Bar Pill (Search... Ctrl+K) */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', display: isMobile ? 'none' : 'block' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            border: `1px solid ${searchFocused ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')}`,
            borderRadius: '9999px',
            padding: '0.45rem 0.85rem 0.45rem 1.1rem',
            transition: 'all 0.18s ease',
            boxShadow: searchFocused ? '0 0 0 3px rgba(99, 102, 241, 0.18)' : 'none'
          }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search... (Ctrl+K)"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSearchSelectedIndex(0);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 240)}
              onKeyDown={handleSearchKeyDown}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.85rem',
                color: isDark ? '#f8fafc' : '#0f172a',
                paddingRight: searchQuery ? '2.5rem' : '1.5rem',
              }}
            />

            {/* Clear Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchSelectedIndex(0);
                  searchInputRef.current?.focus();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: isDark ? '#94a3b8' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '6px'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {/* Magnifying Glass Search Button */}
            <button
              type="button"
              onClick={() => {
                if (displayedSearchResults.length > 0) {
                  handleSearchResultClick(displayedSearchResults[searchSelectedIndex] || displayedSearchResults[0]);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: searchFocused ? '#6366f1' : (isDark ? '#94a3b8' : '#64748b'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Search"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Quick Search Autocomplete Dropdown */}
          {searchFocused && (
            <div
              onMouseDown={e => e.preventDefault()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: 'min(440px, 92vw)',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '12px',
                boxShadow: isDark ? '0 12px 35px rgba(0,0,0,0.5)' : '0 12px 35px rgba(0,0,0,0.12)',
                zIndex: 100,
                padding: '0.6rem 0.5rem',
                maxHeight: '380px',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
            >
              {/* Dropdown Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.25rem 0.75rem 0.5rem',
                borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.6)' : '#f1f5f9'}`,
                marginBottom: '0.35rem'
              }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  {searchQuery.trim() ? `Search Results (${displayedSearchResults.length})` : 'Quick Suggestions'}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  color: isDark ? '#64748b' : '#94a3b8'
                }}>
                  Ctrl+K
                </span>
              </div>

              {displayedSearchResults.length > 0 ? (
                displayedSearchResults.map((item, idx) => {
                  const ItemIcon = item.icon || LayoutDashboard;
                  const isSelected = searchSelectedIndex === idx;
                  const isSection = item.type === 'Section';

                  return (
                    <div
                      key={`${item.path}-${idx}`}
                      onClick={() => handleSearchResultClick(item)}
                      onMouseEnter={() => setSearchSelectedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff')
                          : 'transparent',
                        borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                        transition: 'all 0.12s ease',
                        marginBottom: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        {/* Icon Container */}
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: isSelected
                            ? '#6366f1'
                            : (isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff'),
                          color: isSelected ? '#ffffff' : '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.12s ease'
                        }}>
                          <ItemIcon size={16} />
                        </div>

                        {/* Title and description */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            lineHeight: 1.2
                          }}>
                            <span style={{
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: isDark ? '#f8fafc' : '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {item.label}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: isSection
                                ? (isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff')
                                : (isDark ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe'),
                              color: isSection ? '#a855f7' : '#0284c7',
                              letterSpacing: '0.02em',
                              textTransform: 'uppercase'
                            }}>
                              {isSection ? 'Section' : 'Page'}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '0.72rem',
                            color: isDark ? '#94a3b8' : '#64748b',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '280px'
                          }}>
                            {item.description}
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow / Action indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: isSelected ? '#6366f1' : 'transparent',
                        flexShrink: 0
                      }}>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  <Search size={22} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    No results found for "{searchQuery}"
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                    Try searching for "threats", "scans", "users", "reports", or "storage"
                  </div>
                </div>
              )}

              {/* Bottom Keyboard Navigation Hint */}
              <div style={{
                borderTop: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.6)' : '#f1f5f9'}`,
                marginTop: '0.35rem',
                paddingTop: '0.45rem',
                paddingLeft: '0.5rem',
                paddingRight: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.68rem',
                color: isDark ? '#64748b' : '#94a3b8'
              }}>
                <span>Navigate: <strong>↑ ↓</strong></span>
                <span>Select: <strong>↵ Enter</strong></span>
                <span>Close: <strong>ESC</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Right Action Icons: Theme, Fullscreen, Notification, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
              padding: '8px',
              borderRadius: '8px',
              display: isMobile ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* Notification Bell with Live Dynamic Incident Badge */}
          <div ref={notifMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#94a3b8' : '#64748b',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title={activeIncidentCount > 0 ? `${activeIncidentCount} Active Security Incidents` : "Security Alerts (0 active)"}
            >
              <Bell size={18} />
              {activeIncidentCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  minWidth: '15px',
                  height: '15px',
                  padding: '0 3px',
                  borderRadius: '9999px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px ' + (isDark ? '#1e293b' : '#ffffff'),
                  lineHeight: 1
                }}>
                  {activeIncidentCount > 99 ? '99+' : activeIncidentCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown showing Live Incidents */}
            {notificationsOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '330px',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '12px',
                boxShadow: isDark ? '0 12px 35px rgba(0,0,0,0.5)' : '0 12px 35px rgba(0,0,0,0.12)',
                zIndex: 100,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={16} color="#ef4444" />
                    <span>Incident Alerts</span>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    color: activeIncidentCount > 0 ? '#ef4444' : '#10b981',
                    backgroundColor: activeIncidentCount > 0
                      ? (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2')
                      : (isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5'),
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}>
                    {activeIncidentCount > 0 ? `${activeIncidentCount} Active` : 'All Clear'}
                  </span>
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(String(i.status).toUpperCase())).length > 0 ? (
                    incidents
                      .filter(i => !['RESOLVED', 'CLOSED'].includes(String(i.status).toUpperCase()))
                      .slice(0, 5)
                      .map((inc) => {
                        const sevColor = inc.severity === 'CRITICAL' ? '#ef4444'
                          : inc.severity === 'HIGH' ? '#f97316'
                          : inc.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';

                        return (
                          <div
                            key={inc.id}
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate(`/admin/incidents?id=${inc.id}`);
                            }}
                            style={{
                              padding: '0.7rem 1rem',
                              borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#26334d' : '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                color: isDark ? '#f8fafc' : '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '190px'
                              }}>
                                #{inc.id} {inc.title}
                              </span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                color: sevColor,
                                backgroundColor: `${sevColor}18`,
                                border: `1px solid ${sevColor}40`,
                                textTransform: 'uppercase'
                              }}>
                                {inc.severity}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                color: isDark ? '#94a3b8' : '#64748b'
                              }}>
                                Status: <strong style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{inc.status}</strong>
                              </span>
                              <span style={{ fontSize: '0.68rem', color: isDark ? '#64748b' : '#94a3b8' }}>
                                {new Date(inc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div style={{ padding: '1.75rem 1rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>
                      <Shield size={26} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No Active Incidents</div>
                      <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.8 }}>All security incidents resolved</div>
                    </div>
                  )}
                </div>

                <Link
                  to="/admin/incidents"
                  onClick={() => setNotificationsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#6366f1',
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    textDecoration: 'none',
                    borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
                  }}
                >
                  <span>Manage in Incident Management</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {(user?.username || 'A')[0].toUpperCase()}
              </div>
              <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {user?.username || 'John Doe'}
                </span>
                <ChevronDown size={14} color={isDark ? '#94a3b8' : '#64748b'} />
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {userDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '210px',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                zIndex: 100,
                padding: '0.5rem',
              }}>
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}` }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {user?.username || 'Admin'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>
                    {user?.role || 'SOC_ANALYST'}
                  </div>
                </div>

                <div style={{ padding: '0.35rem 0' }}>
                  <Link
                    to="/admin/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.82rem',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      textDecoration: 'none',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Settings size={15} color="#64748b" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.82rem',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      textDecoration: 'none',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Users size={15} color="#64748b" />
                    <span>User Management</span>
                  </Link>
                </div>

                <div style={{ borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`, paddingTop: '0.35rem' }}>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logoutUser();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.82rem',
                      color: '#ef4444',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={15} color="#ef4444" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN WRAPPER: SIDEBAR + CONTENT AREA
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
        {/* Mobile Backdrop */}
        {isMobile && mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 45
            }}
          />
        )}

        {/* ─── SIDEBAR (Metis Style) ────────────────────────────────── */}
        <aside
          style={{
            width: isMobile ? '260px' : (collapsed ? '72px' : '250px'),
            minWidth: isMobile ? '260px' : (collapsed ? '72px' : '250px'),
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderRight: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: isMobile ? 'fixed' : 'sticky',
            top: '64px',
            bottom: 0,
            left: isMobile ? (mobileOpen ? 0 : '-270px') : 0,
            height: isMobile ? '100vh' : 'calc(100vh - 64px)',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
            zIndex: 46,
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: isMobile && mobileOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
            overflow: 'hidden'
          }}
        >
          {/* Scrollable Navigation Area */}
          <nav
            ref={navRef}
            onScroll={handleNavScroll}
            className="admin-sidebar-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: (collapsed && !isMobile) ? '1rem 0.5rem' : '1rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            {navSections.map((section, sIdx) => (
              <div key={sIdx} style={{ marginBottom: '0.65rem' }}>
                {/* Section Header */}
                {(!collapsed || isMobile) && (
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: isDark ? '#64748b' : '#94a3b8',
                    textTransform: 'uppercase',
                    padding: '0.45rem 0.75rem 0.25rem',
                  }}>
                    {section.title}
                  </div>
                )}

                {/* Section Links */}
                {section.items.map(item => {
                  const ItemIcon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (isMobile) setMobileOpen(false);
                      }}
                      title={(collapsed && !isMobile) ? item.label : ''}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: (collapsed && !isMobile) ? 'center' : 'space-between',
                        padding: (collapsed && !isMobile) ? '0.7rem 0' : '0.55rem 0.75rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: active ? 600 : 500,
                        backgroundColor: active
                          ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff')
                          : 'transparent',
                        color: active
                          ? (isDark ? '#818cf8' : '#4f46e5')
                          : (isDark ? '#94a3b8' : '#475569'),
                        transition: 'all 0.15s ease',
                        marginBottom: '2px',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f8fafc';
                          e.currentTarget.style.color = isDark ? '#ffffff' : '#0f172a';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = isDark ? '#94a3b8' : '#475569';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <ItemIcon size={18} color={active ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')} />
                        {(!collapsed || isMobile) && <span>{item.label}</span>}
                      </div>

                      {/* Pill Badge (Hot / New / Counter) */}
                      {(!collapsed || isMobile) && item.badge && (
                        <span className={`admin-badge ${item.badgeColor}`} style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Collapsible Submenu (e.g. Scanners & Forensics) */}
                {section.collapsible && (
                  <div style={{ marginTop: '2px' }}>
                    <div
                      onClick={section.collapsible.onToggle}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: (collapsed && !isMobile) ? 'center' : 'space-between',
                        padding: (collapsed && !isMobile) ? '0.7rem 0' : '0.55rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: isDark ? '#94a3b8' : '#475569',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f8fafc';
                        e.currentTarget.style.color = isDark ? '#ffffff' : '#0f172a';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = isDark ? '#94a3b8' : '#475569';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <section.collapsible.icon size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                        {(!collapsed || isMobile) && <span>{section.collapsible.title}</span>}
                      </div>
                      {(!collapsed || isMobile) && (
                        <ChevronDown
                          size={14}
                          style={{
                            transform: section.collapsible.isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      )}
                    </div>

                    {/* Collapsible Sub-items */}
                    {section.collapsible.isOpen && (!collapsed || isMobile) && (
                      <div style={{ paddingLeft: '1.25rem', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {section.collapsible.items.map(sub => {
                          const SubIcon = sub.icon;
                          const active = isActive(sub.path);
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => {
                                if (isMobile) setMobileOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                                fontWeight: active ? 600 : 500,
                                backgroundColor: active
                                  ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff')
                                  : 'transparent',
                                color: active
                                  ? (isDark ? '#818cf8' : '#4f46e5')
                                  : (isDark ? '#94a3b8' : '#64748b'),
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                if (!active) {
                                  e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f8fafc';
                                  e.currentTarget.style.color = isDark ? '#ffffff' : '#0f172a';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!active) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
                                }
                              }}
                            >
                              <SubIcon size={14} color={active ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#94a3b8')} />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* ─── MAIN CONTENT CONTAINER ───────────────────────────────── */}
        <main style={{
          flex: 1,
          padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 64px)',
          minWidth: 0,
          width: '100%',
          backgroundColor: isDark ? '#0f172a' : '#f4f6f9',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>

          {/* Universal Footer Across All Admin Pages */}
          <footer style={{
            marginTop: '3rem',
            paddingTop: '1.25rem',
            paddingBottom: '0.75rem',
            borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--admin-text-muted, #64748b)'
          }}>
            <div>© 2026 CyberGuardian AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.75rem' }}>
              <span>CG SOC Admin Console</span>
              <span>•</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>System Protected</span>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
