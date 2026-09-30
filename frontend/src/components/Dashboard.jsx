import React, { useState, useEffect, useContext, Suspense, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AnalysisResults from './AnalysisResults';
import LogAnalyzer from './LogAnalyzer';
import FluidTabs from './shared/FluidTabs';
import Navbar from './shared/Navbar';
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
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('scanner');
  const [chartMode, setChartMode] = useState('3d');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (location.state?.prefillTarget) {
      setTarget(location.state.prefillTarget);
      setActiveTab('scanner');
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  }, [location.state]);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [recommendations, setRecommendations] = useState([
    {
      id: 'rec-firewall-1',
      type: 'alert',
      badge: 'Alert',
      badge_chip: 'chip-danger',
      title: 'Multiple failed login attempts detected on internal firewall.',
      description: '14 failed SSH / root login attempts detected on internal firewall port 22/443 within 60 seconds from IP 198.51.100.42.',
      action_label: 'Block IP',
      action_type: 'BLOCK_IP',
      target: '198.51.100.42',
      is_resolved: false,
      status: 'pending'
    },
    {
      id: 'rec-ssl-1',
      type: 'notice',
      badge: 'Notice',
      badge_chip: 'chip-accent',
      title: 'SSL Certificate for main-domain expires in 12 days.',
      description: 'SSL Certificate for main-domain expires in 12 days. Automated ACME TLS renewal recommended.',
      action_label: 'Renew Now',
      action_type: 'RENEW_SSL',
      target: 'main-domain.com',
      is_resolved: false,
      status: 'pending'
    }
  ]);
  const [actionLoading, setActionLoading] = useState({});
  const [actionModal, setActionModal] = useState(null);
  const [modalTarget, setModalTarget] = useState('');

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
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
      const res = await fetch(`${API_BASE}/api/user/dashboard/`, {
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
        if (data?.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user metrics:", err);
    }
  };

  const fetchRecommendations = async (targetOverride = null) => {
    try {
      const headers = {};
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }
      const activeTgt = targetOverride !== null ? targetOverride : target;
      const url = (activeTgt && activeTgt.trim())
        ? `${API_BASE}/api/user/recommendations/?target=${encodeURIComponent(activeTgt.trim())}`
        : `${API_BASE}/api/user/recommendations/`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    }
  };

  // Debounce target changes in search bar to automatically tailor recommendations
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations(target);
    }, 350);
    return () => clearTimeout(timer);
  }, [target]);

  const openActionModal = (rec, mode) => {
    const currentTarget = (target && target.trim()) ? target.trim() : (rec.target || '');
    setModalTarget(currentTarget);
    setActionModal({ open: true, rec, mode });
  };

  const handleRecommendationAction = async (rec, customActionType = null, customTarget = null) => {
    const actionType = customActionType || rec.action_type;
    const effectiveTarget = (customTarget && customTarget.trim())
      ? customTarget.trim()
      : ((modalTarget && modalTarget.trim()) ? modalTarget.trim() : (rec.target || target || ''));

    setActionLoading(prev => ({ ...prev, [rec.id]: true }));
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }
      const res = await fetch(`${API_BASE}/api/user/recommendations/action/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recommendation_id: rec.id,
          action_type: actionType,
          target: effectiveTarget,
          reason: rec.description || rec.title
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        } else if (data.recommendation) {
          setRecommendations(prev => prev.map(r => r.id === rec.id ? data.recommendation : r));
        }
        setFeedback({
          type: 'success',
          message: data.message || `Action ${actionType} completed successfully.`
        });
        if (actionType === 'BLOCK_IP') {
          emitSecurityEvent('FIREWALL_RULE_UPDATED', { ip: data.blocked_ip || effectiveTarget, status: 'BLOCKED' });
          emitSecurityEvent('INCIDENT_CREATED', { target: data.blocked_ip || effectiveTarget, type: 'FIREWALL_BLOCK' });
        } else if (actionType === 'RENEW_SSL') {
          emitSecurityEvent('SSL_CERTIFICATE_RENEWED', { domain: data.domain || effectiveTarget, days: 365 });
          emitSecurityEvent('INCIDENT_UPDATED', { domain: data.domain || effectiveTarget, type: 'CERTIFICATE_RENEWED' });
        }
        fetchUserMetrics();
        // If user specified a target in modal and top search was empty, populate it
        if (effectiveTarget && !target.trim()) {
          setTarget(effectiveTarget);
        }
      } else {
        setFeedback({
          type: 'error',
          message: data?.error || data?.message || 'Failed to execute recommendation action.'
        });
      }
    } catch (err) {
      console.error("Error executing recommendation action:", err);
      setFeedback({
        type: 'error',
        message: 'Network error when communicating with security engine.'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [rec.id]: false }));
      setActionModal(null);
    }
  };

  const fetchScanHistory = async () => {
    setHistoryLoading(true);
    try {
      const headers = {};
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }
      const res = await fetch(`${API_BASE}/api/user/scans/`, { headers });
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
    fetchRecommendations();
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

      const response = await fetch(`${API_BASE}/api/analyze/`, {
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
      {/* Global User Navigation Bar */}
      <Navbar />

      {/* Dashboard Foreground Content */}
      <div className="user-dashboard responsive-page-container" style={{ position: 'relative', zIndex: 1, padding: 'clamp(0.5rem, 2vw, var(--space-32)) clamp(0.5rem, 2vw, var(--space-24))', maxWidth: '1240px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Header Hierarchy: Weight + Size together */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(1rem, 2.5vw, var(--space-32))', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="h1-fluid" style={{ margin: 0, fontSize: 'clamp(1.4rem, 3.2vw, 2.1rem)', color: 'var(--text-main)' }}>
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

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="chip-badge chip-success" style={{ textTransform: 'none', padding: '6px 12px' }}>
              <CheckCircleIcon />
              Agent Status: <strong>Autonomous Mode Active</strong>
            </span>

            {user && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Welcome, <strong style={{ color: 'var(--text-main)' }}>{user.username}</strong>
              </span>
            )}
          </div>
        </header>

        {/* Navigation Row: Centered Tabs + All Modules Button (Right side of SOC Analyzer, exact below Logout) */}
        <div
          className="dashboard-nav-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: '100%',
            marginBottom: 'var(--space-24, 24px)',
            minHeight: '46px'
          }}
        >
          {/* Critically-Damped Spring Fluid Navigation Tabs */}
          <FluidTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 0 }} />

          {/* ▦ All Modules Button: Positioned on the right side of SOC Analyzer tab & exact below Logout */}
          <div
            className="dashboard-all-modules-container"
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              zIndex: 5
            }}
          >
            <Link
              to="/modules"
              id="btn-all-modules"
              title="Explore all CyberGuardian AI security modules"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '0.875rem',
                background: isDark
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: isDark
                  ? '0 2px 10px rgba(99, 102, 241, 0.4)'
                  : '0 2px 10px rgba(79, 70, 229, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 4px 16px rgba(99, 102, 241, 0.6)'
                  : '0 4px 14px rgba(79, 70, 229, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 2px 10px rgba(99, 102, 241, 0.4)'
                  : '0 2px 10px rgba(79, 70, 229, 0.3)';
              }}
            >
              <LayoutGrid size={15} />
              <span>All Modules</span>
            </Link>
          </div>
        </div>

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
                  className="admin-btn-primary btn-full-mobile"
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)', flexWrap: 'wrap', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>AI Recommendations</span>
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Automated Defensive Response & Mitigation
                    </span>
                  </div>

                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recommendations.map(rec => {
                      const isLoading = !!actionLoading[rec.id];
                      const isResolved = !!rec.is_resolved;
                      const isAlert = rec.type === 'alert' || rec.action_type === 'BLOCK_IP' || rec.action_type === 'UNBLOCK_IP';

                      return (
                        <li
                          key={rec.id}
                          style={{
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
                            flexWrap: 'wrap',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', flex: '1 1 300px' }}>
                            {isResolved ? (
                              <span className="chip-badge chip-positive" style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircleIcon /> {isAlert ? 'Blocked' : 'Renewed'}
                              </span>
                            ) : isAlert ? (
                              <span className="chip-badge chip-danger" style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangleIcon /> Alert
                              </span>
                            ) : (
                              <span className="chip-badge chip-accent" style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <ActivityIcon /> Notice
                              </span>
                            )}
                            <span style={{ fontSize: '0.92rem', lineHeight: 1.4 }}>
                              {rec.title}
                            </span>
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isResolved ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (rec.action_type === 'RENEW_SSL') {
                                      navigate('/ssl-scanner', { state: { prefillTarget: rec.target || 'main-domain.com' } });
                                    }
                                  }}
                                  className="btn-fluid"
                                  style={{
                                    background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
                                    color: isDark ? '#34d399' : '#059669',
                                    border: isDark ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid #bbf7d0',
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: '600',
                                    cursor: rec.action_type === 'RENEW_SSL' ? 'pointer' : 'default',
                                    fontSize: '0.85rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                  title={rec.action_type === 'RENEW_SSL' ? 'Valid for 365 days. Click to inspect in SSL Scanner' : 'Firewall Rule Active'}
                                >
                                  <CheckCircleIcon />
                                  <span>{isAlert ? 'Blocked ✓' : 'Renewed ✓'}</span>
                                </button>

                                {isAlert ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => openActionModal(rec, 'UNBLOCK_IP')}
                                      style={{
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-subtle)',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      Unblock IP
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => openActionModal(rec, 'BLOCK_IP')}
                                      style={{
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-subtle)',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        transition: 'all 0.2s ease'
                                      }}
                                      title="Block another URL, Domain, or IP address"
                                    >
                                      Block Another
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => openActionModal(rec, 'RENEW_SSL')}
                                    style={{
                                      background: 'transparent',
                                      color: 'var(--text-muted)',
                                      border: '1px solid var(--border-subtle)',
                                      padding: '8px 12px',
                                      borderRadius: 'var(--radius-sm)',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      transition: 'all 0.2s ease'
                                    }}
                                    title="Renew SSL and certificate for another URL, Domain, or IP"
                                  >
                                    Renew Another
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => openActionModal(rec, rec.action_type)}
                                className="btn-fluid"
                                style={{
                                  background: isAlert ? 'var(--danger-color)' : 'var(--accent-color)',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontWeight: '600',
                                  cursor: isLoading ? 'not-allowed' : 'pointer',
                                  fontSize: '0.85rem',
                                  boxShadow: isAlert
                                    ? '0 2px 10px rgba(220, 38, 38, 0.25)'
                                    : '0 2px 10px rgba(37, 99, 235, 0.25)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {isLoading ? (
                                  <>
                                    <RefreshCwIcon spinning={true} />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <span>{rec.action_label}</span>
                                )}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </>
        ) : (
          <LogAnalyzer />
        )}

        {/* Action Confirmation Modal with Dynamic URL/Domain/IP Target Input */}
        {actionModal?.open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 'clamp(0.5rem, 2vw, 16px)'
          }}>
            <div style={{
              width: '100%',
              maxWidth: 'min(92vw, 480px)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '18px 22px',
                borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: actionModal.mode === 'BLOCK_IP'
                  ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2')
                  : actionModal.mode === 'UNBLOCK_IP'
                  ? (isDark ? 'rgba(100, 116, 139, 0.12)' : '#f8fafc')
                  : (isDark ? 'rgba(37, 99, 235, 0.12)' : '#eff6ff')
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: actionModal.mode === 'BLOCK_IP'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : actionModal.mode === 'UNBLOCK_IP'
                      ? 'rgba(100, 116, 139, 0.2)'
                      : 'rgba(37, 99, 235, 0.2)',
                    color: actionModal.mode === 'BLOCK_IP' ? '#ef4444' : actionModal.mode === 'UNBLOCK_IP' ? '#94a3b8' : '#2563eb'
                  }}>
                    {actionModal.mode === 'BLOCK_IP' ? <ShieldIcon /> : actionModal.mode === 'UNBLOCK_IP' ? <RefreshCwIcon /> : <ActivityIcon />}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {actionModal.mode === 'BLOCK_IP' && 'Firewall Rule: Block IP / Host'}
                      {actionModal.mode === 'UNBLOCK_IP' && 'Firewall Rule: Unblock IP / Host'}
                      {actionModal.mode === 'RENEW_SSL' && 'SSL & Security Certificate Renewal'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {actionModal.mode === 'BLOCK_IP' ? 'Automated Ingress ACL Drop' : actionModal.mode === 'UNBLOCK_IP' ? 'Restore Ingress Access' : "Let's Encrypt Automated ACME Provisioning"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActionModal(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '20px 22px' }}>
                {actionModal.mode === 'BLOCK_IP' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Apply an immediate firewall ingress ACL drop rule. Enter any target IP address, website domain, or URL below:
                    </p>

                    {/* Editable Target Input for Firewall Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Target IP, Domain, or URL to Block:</span>
                      </label>
                      <input
                        type="text"
                        value={modalTarget}
                        onChange={(e) => setModalTarget(e.target.value)}
                        placeholder="e.g. 198.51.100.42, malicious-site.com, or https://bad.host"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isDark ? '1px solid #ef4444' : '1px solid #f87171',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Domains or URLs are automatically resolved via DNS to their perimeter IP addresses and dropped across all ingress ports.
                      </span>
                    </div>

                    <div style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Target Host / IP:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>
                          {modalTarget.trim() || actionModal.rec.target || '198.51.100.42'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Detection Vector:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Internal Firewall (Kernel/auth.log)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Failed Attempts:</span>
                        <span style={{ fontWeight: 600, color: '#ef4444' }}>14 in last 60 seconds</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Mitigation Rule:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>DROP Ingress All Ports (iptables)</span>
                      </div>
                    </div>
                  </div>
                )}

                {actionModal.mode === 'UNBLOCK_IP' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Are you sure you want to lift the firewall block for <strong style={{ color: 'var(--text-main)' }}>{modalTarget.trim() || actionModal.rec.target}</strong>? This host will be permitted to initiate connections again.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Target IP to Unblock:
                      </label>
                      <input
                        type="text"
                        value={modalTarget}
                        onChange={(e) => setModalTarget(e.target.value)}
                        placeholder="IP to unblock..."
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {actionModal.mode === 'RENEW_SSL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Renew and deploy fresh SSL/TLS certificates and official CyberGuardian Cybersecurity Compliance Certificates for any URL, domain, or website IP.
                    </p>

                    {/* Editable Target Input for SSL Certificate Renewal */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Website URL, Domain, or IP to Renew:</span>
                      </label>
                      <input
                        type="text"
                        value={modalTarget}
                        onChange={(e) => setModalTarget(e.target.value)}
                        placeholder="e.g. main-domain.com, https://mycompany.org, or 192.168.1.1"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isDark ? '1px solid #2563eb' : '1px solid #60a5fa',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Enter any domain, URL, or website IP. Automated ACME TLS renewal provisions 365 days of validity & issues a compliance certificate.
                      </span>
                    </div>

                    <div style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Target Host / Domain:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {modalTarget.trim() || actionModal.rec.target || 'main-domain.com'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Issuing CA:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Let's Encrypt ACME Automated CA</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cipher / Protocol:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>TLS 1.3 (AES-256-GCM / SHA-384)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Extended Validity:</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>+365 Days (1 Year Extension)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Compliance Certificate:</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>CyberGuardian AI Certificate Issued</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{
                padding: '14px 22px',
                borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                background: isDark ? 'rgba(0,0,0,0.15)' : '#fafafa'
              }}>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading[actionModal.rec.id] || !((modalTarget && modalTarget.trim()) || actionModal.rec.target)}
                  onClick={() => handleRecommendationAction(actionModal.rec, actionModal.mode)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: actionModal.mode === 'BLOCK_IP'
                      ? 'var(--danger-color)'
                      : actionModal.mode === 'UNBLOCK_IP'
                      ? (isDark ? '#475569' : '#64748b')
                      : 'var(--accent-color)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: (actionLoading[actionModal.rec.id] || !((modalTarget && modalTarget.trim()) || actionModal.rec.target)) ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: actionModal.mode === 'BLOCK_IP'
                      ? '0 2px 10px rgba(220, 38, 38, 0.3)'
                      : '0 2px 10px rgba(37, 99, 235, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: (!((modalTarget && modalTarget.trim()) || actionModal.rec.target)) ? 0.6 : 1
                  }}
                >
                  {actionLoading[actionModal.rec.id] ? (
                    <>
                      <RefreshCwIcon spinning={true} />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <span>
                      {actionModal.mode === 'BLOCK_IP' && 'Block on Firewall'}
                      {actionModal.mode === 'UNBLOCK_IP' && 'Unblock IP'}
                      {actionModal.mode === 'RENEW_SSL' && 'Renew Certificate Now'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Action Toast Notification Banner */}
        {feedback && (
          <div style={{
            position: 'fixed',
            bottom: 'clamp(12px, 3vw, 24px)',
            right: 'clamp(12px, 3vw, 24px)',
            maxWidth: 'min(calc(100vw - 24px), 420px)',
            boxSizing: 'border-box',
            zIndex: 99999,
            padding: '14px 20px',
            borderRadius: '12px',
            background: feedback.type === 'success'
              ? (isDark ? 'rgba(16, 185, 129, 0.95)' : '#059669')
              : (isDark ? 'rgba(239, 68, 68, 0.95)' : '#dc2626'),
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'toastSlideUp 0.3s ease-out'
          }}>
            {feedback.type === 'success' ? <CheckCircleIcon /> : <AlertTriangleIcon />}
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                marginLeft: '8px',
                fontSize: '1rem',
                opacity: 0.8
              }}
            >
              ✕
            </button>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes modalSlideIn {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes toastSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}
