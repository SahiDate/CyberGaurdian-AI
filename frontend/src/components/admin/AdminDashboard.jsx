import React, { useState, useEffect, useContext, useMemo } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = 'http://localhost:8000';

const StatCard = ({ label, value, icon, color, sub }) => (
  <div
    className="glass-panel"
    style={{
      borderLeft: `3.5px solid ${color}`,
      padding: '1.1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>
        {label}
      </span>
      <span style={{ fontSize: '1.15rem' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '1.95rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
      {value ?? '—'}
    </div>
    {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    ONLINE:   { bg: 'rgba(16,185,129,0.14)', color: 'var(--success-color)', dot: '#10b981' },
    OFFLINE:  { bg: 'rgba(239,68,68,0.14)',  color: 'var(--danger-color)',  dot: '#ef4444' },
    DEGRADED: { bg: 'rgba(245,158,11,0.14)', color: 'var(--warning-color)', dot: '#f59e0b' },
    UNKNOWN:  { bg: 'rgba(100,116,139,0.14)',color: 'var(--text-muted)',    dot: '#64748b' },
  };
  const s = cfg[status] || cfg.UNKNOWN;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '0.25rem 0.65rem',
      borderRadius: '20px',
      fontSize: '0.72rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      border: `1px solid ${s.color}30`
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

const getChartOptions = (isDark) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: isDark ? 'rgba(255,255,255,0.7)' : '#475569',
        font: { size: 11, weight: '600' }
      }
    },
    title: { display: false },
    tooltip: {
      backgroundColor: isDark ? 'rgba(22, 27, 34, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      titleColor: isDark ? '#fff' : '#0f172a',
      bodyColor: isDark ? '#c9d1d9' : '#334155',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
      borderWidth: 1,
      padding: 10,
    }
  },
  scales: {
    x: {
      ticks: { color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', font: { size: 10 } },
      grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }
    },
    y: {
      ticks: { color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', font: { size: 10 } },
      grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }
    },
  },
});

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#2563eb',
  low: '#16a34a',
  excellent: '#16a34a',
  good: '#2563eb'
};

