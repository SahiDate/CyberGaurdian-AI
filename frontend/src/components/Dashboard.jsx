import React, { useState, useEffect, useContext, Suspense, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AnalysisResults from './AnalysisResults';
import LogAnalyzer from './LogAnalyzer';
import FluidTabs from './shared/FluidTabs';
import { useAnimatedCount } from '../hooks/useAnimatedCount';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { emitSecurityEvent } from '../utils/securityEventBus';
import ThemeToggle from './ThemeToggle';
import GlassPanel from './three/GlassPanel';
import ThreatChart3D from './three/ThreatChart3D';
import AnimatedHistoryCard from './shared/AnimatedHistoryCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Inline SVG Icon components for design-craft & zero external dependency issue
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const CpuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="9" y="9" width="6" height="6"/>
    <path d="M15 2v2M9 2v2M15 20v2M9 20v2M20 15h2M20 9h2M2 15h2M2 9h2"/>
  </svg>
);

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const RefreshCwIcon = ({ spinning }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      animation: spinning ? 'spin 0.8s linear infinite' : 'none',
      transformOrigin: 'center'
    }}
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

// Metis Stat Card component matching Admin Dashboard
function StatCard({ title, targetValue, sub, trend, isPositive, iconBg, iconColor, icon }) {
  const { isDark } = useTheme();
  const animatedVal = useAnimatedCount(typeof targetValue === 'number' ? targetValue : parseInt(targetValue, 10) || 0);
  const displayVal = typeof targetValue === 'string' && targetValue.includes('/') ? targetValue : (typeof targetValue === 'number' ? animatedVal : targetValue);

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
      style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        minHeight: '108px',
        borderRadius: '12px',
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
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
          {icon}
        </div>

        <div>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: labelColor,
            marginBottom: '0.25rem',
            letterSpacing: '0.01em'
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: mainColor,
            lineHeight: 1.15
          }}>
            {displayVal ?? '—'}
          </div>
          {sub && (
            <div style={{ fontSize: '0.74rem', color: subColor, marginTop: '4px', fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
      </div>

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
}

export default function Dashboard() {
  const { isDark } = useTheme();
  const { user, logoutUser, authTokens } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('scanner');
  const [chartMode, setChartMode] = useState('3d');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [metrics, setMetrics] = useState({
    high_security_risks: 0,
    analyzed_urls: 0,
    active_modules_count: 8,
    scans_today: 0,
    medium_risks: 0,
    low_clean_risks: 0
  });
  const [scanHistory, setScanHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchUserMetrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/user/dashboard/', {
        headers: {
          'Authorization': `Bearer ${authTokens?.access}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.metrics) {
          setMetrics(data.metrics);
        }
        if (data?.recent_scans && Array.isArray(data.recent_scans) && scanHistory.length === 0) {
          setScanHistory(data.recent_scans);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user metrics:", err);
    }
  };

  const fetchScanHistory = async () => {
    setHistoryLoading(true);
    try {
      const headers = {};
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }
      const res = await fetch('http://localhost:8000/api/user/scans/', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setScanHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch scan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchUserMetrics();
    fetchScanHistory();
  }, [authTokens?.access]);

  const handleSelectHistoryTarget = (item) => {
    const targetName = item._displayTarget || item.domain || item.url;
    if (targetName) {
      setTarget(targetName);
      window.scrollTo({ top: 180, behavior: 'smooth' });
      executeAnalysis(targetName);
    }
  };

  const tabs = [
    { id: 'scanner', label: 'Domain Threat Scanner', icon: <ShieldIcon /> },
    { id: 'logs', label: 'Log Analyzer (SOC)', icon: <ActivityIcon /> }
  ];

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { family: 'system-ui, -apple-system, sans-serif', size: 12, weight: '600' },
          color: isDark ? '#c9d1d9' : '#475569'
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(22, 27, 34, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
        borderWidth: 1,
        titleColor: isDark ? '#f0f6fc' : '#0f172a',
        bodyColor: isDark ? '#c9d1d9' : '#334155',
        titleFont: { weight: '700' },
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
        ticks: { color: isDark ? '#8b949e' : '#64748b', font: { family: 'system-ui, sans-serif' } }
      },
      y: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
        ticks: { color: isDark ? '#8b949e' : '#64748b', font: { family: 'system-ui, sans-serif' } }
      }
    }
  }), [isDark]);

  const data = useMemo(() => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Critical Threats',
        data: [12, 19, 3, 5, 2, 3, 9],
        borderColor: isDark ? '#f85149' : '#dc2626',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return isDark ? 'rgba(248, 81, 73, 0.1)' : 'rgba(220, 38, 38, 0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, isDark ? 'rgba(248, 81, 73, 0.35)' : 'rgba(220, 38, 38, 0.25)');
          gradient.addColorStop(1, 'rgba(248, 81, 73, 0.0)');
          return gradient;
        },
      },
      {
        label: 'Blocked Requests',
        data: [200, 300, 150, 400, 250, 600, 320],
        borderColor: isDark ? '#58a6ff' : '#2563eb',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return isDark ? 'rgba(88, 166, 255, 0.1)' : 'rgba(37, 99, 235, 0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, isDark ? 'rgba(88, 166, 255, 0.35)' : 'rgba(37, 99, 235, 0.25)');
          gradient.addColorStop(1, 'rgba(88, 166, 255, 0.0)');
          return gradient;
        },
      }
    ],
  }), [isDark]);

  const executeAnalysis = async (targetToScan) => {
    const scanTarget = (targetToScan || target || '').trim();
    if (!scanTarget) return;

    setLoading(true);
    setFeedback(null);

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }

      const response = await fetch('http://localhost:8000/api/analyze/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ target: scanTarget })
      });
      
      const resData = await response.json();
      if (response.ok) {
        setResults(resData);
        emitSecurityEvent('SCAN_COMPLETED', { target: scanTarget });
        fetchUserMetrics();
        fetchScanHistory();
        setFeedback({
          type: 'success',
          message: `Threat analysis completed for target "${scanTarget}".`
        });
      } else {
        setFeedback({
          type: 'error',
          message: resData.error || 'Threat analysis failed to complete.'
        });
      }
    } catch (error) {
      console.error(error);
      setFeedback({
        type: 'error',
        message: 'Could not connect to backend scan engine. Please ensure server is running.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e) => {
    e.preventDefault();
    executeAnalysis(target);
  };

  const handleBackToHome = () => {
    setResults(null);
    setFeedback(null);
  };

  const handleRefresh = () => {
    if (target.trim()) {
      executeAnalysis(target);
    }
  };

  return (
    <>
      {/* Dashboard Foreground Content */}
      <div className="user-dashboard" style={{ position: 'relative', zIndex: 1, padding: 'var(--space-32) var(--space-24)', maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* Header Hierarchy: Weight + Size together */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-32)', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h1 className="h1-fluid" style={{ margin: 0, fontSize: '2.1rem', color: 'var(--text-main)' }}>
              CyberGuardian AI
            </h1>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--accent-color)',
              background: isDark ? 'rgba(88, 166, 255, 0.12)' : 'rgba(37, 99, 235, 0.10)',
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Dashboard
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="chip-badge chip-success" style={{ textTransform: 'none', padding: '6px 12px' }}>
              <CheckCircleIcon />
              Agent Status: <strong>Autonomous Mode Active</strong>
            </span>

            {/* Theme Toggle Button (Light / Dark) */}
            <ThemeToggle />

            {user && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Welcome, <strong style={{ color: 'var(--text-main)' }}>{user.username}</strong>
              </span>
            )}

            <button
              onClick={logoutUser}
              className="glass-panel btn-fluid"
              style={{
                padding: '8px 16px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Critically-Damped Spring Fluid Navigation Tabs */}
        <FluidTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'scanner' ? (
          <>
            {/* Analyze Input Form - Centered & Responsive */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 'var(--space-24)' }}>
              <form onSubmit={handleAnalyze} className="form-row-responsive" style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
                maxWidth: '960px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Enter a URL, IP address, or Domain to analyze..."
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    padding: '14px 18px',
                    fontSize: '1.02rem',
                    background: isDark ? '#0f172a' : '#ffffff',
                    border: '1px solid var(--admin-border, #e2e8f0)',
                    color: 'var(--text-main)',
                    borderRadius: '10px',
                    outline: 'none',
                    boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #6366f1)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--admin-border, #e2e8f0)'}
                />
                <button
                  type="submit"
                  disabled={loading || !target.trim()}
                  className="admin-btn-primary"
                  style={{
                    padding: '14px 28px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minWidth: '140px',
                    cursor: loading || !target.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !target.trim() ? 0.7 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #fff',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    'Analyze Target'
                  )}
                </button>
              </form>
            </div>

            {/* Feedback banner */}
            {feedback && (
              <div className="glass-panel" style={{
                padding: '14px 20px',
                marginBottom: 'var(--space-24)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${feedback.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`,
                background: feedback.type === 'success'
                  ? (isDark ? 'rgba(63, 185, 80, 0.12)' : 'rgba(16, 185, 129, 0.12)')
                  : (isDark ? 'rgba(248, 81, 73, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {feedback.type === 'success' ? <CheckCircleIcon /> : <AlertTriangleIcon />}
                  <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-main)' }}>{feedback.message}</span>
                </div>
              </div>
            )}

            {results ? (
              <AnalysisResults
                results={results}
                onBack={handleBackToHome}
                onRefresh={handleRefresh}
                loading={loading}
                target={target}
              />
            ) : (
              <>
                {/* Metis Stat Cards Grid - Real User Counts */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.25rem',
                  marginBottom: 'var(--space-32)'
                }}>
                  <StatCard
                    title="High Security Risk"
                    targetValue={metrics.high_security_risks}
                    sub="Critical & high severity vulnerabilities"
                    trend={metrics.high_security_risks > 0 ? "Requires Review" : "All Clean"}
                    isPositive={metrics.high_security_risks === 0}
                    iconBg={isDark ? 'rgba(239, 68, 68, 0.22)' : '#fee2e2'}
                    iconColor={isDark ? '#f87171' : '#ef4444'}
                    icon={<ShieldIcon />}
                  />
                  <StatCard
                    title="Analyzed URLs"
                    targetValue={metrics.analyzed_urls}
                    sub="Total website & URL scans performed"
                    trend={`+${metrics.scans_today || 0} today`}
                    isPositive={true}
                    iconBg={isDark ? 'rgba(99, 102, 241, 0.22)' : '#eef2ff'}
                    iconColor={isDark ? '#818cf8' : '#6366f1'}
                    icon={<GlobeIcon />}
                  />
                  <StatCard
                    title="Active Modules"
                    targetValue={`${metrics.active_modules_count || 8} Active`}
                    sub="100% Operational • 8/8 Ready"
                    trend="Online"
                    isPositive={true}
                    iconBg={isDark ? 'rgba(16, 185, 129, 0.22)' : '#dcfce7'}
                    iconColor={isDark ? '#34d399' : '#10b981'}
                    icon={<CpuIcon />}
                  />
                </div>

                {/* 1-by-1 Animated Scanning History Card (Expandable to Current, Past, All) */}
                <AnimatedHistoryCard
                  title="Recent Threat Scanning Stream"
                  type="scanner"
                  items={scanHistory}
                  loading={historyLoading}
                  onSelectItem={handleSelectHistoryTarget}
                  emptyMessage="No historical domain scans recorded yet. Enter a target above to start scanning."
                />

                {/* Threat Events Chart Panel with 3D & 2D Views */}
                <div className="glass-panel" style={{ padding: 'var(--space-24)', marginBottom: 'var(--space-32)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700' }}>
                        Threat Events & Traffic Velocity Over Time
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Real-time telemetry and vector analysis
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      padding: '4px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '1px solid var(--border-color)',
                      boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <button
                        type="button"
                        onClick={() => setChartMode('3d')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: chartMode === '3d' ? 'var(--accent-color)' : 'transparent',
                          color: chartMode === '3d' ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        3D Visualizer
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMode('2d')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: chartMode === '2d' ? 'var(--accent-color)' : 'transparent',
                          color: chartMode === '2d' ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        2D Metric View
                      </button>
                    </div>
                  </div>

                  {chartMode === '3d' ? (
                    <ThreatChart3D data={data} />
                  ) : (
                    <div style={{ width: '100%', minHeight: '300px' }}>
                      <Line options={options} data={data} />
                    </div>
                  )}
                </div>

                {/* AI Recommendations Panel */}
                <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-16)', color: 'var(--text-main)' }}>AI Recommendations</h2>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{
                      padding: '16px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.55)',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '1px solid var(--border-color)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                        <span className="chip-badge chip-danger" style={{ padding: '4px 8px' }}><AlertTriangleIcon /> Alert</span>
                        <span>Multiple failed login attempts detected on internal firewall.</span>
                      </span>
                      <button className="btn-fluid" style={{
                        background: 'var(--danger-color)',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 10px rgba(220, 38, 38, 0.25)'
                      }}>
                        Block IP
                      </button>
                    </li>
                    <li style={{
                      padding: '16px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.55)',
                      border: '1px solid var(--border-subtle)',
                      borderTop: '1px solid var(--border-color)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                        <span className="chip-badge chip-accent" style={{ padding: '4px 8px' }}><ActivityIcon /> Notice</span>
                        <span>SSL Certificate for main-domain expires in 12 days.</span>
                      </span>
                      <button className="btn-fluid" style={{
                        background: 'var(--accent-color)',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 10px rgba(37, 99, 235, 0.25)'
                      }}>
                        Renew Now
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </>
        ) : (
          <LogAnalyzer />
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
