import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SEVERITY_STYLES = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: '#f85149' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: '#e3b341' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.12)', border: '#388bfd' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.12)', border: '#39d353' },
};

export default function AdminURLScanner() {
  const { authTokens } = useContext(AuthContext);
  const [scans, setScans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedScan, setSelectedScan] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/url-scanner/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        }),
        fetch(`${API}/api/admin/url-scanner/analytics/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        })
      ]);

      if (listRes.ok) setScans(await listRes.json());
      if (statsRes.ok) setAnalytics(await statsRes.json());
    } catch (e) {
      console.error("Error fetching admin URL scanner data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = scans.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch =
      (s.original_url || '').toLowerCase().includes(term) ||
      (s.normalized_url || '').toLowerCase().includes(term) ||
      (s.hostname || '').toLowerCase().includes(term) ||
      (s.domain || '').toLowerCase().includes(term) ||
      (s.username || '').toLowerCase().includes(term);

    const matchesSev = sevFilter === 'ALL' || s.severity?.toUpperCase() === sevFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesSev && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              🌐 SOC Platform URL & Destination Inspector
            </h1>
            <p style={{ color: '#8b949e', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Platform-wide URL security telemetry, redirect chain analysis, SSRF containment, and correlated threat intelligence.
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              color: '#c9d1d9',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            🔄 Refresh Analytics
          </button>
        </div>

        {/* Real DB Analytics Stats Cards */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total URL Scans</div>
              <div style={{ color: '#f0f6fc', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_scans}</div>
              <div style={{ color: '#58a6ff', fontSize: '0.75rem', marginTop: '0.25rem' }}>+{analytics.scans_today} today</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Threats Detected</div>
              <div style={{ color: '#f85149', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.threats_detected}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Medium / High / Critical</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>SSRF Blocks</div>
              <div style={{ color: '#ff7b72', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.ssrf_blocked_count}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Restricted IP attempts blocked</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Redirect Chains</div>
              <div style={{ color: '#e3b341', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.redirect_chains_count}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Multi-hop destinations</div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search URL, hostname, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 280px',
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '0.85rem'
            }}
          />

          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="SSRF_BLOCKED">SSRF Blocked</option>
            <option value="TIMEOUT">Timeout</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        {/* Platform Scans Table */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>Loading platform URL telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>No URL scan records match current criteria.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.85rem' }}>User / Account</th>
                    <th style={{ padding: '0.85rem' }}>URL / Hostname</th>
                    <th style={{ padding: '0.85rem' }}>Scheme</th>
                    <th style={{ padding: '0.85rem' }}>HTTP</th>
                    <th style={{ padding: '0.85rem' }}>Redirects</th>
                    <th style={{ padding: '0.85rem' }}>Threat Score</th>
                    <th style={{ padding: '0.85rem' }}>Severity</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.85rem' }}>Scanned At</th>
                    <th style={{ padding: '0.85rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const sevBadge = SEVERITY_STYLES[row.severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '0.85rem', color: '#58a6ff', fontWeight: 600 }}>
                          {row.username || `User #${row.user_id}`}
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 700, color: '#f0f6fc', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.normalized_url || row.original_url}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e' }}>
                          {row.scheme}
                        </td>
                        <td style={{ padding: '0.85rem', color: row.http_status === 200 ? '#39d353' : '#e3b341' }}>
                          {row.http_status || 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e' }}>
                          {row.redirect_count}
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 800, color: row.threat_score >= 75 ? '#f85149' : row.threat_score >= 50 ? '#e3b341' : '#39d353' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{ color: sevBadge.color, background: sevBadge.bg, border: `1px solid ${sevBadge.border}`, padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {row.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem', color: row.status === 'SUCCESS' ? '#39d353' : '#f85149', fontSize: '0.78rem' }}>
                          {row.status}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e', fontSize: '0.78rem' }}>
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <button
                            onClick={() => setSelectedScan(row)}
                            style={{
                              background: '#21262d',
                              border: '1px solid #30363d',
                              borderRadius: '4px',
                              color: '#58a6ff',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600
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

        {/* Modal Inspector */}
        {selectedScan && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f0f6fc', margin: 0, wordBreak: 'break-all' }}>
                    URL Investigation: {selectedScan.hostname}
                  </h2>
                  <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: '#58a6ff' }}>{selectedScan.username}</span> | Original: {selectedScan.original_url}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScan(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8b949e',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* URL & HTTP Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                  <div><span style={{ color: '#8b949e' }}>Normalized URL:</span> <span style={{ color: '#f0f6fc', wordBreak: 'break-all' }}>{selectedScan.normalized_url}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#8b949e' }}>Final Destination:</span> <span style={{ color: '#58a6ff', wordBreak: 'break-all' }}>{selectedScan.final_url || selectedScan.normalized_url}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#8b949e' }}>Domain:</span> <span style={{ color: '#f0f6fc' }}>{selectedScan.domain}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#8b949e' }}>Resolved IP:</span> <span style={{ color: '#f0f6fc' }}>{selectedScan.primary_ip || 'N/A'}</span></div>
                </div>

                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                  <div><span style={{ color: '#8b949e' }}>HTTP Status:</span> <span style={{ color: selectedScan.http_status === 200 ? '#39d353' : '#e3b341', fontWeight: 700 }}>{selectedScan.http_status || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#8b949e' }}>Content-Type:</span> <span style={{ color: '#c9d1d9' }}>{selectedScan.content_type || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#8b949e' }}>Server Banner:</span> <span style={{ color: '#c9d1d9' }}>{selectedScan.server || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#8b949e' }}>Redirect Count:</span> <span style={{ color: '#f0f6fc' }}>{selectedScan.redirect_count} Hops</span></div>
                </div>
              </div>

              {/* Redirect Chain */}
              {selectedScan.redirect_chain?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6fc', marginBottom: '0.5rem' }}>
                    Redirect Chain ({selectedScan.redirect_chain.length} Hops)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedScan.redirect_chain.map((hop, idx) => (
                      <div key={idx} style={{ background: '#0d1117', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: '#e3b341', fontWeight: 700 }}>[{hop.status_code}]</span>
                        <span style={{ color: '#8b949e', wordBreak: 'break-all' }}>{hop.from_url}</span>
                        <span style={{ color: '#58a6ff' }}>➔</span>
                        <span style={{ color: '#f0f6fc', wordBreak: 'break-all' }}>{hop.to_url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicators */}
              {selectedScan.indicators?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f85149', marginBottom: '0.5rem' }}>
                    Observed Indicators ({selectedScan.indicators.length})
                  </div>
                  {selectedScan.indicators.map((ind, idx) => (
                    <div key={idx} style={{ background: '#0d1117', borderLeft: '3px solid #f85149', padding: '0.65rem 0.85rem', marginBottom: '0.5rem', borderRadius: '0 6px 6px 0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: '#f0f6fc' }}>{ind.type} ({ind.severity})</div>
                      <div style={{ color: '#8b949e' }}>{ind.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Structured JSON */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6fc', marginBottom: '0.5rem' }}>Structured SOC Evidence</div>
                <pre style={{ background: '#010409', border: '1px solid #30363d', borderRadius: '8px', padding: '1rem', color: '#7ee787', fontSize: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {JSON.stringify(selectedScan.structured_evidence || selectedScan, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
