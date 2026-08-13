import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

export default function UserHistory() {
  const { authTokens } = useContext(AuthContext);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/user/scans/', {
        headers: {
          'Authorization': `Bearer ${authTokens?.access}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setScans(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#fff', paddingBottom: '3rem' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>📜 Scan History</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Historical record of all website scans associated with your account.
          </p>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading scan history...</p>
          ) : scans.length > 0 ? (
            <div className="table-responsive-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Domain</th>
                  <th style={{ padding: '0.75rem' }}>URL</th>
                  <th style={{ padding: '0.75rem' }}>HTTPS</th>
                  <th style={{ padding: '0.75rem' }}>Risk Score</th>
                  <th style={{ padding: '0.75rem' }}>Risk Level</th>
                  <th style={{ padding: '0.75rem' }}>Scanned At</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{scan.domain}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{scan.url}</td>
                    <td style={{ padding: '0.75rem' }}>{scan.is_https ? '✅ Yes' : '❌ No'}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{scan.security_score}/100</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: scan.risk_level === 'high' ? 'rgba(248,81,73,0.2)' : 'rgba(57,211,83,0.2)',
                        color: scan.risk_level === 'high' ? '#f85149' : '#39d353'
                      }}>
                        {scan.risk_level_display}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{new Date(scan.scanned_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No scan history recorded.</p>
          )}
        </div>
      </main>
    </div>
  );
}
