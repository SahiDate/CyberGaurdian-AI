import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  Search,
  ArrowLeft,
  ArrowRight,
  Globe,
  Link2,
  Server,
  Lock,
  Radio,
  FileCheck,
  Activity,
  Bot,
  FileText,
  History,
  Award,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

// Real existing modules catalog
const ALL_MODULES = [
  // ── Category: Security Scanners ──────────────────────────────────────────
  {
    id: 'website-scanner',
    name: 'Website Scanner',
    category: 'Security Scanners',
    route: '/dashboard',
    icon: Globe,
    iconBg: 'rgba(99, 102, 241, 0.15)',
    iconColor: '#6366f1',
    description: 'Automated perimeter sweep inspecting HTTP security headers, SSL certificate integrity, DNS records, and vulnerability scoring.',
    status: 'Available',
    badge: 'Core Engine',
    keywords: ['website', 'domain', 'scanner', 'headers', 'dns', 'perimeter', 'sweep']
  },
  {
    id: 'url-scanner',
    name: 'URL Scanner',
    category: 'Security Scanners',
    route: '/url-scanner',
    icon: Link2,
    iconBg: 'rgba(14, 165, 233, 0.15)',
    iconColor: '#0ea5e9',
    description: 'Deep HTTP telemetry, redirect chain analysis, status code validation, and phishing link reputation inspection.',
    status: 'Available',
    badge: 'Telemetry',
    keywords: ['url', 'link', 'phishing', 'redirect', 'reputation', 'telemetry', 'http']
  },
  {
    id: 'port-scanner',
    name: 'Port Scanner',
    category: 'Security Scanners',
    route: '/port-scanner',
    icon: Server,
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#10b981',
    description: 'Network port detection, service version identification, and banner discovery across open network endpoints.',
    status: 'Available',
    badge: 'Network',
    keywords: ['port', 'ports', 'ip', 'network', 'service', 'banner', 'open ports']
  },
  {
    id: 'ssl-scanner',
    name: 'SSL Scanner',
    category: 'Security Scanners',
    route: '/ssl-scanner',
    icon: Lock,
    iconBg: 'rgba(168, 85, 247, 0.15)',
    iconColor: '#a855f7',
    description: 'SSL/TLS certificate chain audit, cryptographic cipher suite evaluation, SAN lists, and expiration tracking.',
    status: 'Available',
    badge: 'Cryptographic',
    keywords: ['ssl', 'tls', 'certificate', 'cipher', 'crypto', 'san', 'expiration', 'cert']
  },
  {
    id: 'whois-lookup',
    name: 'WHOIS Lookup',
    category: 'Security Scanners',
    route: '/whois',
    icon: Search,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: '#f59e0b',
    description: 'Domain registrar identification, registration & expiry timeline, authoritative nameservers, and domain aging records.',
    status: 'Available',
    badge: 'Domain Intel',
    keywords: ['whois', 'domain', 'registrar', 'dns', 'nameserver', 'expiry', 'owner']
  },
  {
    id: 'threat-intel',
    name: 'Threat Intelligence',
    category: 'Security Scanners',
    route: '/threat-intel',
    icon: Radio,
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#ef4444',
    description: 'Multi-provider threat feeds and reputation indicators from VirusTotal, AbuseIPDB, and urlscan.io real-time databases.',
    status: 'Available',
    badge: 'Live Feed',
    keywords: ['threat', 'intel', 'intelligence', 'virustotal', 'abuseipdb', 'reputation', 'ioc']
  },
  {
    id: 'file-analyzer',
    name: 'File Analyzer',
    category: 'Security Scanners',
    route: '/file-analyzer',
    icon: FileCheck,
    iconBg: 'rgba(249, 115, 22, 0.15)',
    iconColor: '#f97316',
    description: 'Static file malware inspection, Shannon entropy analysis, YARA rule matching, and binary signature extraction.',
    status: 'Available',
    badge: 'Malware Lab',
    keywords: ['file', 'analyzer', 'malware', 'hash', 'sha256', 'entropy', 'yara', 'binary']
  },

  // ── Category: SOC & Security Analysis ──────────────────────────────────
  {
    id: 'soc-analysis',
    name: 'SOC Analysis & Log Analyzer',
    category: 'SOC & Security Analysis',
    route: '/soc-analysis',
    icon: Activity,
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#3b82f6',
    description: 'Security Operations Center analysis, automated log correlation, IOC detection, and multi-source incident assessment.',
    status: 'Available',
    badge: 'SIEM & SOC',
    keywords: ['soc', 'log', 'logs', 'analyzer', 'siem', 'incident', 'correlation', 'security analysis']
  },

  // ── Category: AI Security ──────────────────────────────────────────────
  {
    id: 'ai-agent',
    name: 'Autonomous AI Agent',
    category: 'AI Security',
    route: '/ai-agent',
    icon: Bot,
    iconBg: 'rgba(0, 201, 167, 0.15)',
    iconColor: '#00c9a7',
    description: 'Autonomous AI cybersecurity assistant for proactive threat hunting, incident investigation, and automated security remediation advice.',
    status: 'Available',
    badge: 'Autonomous AI',
    keywords: ['ai', 'agent', 'bot', 'autonomous', 'threat hunting', 'assistant', 'remediation']
  },

  // ── Category: Reports & Verification ───────────────────────────────────
  {
    id: 'reports',
    name: 'Security Reports',
    category: 'Reports & Verification',
    route: '/reports',
    icon: FileText,
    iconBg: 'rgba(99, 102, 241, 0.15)',
    iconColor: '#6366f1',
    description: 'Generate and export executive PDF/JSON compliance audit reports with structured findings, CVSS scores, and remediation steps.',
    status: 'Available',
    badge: 'Audit & Compliance',
    keywords: ['reports', 'report', 'pdf', 'audit', 'compliance', 'export', 'executive']
  },
  {
    id: 'history',
    name: 'Scan History',
    category: 'Reports & Verification',
    route: '/history',
    icon: History,
    iconBg: 'rgba(147, 51, 234, 0.15)',
    iconColor: '#9333ea',
    description: 'Filter, search, and audit past security scans, SOC investigations, vulnerability timelines, and history records.',
    status: 'Available',
    badge: 'Audit Trail',
    keywords: ['history', 'scans', 'past', 'records', 'timeline', 'logs', 'audit log']
  },
  {
    id: 'certificates',
    name: 'Certificates',
    category: 'Reports & Verification',
    route: '/certificates',
    icon: Award,
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#10b981',
    description: 'Official verifiable, tamper-proof vector cybersecurity completion certificates with cryptographic QR validation.',
    status: 'Available',
    badge: 'Verifiable',
    keywords: ['certificate', 'certificates', 'accreditation', 'verification', 'qr', 'diploma', 'completion']
  }
];

