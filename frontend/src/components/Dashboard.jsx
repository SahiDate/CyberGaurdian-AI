import React, { useState, useContext } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AnalysisResults from './AnalysisResults';
import LogAnalyzer from './LogAnalyzer';
import FluidTabs from './shared/FluidTabs';
import { useAnimatedCount } from '../hooks/useAnimatedCount';
import { AuthContext } from '../context/AuthContext';

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

// Stat card component with icon chip & animated count
function StatCard({ title, targetValue, chipText, chipClass, icon }) {
  const animatedVal = useAnimatedCount(targetValue);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>{title}</span>
        <span className={`chip-badge ${chipClass}`}>
          {icon}
          {chipText}
        </span>
      </div>
      <p style={{ fontSize: '2.25rem', margin: 0, fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
        {animatedVal}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1500,
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
          color: '#c9d1d9'
        }
      },
      title: {
        display: true,
        text: 'Threat Events & Traffic Velocity Over Time',
        align: 'start',
        color: '#f0f6fc',
        font: { family: 'system-ui, -apple-system, sans-serif', size: 15, weight: '700' },
        padding: { bottom: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(22, 27, 34, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        titleFont: { weight: '700' },
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#8b949e', font: { family: 'system-ui, sans-serif' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#8b949e', font: { family: 'system-ui, sans-serif' } }
      }
    }
  };

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Critical Threats',
        data: [12, 19, 3, 5, 2, 3, 9],
        borderColor: '#f85149',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(248, 81, 73, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(248, 81, 73, 0.35)');
          gradient.addColorStop(1, 'rgba(248, 81, 73, 0.0)');
          return gradient;
        },
      },
      {
        label: 'Blocked Requests',
        data: [200, 300, 150, 400, 250, 600, 320],
        borderColor: '#58a6ff',
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(88, 166, 255, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(88, 166, 255, 0.35)');
          gradient.addColorStop(1, 'rgba(88, 166, 255, 0.0)');
          return gradient;
        },
      }
    ],
  };

  const [activeTab, setActiveTab] = useState('scanner');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const { user, logoutUser } = useContext(AuthContext);

  const tabs = [
    { id: 'scanner', label: 'Domain Threat Scanner', icon: <ShieldIcon /> },
    { id: 'logs', label: 'Log Analyzer (SOC)', icon: <ActivityIcon /> }
  ];

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
    <div style={{ padding: 'var(--space-32) var(--space-24)', maxWidth: '1240px', margin: '0 auto' }}>
      
      {/* Header Hierarchy: Weight + Size together */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-32)', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 className="h1-fluid" style={{ margin: 0, fontSize: '2.1rem', color: '#ffffff' }}>
            CyberGuardian AI
          </h1>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'var(--accent-color)',
            background: 'rgba(88, 166, 255, 0.12)',
            border: '1px solid rgba(88, 166, 255, 0.25)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Dashboard
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="chip-badge chip-success" style={{ textTransform: 'none', padding: '6px 12px' }}>
            <CheckCircleIcon />
            Agent Status: <strong>Autonomous Mode Active</strong>
          </span>
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
              background: 'rgba(255, 255, 255, 0.03)',
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
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              type="submit"
              disabled={loading || !target.trim()}
              className="glass-panel btn-fluid btn-full-mobile"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading ? 'rgba(88, 166, 255, 0.7)' : 'var(--accent-color)',
                color: '#fff',
                cursor: loading || !target.trim() ? 'not-allowed' : 'pointer',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                minWidth: '140px',
                boxShadow: '0 4px 14px rgba(88, 166, 255, 0.3)'
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
              background: feedback.type === 'success' ? 'rgba(63, 185, 80, 0.08)' : 'rgba(248, 81, 73, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {feedback.type === 'success' ? <CheckCircleIcon /> : <AlertTriangleIcon />}
              <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{feedback.message}</span>
            </div>
          )}

          {results ? (
            <AnalysisResults results={results} />
          ) : (
            <>
              {/* Stat Cards Grid with Icon Chips + Animated Numbers */}
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

              {/* Chart Panel */}
              <div className="glass-panel" style={{ padding: 'var(--space-24)', marginBottom: 'var(--space-32)' }}>
                <Line options={options} data={data} />
              </div>

              {/* AI Recommendations Panel */}
              <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-16)', color: '#ffffff' }}>AI Recommendations</h2>
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  <li style={{
                    padding: '16px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      fontSize: '0.85rem'
                    }}>
                      Block IP
                    </button>
                  </li>
                  <li style={{
                    padding: '16px 0 0 0',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      fontSize: '0.85rem'
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
  );
}
