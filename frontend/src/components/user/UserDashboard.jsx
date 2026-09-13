import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../shared/Navbar';
import AnalysisResults from '../AnalysisResults';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Globe, ShieldAlert, Cpu, Plus, RotateCw, History, ExternalLink,
  ShieldCheck, Activity, Search, AlertTriangle, ArrowUpRight,
  CheckCircle2, FileText, Lock, Radio, Shield, Terminal, Clock, Award
} from 'lucide-react';

const API = 'http://localhost:8000';

// ── Metis Stat Card (Consistent with Admin Dashboard) ────────────────────────
const MetisStatCard = ({ label, value, icon: Icon, iconBg, iconColor, trend, isPositive, sub, onClick }) => {
  const { isDark } = useTheme();
  const mainColor = isDark ? '#f8fafc' : '#0f172a';
  const labelColor = isDark ? '#94a3b8' : '#475569';
  const subColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';

  const badgeTextColor = isPositive ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626');
  const badgeBgColor = isPositive ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2');
  const badgeBorder = isPositive ? (isDark ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid #bbf7d0') : (isDark ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid #fecaca');

  return (
    <div
      className="admin-card"
      onClick={onClick}
      style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        minHeight: '108px',
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '12px',
        boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
        {/* Pastel Rounded Square Icon */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={24} />
        </div>

        <div>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: labelColor,
            marginBottom: '0.25rem',
            letterSpacing: '0.01em'
          }}>
            {label}
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: mainColor,
            lineHeight: 1.15
          }}>
            {value ?? '—'}
          </div>
          {sub && (
            <div style={{ fontSize: '0.74rem', color: subColor, marginTop: '4px', fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* Trend / Status Pill */}
      {trend && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: badgeTextColor,
          alignSelf: 'flex-start',
          backgroundColor: badgeBgColor,
          border: badgeBorder,
          padding: '3px 9px',
          borderRadius: '6px',
          letterSpacing: '0.01em'
        }}>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

// ── Metis Status Badge ───────────────────────────────────────────────────────
const MetisBadge = ({ text, type }) => {
  const styles = {
    completed: { bg: '#10b981', color: '#ffffff' },
    cancelled: { bg: '#ef4444', color: '#ffffff' },
    shipped: { bg: '#0ea5e9', color: '#ffffff' },
    pending: { bg: '#f59e0b', color: '#ffffff' },
    critical: { bg: '#ef4444', color: '#ffffff' },
    high: { bg: '#f97316', color: '#ffffff' },
    medium: { bg: '#f59e0b', color: '#ffffff' },
    low: { bg: '#10b981', color: '#ffffff' },
    excellent: { bg: '#10b981', color: '#ffffff' },
    good: { bg: '#10b981', color: '#ffffff' },
    active: { bg: '#10b981', color: '#ffffff' },
    online: { bg: '#10b981', color: '#ffffff' }
  };

  const s = styles[type?.toLowerCase()] || { bg: '#64748b', color: '#ffffff' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      backgroundColor: s.bg,
      color: s.color,
      textTransform: 'capitalize',
      letterSpacing: '0.01em',
      lineHeight: 1.2
    }}>
      {text || type}
    </span>
  );
};

