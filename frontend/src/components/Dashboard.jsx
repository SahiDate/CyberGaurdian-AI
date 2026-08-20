import React, { useState, useContext, Suspense, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AnalysisResults from './AnalysisResults';
import LogAnalyzer from './LogAnalyzer';
import FluidTabs from './shared/FluidTabs';
import { useAnimatedCount } from '../hooks/useAnimatedCount';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import GlassPanel from './three/GlassPanel';
import ThreatChart3D from './three/ThreatChart3D';

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

// Static, translucent GlassPanel Stat card component (no hover tilt or movement)
function StatCard({ title, targetValue, chipText, chipClass, icon }) {
  const animatedVal = useAnimatedCount(targetValue);

  return (
    <GlassPanel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>{title}</span>
        <span className={`chip-badge ${chipClass}`}>
          {icon}
          {chipText}
        </span>
      </div>
      <p style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
        {animatedVal}
      </p>
    </GlassPanel>
  );
}

export default function Dashboard() {
  const { isDark } = useTheme();
  const { user, logoutUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('scanner');
  const [chartMode, setChartMode] = useState('3d');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

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

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!target) return;

    setLoading(true);
    setResults(null);
    setFeedback(null);

    try {
      const response = await fetch('http://localhost:8000/api/analyze/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target })
      });
      
      const resData = await response.json();
      if (response.ok) {
        setResults(resData);
        setFeedback({
          type: 'success',
          message: `Threat analysis completed for target "${target}".`
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

  return (
    <>
      {/* Dashboard Foreground Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: 'var(--space-32) var(--space-24)', maxWidth: '1240px', margin: '0 auto' }}>
        
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
            {/* Analyze Input Form */}
            <form onSubmit={handleAnalyze} className="form-row-responsive" style={{ display: 'flex', gap: '16px', marginBottom: 'var(--space-24)', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter a URL, IP address, or Domain to analyze..."
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '14px 18px',
                  fontSize: '1.05rem',
                  background: 'var(--input-bg)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease, color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              />
              <button
                type="submit"
                disabled={loading || !target.trim()}
                className="glass-panel btn-fluid btn-full-mobile"
                style={{
                  padding: '14px 28px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  background: loading ? 'rgba(37, 99, 235, 0.7)' : 'var(--accent-color)',
                  color: '#fff',
                  cursor: loading || !target.trim() ? 'not-allowed' : 'pointer',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minWidth: '140px',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)'
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
                  'Analyze'
                )}
              </button>
            </form>

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
                gap: '12px'
              }}>
                {feedback.type === 'success' ? <CheckCircleIcon /> : <AlertTriangleIcon />}
                <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-main)' }}>{feedback.message}</span>
              </div>
            )}

            {results ? (
              <AnalysisResults results={results} />
            ) : (
              <>
                {/* Static, Transparent Glass Stat Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-16)', marginBottom: 'var(--space-32)' }}>
                  <StatCard
                    title="High Severity Threats"
                    targetValue={42}
                    chipText="Critical"
                    chipClass="chip-danger"
                    icon={<ShieldIcon />}
                  />
                  <StatCard
                    title="Analyzed URLs"
                    targetValue="1,204"
                    chipText="Scanned"
                    chipClass="chip-success"
                    icon={<GlobeIcon />}
                  />
                  <StatCard
                    title="Active Modules"
                    targetValue="14/15"
                    chipText="Operational"
                    chipClass="chip-accent"
                    icon={<CpuIcon />}
                  />
                </div>

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
