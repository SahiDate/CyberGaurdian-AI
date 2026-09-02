import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';

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
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
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
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              🌐 SOC Platform URL & Destination Inspector
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Platform-wide URL security telemetry, redirect chain analysis, SSRF containment, and correlated threat intelligence.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="glass-panel"
            style={{
              padding: '0.55rem 1.1rem',
              background: 'rgba(56,139,253,0.15)',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
          >
            🔄 Refresh Analytics
          </button>
        </div>

        {/* Real DB Analytics Stats Cards */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total URL Scans</div>
              <div style={{ color: 'var(--text-main)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_scans}</div>
              <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>+{analytics.scans_today} today</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Threats Detected</div>
              <div style={{ color: 'var(--danger-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.threats_detected}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Medium / High / Critical</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid #ff7b72', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#ff7b72', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SSRF Blocks</div>
              <div style={{ color: '#ff7b72', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.ssrf_blocked_count}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Restricted IP attempts blocked</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Redirect Chains</div>
              <div style={{ color: 'var(--warning-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.redirect_chains_count}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Multi-hop destinations</div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search URL, hostname, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-panel"
            style={{
              flex: '1 1 280px',
              padding: '0.65rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />

          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="glass-panel"
            style={{
              padding: '0.65rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
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
            className="glass-panel"
            style={{
              padding: '0.65rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
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
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>Loading platform URL telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No URL scan records match current criteria.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>User / Account</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>URL / Hostname</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Scheme</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>HTTP</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Redirects</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Threat Score</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Severity</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Scanned At</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const sevBadge = SEVERITY_STYLES[row.severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                          {row.username || `User #${row.user_id}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.normalized_url || row.original_url}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {row.scheme}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: row.http_status === 200 ? 'var(--success-color)' : 'var(--warning-color)', fontWeight: 700 }}>
                          {row.http_status || 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {row.redirect_count}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: row.threat_score >= 75 ? 'var(--danger-color)' : row.threat_score >= 50 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ color: sevBadge.color, background: sevBadge.bg, border: `1px solid ${sevBadge.border}`, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {row.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: row.status === 'SUCCESS' ? 'var(--success-color)' : 'var(--danger-color)', fontSize: '0.78rem', fontWeight: 600 }}>
                          {row.status}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            onClick={() => setSelectedScan(row)}
                            className="glass-panel"
                            style={{
                              background: 'rgba(56,139,253,0.15)',
                              border: '1px solid var(--accent-color)',
                              borderRadius: '6px',
                              color: 'var(--accent-color)',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 700
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
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              border: '1px solid var(--accent-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, wordBreak: 'break-all' }}>
                    URL Investigation: {selectedScan.hostname}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{selectedScan.username}</span> | Original: {selectedScan.original_url}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScan(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>

              {/* URL & HTTP Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Normalized URL:</span> <span style={{ color: 'var(--text-main)', wordBreak: 'break-all', fontWeight: 600 }}>{selectedScan.normalized_url}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Final Destination:</span> <span style={{ color: 'var(--accent-color)', wordBreak: 'break-all', fontWeight: 600 }}>{selectedScan.final_url || selectedScan.normalized_url}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Domain:</span> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedScan.domain}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Resolved IP:</span> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedScan.primary_ip || 'N/A'}</span></div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>HTTP Status:</span> <span style={{ color: selectedScan.http_status === 200 ? 'var(--success-color)' : 'var(--warning-color)', fontWeight: 700 }}>{selectedScan.http_status || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Content-Type:</span> <span style={{ color: 'var(--text-main)' }}>{selectedScan.content_type || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Server Banner:</span> <span style={{ color: 'var(--text-main)' }}>{selectedScan.server || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Redirect Count:</span> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedScan.redirect_count} Hops</span></div>
                </div>
              </div>

              {/* Redirect Chain */}
              {selectedScan.redirect_chain?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Redirect Chain ({selectedScan.redirect_chain.length} Hops)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedScan.redirect_chain.map((hop, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--warning-color)', fontWeight: 700 }}>[{hop.status_code}]</span>
                        <span style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>{hop.from_url}</span>
                        <span style={{ color: 'var(--accent-color)' }}>➔</span>
                        <span style={{ color: 'var(--text-main)', wordBreak: 'break-all', fontWeight: 600 }}>{hop.to_url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicators */}
              {selectedScan.indicators?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger-color)', marginBottom: '0.5rem' }}>
                    Observed Indicators ({selectedScan.indicators.length})
                  </div>
                  {selectedScan.indicators.map((ind, idx) => (
                    <div key={idx} className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', padding: '0.75rem 1rem', marginBottom: '0.5rem', borderRadius: '0 8px 8px 0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ind.type} ({ind.severity})</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>{ind.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Structured JSON */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Structured SOC Evidence</div>
                <pre className="glass-panel" style={{ borderRadius: '8px', padding: '1rem', color: 'var(--success-color)', fontSize: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {JSON.stringify(selectedScan.structured_evidence || selectedScan, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminSidebar>
  );
}
