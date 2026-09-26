import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';

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
  const [newTarget, setNewTarget] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const handleSyncUserActions = async () => {
    setSyncing(true);
    try {
      await fetch(`${API}/api/admin/ssl-scanner/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({ action: 'sync_user_actions' })
      });
      await fetchData();
    } catch (e) {
      console.error("Error syncing user actions:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleAdminScan = async (e) => {
    if (e) e.preventDefault();
    if (!newTarget.trim()) return;
    setInspecting(true);
    try {
      const res = await fetch(`${API}/api/admin/ssl-scanner/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({ target: newTarget.trim(), port: 443 })
      });
      if (res.ok) {
        setNewTarget('');
        await fetchData();
      }
    } catch (e) {
      console.error("Error running admin SSL scan:", e);
    } finally {
      setInspecting(false);
    }
  };

  const fetchData = async () => {
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
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              🛡️ SOC Platform SSL / TLS Inspector
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Platform-wide TLS certificate posture, expiration telemetry, and cryptographic vulnerabilities.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleSyncUserActions}
              disabled={syncing}
              className="glass-panel"
              style={{
                padding: '0.55rem 1.1rem',
                background: 'rgba(57,211,83,0.15)',
                border: '1px solid var(--success-color)',
                color: 'var(--success-color)',
                borderRadius: '8px',
                cursor: syncing ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}
            >
              {syncing ? '⏳ Syncing Users...' : '⚡ Ingest User Telemetry'}
            </button>
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
        </div>

        {/* Real DB Analytics Stats Cards */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total SSL Scans</div>
              <div style={{ color: 'var(--text-main)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_scans}</div>
              <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>+{analytics.scans_today} today</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expired Certs</div>
              <div style={{ color: 'var(--danger-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expired_certs}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Requires immediate renewal</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expiring &lt; 30 Days</div>
              <div style={{ color: 'var(--warning-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expiring_soon}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Proactive alert flagged</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid #ff7b72', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#ff7b72', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hostname Mismatches</div>
              <div style={{ color: '#ff7b72', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.hostname_mismatches}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Potential MITM / config error</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--success-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valid Certificates</div>
              <div style={{ color: 'var(--success-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.valid_certs}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Healthy posture</div>
            </div>
          </div>
        )}

        {/* Admin Live Target Inspector Bar */}
        <form onSubmit={handleAdminScan} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Inspect any target domain (e.g. google.com or badssl.com)..."
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="glass-panel"
            style={{
              flex: '1 1 320px',
              padding: '0.7rem 1.1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={inspecting || !newTarget.trim()}
            style={{
              padding: '0.7rem 1.5rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: inspecting || !newTarget.trim() ? 'not-allowed' : 'pointer',
              opacity: inspecting || !newTarget.trim() ? 0.6 : 1
            }}
          >
            {inspecting ? '🔍 Inspecting TLS...' : '🚀 Inspect SSL Target'}
          </button>
        </form>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search domain, issuer, user..."
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
            <option value="ALL">All Cert Statuses</option>
            <option value="VALID">Valid</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="HOSTNAME_MISMATCH">Hostname Mismatch</option>
          </select>

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
        </div>

        {/* Platform-wide Scans Table */}
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>Loading platform SSL telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No SSL scan records match current criteria.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>User / Account</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Domain & Port</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Certificate Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Days Left</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Issuer CA</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>TLS & Cipher</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Threat Score</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Severity</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Scanned At</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const statusBadge = CERT_STATUS_STYLES[row.certificate_status] || CERT_STATUS_STYLES.UNAVAILABLE;
                    const sevBadge = SEVERITY_STYLES[row.severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                          {row.username || `User #${row.user_id}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {row.domain}:{row.port}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ color: statusBadge.color, background: statusBadge.bg, border: `1px solid ${statusBadge.border}`, padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.73rem', fontWeight: 700 }}>
                            {row.certificate_status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: (row.days_remaining ?? 0) <= 0 ? 'var(--danger-color)' : (row.days_remaining ?? 0) <= 30 ? 'var(--warning-color)' : 'var(--text-main)' }}>
                          {row.days_remaining !== null ? `${row.days_remaining}d` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.issuer_cn || 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {row.tls_version}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: row.threat_score >= 75 ? 'var(--danger-color)' : row.threat_score >= 50 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ color: sevBadge.color, background: sevBadge.bg, border: `1px solid ${sevBadge.border}`, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {row.severity}
                          </span>
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
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              border: '1px solid var(--accent-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    SSL Investigation: {selectedScan.domain}:{selectedScan.port}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{selectedScan.username}</span> | Target: {selectedScan.target}
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

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Subject CN:</div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{selectedScan.subject_cn || 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Issuer CA:</div>
                  <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>{selectedScan.issuer_cn || 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>TLS Version:</div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedScan.tls_version}</div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Valid From:</div>
                  <div style={{ color: 'var(--text-main)' }}>{selectedScan.valid_from ? new Date(selectedScan.valid_from).toUTCString() : 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Valid Until:</div>
                  <div style={{ color: 'var(--text-main)' }}>{selectedScan.valid_until ? new Date(selectedScan.valid_until).toUTCString() : 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cipher:</div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedScan.cipher_name} ({selectedScan.cipher_bits} bits)</div>
                </div>
              </div>

              {/* SAN List */}
              {selectedScan.san_list?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    SANs ({selectedScan.san_list.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '100px', overflowY: 'auto' }}>
                    {selectedScan.san_list.map((san, idx) => (
                      <span key={idx} className="glass-panel" style={{ color: 'var(--accent-color)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {san}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {selectedScan.security_issues?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger-color)', marginBottom: '0.5rem' }}>
                    Security Findings ({selectedScan.security_issues.length})
                  </div>
                  {selectedScan.security_issues.map((issue, idx) => (
                    <div key={idx} className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', padding: '0.75rem 1rem', marginBottom: '0.5rem', borderRadius: '0 8px 8px 0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{issue.type} ({issue.severity})</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>{issue.description}</div>
                      {issue.remediation && <div style={{ color: 'var(--accent-color)', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 600 }}>Fix: {issue.remediation}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* JSON */}
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
