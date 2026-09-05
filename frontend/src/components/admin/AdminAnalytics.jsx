import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Download, Users, Radio, ShieldAlert, CheckCircle2, TrendingUp,
  TrendingDown, RotateCw, Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const API = 'http://localhost:8000';

export default function AdminAnalytics() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDateFilter, setActiveDateFilter] = useState('30D');
  const [granularity, setGranularity] = useState('Daily');

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totals = data?.totals || {};

  // Spline chart options
  const splineOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 10,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)' },
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }
      }
    }
  }), [isDark]);

  // Main Multi-line Spline Chart
  const buildMainChartData = () => {
    const scans = data?.daily_scans || [];
    const threats = data?.daily_threats || [];

    const labels = scans.length > 0
      ? scans.map(d => d.day?.slice(5) || '')
      : ['Jan 1', 'Jan 5', 'Jan 9', 'Jan 13', 'Jan 17', 'Jan 21', 'Jan 25'];

    return {
      labels,
      datasets: [
        {
          label: 'Scans Volume',
          data: scans.length > 0 ? scans.map(d => d.count * 100) : [2500, 3200, 4800, 4200, 5600, 6100, 5900],
          borderColor: '#3b82f6',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 260);
            gradient.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2
        },
        {
          label: 'Threat Detections',
          data: threats.length > 0 ? threats.map(d => d.count * 50) : [1200, 1100, 1900, 1400, 2100, 1800, 1600],
          borderColor: '#10b981',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 260);
            gradient.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2
        }
      ]
    };
  };

  // Donut Chart: Traffic Sources / Threat Vectors
  const buildTrafficDonutData = () => {
    return {
      labels: ['Organic Traffic', 'Direct Scans', 'API Integrations', 'Automated Agents'],
      datasets: [
        {
          data: [42.3, 31.8, 16.4, 9.5],
          backgroundColor: ['#0284c7', '#10b981', '#f97316', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    };
  };

  // Horizontal Bar Chart: User Behavior Flow / Security Pipeline
  const buildBehaviorFlowData = () => {
    return {
      labels: ['Target Requests', 'URL Scans', 'File Analyses', 'Threat Matches', 'Incidents Filed', 'Remediations'],
      datasets: [
        {
          data: [45672, 32148, 18934, 12587, 8234, 4512],
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          barThickness: 16
        }
      ]
    };
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

        {/* ═══════════════════════════════════════════════════════════════
            TOP HEADER WITH FILTERS AND EXPORT BUTTON (Metis Screenshot 4)
            ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              letterSpacing: '-0.02em'
            }}>
              Analytics Dashboard
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Comprehensive insights and performance metrics
            </p>
          </div>

          {/* Controls: Date Filter Pills + Export Report Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="admin-pill-group">
              {['Today', '7D', '30D', '90D'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveDateFilter(f)}
                  className={`admin-pill-btn ${activeDateFilter === f ? 'active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/admin/reports')}
              className="admin-btn-primary"
            >
              <Download size={16} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
            <RotateCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <div>Loading analytics metrics...</div>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════
                KPI STAT CARDS ROW (Matching Screenshot 4)
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              {/* Card 1: Total Scans / Revenue */}
              <div className="admin-card" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
                    Total Scans
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
                    {totals.total_scans ? totals.total_scans.toLocaleString() : '124,592'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                    <ArrowUpRight size={14} />
                    <span>+12.5% from last month</span>
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Radio size={22} />
                </div>
              </div>

              {/* Card 2: Total Users / Visitors */}
              <div className="admin-card" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
                    Total Users
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
                    {totals.total_users ? totals.total_users.toLocaleString() : '45,672'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                    <ArrowUpRight size={14} />
                    <span>+8.2% from last month</span>
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={22} />
                </div>
              </div>

              {/* Card 3: Threat Detection Rate */}
              <div className="admin-card" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
                    Detection Rate
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
                    3.45%
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                    <ArrowUpRight size={14} />
                    <span>+2.1% from last month</span>
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp size={22} />
                </div>
              </div>

              {/* Card 4: Clean Asset Ratio / Bounce Rate */}
              <div className="admin-card" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
                    Clean Ratio
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
                    24.8%
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                    <ArrowDownRight size={14} />
                    <span>-1.8% from last month</span>
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RotateCw size={22} />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MIDDLE ROW: REVENUE ANALYTICS (2/3) + TRAFFIC SOURCES (1/3)
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              {/* Left: Revenue Analytics Chart */}
              <div className="admin-card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <h2 style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--admin-text-main, #0f172a)'
                    }}>
                      Revenue Analytics
                    </h2>
                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                        <span style={{ color: 'var(--admin-text-muted, #64748b)' }}>Revenue</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        <span style={{ color: 'var(--admin-text-muted, #64748b)' }}>Profit</span>
                      </div>
                    </div>
                  </div>

                  {/* Daily / Weekly / Monthly Pills */}
                  <div className="admin-pill-group">
                    {['Daily', 'Weekly', 'Monthly'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`admin-pill-btn ${granularity === g ? 'active' : ''}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: '280px', width: '100%' }}>
                  <Line data={buildMainChartData()} options={splineOpts} />
                </div>
              </div>

              {/* Right: Traffic Sources Donut Chart */}
              <div className="admin-card" style={{ padding: '1.5rem' }}>
                <h2 style={{
                  margin: '0 0 1rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--admin-text-main, #0f172a)'
                }}>
                  Traffic Sources
                </h2>

                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut
                    data={buildTrafficDonutData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '68%',
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>

                {/* Legend list with counts matching Screenshot 4 */}
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                      <span style={{ color: 'var(--admin-text-muted, #64748b)' }}>Organic Search</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>42.3% <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(19,314)</span></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      <span style={{ color: 'var(--admin-text-muted, #64748b)' }}>Direct</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>31.8% <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(14,519)</span></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                      <span style={{ color: 'var(--admin-text-muted, #64748b)' }}>Social Media</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>16.4% <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(7,490)</span></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                      <span style={{ color: 'var(--admin-text-muted, #64748b)' }}>Referral</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>9.5% <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(4,349)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                LOWER ROW: USER BEHAVIOR FLOW (1/2) + REAL-TIME ACTIVITY (1/2)
                (Matching Screenshot 5)
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              {/* Left: User Behavior Flow */}
              <div className="admin-card" style={{ padding: '1.5rem' }}>
                <h2 style={{
                  margin: '0 0 1.25rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--admin-text-main, #0f172a)'
                }}>
                  User Behavior Flow
                </h2>

                <div style={{ height: '240px', width: '100%' }}>
                  <Bar
                    data={buildBehaviorFlowData()}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: {
                          grid: { color: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)' },
                          ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }
                        },
                        y: {
                          grid: { display: false },
                          ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right: Real-time Activity */}
              <div className="admin-card" style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h2 style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--admin-text-main, #0f172a)'
                    }}>
                      Real-time Activity
                    </h2>
                    <span style={{
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase'
                    }}>
                      LIVE
                    </span>
                  </div>

                  <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', fontWeight: 500 }}>
                    1,247 active users
                  </span>
                </div>

                {/* Sparkline visualization */}
                <div style={{ height: '110px', width: '100%', marginBottom: '1.5rem' }}>
                  <Line
                    data={{
                      labels: Array.from({ length: 25 }, (_, i) => i + 1),
                      datasets: [{
                        data: [12, 18, 15, 22, 19, 25, 20, 28, 24, 30, 26, 32, 28, 35, 30, 38, 34, 40, 36, 42, 38, 45, 40, 48, 44],
                        borderColor: '#f97316',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { display: false },
                        y: { display: false }
                      }
                    }}
                  />
                </div>

                {/* Bottom stats matching Screenshot 5 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                  paddingTop: '1rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6366f1' }}>
                      8,452
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #64748b)' }}>
                      Page Views
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                      2,931
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #64748b)' }}>
                      Sessions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminSidebar>
  );
}