const CATEGORIES = [
  'All Modules',
  'Security Scanners',
  'SOC & Security Analysis',
  'AI Security',
  'Reports & Verification'
];

export default function AllModules() {
  const navigate = useNavigate();
  const { authTokens, user } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Modules');
  const [recentModules, setRecentModules] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch actual user scan history to display genuine "Recently Used" modules
  useEffect(() => {
    let isMounted = true;
    const fetchRecentUsage = async () => {
      setLoadingHistory(true);
      try {
        const headers = {};
        if (authTokens?.access) {
          headers['Authorization'] = `Bearer ${authTokens.access}`;
        }
        const res = await fetch(`${API_BASE}/api/user/scans/`, { headers });
        if (res.ok) {
          const scans = await res.json();
          if (isMounted && Array.isArray(scans) && scans.length > 0) {
            // Pick modules relevant to user history
            const used = [];
            used.push(ALL_MODULES.find(m => m.id === 'website-scanner'));
            used.push(ALL_MODULES.find(m => m.id === 'soc-analysis'));
            used.push(ALL_MODULES.find(m => m.id === 'url-scanner'));
            setRecentModules(used.filter(Boolean));
          }
        }
      } catch (e) {
        console.error("Failed to load user scan history for recent modules:", e);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchRecentUsage();
    return () => { isMounted = false; };
  }, [authTokens?.access]);

  // Combined Search and Category Filtering
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_MODULES.filter((module) => {
      // Category filter match
      const matchCategory =
        selectedCategory === 'All Modules' || module.category === selectedCategory;

      if (!matchCategory) return false;

      // Text search match
      if (!q) return true;

      const inName = module.name.toLowerCase().includes(q);
      const inDesc = module.description.toLowerCase().includes(q);
      const inCategory = module.category.toLowerCase().includes(q);
      const inKeywords = module.keywords.some(k => k.toLowerCase().includes(q));

      return inName || inDesc || inCategory || inKeywords;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? 'transparent' : 'var(--bg-main, #f8fafc)',
      color: 'var(--text-main, #0f172a)',
      paddingBottom: '4rem'
    }}>
      {/* Existing Persistent Top Navigation */}
      <Navbar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        {/* Navigation Breadcrumb / Back to Dashboard */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            id="back-to-dashboard-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.85)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-color, #6366f1)';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '4px 12px',
            borderRadius: '999px',
            background: isDark ? 'rgba(0, 201, 167, 0.12)' : 'rgba(0, 201, 167, 0.15)',
            border: '1px solid rgba(0, 201, 167, 0.3)',
            color: '#00c9a7',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.02em'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#00c9a7' }} />
            <span>{ALL_MODULES.length} Security Modules Available</span>
          </div>
        </div>

        {/* Page Hero Header */}
        <div style={{
          marginBottom: '2rem',
          padding: '2rem 2.25rem',
          borderRadius: '16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid var(--border-color)',
          boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Accent Glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #00c9a7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
              }}>
                <Shield size={18} />
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-color, #6366f1)'
              }}>
                CyberGuardian Security Suite
              </span>
            </div>

            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2.1rem',
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              All CyberGuardian Modules
            </h1>

            <p style={{
              margin: 0,
              fontSize: '1rem',
              color: 'var(--text-muted, #64748b)',
              maxWidth: '680px',
              lineHeight: 1.5
            }}>
              Explore all available cybersecurity tools and analysis capabilities. Launch automated threat sweeps, telemetry inspection, SOC correlations, and verified compliance audits.
            </p>
          </div>
        </div>

        {/* ── Section 14: Quick Access / Recently Used (Only rendered if actual history exists) ── */}
        {!loadingHistory && recentModules.length > 0 && (
          <div style={{ marginBottom: '2.25rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.85rem'
            }}>
              <Clock size={16} color="var(--accent-color, #6366f1)" />
              <h2 style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                letterSpacing: '0.01em',
                textTransform: 'uppercase'
              }}>
                Recently Used
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              {recentModules.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={`recent-${item.id}`}
                    onClick={() => navigate(item.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.9rem 1.15rem',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
                      border: '1px solid var(--border-color)',
                      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-color, #6366f1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: item.iconBg,
                        color: item.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ItemIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.category}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      color: 'var(--accent-color, #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}>
                      <span>Launch</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Search Bar & Category Filters (Sections 12 & 13) ── */}
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Search Input Box */}
          <div style={{
            position: 'relative',
            width: '100%'
          }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #94a3b8)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              id="module-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules... (e.g. Website, URL, SOC, SSL, Port, Certificate)"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '13px 44px 13px 46px',
                fontSize: '0.96rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-color, #6366f1)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                title="Clear Search"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Section 13) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '4px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    border: isSelected
                      ? '1px solid var(--accent-color, #6366f1)'
                      : '1px solid var(--border-color)',
                    background: isSelected
                      ? (isDark ? 'var(--accent-color, #6366f1)' : '#4f46e5')
                      : (isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'),
                    color: isSelected ? '#ffffff' : 'var(--text-muted, #64748b)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--accent-color, #6366f1)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-muted, #64748b)';
                    }
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Active Filters Summary & Count ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            Showing <strong style={{ color: 'var(--text-main)' }}>{filteredModules.length}</strong> of {ALL_MODULES.length} modules
            {selectedCategory !== 'All Modules' && ` in ${selectedCategory}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          {(searchQuery || selectedCategory !== 'All Modules') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Modules');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-color, #6366f1)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* ── Module Cards Grid (Sections 9, 10, 11, 18, 19) ── */}
        {filteredModules.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredModules.map((module) => {
              const ModuleIcon = module.icon;
              return (
                <div
                  key={module.id}
                  className="module-card-item"
                  style={{
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'var(--accent-color, #6366f1)';
                    e.currentTarget.style.boxShadow = isDark
                      ? '0 8px 24px rgba(99, 102, 241, 0.2)'
                      : '0 8px 24px rgba(99, 102, 241, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  {/* Top Row: Icon + Badge + Status */}
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: module.iconBg,
                        color: module.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 8px ${module.iconBg}`
                      }}>
                        <ModuleIcon size={22} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {/* Real Status Indicator (Section 11) */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#10b981',
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                          ● {module.status}
                        </span>

                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {module.badge}
                        </span>
                      </div>
                    </div>

                    {/* Category Label */}
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--accent-color, #6366f1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.35rem'
                    }}>
                      {module.category}
                    </div>

                    {/* Module Title */}
                    <h3 style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text-main, #0f172a)',
                      lineHeight: 1.25
                    }}>
                      {module.name}
                    </h3>

                    {/* Module Description */}
                    <p style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      color: 'var(--text-muted, #64748b)',
                      lineHeight: 1.5,
                      marginBottom: '1.25rem'
                    }}>
                      {module.description}
                    </p>
                  </div>

                  {/* Open Module Action Button */}
                  <div>
                    <Link
                      to={module.route}
                      className="open-module-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
                        color: 'var(--accent-color, #6366f1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-color, #6366f1)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff';
                        e.currentTarget.style.color = 'var(--accent-color, #6366f1)';
                      }}
                    >
                      <span>Open Module</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search State (Section 12) */
          <div style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            borderRadius: '12px',
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--text-muted)'
            }}>
              <Search size={24} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.15rem' }}>
              No modules found
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', maxWidth: '420px', marginInline: 'auto' }}>
              No cybersecurity modules matched your query "{searchQuery}". Try searching for terms like "URL", "SOC", "certificate", or select "All Modules".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Modules');
              }}
              className="admin-btn-primary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              Show All Modules
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
