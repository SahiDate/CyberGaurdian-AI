import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Activity, Cpu, HardDrive, Server, RotateCw } from 'lucide-react';

export default function AdminSystemHealth() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/admin/system-health/', {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        setData(await response.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Header */}
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
              System Health
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Real-time CPU utilization, memory allocation, storage space, and microservices status.
            </p>
          </div>

          <button onClick={fetchHealth} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading health metrics...</div>
        ) : data ? (
          <>
            {/* Health Stat Cards (Metis Style) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div className="admin-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
                  color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Cpu size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>CPU Utilization</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', marginTop: '2px' }}>
                    {data.cpu_usage_pct}%
                  </div>
                </div>
              </div>

              <div className="admin-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                  color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Activity size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>Memory Usage</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', marginTop: '2px' }}>
                    {data.memory_usage_pct}%
                  </div>
                </div>
              </div>

              <div className="admin-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <HardDrive size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>Disk Usage</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', marginTop: '2px' }}>
                    {data.disk_usage_pct}%
                  </div>
                </div>
              </div>
            </div>

            {/* Service Status Matrix Table Card */}
            <div className="admin-card" style={{ padding: '1.5rem' }}>
              <h2 style={{
                margin: '0 0 1.25rem',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--admin-text-main, #0f172a)'
              }}>
                Service Status Matrix
              </h2>

              <div className="table-responsive-container" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>SERVICE COMPONENT</th>
                      <th>HEALTH STATUS</th>
                      <th>UPTIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.active_services || {}).map(([srv, st]) => (
                      <tr key={srv}>
                        <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)', textTransform: 'capitalize' }}>
                          {srv.replace(/_/g, ' ')}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            {st}
                          </span>
                        </td>
                        <td style={{ color: 'var(--admin-text-muted, #64748b)', fontSize: '0.82rem' }}>
                          99.98%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminSidebar>
  );
}
