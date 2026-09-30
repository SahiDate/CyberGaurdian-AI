import React, { useState, useContext } from 'react';
import Navbar from '../shared/Navbar';
import AnalysisResults from '../AnalysisResults';
import { AuthContext } from '../../context/AuthContext';

export default function UserScanner() {
  const { authTokens } = useContext(AuthContext);
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE}/api/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({ target })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze target.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#fff', paddingBottom: '3rem' }}>
      <Navbar />

      <main className="responsive-page-container" style={{ margin: '0 auto', padding: '0 clamp(1rem, 3vw, 1.5rem)' }}>
        <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', borderRadius: '12px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)', fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>🌐 Website Security Scanner</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Enter a domain, IP address, or URL to analyze HTTP security headers, SSL certificate integrity, and port status.
          </p>

          <form onSubmit={handleScan} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. example.com or https://cyberguardian.io"
              style={{
                flex: '1 1 240px',
                minWidth: 0,
                width: '100%',
                padding: '0.9rem 1.2rem',
                fontSize: '1.05rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
              required
            />
            <button type="submit" disabled={loading} className="btn-full-mobile" style={{
              padding: '0.9rem 2rem',
              minHeight: '44px',
              fontSize: '1rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              {loading ? 'Scanning Target...' : 'Execute Scan'}
            </button>
          </form>
        </div>

        {results && <AnalysisResults results={results} />}
      </main>
    </div>
  );
}
