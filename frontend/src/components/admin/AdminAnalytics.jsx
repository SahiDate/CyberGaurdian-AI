import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = 'http://localhost:8000';

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: 'rgba(255,255,255,0.55)', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
  },
};
const doughnutOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.55)', font: { size: 11 } } } },
};

export default function AdminAnalytics() {
  const { authTokens } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/analytics/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

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
    datasets: [{ label: 'New Users', data: (data?.weekly_users || []).map(d => d.count), backgroundColor: 'rgba(163,113,247,0.6)', borderRadius: 4 }],
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
    datasets: [{ label: 'Usage', data: Object.values(data?.module_usage || {}), backgroundColor: 'rgba(56,139,253,0.6)', borderRadius: 4 }],
  };

  const totals = data?.totals || {};

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1400px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>📊 Analytics</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Platform-wide statistics from real database queries. No fake data.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading analytics...</div>
        ) : (
          <>
            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                ['Total Users', totals.total_users, '#388bfd', '👥'],
                ['Total Scans', totals.total_scans, '#a371f7', '🔍'],
                ['Threats Found', totals.total_threats, '#f85149', '🚨'],
                ['Incidents', totals.total_incidents, '#e3b341', '🔥'],
                ['Reports', totals.total_reports, '#39d353', '📋'],
                ['AI Activities', totals.total_ai_activities, '#58a6ff', '🧠'],
              ].map(([label, val, color, icon]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '1rem 1.15rem' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>{icon}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{val ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.6px' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700 }}>📈 Daily Scan Activity (30d)</h3>
                <div style={{ height: '200px' }}><Line options={chartOpts} data={scanChartData} /></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700 }}>🚨 Daily Threat Detections (30d)</h3>
                <div style={{ height: '200px' }}><Line options={chartOpts} data={threatChartData} /></div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700 }}>🛡️ Threat Severity</h3>
                <div style={{ height: '200px' }}><Doughnut options={doughnutOpts} data={sevData} /></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700 }}>📊 Scan Risk Distribution</h3>
                <div style={{ height: '200px' }}><Doughnut options={doughnutOpts} data={riskData} /></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700 }}>📅 User Growth (12 Weeks)</h3>
                <div style={{ height: '200px' }}><Bar options={chartOpts} data={userGrowthData} /></div>
              </div>
            </div>

            {/* Module Usage */}
            {Object.keys(data?.module_usage || {}).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700 }}>🔧 AI Module Usage</h3>
                <div style={{ height: '200px' }}><Bar options={chartOpts} data={moduleData} /></div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminSidebar>
  );
}
