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
      <div style={{ maxWidth: '1100px' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#fff' }}>💻 System & Infrastructure Health</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Real-time CPU utilization, memory allocation, storage space, and microservices status.
        </p>

        {data ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>CPU Utilization</h4>
                <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: 'var(--accent-color)' }}>{data.cpu_usage_pct}%</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Memory Usage</h4>
                <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: '#388bfd' }}>{data.memory_usage_pct}%</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Disk Usage</h4>
                <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: '#39d353' }}>{data.disk_usage_pct}%</p>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>🔌 Service Status Matrix</h3>
              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '450px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Service Component</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.active_services || {}).map(([srv, st]) => (
                    <tr key={srv} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{srv.replace('_', ' ')}</td>
                      <td style={{ padding: '0.75rem', color: '#39d353', fontWeight: 'bold' }}>🟢 {st}</td>
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
