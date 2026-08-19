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

const STATE_BADGES = {
  OPEN:     { color: '#39d353', bg: 'rgba(57,211,83,0.15)', label: 'OPEN' },
  CLOSED:   { color: '#8b949e', bg: 'rgba(139,148,158,0.15)', label: 'CLOSED' },
  FILTERED: { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', label: 'FILTERED' },
  UNKNOWN:  { color: '#f85149', bg: 'rgba(248,81,73,0.15)', label: 'UNKNOWN' }
};

export default function PortScanner() {
  const { authTokens } = useContext(AuthContext);
  const [targetInput, setTargetInput] = useState('');
  const [profile, setProfile] = useState('COMMON');
  const [customPortsInput, setCustomPortsInput] = useState('');
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
      const res = await fetch(`${API}/api/port-scanner/history/`, {
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
    if (!targetInput.trim()) {
      setErrorMsg('Please enter a valid hostname or IP address.');
      return;
    }

    let parsedCustomPorts = [];
    if (profile === 'CUSTOM') {
      parsedCustomPorts = customPortsInput
        .split(',')
        .map(p => parseInt(p.trim(), 10))
        .filter(p => !isNaN(p) && p >= 1 && p <= 65535);

      if (parsedCustomPorts.length === 0) {
        setErrorMsg('Please specify at least one valid port number (1–65535) for Custom profile.');
        return;
      }
    }

    setScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/port-scanner/scan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({
          target: targetInput.trim(),
          profile: profile,
          ports: parsedCustomPorts
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.target?.[0] || data.error || 'Failed to complete port scan.');
      }
      setCurrentResult(data);
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setScanning(false);
    }
  };

  const quickScan = (sample) => {
    setTargetInput(sample);
  };

  const filteredHistory = history.filter(item => {
    const term = filterQuery.toLowerCase();
    const matchesTarget =
      (item.target || '').toLowerCase().includes(term) ||
      (item.primary_ip || '').toLowerCase().includes(term) ||
      (item.scan_profile || '').toLowerCase().includes(term);

    const matchesSev = filterSev === 'ALL' || item.severity?.toUpperCase() === filterSev;
    return matchesTarget && matchesSev;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔌</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              Defensive TCP Port Scanner
            </h1>
          </div>
          <p style={{ color: '#8b949e', fontSize: '0.95rem', margin: 0 }}>
            Controlled, non-exploitative TCP connection verification for perimeter exposure assessment, service identification, and risk evaluation.
          </p>
        </div>

        {/* Authorization / Safety Notice */}
        <div style={{
          background: 'rgba(56, 139, 253, 0.1)',
          border: '1px solid #388bfd',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          color: '#79c0ff',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.75rem'
        }}>
          <span>🛡️</span>
          <div>
            <strong>Authorized Scanning Notice:</strong> Only scan systems you own or have explicit authorization to inspect. All connection checks are defensive and rate-limited.
          </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 320px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Target Hostname or Authorized IP
                </label>
                <input
                  type="text"
                  placeholder="example.com or 198.51.100.1"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Scan Profile
                </label>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#f0f6fc',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                >
                  <option value="COMMON">COMMON (28 Popular Services)</option>
                  <option value="WEB">WEB (8 HTTP/HTTPS Ports)</option>
                  <option value="DATABASE">DATABASE (8 Database Services)</option>
                  <option value="ADMIN_REMOTE">ADMIN REMOTE (9 Management Ports)</option>
                  <option value="CUSTOM">CUSTOM (Specify Ports)</option>
                </select>
              </div>

              {profile === 'CUSTOM' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                    Custom Port Numbers (Comma separated, max 100 ports)
                  </label>
                  <input
                    type="text"
                    placeholder="80, 443, 8080, 3000, 5000"
                    value={customPortsInput}
                    onChange={(e) => setCustomPortsInput(e.target.value)}
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
              )}

              <div>
                <button
                  type="submit"
                  disabled={scanning}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.75rem',
                    background: scanning ? '#21262d' : 'linear-gradient(135deg, #1f6feb 0%, #238636 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(35,134,54,0.3)'
                  }}
                >
                  {scanning ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Checking TCP Ports...
                    </>
                  ) : (
                    <>🔍 Execute Port Scan</>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick chips */}
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6e7681', fontWeight: 600 }}>Quick Targets:</span>
            {[
              'scanme.nmap.org',
              'google.com',
              'github.com',
              'cloudflare.com'
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

        {/* Results Panel */}
        {currentResult && (
          <div style={{
            background: 'rgba(22, 27, 34, 0.95)',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '1.75rem',
            marginBottom: '2.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            {/* Result Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #21262d', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', background: '#21262d', color: '#58a6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                    {currentResult.target_type || 'TARGET'}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#21262d', color: '#e3b341', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                    PROFILE: {currentResult.scan_profile}
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
                    {currentResult.target}
                  </h2>
                </div>
                <div style={{ color: '#8b949e', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  Primary IP: <strong style={{ color: '#f0f6fc' }}>{currentResult.primary_ip || 'N/A'}</strong> | Scan Duration: <strong>{currentResult.scan_duration}s</strong>
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
                  Exposure Score: {currentResult.threat_score}/100 ({currentResult.severity})
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Ports Checked</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: '#f0f6fc' }}>
                  {currentResult.requested_ports?.length || currentResult.results?.length || 0}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Open Ports</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.open_ports?.length > 0 ? '#39d353' : '#8b949e' }}>
                  {currentResult.open_ports?.length || 0}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Closed Ports</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: '#8b949e' }}>
                  {currentResult.closed_ports?.length || 0}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Filtered / Timeout</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: '#e3b341' }}>
                  {currentResult.filtered_ports?.length || 0}
                </div>
              </div>
            </div>

            {/* Detailed Port Table */}
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.75rem' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #21262d', fontWeight: 700, color: '#f0f6fc', fontSize: '0.95rem' }}>
                📋 Port Scan Telemetry Results ({currentResult.results?.length || 0} Ports)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #30363d', background: '#161b22', textAlign: 'left', color: '#8b949e' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Port</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Protocol</th>
                      <th style={{ padding: '0.75rem 1rem' }}>State</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Identified Service</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.results?.map((row, idx) => {
                      const stateBadge = STATE_BADGES[row.state] || STATE_BADGES.UNKNOWN;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #21262d' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f0f6fc' }}>
                            {row.port}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#8b949e' }}>
                            {row.protocol || 'TCP'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              color: stateBadge.color,
                              background: stateBadge.bg,
                              border: `1px solid ${stateBadge.color}`,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              {stateBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: row.state === 'OPEN' ? '#58a6ff' : '#8b949e' }}>
                            {row.service || 'UNKNOWN'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#8b949e' }}>
                            {row.category || 'OTHER'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: row.confidence === 'HIGH' ? '#39d353' : row.confidence === 'MEDIUM' ? '#e3b341' : '#8b949e', fontWeight: 600 }}>
                            {row.confidence}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#8b949e', fontSize: '0.8rem' }}>
                            {row.response_time_ms ? `${row.response_time_ms} ms` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Security Indicators */}
            {currentResult.indicators?.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f85149', marginTop: 0, marginBottom: '0.75rem' }}>
                  ⚠️ Exposure Observations & Indicators ({currentResult.indicators.length})
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

            {/* Recommendations */}
            {currentResult.recommendations?.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#58a6ff', marginTop: 0, marginBottom: '0.75rem' }}>
                  💡 Hardening Recommendations
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

        {/* History Table */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f0f6fc', margin: 0 }}>
              📜 Your Port Scan History
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter target or IP..."
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
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>Loading port scan history...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', fontSize: '0.9rem' }}>
              No port scans recorded yet. Enter a target above to run your first scan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.75rem' }}>Target</th>
                    <th style={{ padding: '0.75rem' }}>Profile</th>
                    <th style={{ padding: '0.75rem' }}>Primary IP</th>
                    <th style={{ padding: '0.75rem' }}>Open Ports</th>
                    <th style={{ padding: '0.75rem' }}>Exposure Score</th>
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
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f0f6fc' }}>
                          {row.target}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#58a6ff', fontSize: '0.8rem' }}>
                          {row.scan_profile}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>
                          {row.primary_ip || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: row.open_ports?.length > 0 ? '#39d353' : '#8b949e', fontWeight: 700 }}>
                          {row.open_ports?.length || 0}
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