export default function UserDashboard() {
  const { user, authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const scanInputRef = useRef(null);

  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setDashLoading(true);
    try {
      const headers = { Authorization: `Bearer ${authTokens?.access}` };
      
      // Fetch both dashboard KPI stats and user scans
      const [kpiRes, scansRes] = await Promise.all([
        fetch(`${API}/api/user/dashboard/`, { headers }),
        fetch(`${API}/api/user/scans/`, { headers })
      ]);

      if (kpiRes.ok) {
        const kpi = await kpiRes.json();
        setKpiData(kpi);
        if (kpi.recent_scans && kpi.recent_scans.length > 0) {
          setRecentScans(kpi.recent_scans);
        }
      }

      if (scansRes.ok) {
        const scans = await scansRes.json();
        setRecentScans(scans.slice(0, 5));
      }
    } catch (e) {
      console.error("Failed to load dashboard metrics:", e);
    } finally {
      setDashLoading(false);
    }
  };

  const handleQuickScan = async (e) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch(`${API}/api/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({ target })
      });
      const data = await response.json();
      setResults(data);
      // Refresh real counts and history after scan
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      alert("Failed to analyze target. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const metrics = kpiData?.metrics || {
    analyzed_urls: recentScans.length,
    website_scans: recentScans.length,
    url_scans: 0,
    scans_today: 0,
    high_security_risks: recentScans.filter(s => s.risk_level === 'high').length,
    medium_risks: recentScans.filter(s => s.risk_level === 'medium').length,
    low_clean_risks: recentScans.filter(s => ['good', 'excellent'].includes(s.risk_level)).length,
    active_modules_count: 8,
    total_reports: recentScans.length,
    average_security_score: 100
  };

  const focusScanInput = () => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
      scanInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="user-dashboard" style={{
      minHeight: '100vh',
      color: 'var(--admin-text-main, #0f172a)',
      paddingBottom: '3.5rem'
    }}>
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        {/* ═══════════════════════════════════════════════════════════════
            TOP PAGE HEADER WITH METIS-STYLE ACTION CONTROLS
            ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
          marginTop: '0.5rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              Security Dashboard
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Welcome back, <strong style={{ color: 'var(--admin-primary, #6366f1)' }}>{user ? user.username : 'User'}</strong>! Autonomous protection is active for your account.
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={focusScanInput}
              className="admin-btn-primary"
              title="Launch a new website security scan"
            >
              <Plus size={16} />
              <span>New Scan</span>
            </button>

            <button
              onClick={fetchDashboardData}
              className="admin-btn-secondary"
              title="Refresh Dashboard Metrics"
            >
              <RotateCw size={16} className={dashLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => navigate('/history')}
              className="admin-btn-secondary"
              title="View Complete Scan History"
            >
              <History size={16} />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            KPI STAT CARDS (4 Cards Grid - Real User Counts)
            ═══════════════════════════════════════════════════════════════ */}
        <div id="user-kpi-stats" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem'
        }}>
          {/* Card 1: Analyzed URLs */}
          <MetisStatCard
            label="Analyzed URLs"
            value={metrics.analyzed_urls?.toLocaleString() ?? '0'}
            icon={Globe}
            iconBg={isDark ? 'rgba(99, 102, 241, 0.22)' : '#eef2ff'}
            iconColor={isDark ? '#818cf8' : '#6366f1'}
            sub={`${metrics.website_scans || 0} Web • ${metrics.url_scans || 0} URL scans`}
            trend={`+${metrics.scans_today || 0} today`}
            isPositive={true}
            onClick={() => navigate('/history')}
          />

          {/* Card 2: High Security Risk */}
          <MetisStatCard
            label="High Security Risk"
            value={metrics.high_security_risks?.toLocaleString() ?? '0'}
            icon={ShieldAlert}
            iconBg={isDark ? 'rgba(239, 68, 68, 0.22)' : '#fee2e2'}
            iconColor={isDark ? '#f87171' : '#ef4444'}
            sub={`${metrics.medium_risks || 0} medium • ${metrics.low_clean_risks || 0} safe`}
            trend={metrics.high_security_risks > 0 ? "Requires Review" : "All Clean"}
            isPositive={metrics.high_security_risks === 0}
            onClick={() => navigate('/threat-intel')}
          />

          {/* Card 3: Active Modules */}
          <MetisStatCard
            label="Active Modules"
            value={`${metrics.active_modules_count || 8} Active`}
            icon={Cpu}
            iconBg={isDark ? 'rgba(16, 185, 129, 0.22)' : '#dcfce7'}
            iconColor={isDark ? '#34d399' : '#10b981'}
            sub="100% Operational • 8/8 Live"
            trend="Online"
            isPositive={true}
          />

          {/* Card 4: Security Posture */}
          <MetisStatCard
            label="Security Posture"
            value={`${metrics.average_security_score ?? 100} / 100`}
            icon={ShieldCheck}
            iconBg={isDark ? 'rgba(14, 165, 233, 0.22)' : '#e0f2fe'}
            iconColor={isDark ? '#38bdf8' : '#0ea5e9'}
            sub={`${metrics.total_reports || 0} security reports generated`}
            trend={(metrics.average_security_score ?? 100) >= 80 ? "Optimal" : "Moderate"}
            isPositive={(metrics.average_security_score ?? 100) >= 80}
            onClick={() => navigate('/reports')}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CYBERGUARDIAN AI CERTIFICATE PROMOTION BANNER
            ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(14, 165, 233, 0.08) 100%)'
            : 'linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)',
          border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : '#c7d2fe'}`,
          borderRadius: '12px',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(99,102,241,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.35)'
            }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--admin-text-main, #0f172a)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>Official Cybersecurity Analysis Completion Certificates</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(99, 102, 241, 0.18)',
                  color: '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  NEW
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Complete full-scope perimeter assessments and SOC analyses to earn verifiable, tamper-proof vector certificates with cryptographic QR validation.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={() => navigate('/certificates')}
              className="admin-btn-primary"
              style={{ padding: '0.55rem 1.15rem', fontSize: '0.84rem' }}
            >
              <Award size={15} />
              <span>View My Certificates</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            QUICK SCAN SECTION (Metis Card Design)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="admin-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              margin: '0 0 0.35rem 0',
              color: 'var(--admin-text-main, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Search size={20} color="var(--admin-primary, #6366f1)" />
              <span>Quick Website Security Scan</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Inspect SSL certificates, security headers, DNS records, WHOIS data, and risk scoring in real time.
            </p>
          </div>

          <form onSubmit={handleQuickScan} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              ref={scanInputRef}
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Enter domain or URL (e.g. example.com or https://company.org)..."
              disabled={loading}
              style={{
                flex: 1,
                minWidth: '260px',
                padding: '0.75rem 1.1rem',
                fontSize: '0.95rem',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                border: '1px solid var(--admin-border, #e2e8f0)',
                color: 'var(--admin-text-main, #0f172a)',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="admin-btn-primary"
              style={{ padding: '0.75rem 1.75rem', fontSize: '0.92rem' }}
            >
              {loading ? (
                <>
                  <RotateCw size={16} className="animate-spin" />
                  <span>Analyzing Target...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Start Scan</span>
                </>
              )}
            </button>
          </form>

          {results && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--admin-border, #e2e8f0)', paddingTop: '1.5rem' }}>
              <AnalysisResults results={results} />
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TWO COLUMN GRID: RECENT SCANS & SECURITY SUMMARY
            ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Left Card: My Recent Scans */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--admin-text-main, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <History size={18} color="var(--admin-primary, #6366f1)" />
                  <span>My Recent Scans</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
                  Latest security scans performed by your account
                </span>
              </div>
              <Link
                to="/history"
                style={{
                  color: 'var(--admin-primary, #6366f1)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>Full History</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {recentScans.length > 0 ? (
              <div className="table-responsive-container">
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.85rem'
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: '1px solid var(--admin-border, #e2e8f0)',
                      color: 'var(--admin-text-muted, #64748b)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Domain</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>HTTPS</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Score</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Risk Level</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((scan) => (
                      <tr
                        key={scan.id}
                        style={{
                          borderBottom: '1px solid var(--admin-border-subtle, rgba(226, 232, 240, 0.6))',
                          transition: 'background-color 0.1s ease'
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--admin-text-main, #0f172a)' }}>
                            {scan.domain}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: scan.is_https ? '#10b981' : '#ef4444'
                          }}>
                            {scan.is_https ? 'SSL Active' : 'No SSL'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)' }}>
                          {scan.security_score ?? '—'}/100
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <MetisBadge
                            text={scan.risk_level_display || scan.risk_level}
                            type={scan.risk_level}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--admin-text-muted, #64748b)', fontSize: '0.78rem' }}>
                          {scan.scanned_at ? new Date(scan.scanned_at).toLocaleDateString() : 'Today'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--admin-text-muted, #64748b)' }}>
                <Globe size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>No scans recorded yet</p>
                <span style={{ fontSize: '0.8rem' }}>Enter a domain above to perform your first real-time security audit.</span>
              </div>
            )}
          </div>

          {/* Right Card: Threat Breakdown & Activity */}
          <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--admin-text-main, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Activity size={18} color="#10b981" />
                  <span>Security Risk Distribution</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
                  Aggregated threat posture from your scans and analyzers
                </span>
              </div>

              {/* Progress bars / risk pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                      High / Critical Risk
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--admin-text-main, #0f172a)' }}>
                      {metrics.high_security_risks || 0}
                    </span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((metrics.high_security_risks || 0) / Math.max(1, (metrics.analyzed_urls || 1))) * 100)}%`,
                      backgroundColor: '#ef4444',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                      Medium Risk
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--admin-text-main, #0f172a)' }}>
                      {metrics.medium_risks || 0}
                    </span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((metrics.medium_risks || 0) / Math.max(1, (metrics.analyzed_urls || 1))) * 100)}%`,
                      backgroundColor: '#f59e0b',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      Low / Clean / Verified
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--admin-text-main, #0f172a)' }}>
                      {metrics.low_clean_risks || 0}
                    </span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((metrics.low_clean_risks || 0) / Math.max(1, (metrics.analyzed_urls || 1))) * 100)}%`,
                      backgroundColor: '#10b981',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              </div>

              {/* Recent Activity Timeline snippet */}
              {kpiData?.recent_activity && kpiData.recent_activity.length > 0 && (
                <div style={{ borderTop: '1px solid var(--admin-border, #e2e8f0)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-muted, #64748b)', marginBottom: '0.65rem' }}>
                    Recent Activity Timeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {kpiData.recent_activity.slice(0, 3).map((act, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: act.type === 'FILE' ? '#6366f120' : act.type === 'URL' ? '#0ea5e920' : '#10b98120',
                            color: act.type === 'FILE' ? '#6366f1' : act.type === 'URL' ? '#0ea5e9' : '#10b981'
                          }}>
                            {act.type}
                          </span>
                          <span style={{ fontWeight: 500, color: 'var(--admin-text-main, #0f172a)' }}>
                            {act.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted, #64748b)' }}>
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick action button */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border, #e2e8f0)' }}>
              <Link
                to="/reports"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  color: 'var(--admin-primary, #6366f1)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <span>View Full Audit & Compliance Reports</span>
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ACTIVE ENTERPRISE SECURITY MODULES GRID
            ═══════════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              margin: '0 0 0.25rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Shield size={20} color="var(--admin-primary, #6366f1)" />
              <span>Enterprise Security Analyzers & Tools</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Autonomous detection engines accessible to your account. Click any module to start analyzing.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Tool 1: URL Scanner */}
            <Link to="/url-scanner" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
                        color: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Globe size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        URL Scanner
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Deep HTTP telemetry, redirect chain analysis, status code validation, and target reputation.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Launch Scanner</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 2: File Analyzer */}
            <Link to="/file-analyzer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed',
                        color: '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileText size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        File Analyzer
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Static file inspection, Shannon entropy, YARA rule matching, and binary signature extraction.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Inspect Files</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 3: Threat Intelligence */}
            <Link to="/threat-intel" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Radio size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        Threat Intelligence
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Multi-provider indicators from VirusTotal, AbuseIPDB, and urlscan.io real-time feeds.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Query Intel</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 4: SSL/TLS Scanner */}
            <Link to="/ssl-scanner" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Lock size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        SSL/TLS Inspector
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Certificate chain validation, cipher suite strengths, SAN lists, and expiration tracking.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Verify SSL</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 5: Port Scanner */}
            <Link to="/port-scanner" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.18)' : '#e0f2fe',
                        color: '#0ea5e9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Terminal size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        Port & Service Scanner
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Network port detection, service version identification, and banner discovery.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Scan Ports</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 6: WHOIS Domain Lookup */}
            <Link to="/whois" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(168, 85, 247, 0.18)' : '#f3e8ff',
                        color: '#a855f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Search size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        WHOIS Domain Lookup
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Registrar identification, creation/expiration dates, DNS nameservers, and domain aging.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Lookup Domain</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 7: SOC Incident & Reports */}
            <Link to="/reports" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldCheck size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        SOC Reports & Export
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Generate executive PDF/JSON compliance audit reports with structured findings and remediation.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Open Reports</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>

            {/* Tool 8: Scan History */}
            <Link to="/history" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="admin-card" style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(147, 51, 234, 0.18)' : '#faf5ff',
                        color: '#9333ea',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <History size={18} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        Audit Log & History
                      </h4>
                    </div>
                    <MetisBadge text="ACTIVE" type="active" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
                    Filter, search, and review your historical scan records, timestamps, and vulnerability changes.
                  </p>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--admin-primary, #6366f1)', fontWeight: 600 }}>
                  <span>Review Logs</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
