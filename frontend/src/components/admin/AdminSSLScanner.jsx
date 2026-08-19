import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const CERT_STATUS_STYLES = {
  VALID:             { color: '#39d353', bg: 'rgba(57,211,83,0.15)', border: '#39d353' },
  EXPIRING_SOON:     { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', border: '#e3b341' },
  EXPIRED:           { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149' },
  NOT_YET_VALID:     { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149' },
  HOSTNAME_MISMATCH: { color: '#ff7b72', bg: 'rgba(255,123,114,0.15)', border: '#ff7b72' },
  INVALID:           { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149' },
  UNAVAILABLE:       { color: '#8b949e', bg: 'rgba(139,148,158,0.15)', border: '#8b949e' },
};

const SEVERITY_STYLES = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: '#f85149' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: '#e3b341' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.12)', border: '#388bfd' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.12)', border: '#39d353' },
};

export default function AdminSSLScanner() {
  const { authTokens } = useContext(AuthContext);
  const [scans, setScans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [selectedScan, setSelectedScan] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/ssl-scanner/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        }),
        fetch(`${API}/api/admin/ssl-scanner/analytics/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        })
      ]);

      if (listRes.ok) setScans(await listRes.json());
      if (statsRes.ok) setAnalytics(await statsRes.json());
    } catch (e) {
      console.error("Error fetching admin SSL data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = scans.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch =
      (s.domain || '').toLowerCase().includes(term) ||
      (s.target || '').toLowerCase().includes(term) ||
      (s.issuer_cn || '').toLowerCase().includes(term) ||
      (s.username || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || s.certificate_status === statusFilter;
    const matchesSev = sevFilter === 'ALL' || s.severity?.toUpperCase() === sevFilter;

    return matchesSearch && matchesStatus && matchesSev;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              🛡️ SOC Platform SSL / TLS Inspector
            </h1>
            <p style={{ color: '#8b949e', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Platform-wide TLS certificate posture, expiration telemetry, and cryptographic vulnerabilities.
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
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total SSL Scans</div>
              <div style={{ color: '#f0f6fc', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_scans}</div>
              <div style={{ color: '#58a6ff', fontSize: '0.75rem', marginTop: '0.25rem' }}>+{analytics.scans_today} today</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Expired Certs</div>
              <div style={{ color: '#f85149', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expired_certs}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Requires immediate renewal</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Expiring &lt; 30 Days</div>
              <div style={{ color: '#e3b341', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expiring_soon}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Proactive alert flagged</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Hostname Mismatches</div>
              <div style={{ color: '#ff7b72', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.hostname_mismatches}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Potential MITM / config error</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Valid Certificates</div>
              <div style={{ color: '#39d353', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.valid_certs}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Healthy posture</div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search domain, issuer, user..."
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
            <option value="ALL">All Cert Statuses</option>
            <option value="VALID">Valid</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="HOSTNAME_MISMATCH">Hostname Mismatch</option>
          </select>

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
        </div>

        {/* Platform-wide Scans Table */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>Loading platform SSL telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>No SSL scan records match current criteria.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.85rem' }}>User / Account</th>
                    <th style={{ padding: '0.85rem' }}>Domain & Port</th>
                    <th style={{ padding: '0.85rem' }}>Certificate Status</th>
                    <th style={{ padding: '0.85rem' }}>Days Left</th>
                    <th style={{ padding: '0.85rem' }}>Issuer CA</th>
                    <th style={{ padding: '0.85rem' }}>TLS & Cipher</th>
                    <th style={{ padding: '0.85rem' }}>Threat Score</th>
                    <th style={{ padding: '0.85rem' }}>Severity</th>
                    <th style={{ padding: '0.85rem' }}>Scanned At</th>
                    <th style={{ padding: '0.85rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const statusBadge = CERT_STATUS_STYLES[row.certificate_status] || CERT_STATUS_STYLES.UNAVAILABLE;
                    const sevBadge = SEVERITY_STYLES[row.severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '0.85rem', color: '#58a6ff', fontWeight: 600 }}>
                          {row.username || `User #${row.user_id}`}
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 700, color: '#f0f6fc' }}>
                          {row.domain}:{row.port}
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{ color: statusBadge.color, background: statusBadge.bg, border: `1px solid ${statusBadge.border}`, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {row.certificate_status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem', color: (row.days_remaining ?? 0) <= 0 ? '#f85149' : (row.days_remaining ?? 0) <= 30 ? '#e3b341' : '#c9d1d9' }}>
                          {row.days_remaining !== null ? `${row.days_remaining}d` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.issuer_cn || 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e', fontSize: '0.8rem' }}>
                          {row.tls_version}
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 800, color: row.threat_score >= 75 ? '#f85149' : row.threat_score >= 50 ? '#e3b341' : '#39d353' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{ color: sevBadge.color, background: sevBadge.bg, border: `1px solid ${sevBadge.border}`, padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {row.severity}
                          </span>
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
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
                    SSL Investigation: {selectedScan.domain}:{selectedScan.port}
                  </h2>
                  <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: '#58a6ff' }}>{selectedScan.username}</span> | Target: {selectedScan.target}
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

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ color: '#8b949e' }}>Subject CN:</div>
                  <div style={{ color: '#f0f6fc', fontWeight: 600 }}>{selectedScan.subject_cn || 'N/A'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>Issuer CA:</div>
                  <div style={{ color: '#58a6ff', fontWeight: 600 }}>{selectedScan.issuer_cn || 'N/A'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>TLS Version:</div>
                  <div style={{ color: '#f0f6fc' }}>{selectedScan.tls_version}</div>
                </div>

                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ color: '#8b949e' }}>Valid From:</div>
                  <div style={{ color: '#c9d1d9' }}>{selectedScan.valid_from ? new Date(selectedScan.valid_from).toUTCString() : 'N/A'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>Valid Until:</div>
                  <div style={{ color: '#c9d1d9' }}>{selectedScan.valid_until ? new Date(selectedScan.valid_until).toUTCString() : 'N/A'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>Cipher:</div>
                  <div style={{ color: '#f0f6fc' }}>{selectedScan.cipher_name} ({selectedScan.cipher_bits} bits)</div>
                </div>
              </div>

              {/* SAN List */}
              {selectedScan.san_list?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6fc', marginBottom: '0.5rem' }}>
                    SANs ({selectedScan.san_list.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '100px', overflowY: 'auto' }}>
                    {selectedScan.san_list.map((san, idx) => (
                      <span key={idx} style={{ background: '#0d1117', border: '1px solid #30363d', color: '#58a6ff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {san}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {selectedScan.security_issues?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f85149', marginBottom: '0.5rem' }}>
                    Security Findings ({selectedScan.security_issues.length})
                  </div>
                  {selectedScan.security_issues.map((issue, idx) => (
                    <div key={idx} style={{ background: '#0d1117', borderLeft: '3px solid #f85149', padding: '0.65rem 0.85rem', marginBottom: '0.5rem', borderRadius: '0 6px 6px 0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: '#f0f6fc' }}>{issue.type} ({issue.severity})</div>
                      <div style={{ color: '#8b949e' }}>{issue.description}</div>
                      {issue.remediation && <div style={{ color: '#58a6ff', fontSize: '0.78rem', marginTop: '0.2rem' }}>Fix: {issue.remediation}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* JSON */}
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
