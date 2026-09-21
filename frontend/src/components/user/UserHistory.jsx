import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Globe, Shield, ArrowLeft, Search, Filter, AlertTriangle,
  CheckCircle2, XCircle, Download, ExternalLink, RefreshCw,
  Eye, Calendar, FileText, Activity, Lock, Unlock, X
} from 'lucide-react';

const API = 'http://localhost:8000';

export default function UserHistory() {
  const navigate = useNavigate();
  const { authTokens, user } = useContext(AuthContext);
  const { isDark } = useTheme();

  // Tab State: 'domain' | 'soc'
  const [activeTab, setActiveTab] = useState('domain');

  // Domain Scans State
  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [scanSearch, setScanSearch] = useState('');
  const [scanFilter, setScanFilter] = useState('ALL');

  // SOC Analyses State
  const [socRecords, setSocRecords] = useState([]);
  const [socLoading, setSocLoading] = useState(true);
  const [socSearch, setSocSearch] = useState('');
  const [socFilter, setSocFilter] = useState('ALL');

  // Modal State for Inspection
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordType, setRecordType] = useState(null); // 'domain' | 'soc'
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  const getAuthToken = () => {
    let token = authTokens?.access;
    if (!token) {
      try {
        const stored = localStorage.getItem('authTokens');
        if (stored) token = JSON.parse(stored)?.access;
      } catch (e) {}
    }
    return token;
  };

  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch Domain Scans (Tenant-Isolated)
  const fetchDomainScans = async () => {
    setScansLoading(true);
    try {
      const res = await fetch(`${API}/api/user/scans/`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setScans(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch domain scans history:', err);
    } finally {
      setScansLoading(false);
    }
  };

  // Fetch SOC Analyses (Tenant-Isolated)
  const fetchSocHistory = async () => {
    setSocLoading(true);
    try {
      const res = await fetch(`${API}/api/soc/history/`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSocRecords(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch SOC history:', err);
    } finally {
      setSocLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainScans();
    fetchSocHistory();
  }, [authTokens?.access]);

  // Handle PDF Download for SOC
  const handleDownloadSocPdf = async (item) => {
    if (!item?.id) return;
    setDownloadingPdfId(item.id);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/api/soc/${item.id}/pdf/`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTarget = (item.target || 'record').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `SOC_Report_${cleanTarget}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Could not download SOC Analysis PDF report.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Quick action: Re-scan domain
  const handleReScanDomain = (targetDomain) => {
    navigate('/dashboard', { state: { prefillTarget: targetDomain } });
  };

  // Quick action: Open target in SOC
  const handleOpenInSoc = (target) => {
    navigate('/soc-analysis', { state: { prefillTarget: target } });
  };

  // Tenant Aggregated Metrics
  const metrics = useMemo(() => {
    const totalScans = scans.length;
    const totalSoc = socRecords.length;
    const cleanScans = scans.filter(s => (s.security_score >= 80) || s.risk_level === 'low').length;
    const safeSoc = socRecords.filter(s => (s.risk_score === 0) || s.severity === 'LOW' || s.threat_level === 'LOW').length;
    const elevatedThreats = (totalScans - cleanScans) + (totalSoc - safeSoc);

    return {
      totalScans,
      totalSoc,
      safeTotal: cleanScans + safeSoc,
      threatsTotal: Math.max(0, elevatedThreats)
    };
  }, [scans, socRecords]);

  // Filtered Domain Scans
  const filteredScans = useMemo(() => {
    return scans.filter(item => {
      const matchQuery = !scanSearch.trim() ||
        (item.domain && item.domain.toLowerCase().includes(scanSearch.toLowerCase())) ||
        (item.url && item.url.toLowerCase().includes(scanSearch.toLowerCase()));

      if (!matchQuery) return false;

      if (scanFilter === 'ALL') return true;
      const rLevel = (item.risk_level || '').toUpperCase();
      if (scanFilter === 'LOW' && (rLevel === 'LOW' || item.security_score >= 80)) return true;
      if (scanFilter === 'MEDIUM' && (rLevel === 'MEDIUM' || (item.security_score >= 50 && item.security_score < 80))) return true;
      if (scanFilter === 'HIGH' && (rLevel === 'HIGH' || item.security_score < 50)) return true;
      if (scanFilter === 'CRITICAL' && rLevel === 'CRITICAL') return true;

      return false;
    });
  }, [scans, scanSearch, scanFilter]);

  // Filtered SOC Records
  const filteredSoc = useMemo(() => {
    return socRecords.filter(item => {
      const matchQuery = !socSearch.trim() ||
        (item.target && item.target.toLowerCase().includes(socSearch.toLowerCase())) ||
        (item.summary && item.summary.toLowerCase().includes(socSearch.toLowerCase()));

      if (!matchQuery) return false;

      if (socFilter === 'ALL') return true;
      const sev = (item.severity || '').toUpperCase();
      return sev === socFilter;
    });
  }, [socRecords, socSearch, socFilter]);

  // Date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Color Tokens
  const theme = {
    bg: isDark ? '#0b0f19' : '#f8fafc',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    cardBorder: isDark ? '#334155' : '#e2e8f0',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    headerBg: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
    tableRowHover: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.7)'
  };

  const getSeverityBadge = (sev) => {
    const s = (sev || 'LOW').toUpperCase();
    if (s.includes('CRIT')) {
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' };
    }
    if (s.includes('HIGH')) {
      return { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: '#f97316' };
    }
    if (s.includes('MED')) {
      return { bg: 'rgba(234, 179, 8, 0.15)', text: '#fde047', border: '#eab308' };
    }
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: '#22c55e' };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg, color: theme.textMain, transition: 'background-color 0.2s ease' }}>
      <Navbar />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 4rem 1.5rem' }}>

        {/* Top Header & Breadcrumbs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'transparent',
                  border: 'none',
                  color: theme.textMuted,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: 0
                }}
              >
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <span style={{ color: theme.textMuted }}>•</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '0.15rem 0.6rem',
                borderRadius: '999px',
                background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}>
                Tenant: {user?.username || 'Authorized User'}
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.02em', color: theme.textMain }}>
              Security Operations History
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', color: theme.textMuted, fontSize: '0.95rem' }}>
              Separate audit trails for Domain Threat Scanner and SOC Log Analyzer with strict tenant isolation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => { fetchDomainScans(); fetchSocHistory(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                color: theme.textMain,
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <RefreshCw size={14} className={scansLoading || socLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tenant Activity Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: theme.textMuted, fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Domain Scans</span>
              <Globe size={18} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.4rem', color: theme.textMain }}>
              {metrics.totalScans}
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.2rem' }}>
              Website & host vulnerability checks
            </div>
          </div>

          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: theme.textMuted, fontSize: '0.85rem', fontWeight: '600' }}>
              <span>SOC Log Analyses</span>
              <Shield size={18} color="#a855f7" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.4rem', color: theme.textMain }}>
              {metrics.totalSoc}
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.2rem' }}>
              Security event & telemetry records
            </div>
          </div>

          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: theme.textMuted, fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Clean / Safe Assets</span>
              <CheckCircle2 size={18} color="#22c55e" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.4rem', color: '#22c55e' }}>
              {metrics.safeTotal}
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.2rem' }}>
              Passed with zero or low risk score
            </div>
          </div>

          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: theme.textMuted, fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Elevated Threats</span>
              <AlertTriangle size={18} color="#f97316" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.4rem', color: '#f97316' }}>
              {metrics.threatsTotal}
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.2rem' }}>
              High or critical severity findings
            </div>
          </div>
        </div>

        {/* Tab Switcher (Segmented Control) */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: `1px solid ${theme.cardBorder}`,
          marginBottom: '1.5rem',
          paddingBottom: '0.25rem'
        }}>
          <button
            onClick={() => setActiveTab('domain')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1.4rem',
              background: activeTab === 'domain' ? (isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.08)') : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'domain' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'domain' ? (isDark ? '#38bdf8' : '#0284c7') : theme.textMuted,
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={18} />
            <span>Domain Threat Scanner History</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: activeTab === 'domain' ? (isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 165, 233, 0.15)') : (isDark ? '#334155' : '#e2e8f0'),
              color: activeTab === 'domain' ? (isDark ? '#38bdf8' : '#0284c7') : theme.textMuted
            }}>
              {scans.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('soc')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1.4rem',
              background: activeTab === 'soc' ? (isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.08)') : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'soc' ? '3px solid #9333ea' : '3px solid transparent',
              color: activeTab === 'soc' ? (isDark ? '#c084fc' : '#9333ea') : theme.textMuted,
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={18} />
            <span>SOC Analyzer History</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: activeTab === 'soc' ? (isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.15)') : (isDark ? '#334155' : '#e2e8f0'),
              color: activeTab === 'soc' ? (isDark ? '#c084fc' : '#9333ea') : theme.textMuted
            }}>
              {socRecords.length}
            </span>
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: DOMAIN SCANNER HISTORY */}
        {/* ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'domain' && (
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
                <Search size={16} color={theme.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by domain, hostname, or URL..."
                  value={scanSearch}
                  onChange={(e) => setScanSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme.cardBorder}`,
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                    color: theme.textMain,
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Severity Filter Chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setScanFilter(flt)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: `1px solid ${scanFilter === flt ? '#0284c7' : theme.cardBorder}`,
                      background: scanFilter === flt ? (isDark ? '#0284c7' : '#e0f2fe') : theme.cardBg,
                      color: scanFilter === flt ? (isDark ? '#ffffff' : '#0369a1') : theme.textMuted
                    }}
                  >
                    {flt === 'ALL' ? 'All Scans' : flt === 'LOW' ? 'Clean / Low' : flt}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Container */}
            {scansLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading domain threat scans...</p>
              </div>
            ) : filteredScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: theme.textMuted }}>
                <Globe size={40} strokeWidth={1.5} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.textMain }}>No Domain Scans Found</h3>
                <p style={{ margin: '0.4rem 0 1.25rem 0', fontSize: '0.875rem' }}>
                  {scanSearch ? 'No scan records match your filter criteria.' : 'You have not performed any website domain scans yet.'}
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Start Domain Scan Now
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textMuted, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Target Domain</th>
                      <th style={{ padding: '0.75rem 1rem' }}>SSL / HTTPS</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Security Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Risk Level</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Scanned At</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScans.map((scan) => {
                      const sevBadge = getSeverityBadge(scan.risk_level || (scan.security_score < 50 ? 'HIGH' : 'LOW'));
                      return (
                        <tr
                          key={scan.id}
                          style={{
                            borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9'}`,
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: '700', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Globe size={15} color="#38bdf8" />
                              <span>{scan.domain}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.15rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {scan.url}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            {scan.is_https ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#22c55e', fontSize: '0.8rem', fontWeight: '600' }}>
                                <Lock size={14} /> HTTPS Valid
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f97316', fontSize: '0.8rem', fontWeight: '600' }}>
                                <Unlock size={14} /> Insecure (HTTP)
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontWeight: '800', fontSize: '0.95rem', color: scan.security_score >= 80 ? '#22c55e' : scan.security_score >= 50 ? '#eab308' : '#ef4444' }}>
                                {scan.security_score}/100
                              </span>
                              <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: isDark ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min(100, Math.max(0, scan.security_score || 0))}%`,
                                  height: '100%',
                                  background: scan.security_score >= 80 ? '#22c55e' : scan.security_score >= 50 ? '#eab308' : '#ef4444'
                                }} />
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: sevBadge.bg,
                              color: sevBadge.text,
                              border: `1px solid ${sevBadge.border}`
                            }}>
                              {scan.risk_level_display || scan.risk_level?.toUpperCase() || 'LOW'}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: theme.textMuted, fontSize: '0.8rem' }}>
                            {formatDate(scan.scanned_at)}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => { setSelectedRecord(scan); setRecordType('domain'); }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme.cardBorder}`,
                                  background: theme.cardBg,
                                  color: theme.textMain,
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={13} /> View Details
                              </button>

                              <button
                                onClick={() => handleReScanDomain(scan.domain)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                <RefreshCw size={13} /> Re-Scan
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: SOC ANALYZER HISTORY */}
        {/* ────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'soc' && (
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
                <Search size={16} color={theme.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by log file name, host, or summary..."
                  value={socSearch}
                  onChange={(e) => setSocSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme.cardBorder}`,
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                    color: theme.textMain,
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Severity Filter Chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setSocFilter(flt)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: `1px solid ${socFilter === flt ? '#9333ea' : theme.cardBorder}`,
                      background: socFilter === flt ? (isDark ? '#9333ea' : '#f3e8ff') : theme.cardBg,
                      color: socFilter === flt ? (isDark ? '#ffffff' : '#7e22ce') : theme.textMuted
                    }}
                  >
                    {flt === 'ALL' ? 'All Severities' : flt}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Container */}
            {socLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading SOC analysis records...</p>
              </div>
            ) : filteredSoc.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: theme.textMuted }}>
                <Shield size={40} strokeWidth={1.5} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.textMain }}>No SOC Analysis Records Found</h3>
                <p style={{ margin: '0.4rem 0 1.25rem 0', fontSize: '0.875rem' }}>
                  {socSearch ? 'No SOC records match your filter criteria.' : 'You have not uploaded or analyzed any security logs yet.'}
                </p>
                <button
                  onClick={() => navigate('/soc-analysis')}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    background: '#9333ea',
                    color: '#ffffff',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Analyze Security Logs Now
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textMuted, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Target / File</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Severity</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Threat Level</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Risk Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Findings</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSoc.map((item) => {
                      const sevBadge = getSeverityBadge(item.severity);
                      const findingsCount = Array.isArray(item.findings) ? item.findings.length : 0;
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9'}`,
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: '700', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={15} color="#c084fc" />
                              <span>{item.target}</span>
                            </div>
                            {item.summary && (
                              <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.15rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.summary}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: sevBadge.bg,
                              color: sevBadge.text,
                              border: `1px solid ${sevBadge.border}`
                            }}>
                              {item.severity || 'LOW'}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: theme.textMain }}>
                            {item.threat_level || 'CLEAN'}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '0.95rem',
                              color: item.risk_score > 70 ? '#ef4444' : item.risk_score > 30 ? '#f97316' : '#22c55e'
                            }}>
                              {item.risk_score ?? 0}/100
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '4px',
                              background: findingsCount > 0 ? (isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5') : (isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7'),
                              color: findingsCount > 0 ? '#ea580c' : '#16a34a'
                            }}>
                              {findingsCount} finding(s)
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: theme.textMuted, fontSize: '0.8rem' }}>
                            {formatDate(item.created_at)}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => { setSelectedRecord(item); setRecordType('soc'); }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme.cardBorder}`,
                                  background: theme.cardBg,
                                  color: theme.textMain,
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={13} /> View
                              </button>

                              <button
                                onClick={() => handleDownloadSocPdf(item)}
                                disabled={downloadingPdfId === item.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#9333ea',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: downloadingPdfId === item.id ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <Download size={13} />
                                {downloadingPdfId === item.id ? 'PDF...' : 'PDF'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────── */}
        {/* RECORD INSPECTION MODAL */}
        {/* ────────────────────────────────────────────────────────────────────── */}
        {selectedRecord && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: `1px solid ${theme.cardBorder}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {recordType === 'domain' ? <Globe size={20} color="#38bdf8" /> : <Shield size={20} color="#c084fc" />}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: theme.textMain, fontWeight: '700' }}>
                      {recordType === 'domain' ? 'Domain Scan Record Details' : 'SOC Log Analysis Details'}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                      ID #{selectedRecord.id} • {formatDate(selectedRecord.scanned_at || selectedRecord.created_at)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRecord(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Target Information */}
                <div>
                  <div style={{ fontSize: '0.8rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Target Asset
                  </div>
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    borderRadius: '8px',
                    border: `1px solid ${theme.cardBorder}`,
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: theme.textMain
                  }}>
                    {selectedRecord.domain || selectedRecord.target}
                    {selectedRecord.url && (
                      <div style={{ fontSize: '0.8rem', color: theme.textMuted, fontWeight: '400', marginTop: '0.2rem' }}>
                        {selectedRecord.url}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score & Risk Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{
                    padding: '0.85rem',
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    borderRadius: '8px',
                    border: `1px solid ${theme.cardBorder}`
                  }}>
                    <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: '600' }}>Security / Risk Score</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem', color: theme.textMain }}>
                      {selectedRecord.security_score ?? selectedRecord.risk_score ?? 0} / 100
                    </div>
                  </div>

                  <div style={{
                    padding: '0.85rem',
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    borderRadius: '8px',
                    border: `1px solid ${theme.cardBorder}`
                  }}>
                    <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: '600' }}>Assessment Level</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '0.3rem', color: '#38bdf8' }}>
                      {selectedRecord.risk_level_display || selectedRecord.severity || selectedRecord.threat_level || 'CLEAN'}
                    </div>
                  </div>
                </div>

                {/* Summary (if SOC) */}
                {selectedRecord.summary && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>
                      Executive Summary
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                      borderRadius: '8px',
                      border: `1px solid ${theme.cardBorder}`,
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      color: theme.textMain
                    }}>
                      {selectedRecord.summary}
                    </div>
                  </div>
                )}

                {/* Findings List (if SOC) */}
                {Array.isArray(selectedRecord.findings) && selectedRecord.findings.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>
                      Security Findings ({selectedRecord.findings.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {selectedRecord.findings.map((f, i) => (
                        <div key={i} style={{
                          padding: '0.6rem 0.85rem',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          fontSize: '0.8rem',
                          color: isDark ? '#fca5a5' : '#b91c1c'
                        }}>
                          {typeof f === 'string' ? f : (f.title || f.description || JSON.stringify(f))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations (if SOC) */}
                {Array.isArray(selectedRecord.recommendations) && selectedRecord.recommendations.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>
                      Remediation Guidance
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: theme.textMain }}>
                      {selectedRecord.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: `1px solid ${theme.cardBorder}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc'
              }}>
                {recordType === 'soc' && (
                  <button
                    onClick={() => handleDownloadSocPdf(selectedRecord)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: '#9333ea',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                )}

                {recordType === 'domain' && (
                  <button
                    onClick={() => {
                      const tgt = selectedRecord.domain;
                      setSelectedRecord(null);
                      handleReScanDomain(tgt);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} /> Re-Scan Target
                  </button>
                )}

                <button
                  onClick={() => setSelectedRecord(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    color: theme.textMain,
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
