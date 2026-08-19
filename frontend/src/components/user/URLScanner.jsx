import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SEVERITY_STYLES = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', border: '#e3b341' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.15)', border: '#388bfd' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.15)', border: '#39d353' },
};

export default function URLScanner() {
  const { authTokens } = useContext(AuthContext);
  const [urlInput, setUrlInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterSev, setFilterSev] = useState('ALL');
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/url-scanner/history/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Please enter a valid URL to scan.');
      return;
    }

    setScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/url-scanner/scan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({ url: urlInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.url?.[0] || data.error || 'Failed to analyze URL.');
      }
      setCurrentResult(data);
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setScanning(false);
    }
  };

  const quickScan = (sampleUrl) => {
    setUrlInput(sampleUrl);
  };

  const filteredHistory = history.filter(item => {
    const term = filterQuery.toLowerCase();
    const matchesUrl =
      (item.original_url || '').toLowerCase().includes(term) ||
      (item.normalized_url || '').toLowerCase().includes(term) ||
      (item.hostname || '').toLowerCase().includes(term) ||
      (item.domain || '').toLowerCase().includes(term);

    const matchesSev = filterSev === 'ALL' || item.severity?.toUpperCase() === filterSev;
    return matchesUrl && matchesSev;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔗</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              Defensive URL Security Scanner
            </h1>
          </div>
          <p style={{ color: '#8b949e', fontSize: '0.95rem', margin: 0 }}>
            Comprehensive analysis of web destinations, multi-hop redirect chains, HTTP security headers, correlated TLS/WHOIS posture, and threat intelligence.
          </p>
        </div>

        {/* Input Card */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '12px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)',
          marginBottom: '2rem'
        }}>
          <form onSubmit={handleScan}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 500px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Target Web URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/login?redirect=portal"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#f0f6fc',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={scanning}
                  style={{
                    padding: '0.75rem 1.75rem',
                    background: scanning ? '#21262d' : 'linear-gradient(135deg, #1f6feb 0%, #8957e5 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(137,87,229,0.3)'
                  }}
                >
                  {scanning ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Analyzing URL...
                    </>
                  ) : (
                    <>🔍 Scan URL</>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick chips */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6e7681', fontWeight: 600 }}>Quick Targets:</span>
            {[
              'https://github.com',
              'https://google.com',
              'https://bit.ly/3xYzaBc',
              'https://expired.badssl.com',
              'http://198.51.100.4/login'
            ].map(chip => (
              <button
                key={chip}
                onClick={() => quickScan(chip)}
                style={{
                  background: 'rgba(48, 54, 61, 0.4)',
                  border: '1px solid #30363d',
                  borderRadius: '16px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.75rem',
                  color: '#8b949e',
                  cursor: 'pointer'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', borderRadius: '8px', color: '#ff7b72', fontSize: '0.88rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Current Result Card */}
        {currentResult && (
          <div style={{
            background: 'rgba(22, 27, 34, 0.95)',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '1.75rem',
            marginBottom: '2.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #21262d', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', background: '#21262d', color: '#58a6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                    {currentResult.scheme?.toUpperCase()}
                  </span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f0f6fc', margin: 0, wordBreak: 'break-all' }}>
                    {currentResult.normalized_url}
                  </h2>
                </div>
                {currentResult.final_url && currentResult.final_url !== currentResult.normalized_url && (
                  <div style={{ color: '#e3b341', fontSize: '0.85rem', marginTop: '0.4rem', wordBreak: 'break-all' }}>
                    ↪️ Final Destination: <strong>{currentResult.final_url}</strong>
                  </div>
                )}
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                  Domain: <strong>{currentResult.domain}</strong> | Resolved IP: <strong>{currentResult.primary_ip || 'N/A'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <span style={{
                  color: currentResult.threat_score >= 75 ? '#f85149' : currentResult.threat_score >= 50 ? '#e3b341' : currentResult.threat_score >= 25 ? '#388bfd' : '#39d353',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #30363d',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 800
                }}>
                  Risk Score: {currentResult.threat_score}/100 ({currentResult.severity})
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>HTTP Status</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.http_status === 200 ? '#39d353' : currentResult.http_status ? '#e3b341' : '#f85149' }}>
                  {currentResult.http_status ? `${currentResult.http_status}` : 'Connection Failed'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Redirects</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.redirect_count > 2 ? '#e3b341' : '#f0f6fc' }}>
                  {currentResult.redirect_count} Hops
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>SSL / TLS Status</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.ssl_result?.certificate_status === 'VALID' ? '#39d353' : '#e3b341' }}>
                  {currentResult.ssl_result?.certificate_status || 'NOT_APPLICABLE'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>WHOIS Age</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.whois_result?.age_category === 'NEW' ? '#e3b341' : '#58a6ff' }}>
                  {currentResult.whois_result?.age_category || 'UNKNOWN'}
                </div>
              </div>
            </div>

            {/* Redirect Chain Visualization */}
            {currentResult.redirect_chain?.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f6fc', marginTop: 0, marginBottom: '0.75rem' }}>
                  🔀 Multi-Hop Redirect Chain ({currentResult.redirect_chain.length} Hops)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {currentResult.redirect_chain.map((hop, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', background: 'rgba(22,27,34,0.6)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <span style={{ background: '#21262d', color: '#e3b341', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        {hop.status_code}
                      </span>
                      <span style={{ color: '#8b949e', wordBreak: 'break-all' }}>{hop.from_url}</span>
                      <span style={{ color: '#58a6ff' }}>➔</span>
                      <span style={{ color: '#f0f6fc', fontWeight: 600, wordBreak: 'break-all' }}>{hop.to_url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Findings & Indicators */}
            {currentResult.indicators?.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f85149', marginTop: 0, marginBottom: '0.75rem' }}>
                  ⚠️ Security Observations & URL Indicators ({currentResult.indicators.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {currentResult.indicators.map((ind, idx) => {
                    const sevStyle = SEVERITY_STYLES[ind.severity] || SEVERITY_STYLES.LOW;
                    return (
                      <div key={idx} style={{ borderLeft: `3px solid ${sevStyle.color}`, background: 'rgba(22, 27, 34, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '0 6px 6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: sevStyle.color, fontWeight: 700, fontSize: '0.78rem' }}>{ind.severity}</span>
                          <span style={{ color: '#f0f6fc', fontWeight: 600, fontSize: '0.85rem' }}>{ind.type}</span>
                        </div>
                        <div style={{ color: '#8b949e', fontSize: '0.8rem', marginTop: '0.2rem' }}>{ind.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actionable Recommendations */}
            {currentResult.recommendations?.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#58a6ff', marginTop: 0, marginBottom: '0.75rem' }}>
                  💡 Security Recommendations
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#c9d1d9', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {currentResult.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collapsible Structured Evidence */}
            <div>
              <button
                onClick={() => setShowJson(!showJson)}
                style={{
                  background: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#8b949e',
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer'
                }}
              >
                {showJson ? '▲ Hide Structured Evidence' : '▼ View Structured SOC Evidence'}
              </button>
              {showJson && (
                <pre style={{
                  background: '#010409',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#7ee787',
                  fontSize: '0.78rem',
                  overflowX: 'auto',
                  marginTop: '0.75rem',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(currentResult.structured_evidence || currentResult, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Scan History Table */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f0f6fc', margin: 0 }}>
              📜 Your URL Scan History
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter history..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <select
                value={filterSev}
                onChange={(e) => setFilterSev(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>Loading URL scan history...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', fontSize: '0.9rem' }}>
              No URL scans recorded yet. Enter a URL above to perform your first scan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.75rem' }}>URL / Hostname</th>
                    <th style={{ padding: '0.75rem' }}>HTTP</th>
                    <th style={{ padding: '0.75rem' }}>Redirects</th>
                    <th style={{ padding: '0.75rem' }}>Risk Score</th>
                    <th style={{ padding: '0.75rem' }}>Severity</th>
                    <th style={{ padding: '0.75rem' }}>Scanned At</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(row => {
                    const sevStyle = SEVERITY_STYLES[row.severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#f0f6fc', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.normalized_url || row.original_url}
                        </td>
                        <td style={{ padding: '0.75rem', color: row.http_status === 200 ? '#39d353' : '#8b949e' }}>
                          {row.http_status || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>
                          {row.redirect_count}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: row.threat_score >= 75 ? '#f85149' : row.threat_score >= 50 ? '#e3b341' : '#39d353' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: sevStyle.color, background: sevStyle.bg, border: `1px solid ${sevStyle.border}`, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {row.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => setCurrentResult(row)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #30363d',
                              borderRadius: '4px',
                              color: '#58a6ff',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
