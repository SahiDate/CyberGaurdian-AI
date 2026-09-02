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

const STATE_BADGES = {
  OPEN:     { color: '#39d353', bg: 'rgba(57,211,83,0.15)', label: 'OPEN' },
  CLOSED:   { color: '#8b949e', bg: 'rgba(139,148,158,0.15)', label: 'CLOSED' },
  FILTERED: { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', label: 'FILTERED' },
  UNKNOWN:  { color: '#f85149', bg: 'rgba(248,81,73,0.15)', label: 'UNKNOWN' }
};

export default function AdminPortScanner() {
  const { authTokens } = useContext(AuthContext);
  const [scans, setScans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [profileFilter, setProfileFilter] = useState('ALL');
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
        fetch(`${API}/api/admin/port-scanner/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        }),
        fetch(`${API}/api/admin/port-scanner/analytics/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        })
      ]);

      if (listRes.ok) setScans(await listRes.json());
      if (statsRes.ok) setAnalytics(await statsRes.json());
    } catch (e) {
      console.error("Error fetching admin port scanner data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = scans.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch =
      (s.target || '').toLowerCase().includes(term) ||
      (s.primary_ip || '').toLowerCase().includes(term) ||
      (s.username || '').toLowerCase().includes(term);

    const matchesSev = sevFilter === 'ALL' || s.severity?.toUpperCase() === sevFilter;
    const matchesProfile = profileFilter === 'ALL' || s.scan_profile?.toUpperCase() === profileFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesSev && matchesProfile && matchesStatus;
  });

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              🔌 SOC Platform Port & Service Exposure Inspector
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Platform-wide port exposure telemetry, active TCP service mapping, SSRF containment, and infrastructure vulnerability posture.
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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Port Scans</div>
              <div style={{ color: 'var(--text-main)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_scans}</div>
              <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>+{analytics.scans_today} today</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exposures Detected</div>
              <div style={{ color: 'var(--danger-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.threats_detected}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Medium / High / Critical</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid #ff7b72', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#ff7b72', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SSRF Blocks</div>
              <div style={{ color: '#ff7b72', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.ssrf_blocked_count}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Restricted IP attempts blocked</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Open Services Found</div>
              <div style={{ color: 'var(--warning-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.open_ports_discovered}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Active network listeners</div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search target, IP, user..."
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
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
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
            <option value="ALL">All Scan Profiles</option>
            <option value="QUICK">Quick Top 20</option>
            <option value="STANDARD">Standard Top 100</option>
            <option value="FULL">Full Range (1-1024)</option>
            <option value="CUSTOM">Custom Ports</option>
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
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>Loading platform port telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No port scan records match current criteria.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>User / Account</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Target & IP</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Profile</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Open</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Closed</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Filtered</th>
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
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {row.target}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>{row.primary_ip}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {row.scan_profile}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: row.open_ports_count > 0 ? 'var(--warning-color)' : 'var(--text-muted)', fontWeight: row.open_ports_count > 0 ? 800 : 400 }}>
                          {row.open_ports_count}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {row.closed_ports_count}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {row.filtered_ports_count}
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
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Port Investigation: {selectedScan.target}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{selectedScan.username}</span> | IP: {selectedScan.primary_ip} | Profile: {selectedScan.scan_profile}
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

              {/* Port Summary Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Target:</span> <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{selectedScan.target}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Primary IP:</span> <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{selectedScan.primary_ip || 'N/A'}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Profile:</span> <span style={{ color: 'var(--text-main)' }}>{selectedScan.scan_profile}</span></div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Open Ports:</span> <span style={{ color: 'var(--warning-color)', fontWeight: 700 }}>{selectedScan.open_ports_count}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Closed / Filtered:</span> <span style={{ color: 'var(--text-main)' }}>{selectedScan.closed_ports_count} / {selectedScan.filtered_ports_count}</span></div>
                  <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Threat Score:</span> <span style={{ color: selectedScan.threat_score >= 50 ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 700 }}>{selectedScan.threat_score}/100</span></div>
                </div>
              </div>

              {/* Port Breakdown Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Port Probing Results ({selectedScan.port_results?.length || 0} Ports)
                </div>
                <div className="glass-panel" style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel-bg)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Port</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Protocol</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>State</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Service</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Category</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedScan.port_results || []).map((p, idx) => {
                        const stateBadge = PORT_STATE_STYLES[p.state] || PORT_STATE_STYLES.FILTERED;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.port}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{p.protocol}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <span style={{ color: stateBadge.color, background: stateBadge.bg, border: `1px solid ${stateBadge.border}`, padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {stateBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', color: p.state === 'OPEN' ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 600 }}>{p.service}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{p.category}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{p.confidence}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Indicators */}
              {selectedScan.indicators?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger-color)', marginBottom: '0.5rem' }}>
                    Exposure Indicators ({selectedScan.indicators.length})
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
