import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
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
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', border: '#e3b341' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.15)', border: '#388bfd' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.15)', border: '#39d353' },
};

export default function SSLScanner() {
  const { authTokens } = useContext(AuthContext);
  const [target, setTarget] = useState('');
  const [port, setPort] = useState(443);
  const [scanning, setScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/ssl-scanner/history/`, {
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
    if (!target.trim()) {
      setErrorMsg('Please enter a target domain or URL.');
      return;
    }

    setScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/ssl-scanner/scan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({ target: target.trim(), port: parseInt(port) || 443 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.target?.[0] || data.error || 'Failed to scan SSL certificate.');
      }
      setCurrentResult(data);
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setScanning(false);
    }
  };

  const quickScan = (sampleDomain, samplePort = 443) => {
    setTarget(sampleDomain);
    setPort(samplePort);
  };

  const filteredHistory = history.filter(item => {
    const matchesDomain = (item.domain || item.target || '').toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || item.certificate_status === filterStatus;
    return matchesDomain && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔒</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              SSL / TLS Certificate Scanner
            </h1>
          </div>
          <p style={{ color: '#8b949e', fontSize: '0.95rem', margin: 0 }}>
            Inspect SSL/TLS certificates, expiry dates, cryptographic cipher suites, protocol versions, and potential security vulnerabilities.
          </p>
        </div>

        {/* Scan Input Card */}
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
              <div style={{ flex: '1 1 400px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Target Domain or URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. google.com or https://api.stripe.com"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
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

              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Port
                </label>
                <input
                  type="number"
                  placeholder="443"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
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
                    background: scanning ? '#21262d' : 'linear-gradient(135deg, #1f6feb 0%, #1158c7 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(31,111,235,0.3)'
                  }}
                >
                  {scanning ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Scanning TLS...
                    </>
                  ) : (
                    <>🔍 Scan Certificate</>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick chips */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6e7681', fontWeight: 600 }}>Quick Targets:</span>
            {['google.com', 'github.com', 'cloudflare.com', 'expired.badssl.com', 'self-signed.badssl.com'].map(chip => (
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

        {/* Current Result Details */}
        {currentResult && (
          <div style={{
            background: 'rgba(22, 27, 34, 0.95)',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '1.75rem',
            marginBottom: '2.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            {/* Header / Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #21262d', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
                    {currentResult.domain}
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: '#8b949e', background: '#0d1117', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #30363d' }}>
                    Port {currentResult.port}
                  </span>
                </div>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                  Target: {currentResult.target}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {/* Cert Status Badge */}
                {(() => {
                  const s = CERT_STATUS_STYLES[currentResult.certificate_status] || CERT_STATUS_STYLES.UNAVAILABLE;
                  return (
                    <span style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 800 }}>
                      {currentResult.certificate_status}
                    </span>
                  );
                })()}

                {/* Threat Score Badge */}
                <span style={{
                  color: currentResult.threat_score >= 75 ? '#f85149' : currentResult.threat_score >= 50 ? '#e3b341' : currentResult.threat_score >= 25 ? '#388bfd' : '#39d353',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #30363d',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 800
                }}>
                  Risk Score: {currentResult.threat_score}/100 ({currentResult.severity})
                </span>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Days Remaining</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: (currentResult.days_remaining ?? 0) <= 0 ? '#f85149' : (currentResult.days_remaining ?? 0) <= 30 ? '#e3b341' : '#39d353' }}>
                  {currentResult.days_remaining !== null ? `${currentResult.days_remaining} Days` : 'N/A'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Protocol Version</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.tls_version === 'TLSv1.3' ? '#39d353' : currentResult.tls_version === 'TLSv1.2' ? '#388bfd' : '#f85149' }}>
                  {currentResult.tls_version || 'Unknown'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Cipher & Bits</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#f0f6fc', wordBreak: 'break-all' }}>
                  {currentResult.cipher_name || 'Unknown'} ({currentResult.cipher_bits} bits)
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Hostname Match</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.hostname_valid ? '#39d353' : '#f85149' }}>
                  {currentResult.hostname_valid ? '✅ Valid Match' : '❌ Mismatch'}
                </div>
              </div>
            </div>

            {/* Certificate Details Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f6fc', marginTop: 0, marginBottom: '0.75rem' }}>
                  📜 Subject & Issuer
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: '#8b949e' }}>Subject CN:</span> <span style={{ color: '#f0f6fc', fontWeight: 600 }}>{currentResult.subject_cn || 'N/A'}</span></div>
                  <div><span style={{ color: '#8b949e' }}>Issuer CA:</span> <span style={{ color: '#58a6ff', fontWeight: 600 }}>{currentResult.issuer_cn || 'N/A'}</span></div>
                  <div><span style={{ color: '#8b949e' }}>Valid From:</span> <span style={{ color: '#c9d1d9' }}>{currentResult.valid_from ? new Date(currentResult.valid_from).toUTCString() : 'N/A'}</span></div>
                  <div><span style={{ color: '#8b949e' }}>Valid Until:</span> <span style={{ color: '#c9d1d9' }}>{currentResult.valid_until ? new Date(currentResult.valid_until).toUTCString() : 'N/A'}</span></div>
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f6fc', marginTop: 0, marginBottom: '0.75rem' }}>
                  🌐 Subject Alternative Names (SAN)
                </h3>
                {currentResult.san_list?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                    {currentResult.san_list.map((san, idx) => (
                      <span key={idx} style={{ background: 'rgba(56,139,253,0.1)', border: '1px solid rgba(56,139,253,0.3)', color: '#58a6ff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {san}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>No SAN records declared.</span>
                )}
              </div>
            </div>

            {/* Security Issues / Warnings */}
            {currentResult.security_issues?.length > 0 ? (
              <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f85149', marginTop: 0, marginBottom: '0.75rem' }}>
                  ⚠️ Security Findings ({currentResult.security_issues.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {currentResult.security_issues.map((issue, idx) => {
                    const sevStyle = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.LOW;
                    return (
                      <div key={idx} style={{ borderLeft: `3px solid ${sevStyle.color}`, background: 'rgba(22, 27, 34, 0.6)', padding: '0.75rem 1rem', borderRadius: '0 6px 6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: sevStyle.color, fontWeight: 700, fontSize: '0.8rem' }}>{issue.severity}</span>
                          <span style={{ color: '#f0f6fc', fontWeight: 600, fontSize: '0.85rem' }}>{issue.type}</span>
                        </div>
                        <div style={{ color: '#8b949e', fontSize: '0.82rem' }}>{issue.description}</div>
                        {issue.remediation && (
                          <div style={{ color: '#58a6ff', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                            💡 Fix: {issue.remediation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(57,211,83,0.08)', border: '1px solid rgba(57,211,83,0.3)', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', color: '#39d353', fontSize: '0.88rem' }}>
                ✅ No security issues detected. Certificate chain, cipher suite, and TLS version meet modern security baselines.
              </div>
            )}

            {/* Collapsible Raw Structured Evidence */}
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
              📜 Your SSL Scan History
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter domains..."
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
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
                <option value="ALL">All Statuses</option>
                <option value="VALID">Valid</option>
                <option value="EXPIRING_SOON">Expiring Soon</option>
                <option value="EXPIRED">Expired</option>
                <option value="HOSTNAME_MISMATCH">Mismatch</option>
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>Loading scan history...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', fontSize: '0.9rem' }}>
              No SSL scans recorded yet. Enter a domain above to perform your first scan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.75rem' }}>Target / Domain</th>
                    <th style={{ padding: '0.75rem' }}>Port</th>
                    <th style={{ padding: '0.75rem' }}>Cert Status</th>
                    <th style={{ padding: '0.75rem' }}>Days Left</th>
                    <th style={{ padding: '0.75rem' }}>TLS Version</th>
                    <th style={{ padding: '0.75rem' }}>Risk Score</th>
                    <th style={{ padding: '0.75rem' }}>Scanned At</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(row => {
                    const statusBadge = CERT_STATUS_STYLES[row.certificate_status] || CERT_STATUS_STYLES.UNAVAILABLE;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#f0f6fc' }}>{row.domain || row.target}</td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>{row.port}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: statusBadge.color, background: statusBadge.bg, border: `1px solid ${statusBadge.border}`, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {row.certificate_status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: (row.days_remaining ?? 0) <= 0 ? '#f85149' : (row.days_remaining ?? 0) <= 30 ? '#e3b341' : '#c9d1d9' }}>
                          {row.days_remaining !== null ? `${row.days_remaining}d` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>{row.tls_version}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: row.threat_score >= 75 ? '#f85149' : row.threat_score >= 50 ? '#e3b341' : '#39d353', fontWeight: 700 }}>
                            {row.threat_score}/100
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
