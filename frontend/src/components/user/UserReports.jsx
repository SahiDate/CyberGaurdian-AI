import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

export default function UserReports() {
  const { authTokens } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/reports/', {
        headers: {
          'Authorization': `Bearer ${authTokens?.access}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        // Fallback to scans if reports list is empty/initial
        const fallback = await fetch('http://localhost:8000/api/user/scans/', {
          headers: { 'Authorization': `Bearer ${authTokens?.access}` }
        });
        if (fallback.ok) setReports(await fallback.json());
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
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>📑 Generated Security Reports</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Detailed audit reports for your monitored websites and domains.
          </p>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading reports...</p>
          ) : reports.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {reports.map((report) => (
                <div key={report.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${report.risk_level === 'high' ? '#f85149' : '#39d353'}` }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{report.domain}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Date: {new Date(report.scanned_at).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      background: report.risk_level === 'high' ? 'rgba(248,81,73,0.2)' : 'rgba(57,211,83,0.2)',
                      color: report.risk_level === 'high' ? '#f85149' : '#39d353'
                    }}>
                      {report.risk_level_display} ({report.security_score}/100)
                    </span>
                    <button onClick={() => alert(`Report Summary for ${report.domain}:\nScore: ${report.security_score}/100\nHTTPS: ${report.is_https}`)} style={{
                      padding: '0.4rem 0.8rem',
                      background: 'var(--accent-color)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No reports generated yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
