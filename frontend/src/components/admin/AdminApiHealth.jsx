import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Server, RotateCw, CheckCircle2 } from 'lucide-react';

export default function AdminApiHealth() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiHealth();
  }, []);

  const fetchApiHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/admin/api-health/', {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        setApiData(await response.json());
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
              API Health & Latency
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Endpoint status verification, response latencies, and uptime telemetry.
            </p>
          </div>

          <button onClick={fetchApiHealth} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading API metrics...</div>
        ) : apiData ? (
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ color: 'var(--admin-text-muted, #64748b)', fontSize: '0.85rem' }}>Global API Uptime: </span>
                <strong style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: 700 }}>{apiData.overall_uptime}</strong>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.8rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>API STATUS: {apiData.api_status}</span>
              </div>
            </div>

            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>ENDPOINT NAME</th>
                    <th>HTTP STATUS</th>
                    <th>AVERAGE LATENCY</th>
                  </tr>
                </thead>
                <tbody>
                  {apiData.endpoints?.map((ep, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>{ep.name}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          {ep.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', fontWeight: 600 }}>{ep.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AdminSidebar>
  );
}
