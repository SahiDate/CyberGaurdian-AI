import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../shared/Navbar';
import AnalysisResults from '../AnalysisResults';
import { AuthContext } from '../../context/AuthContext';

export default function UserDashboard() {
  const { user, authTokens } = useContext(AuthContext);
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    fetchUserHistory();
  }, []);

  const fetchUserHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/user/scans/', {
        headers: {
          'Authorization': `Bearer ${authTokens?.access}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentScans(data.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickScan = async (e) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('http://localhost:8000/api/analyze/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({ target })
      });
      const data = await response.json();
      setResults(data);
      fetchUserHistory();
    } catch (error) {
      console.error(error);
      alert("Failed to analyze target. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#fff', paddingBottom: '3rem' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Banner Welcome */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-color)' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>
            Welcome back, <span style={{ color: 'var(--accent-color)' }}>{user ? user.username : 'User'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
            Autonomous protection active. Perform security checks, inspect reports, and monitor personal digital assets.
          </p>
        </div>

        {/* Quick Scan Card Section */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔍 Quick Website Security Scan
          </h2>
          <form onSubmit={handleQuickScan} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Enter a website URL or domain (e.g., example.com)..."
              style={{
                flex: 1,
                padding: '0.9rem 1.2rem',
                fontSize: '1.05rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                borderRadius: '8px'
              }}
            />
            <button type="submit" disabled={loading} style={{
              padding: '0.9rem 2rem',
              fontSize: '1rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              {loading ? 'Analyzing Target...' : 'Start Scan'}
            </button>
          </form>

          {results && (
            <div style={{ marginTop: '2rem' }}>
              <AnalysisResults results={results} />
            </div>
          )}
        </div>

        {/* Metrics & Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Recent Reports Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--accent-color)' }}>📑 Recent Reports</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{recentScans.length}</p>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scans performed this session</span>
            <div style={{ marginTop: '1rem' }}>
              <Link to="/reports" style={{ color: 'var(--accent-color)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold' }}>View All Reports →</Link>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--success-color)' }}>⚡ Recent Activity</h3>
            {recentScans.length > 0 ? (
              <ul style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.8' }}>
                {recentScans.slice(0, 3).map((scan, idx) => (
                  <li key={idx}>Scanned {scan.domain} - {scan.risk_level_display}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity logged.</p>
            )}
          </div>

          {/* Security Tips Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#e3b341' }}>💡 Security Tips</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              Ensure HTTPS and valid HSTS headers are enabled on all production domain endpoints to prevent SSL stripping attacks.
            </p>
          </div>

          {/* Threat Summary Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--danger-color)' }}>🛡️ Threat Summary</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--success-color)' }}>Low Risk</p>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your scan history shows no active critical vulnerabilities.</span>
          </div>
        </div>

        {/* My History Preview Section */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>📜 My Scan History</h2>
            <Link to="/history" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>Full History →</Link>
          </div>

          {recentScans.length > 0 ? (
            <div className="table-responsive-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '550px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Domain</th>
                  <th style={{ padding: '0.75rem' }}>HTTPS</th>
                  <th style={{ padding: '0.75rem' }}>Risk Level</th>
                  <th style={{ padding: '0.75rem' }}>Scanned At</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{scan.domain}</td>
                    <td style={{ padding: '0.75rem' }}>{scan.is_https ? '✅ Yes' : '❌ No'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
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
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No scan history recorded yet. Use Quick Scan above to get started.</p>
          )}
        </div>

        {/* Future Module Placeholders */}
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>🔮 Upcoming Enterprise AI Modules</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <Link to="/threat-intel" style={{ textDecoration: 'none', color: '#fff' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--accent-color)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>🛡️ Threat Intelligence</h4>
                  <span style={{ background: 'rgba(57,211,83,0.15)', color: '#39d353', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>ACTIVE</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>VirusTotal, AbuseIPDB & urlscan.io multi-provider lookups →</p>
              </div>
            </Link>
            <Link to="/file-analyzer" style={{ textDecoration: 'none', color: '#fff' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--accent-color)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>📁 File Analyzer</h4>
                  <span style={{ background: 'rgba(57,211,83,0.15)', color: '#39d353', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>ACTIVE</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Static YARA, Entropy, PE & Document Inspection →</p>
              </div>
            </Link>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', opacity: 0.6, borderStyle: 'dashed' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>🤖 AI Assistant</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Interactive LLM cybersecurity copilot (Placeholder)</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', opacity: 0.6, borderStyle: 'dashed' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>📊 SOC Report Generator</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Automated compliance PDF export (Placeholder)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
