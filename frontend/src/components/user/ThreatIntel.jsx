import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000';

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', border: '#e3b341' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.15)', border: '#388bfd' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.15)', border: '#39d353' },
};

const TARGET_TYPE_ICONS = {
  DOMAIN: '🌐',
  URL: '🔗',
  IP: '🖥️',
  FILE_HASH: '📁',
};

export default function ThreatIntel() {
  const { authTokens } = useContext(AuthContext);
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState('AUTO');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sevFilter, setSevFilter] = useState('ALL');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/threat-intelligence/history/`, {
        headers: {
          'Authorization': `Bearer ${authTokens?.access}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch threat intel history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!target.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setScanResult(null);

    const payload = {
      target: target.trim(),
    };
    if (targetType !== 'AUTO') {
      payload.target_type = targetType;
    }

    try {
      const response = await fetch(`${API_BASE}/api/threat-intelligence/scan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setScanResult(data);
        fetchHistory(); // Refresh history table
      } else {
        setErrorMsg(data.error || 'Threat intelligence scan failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to backend threat intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered history
  const filteredHistory = history.filter((item) => {
    const matchType = typeFilter === 'ALL' || item.target_type === typeFilter;
    const matchSev = sevFilter === 'ALL' || item.severity === sevFilter;
    const matchSearch = !searchFilter ||
      item.target.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchFilter.toLowerCase());
    return matchType && matchSev && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#fff', paddingBottom: '4rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        {/* Header Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #8b949e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Threat Intelligence Engine
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Query VirusTotal, AbuseIPDB, and urlscan.io in real-time for URLs, Domains, IPs, and SHA-256 File Hashes.
          </p>
        </div>

        {/* Scan Input Card */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2.5rem', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 1.25rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔍 Perform Threat Reputation Lookup
          </h2>

          <form onSubmit={handleScanSubmit}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target (Domain, URL, IP, or SHA-256 Hash)
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. example.com, https://phish.xyz, 8.8.8.8, or 64-character SHA-256 hash"
                  style={{
                    padding: '0.9rem 1.2rem',
                    fontSize: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target Type
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  style={{
                    padding: '0.9rem 1rem',
                    fontSize: '0.95rem',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="AUTO">✨ Auto-Detect</option>
                  <option value="DOMAIN">🌐 Domain</option>
                  <option value="URL">🔗 URL</option>
                  <option value="IP">🖥️ IP Address</option>
                  <option value="FILE_HASH">📁 File Hash</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={loading || !target.trim()}
                  style={{
                    padding: '0.9rem 2.2rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: loading ? 'rgba(56, 139, 253, 0.5)' : 'var(--accent-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading || !target.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(56, 139, 253, 0.3)',
                    transition: 'all 0.2s ease',
                    minWidth: '150px'
                  }}
                >
                  {loading ? 'Querying...' : 'Scan Threat'}
                </button>
              </div>
            </div>
          </form>

          {errorMsg && (
            <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', borderRadius: '8px', background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', color: '#f85149', fontSize: '0.9rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Active Scan Result Display */}
        {scanResult && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2.5rem', border: `1px solid ${SEVERITY_CONFIG[scanResult.severity]?.border || 'var(--border-color)'}` }}>
            
            {/* Top Bar Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{TARGET_TYPE_ICONS[scanResult.target_type] || '🔍'}</span>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#fff', wordBreak: 'break-all' }}>
                    {scanResult.target}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Type: {scanResult.target_type}
                  </span>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Providers: {scanResult.provider}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Scanned: {new Date(scanResult.detected_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Threat Score Gauge Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(0,0,0,0.3)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: SEVERITY_CONFIG[scanResult.severity]?.color || '#fff', lineHeight: 1 }}>
                    {scanResult.threat_score}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Threat Score
                  </span>
                </div>

                <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />

                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: SEVERITY_CONFIG[scanResult.severity]?.bg,
                    color: SEVERITY_CONFIG[scanResult.severity]?.color,
                    border: `1px solid ${SEVERITY_CONFIG[scanResult.severity]?.border}`,
                    letterSpacing: '0.5px'
                  }}>
                    {scanResult.severity}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    Confidence: <strong>{scanResult.confidence}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Breakdown Cards */}
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: 700 }}>
              📊 Multi-Provider Intelligence Results
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {(scanResult.normalized_result?.provider_breakdown || []).map((prov, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                      {prov.provider}
                    </h4>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: prov.status === 'SUCCESS' ? 'rgba(57,211,83,0.15)' : 'rgba(248,81,73,0.15)',
                      color: prov.status === 'SUCCESS' ? '#39d353' : '#f85149'
                    }}>
                      {prov.status}
                    </span>
                  </div>

                  {prov.status === 'SUCCESS' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center', margin: '0.75rem 0' }}>
                      <div style={{ background: 'rgba(248,81,73,0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f85149' }}>{prov.malicious}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Malicious</div>
                      </div>
                      <div style={{ background: 'rgba(227,179,65,0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e3b341' }}>{prov.suspicious}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Suspicious</div>
                      </div>
                      <div style={{ background: 'rgba(57,211,83,0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#39d353' }}>{prov.harmless}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Clean</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b949e' }}>{prov.undetected}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Undetected</div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                      {prov.error_message || 'Provider query inactive or non-applicable.'}
                    </p>
                  )}

                  {/* Provider Extra Metadata */}
                  {prov.raw_summary && Object.keys(prov.raw_summary).length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      {prov.raw_summary.abuseConfidenceScore !== undefined && (
                        <div>Abuse Score: <strong>{prov.raw_summary.abuseConfidenceScore}%</strong> ({prov.raw_summary.totalReports} reports)</div>
                      )}
                      {prov.raw_summary.countryCode && (
                        <div>Country: <strong>{prov.raw_summary.countryCode}</strong> | ISP: <strong>{prov.raw_summary.isp}</strong></div>
                      )}
                      {prov.raw_summary.reputation !== undefined && (
                        <div>VT Reputation Score: <strong>{prov.raw_summary.reputation}</strong></div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Evidence Signals */}
            {scanResult.detection_summary?.signals?.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                  📌 Correlated Evidence & Findings
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  {scanResult.detection_summary.signals.map((sig, idx) => (
                    <li key={idx}>{sig}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* User History Table */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              📜 My Threat Intelligence History
            </h2>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search target..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '6px',
                }}
              >
                <option value="ALL">All Types</option>
                <option value="DOMAIN">Domain</option>
                <option value="URL">URL</option>
                <option value="IP">IP</option>
                <option value="FILE_HASH">File Hash</option>
              </select>

              <select
                value={sevFilter}
                onChange={(e) => setSevFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '6px',
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
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading scan history...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No threat intelligence queries recorded matching filters.
            </div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '650px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Target</th>
                    <th style={{ padding: '0.75rem' }}>Type</th>
                    <th style={{ padding: '0.75rem' }}>Providers</th>
                    <th style={{ padding: '0.75rem' }}>Threat Score</th>
                    <th style={{ padding: '0.75rem' }}>Severity</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Scanned At</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#fff', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.target}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                          {item.target_type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {item.provider}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: SEVERITY_CONFIG[item.severity]?.color || '#fff' }}>
                        {item.threat_score}/100
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: SEVERITY_CONFIG[item.severity]?.bg,
                          color: SEVERITY_CONFIG[item.severity]?.color,
                          border: `1px solid ${SEVERITY_CONFIG[item.severity]?.border}`
                        }}>
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: item.status === 'SUCCESS' ? '#39d353' : '#e3b341' }}>
                        {item.status}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(item.detected_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => setScanResult(item)}
                          style={{
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: 'rgba(56,139,253,0.15)',
                            color: '#388bfd',
                            border: '1px solid #388bfd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
