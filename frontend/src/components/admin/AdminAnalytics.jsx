import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = 'http://localhost:8000';

const getChartOpts = (isDark) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: isDark ? 'rgba(255,255,255,0.7)' : '#334155',
        font: { size: 11, weight: '600' }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', font: { size: 10 } },
      grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
    },
    y: {
      ticks: { color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', font: { size: 10 } },
      grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
    },
  },
});

const getDoughnutOpts = (isDark) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: isDark ? 'rgba(255,255,255,0.75)' : '#334155',
        font: { size: 11, weight: '600' }
      }
    }
  },
});

export default function AdminAnalytics() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchAnalytics();
    });
    return () => unsubscribe();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/analytics/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const chartOpts = getChartOpts(isDark);
  const doughnutOpts = getDoughnutOpts(isDark);

  const scanChartData = {
    labels: (data?.daily_scans || []).map(d => d.day?.slice(5)),
    datasets: [{ label: 'Scans', data: (data?.daily_scans || []).map(d => d.count), borderColor: '#388bfd', backgroundColor: 'rgba(56,139,253,0.15)', fill: true, tension: 0.4 }],
  };

  const threatChartData = {
    labels: (data?.daily_threats || []).map(d => d.day?.slice(5)),
    datasets: [{ label: 'Threats', data: (data?.daily_threats || []).map(d => d.count), borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.15)', fill: true, tension: 0.4 }],
  };

  const userGrowthData = {
    labels: (data?.weekly_users || []).map(d => d.week?.slice(0, 10)),
    datasets: [{ label: 'New Users', data: (data?.weekly_users || []).map(d => d.count), backgroundColor: 'rgba(163,113,247,0.7)', borderRadius: 4 }],
  };

  const SEV_COLORS = ['#f85149', '#e3b341', '#388bfd', '#39d353', '#8b949e'];
  const sevData = {
    labels: (data?.severity_breakdown || []).map(s => s.severity || 'Unknown'),
    datasets: [{ data: (data?.severity_breakdown || []).map(s => s.count), backgroundColor: SEV_COLORS, borderWidth: 0 }],
  };

  const RISK_COLORS = { high: '#f85149', medium: '#e3b341', good: '#388bfd', excellent: '#39d353' };
  const riskData = {
    labels: (data?.risk_breakdown || []).map(r => r.risk_level),
    datasets: [{ data: (data?.risk_breakdown || []).map(r => r.count), backgroundColor: (data?.risk_breakdown || []).map(r => RISK_COLORS[r.risk_level] || '#8b949e'), borderWidth: 0 }],
  };

  const moduleData = {
    labels: Object.keys(data?.module_usage || {}),
    datasets: [{ label: 'Usage', data: Object.values(data?.module_usage || {}), backgroundColor: 'rgba(56,139,253,0.7)', borderRadius: 4 }],
  };

  const totals = data?.totals || {};

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1400px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 800, color: 'var(--text-main)' }}>📊 Analytics</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Platform-wide statistics from real database queries. No fake data.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div>
        ) : (
          <>
            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                ['Total Users', totals.total_users, '#388bfd', '👥'],
                ['Total Scans', totals.total_scans, '#a371f7', '🔍'],
                ['Threats Found', totals.total_threats, '#f85149', '🚨'],
                ['Incidents', totals.total_incidents, '#e3b341', '🔥'],
                ['Reports', totals.total_reports, '#39d353', '📋'],
                ['AI Activities', totals.total_ai_activities, '#58a6ff', '🧠'],
              ].map(([label, val, color, icon]) => (
                <div
                  key={label}
                  className="glass-panel"
                  style={{
                    borderLeft: `3.5px solid ${color}`,
                    borderRadius: '12px',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.6px' }}>{label}</span>
                    <span style={{ fontSize: '1.15rem' }}>{icon}</span>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color, lineHeight: 1.1 }}>{val ?? 0}</div>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>📈 Daily Scan Activity (30d)</h3>
                <div style={{ height: '220px' }}><Line options={chartOpts} data={scanChartData} /></div>
              </div>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🚨 Daily Threat Detections (30d)</h3>
                <div style={{ height: '220px' }}><Line options={chartOpts} data={threatChartData} /></div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🛡️ Threat Severity</h3>
                <div style={{ height: '220px' }}><Doughnut options={doughnutOpts} data={sevData} /></div>
              </div>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>📊 Scan Risk Distribution</h3>
                <div style={{ height: '220px' }}><Doughnut options={doughnutOpts} data={riskData} /></div>
              </div>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>📅 User Growth (12 Weeks)</h3>
                <div style={{ height: '220px' }}><Bar options={chartOpts} data={userGrowthData} /></div>
              </div>
            </div>

            {/* Module Usage */}
            {Object.keys(data?.module_usage || {}).length > 0 && (
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🔧 AI Module Usage</h3>
                <div style={{ height: '220px' }}><Bar options={chartOpts} data={moduleData} /></div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminSidebar>
  );
}
