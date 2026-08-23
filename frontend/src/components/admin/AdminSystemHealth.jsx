import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

export default function AdminSystemHealth() {
  const { authTokens } = useContext(AuthContext);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/system-health/', {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        setData(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1100px', fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: 'var(--text-main)', fontWeight: 800 }}>💻 System & Infrastructure Health</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Real-time CPU utilization, memory allocation, storage space, and microservices status.
        </p>

        {data ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '3.5px solid var(--accent-color)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CPU Utilization</h4>
                <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--accent-color)' }}>{data.cpu_usage_pct}%</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '3.5px solid var(--info-color)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Memory Usage</h4>
                <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--info-color)' }}>{data.memory_usage_pct}%</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '3.5px solid var(--success-color)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disk Usage</h4>
                <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--success-color)' }}>{data.disk_usage_pct}%</p>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>🔌 Service Status Matrix</h3>
              <div className="table-responsive-container" style={{ margin: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '450px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Service Component</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.active_services || {}).map(([srv, st]) => (
                    <tr key={srv} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-main)' }}>{srv.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--success-color)', fontWeight: 800 }}>🟢 {st}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Loading health stats...</p>
        )}
      </div>
    </AdminSidebar>
  );
}
