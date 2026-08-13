import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = 'http://localhost:8000';

const StatCard = ({ label, value, icon, color, sub }) => (
  <div style={{
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderLeft: `3px solid ${color}`,
    borderRadius: '10px',
    padding: '1.1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.8px' }}>{label}</span>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{sub}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    ONLINE:   { bg: 'rgba(57,211,83,0.12)',  color: '#39d353', dot: '#39d353' },
    OFFLINE:  { bg: 'rgba(248,81,73,0.12)',  color: '#f85149', dot: '#f85149' },
    DEGRADED: { bg: 'rgba(227,179,65,0.12)', color: '#e3b341', dot: '#e3b341' },
    UNKNOWN:  { bg: 'rgba(139,148,158,0.12)',color: '#8b949e', dot: '#8b949e' },
  };
  const s = cfg[status] || cfg.UNKNOWN;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

const chartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } } },
    title: { display: false },
  },
  scales: {
    x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
  },
});

const SEVERITY_COLORS = { critical: '#f85149', high: '#e3b341', medium: '#388bfd', low: '#39d353', excellent: '#39d353', good: '#388bfd' };

export default function AdminDashboard() {
  const { authTokens, user } = useContext(AuthContext);
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

  // Build chart data from real analytics
  const buildScanChart = () => {
    const days = analytics?.daily_scans || [];
    return {
      labels: days.map(d => d.day?.slice(5)),
      datasets: [{
        label: 'Scans',
        data: days.map(d => d.count),
        borderColor: '#388bfd',
        backgroundColor: 'rgba(56,139,253,0.15)',
        fill: true, tension: 0.4,
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
        borderColor: '#f85149',
        backgroundColor: 'rgba(248,81,73,0.15)',
        fill: true, tension: 0.4,
      }],
    };
  };

  const buildDoughnutData = () => {
    const rb = dash?.threats?.scan_risk_breakdown || {};
    return {
      labels: ['High Risk', 'Medium', 'Good', 'Excellent'],
      datasets: [{
        data: [rb.high || 0, rb.medium || 0, rb.good || 0, rb.excellent || 0],
        backgroundColor: ['#f85149', '#e3b341', '#388bfd', '#39d353'],
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
        backgroundColor: 'rgba(163,113,247,0.6)',
        borderRadius: 4,
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
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>SOC Command Center</span>
              <span style={{ fontSize: '0.7rem', background: '#f85149', color: '#fff', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                {user?.role || 'ADMIN'}
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
              {greeting}, {user?.username}. Real-time security intelligence & platform control.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={services.ollama_ai || 'UNKNOWN'} />
            <button
              onClick={fetchData}
              className="btn-fluid"
              style={{ padding: '0.5rem 1rem', background: 'rgba(56,139,253,0.1)', border: '1px solid rgba(56,139,253,0.3)', color: '#388bfd', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⟳</div>
            Loading SOC intelligence...
          </div>
        ) : (
          <>
            {/* ── KPI Cards ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <StatCard label="Total Users"    value={dash?.users?.total}       icon="👥" color="#388bfd" sub="Registered accounts" />
              <StatCard label="Active Users"   value={dash?.users?.active}      icon="✅" color="#39d353" sub="USER role, ACTIVE" />
              <StatCard label="Suspended"      value={dash?.users?.suspended}   icon="🔒" color="#e3b341" sub="Suspended accounts" />
              <StatCard label="Total Scans"    value={dash?.scans?.total}       icon="🔍" color="#388bfd" sub="Platform-wide" />
              <StatCard label="Scans Today"    value={dash?.scans?.today}       icon="📡" color="#a371f7" sub={new Date().toLocaleDateString()} />
              <StatCard label="Critical"       value={dash?.threats?.critical}  icon="🔴" color="#f85149" sub="Critical threats" />
              <StatCard label="High"           value={dash?.threats?.high}      icon="🟠" color="#e3b341" sub="High severity" />
              <StatCard label="Medium"         value={dash?.threats?.medium}    icon="🟡" color="#e3b341" sub="Medium severity" />
              <StatCard label="Low"            value={dash?.threats?.low}       icon="🟢" color="#39d353" sub="Low/clean" />
              <StatCard label="Open Incidents" value={dash?.incidents?.open}    icon="🔥" color="#f85149" sub="Requires action" />
              <StatCard label="Reports"        value={dash?.reports?.total}     icon="📋" color="#58a6ff" sub="Generated reports" />
              <StatCard label="AI Activities"  value={dash?.ai_activity?.total} icon="🧠" color="#a371f7" sub={`${dash?.ai_activity?.today ?? 0} today`} />
            </div>

            {/* ── Charts Row 1 ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>📈 Scan Activity (Last 30 Days)</h3>
                <div style={{ height: '220px', minHeight: '180px' }}>
                  <Line options={chartOptions()} data={buildScanChart()} />
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>🛡️ Threat Distribution</h3>
                <div style={{ height: '220px', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut data={buildDoughnutData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } } } } }} />
                </div>
              </div>
            </div>

            {/* ── Charts Row 2 ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>🚨 Threat Trends (Last 30 Days)</h3>
                <div style={{ height: '200px', minHeight: '180px' }}>
                  <Line options={chartOptions()} data={buildThreatChart()} />
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>📊 User Growth (12 Weeks)</h3>
                <div style={{ height: '200px', minHeight: '180px' }}>
                  <Bar options={chartOptions()} data={buildUserGrowthChart()} />
                </div>
              </div>
            </div>

            {/* ── Service Status ────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>💻 Service Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Object.entries(services).map(([svc, st]) => (
                    <div key={svc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>
                        {svc.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={st} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Recent Incidents ────────────────────────── */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>🔥 Open Incidents</h3>
                {dash?.recent_incidents?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {dash.recent_incidents.map((inc) => (
                      <div key={inc.id} style={{ padding: '0.65rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `3px solid ${SEVERITY_COLORS[inc.severity?.toLowerCase()] || '#8b949e'}` }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>{inc.title}</div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
                          <span>#{inc.id}</span>
                          <span style={{ color: SEVERITY_COLORS[inc.severity?.toLowerCase()] || '#8b949e', fontWeight: 600 }}>{inc.severity}</span>
                          <span>{inc.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0 }}>No open incidents. 🎉</p>
                )}
              </div>
            </div>

            {/* ── Recent Scans Table ────────────────────────── */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>🔍 Recent Scans</h3>
              {dash?.recent_scans?.length > 0 ? (
                <div className="table-responsive-container">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '550px' }}>
                    <thead>
                      <tr style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {['Domain', 'HTTPS', 'Score', 'Risk', 'Timestamp'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dash.recent_scans.map(scan => (
                        <tr key={scan.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{scan.domain}</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>{scan.is_https ? '✅' : '❌'}</td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: scan.security_score >= 70 ? '#39d353' : scan.security_score >= 40 ? '#e3b341' : '#f85149' }}>{scan.security_score}/100</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: SEVERITY_COLORS[scan.risk_level] ? `${SEVERITY_COLORS[scan.risk_level]}22` : 'rgba(255,255,255,0.05)', color: SEVERITY_COLORS[scan.risk_level] || '#8b949e' }}>
                              {scan.risk_level_display || scan.risk_level}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: 'rgba(255,255,255,0.35)' }}>{new Date(scan.scanned_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No scans recorded yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AdminSidebar>
  );
}
