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
      <div style={{ maxWidth: '1100px' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#fff' }}>⚡ API Health & Endpoint Status</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Endpoint status verification, http status code monitor, and average response latencies.
        </p>

        {apiData ? (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Global API Uptime: </span>
                <strong style={{ color: '#39d353', fontSize: '1.1rem' }}>{apiData.overall_uptime}</strong>
              </div>
              <div style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                🟢 API STATUS: {apiData.api_status}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Endpoint Name</th>
                  <th style={{ padding: '0.75rem' }}>HTTP Status</th>
                  <th style={{ padding: '0.75rem' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {apiData.endpoints?.map((ep, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{ep.name}</td>
                    <td style={{ padding: '0.75rem', color: '#39d353', fontWeight: 'bold' }}>{ep.status}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{ep.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Loading API metrics...</p>
        )}
      </div>
    </AdminSidebar>
  );
}
