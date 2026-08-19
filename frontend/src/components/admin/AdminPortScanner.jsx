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
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              🔌 SOC Platform Port & Service Exposure Inspector
            </h1>
            <p style={{ color: '#8b949e', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Platform-wide port exposure telemetry, active TCP service mapping, SSRF containment, and infrastructure vulnerability posture.
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
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Port Scans</div>
              <div style={{ color: '#f0f6fc', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_scans}</div>
              <div style={{ color: '#58a6ff', fontSize: '0.75rem', marginTop: '0.25rem' }}>+{analytics.scans_today} today</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Exposures Detected</div>
              <div style={{ color: '#f85149', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.threats_detected}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Medium / High / Critical</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>SSRF Blocks</div>
              <div style={{ color: '#ff7b72', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.ssrf_blocked_count}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Internal probe attempts blocked</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Top Profiles</div>
              <div style={{ color: '#e3b341', fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {analytics.by_profile?.[0]?.scan_profile || 'COMMON'} ({analytics.by_profile?.[0]?.count || 0})
              </div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Active scan profiles</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search Target, IP, or User..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px',
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '0.85rem'
            }}
          />

          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Profiles</option>
            <option value="COMMON">COMMON</option>
            <option value="WEB">WEB</option>
            <option value="DATABASE">DATABASE</option>
            <option value="ADMIN_REMOTE">ADMIN_REMOTE</option>
            <option value="CUSTOM">CUSTOM</option>
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
            <option value="DNS_ERROR">DNS Error</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        {/* Data Table */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>Loading platform port telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>No port scan records match current criteria.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.85rem' }}>User / Account</th>
                    <th style={{ padding: '0.85rem' }}>Target</th>
                    <th style={{ padding: '0.85rem' }}>Type</th>
                    <th style={{ padding: '0.85rem' }}>Primary IP</th>
                    <th style={{ padding: '0.85rem' }}>Profile</th>
                    <th style={{ padding: '0.85rem' }}>Open Ports</th>
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
                        <td style={{ padding: '0.85rem', fontWeight: 700, color: '#f0f6fc' }}>
                          {row.target}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e', fontSize: '0.78rem' }}>
                          {row.target_type}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e' }}>
                          {row.primary_ip || 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#e3b341', fontSize: '0.78rem', fontWeight: 600 }}>
                          {row.scan_profile}
                        </td>
                        <td style={{ padding: '0.85rem', color: row.open_ports?.length > 0 ? '#39d353' : '#8b949e', fontWeight: 700 }}>
                          {row.open_ports?.length || 0}
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
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
                    Port Scan Telemetry: {selectedScan.target}
                  </h2>
                  <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: '#58a6ff' }}>{selectedScan.username}</span> | Profile: {selectedScan.scan_profile} | Primary IP: {selectedScan.primary_ip || 'N/A'}
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

              {/* Port Results Table */}
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #21262d', fontWeight: 700, color: '#f0f6fc', fontSize: '0.88rem' }}>
                  Ports Checked ({selectedScan.results?.length || 0})
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#161b22', textAlign: 'left', color: '#8b949e' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Port</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>State</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Service</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Category</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedScan.results?.map((p, idx) => {
                        const stateBadge = STATE_BADGES[p.state] || STATE_BADGES.UNKNOWN;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #21262d' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#f0f6fc' }}>{p.port}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <span style={{ color: stateBadge.color, background: stateBadge.bg, padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {stateBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', color: p.state === 'OPEN' ? '#58a6ff' : '#8b949e' }}>{p.service}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#8b949e' }}>{p.category}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#8b949e' }}>{p.confidence}</td>
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
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f85149', marginBottom: '0.5rem' }}>
                    Exposure Indicators ({selectedScan.indicators.length})
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