export default function AdminDashboard() {
  const { authTokens, user } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [dash, setDash] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const h = { Authorization: `Bearer ${authTokens?.access}` };
      const [dRes, aRes] = await Promise.all([
        fetch(`${API}/api/admin/dashboard/`, { headers: h }),
        fetch(`${API}/api/admin/analytics/`, { headers: h }),
      ]);
      if (dRes.ok) setDash(await dRes.json());
      if (aRes.ok) setAnalytics(await aRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const chartOpts = useMemo(() => getChartOptions(isDark), [isDark]);

  // Build chart data from real analytics
  const buildScanChart = () => {
    const days = analytics?.daily_scans || [];
    return {
      labels: days.map(d => d.day?.slice(5)),
      datasets: [{
        label: 'Scans',
        data: days.map(d => d.count),
        borderColor: isDark ? '#58a6ff' : '#2563eb',
        backgroundColor: isDark ? 'rgba(88,166,255,0.18)' : 'rgba(37,99,235,0.12)',
        fill: true,
        tension: 0.4,
      }],
    };
  };

  const buildThreatChart = () => {
    const days = analytics?.daily_threats || [];
    return {
      labels: days.map(d => d.day?.slice(5)),
      datasets: [{
        label: 'Threat Detections',
        data: days.map(d => d.count),
        borderColor: isDark ? '#f85149' : '#dc2626',
        backgroundColor: isDark ? 'rgba(248,81,73,0.18)' : 'rgba(220,38,38,0.12)',
        fill: true,
        tension: 0.4,
      }],
    };
  };

  const buildDoughnutData = () => {
    const rb = dash?.threats?.scan_risk_breakdown || {};
    return {
      labels: ['High Risk', 'Medium', 'Good', 'Excellent'],
      datasets: [{
        data: [rb.high || 0, rb.medium || 0, rb.good || 0, rb.excellent || 0],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        borderWidth: 0,
      }],
    };
  };

  const buildUserGrowthChart = () => {
    const weeks = analytics?.weekly_users || [];
    return {
      labels: weeks.map(w => w.week?.slice(0, 10)),
      datasets: [{
        label: 'New Users',
        data: weeks.map(w => w.count),
        backgroundColor: isDark ? 'rgba(163,113,247,0.65)' : 'rgba(124,58,237,0.55)',
        borderRadius: 6,
      }],
    };
  };

  const services = dash?.services || {};

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: "system-ui, -apple-system, sans-serif" }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
              <span>SOC Command Center</span>
              <span style={{ fontSize: '0.7rem', background: 'var(--danger-color)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px' }}>
                {user?.role || 'ADMIN'}
              </span>
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
              {greeting}, <strong style={{ color: 'var(--text-main)' }}>{user?.username}</strong>. Real-time security intelligence & platform control.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={services.ollama_ai || 'UNKNOWN'} />
            <button
              onClick={fetchData}
              className="glass-panel btn-fluid"
              style={{
                padding: '0.5rem 1rem',
                color: 'var(--accent-color)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⟳</div>
            Loading SOC intelligence...
          </div>
        ) : (
          <>
            {/* ── KPI Cards ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <StatCard label="Total Users"    value={dash?.users?.total}       icon="👥" color="#3b82f6" sub="Registered accounts" />
              <StatCard label="Active Users"   value={dash?.users?.active}      icon="✅" color="#10b981" sub="USER role, ACTIVE" />
              <StatCard label="Suspended"      value={dash?.users?.suspended}   icon="🔒" color="#f59e0b" sub="Suspended accounts" />
              <StatCard label="Total Scans"    value={dash?.scans?.total}       icon="🔍" color="#0ea5e9" sub="Platform-wide" />
              <StatCard label="Scans Today"    value={dash?.scans?.today}       icon="📡" color="#8b5cf6" sub={new Date().toLocaleDateString()} />
              <StatCard label="Critical"       value={dash?.threats?.critical}  icon="🔴" color="#ef4444" sub="Critical threats" />
              <StatCard label="High"           value={dash?.threats?.high}      icon="🟠" color="#f97316" sub="High severity" />
              <StatCard label="Medium"         value={dash?.threats?.medium}    icon="🟡" color="#eab308" sub="Medium severity" />
              <StatCard label="Low"            value={dash?.threats?.low}       icon="🟢" color="#10b981" sub="Low/clean" />
              <StatCard label="Open Incidents" value={dash?.incidents?.open}    icon="🔥" color="#ef4444" sub="Requires action" />
              <StatCard label="Reports"        value={dash?.reports?.total}     icon="📋" color="#0284c7" sub="Generated reports" />
              <StatCard label="AI Activities"  value={dash?.ai_activity?.total} icon="🧠" color="#8b5cf6" sub={`${dash?.ai_activity?.today ?? 0} today`} />
            </div>

            {/* ── Charts Row 1 ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>📈 Scan Activity (Last 30 Days)</h3>
                <div style={{ height: '220px', minHeight: '180px' }}>
                  <Line options={chartOpts} data={buildScanChart()} />
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🛡️ Threat Distribution</h3>
                <div style={{ height: '220px', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut data={buildDoughnutData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: isDark ? 'rgba(255,255,255,0.7)' : '#475569', font: { size: 10, weight: '600' } } } } }} />
                </div>
              </div>
            </div>

            {/* ── Charts Row 2 ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🚨 Threat Trends (Last 30 Days)</h3>
                <div style={{ height: '200px', minHeight: '180px' }}>
                  <Line options={chartOpts} data={buildThreatChart()} />
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>📊 User Growth (12 Weeks)</h3>
                <div style={{ height: '200px', minHeight: '180px' }}>
                  <Bar options={chartOpts} data={buildUserGrowthChart()} />
                </div>
              </div>
            </div>

            {/* ── Service Status ────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>💻 Service Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Object.entries(services).map(([svc, st]) => (
                    <div key={svc} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.85rem',
                      background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.55)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'capitalize', fontWeight: 500 }}>
                        {svc.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={st} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Recent Incidents ────────────────────────── */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🔥 Open Incidents</h3>
                {dash?.recent_incidents?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {dash.recent_incidents.map((inc) => (
                      <div key={inc.id} style={{
                        padding: '0.75rem 0.85rem',
                        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.55)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `3.5px solid ${SEVERITY_COLORS[inc.severity?.toLowerCase()] || '#8b949e'}`
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{inc.title}</div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>#{inc.id}</span>
                          <span style={{ color: SEVERITY_COLORS[inc.severity?.toLowerCase()] || '#8b949e', fontWeight: 700 }}>{inc.severity}</span>
                          <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{inc.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No open incidents. 🎉</p>
                )}
              </div>
            </div>

            {/* ── Recent Scans Table ────────────────────────── */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>🔍 Recent Scans</h3>
              {dash?.recent_scans?.length > 0 ? (
                <div className="table-responsive-container">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '550px' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {['Domain', 'HTTPS', 'Score', 'Risk', 'Timestamp'].map(h => (
                          <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dash.recent_scans.map(scan => (
                        <tr key={scan.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>{scan.domain}</td>
                          <td style={{ padding: '0.75rem 0.75rem' }}>{scan.is_https ? '✅' : '❌'}</td>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: scan.security_score >= 70 ? '#10b981' : scan.security_score >= 40 ? '#f59e0b' : '#ef4444' }}>{scan.security_score}/100</td>
                          <td style={{ padding: '0.75rem 0.75rem' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: SEVERITY_COLORS[scan.risk_level] ? `${SEVERITY_COLORS[scan.risk_level]}20` : 'rgba(100,116,139,0.1)',
                              color: SEVERITY_COLORS[scan.risk_level] || 'var(--text-muted)',
                              border: `1px solid ${SEVERITY_COLORS[scan.risk_level]}35`
                            }}>
                              {scan.risk_level_display || scan.risk_level}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)' }}>{new Date(scan.scanned_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No scans recorded yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AdminSidebar>
  );
}
