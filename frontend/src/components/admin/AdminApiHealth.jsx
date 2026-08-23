import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

export default function AdminApiHealth() {
  const { authTokens } = useContext(AuthContext);
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    fetchApiHealth();
  }, []);

  const fetchApiHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/api-health/', {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        setApiData(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1100px', fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', color: 'var(--text-main)', fontWeight: 800 }}>⚡ API Health & Endpoint Status</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Endpoint status verification, http status code monitor, and average response latencies.
        </p>

        {apiData ? (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Global API Uptime: </span>
                <strong style={{ color: 'var(--success-color)', fontSize: '1.1rem', fontWeight: 800 }}>{apiData.overall_uptime}</strong>
              </div>
              <div style={{ color: 'var(--success-color)', fontWeight: 800, fontSize: '0.9rem' }}>
                🟢 API STATUS: {apiData.api_status}
              </div>
            </div>

            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Endpoint Name</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>HTTP Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {apiData.endpoints?.map((ep, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{ep.name}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--success-color)', fontWeight: 800 }}>{ep.status}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>{ep.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Loading API metrics...</p>
        )}
      </div>
    </AdminSidebar>
  );
}
