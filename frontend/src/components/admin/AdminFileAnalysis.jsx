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

const SevBadge = ({ severity }) => {
  const cfg = SEVERITY_STYLES[severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
  return (
    <span style={{
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: 700
    }}>
      {severity || 'LOW'}
    </span>
  );
};

export default function AdminFileAnalysis() {
  const { authTokens } = useContext(AuthContext);
  const [analyses, setAnalyses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/file-analysis/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        }),
        fetch(`${API}/api/admin/file-analysis/analytics/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        })
      ]);

      if (listRes.ok) setAnalyses(await listRes.json());
      if (statsRes.ok) setAnalytics(await statsRes.json());
    } catch (e) {
      console.error("Error fetching admin file analysis data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = analyses.filter(item => {
    const matchType = typeFilter === 'ALL' || item.detected_type?.toUpperCase() === typeFilter;
    const matchSev = sevFilter === 'ALL' || item.severity?.toUpperCase() === sevFilter;
    const matchSearch = !search ||
      item.original_filename?.toLowerCase().includes(search.toLowerCase()) ||
      item.username?.toLowerCase().includes(search.toLowerCase()) ||
      item.sha256?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSev && matchSearch;
  });

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>📁 File Security Analysis Monitoring</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
              Platform-wide static file security analyses, YARA matches, and VirusTotal hash lookups across all users.
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
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
          >
            🔄 Refresh Records
          </button>
        </div>

        {/* Analytics Strip */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total File Analyses</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{analytics.total_analyzed}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '0.3rem', fontWeight: 600 }}>+{analytics.analyzed_today} today</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--danger-color)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical / High Risk</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--danger-color)', marginTop: '0.2rem' }}>
                {(analytics.severity_breakdown?.critical || 0) + (analytics.severity_breakdown?.high || 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Threat score ≥ 50</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>YARA Rule Matches</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning-color)', marginTop: '0.2rem' }}>
                {analytics.yara_matches_count || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Defensive rules triggered</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--accent-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-color)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VirusTotal Flagged</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.2rem' }}>
                {analytics.vt_flagged_count || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Hash reputation matches</div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Search by filename, user, hash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-panel"
            style={{ flex: '1 1 280px', padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
          />

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="glass-panel"
            style={{ padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All File Types</option>
            <option value="PE">Windows PE Executable</option>
            <option value="ELF">Linux ELF</option>
            <option value="SCRIPT">Script</option>
            <option value="DOCUMENT">Document</option>
            <option value="ARCHIVE">Archive</option>
          </select>

          <select
            value={sevFilter}
            onChange={e => setSevFilter(e.target.value)}
            className="glass-panel"
            style={{ padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading platform file analysis records...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No file analysis records found.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['ID', 'User', 'Filename', 'Type', 'Size', 'SHA-256', 'Score', 'Severity', 'YARA', 'Created At', ''].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <React.Fragment key={item.id}>
                      <tr
                        style={{ borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', background: expanded === item.id ? 'rgba(56,139,253,0.08)' : 'transparent', transition: 'background-color 0.15s ease' }}
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        onMouseEnter={e => { if (expanded !== item.id) e.currentTarget.style.backgroundColor = 'rgba(88,166,255,0.05)'; }}
                        onMouseLeave={e => { if (expanded !== item.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>#{item.id}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-color)' }}>{item.username}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.original_filename}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.detected_type}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{(item.file_size / 1024).toFixed(1)} KB</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.sha256?.substring(0, 16)}...</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: SEVERITY_STYLES[item.severity]?.color || 'var(--text-main)' }}>{item.threat_score}/100</td>
                        <td style={{ padding: '0.85rem 1rem' }}><SevBadge severity={item.severity} /></td>
                        <td style={{ padding: '0.85rem 1rem', color: item.yara_status === 'MATCH' ? 'var(--danger-color)' : 'var(--text-muted)', fontWeight: 600 }}>{item.yara_status}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)' }}>{expanded === item.id ? '▲' : '▼'}</td>
                      </tr>

                      {expanded === item.id && (
                        <tr>
                          <td colSpan={11} style={{ padding: '1.25rem 1.5rem', background: 'rgba(56,139,253,0.04)', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>OWNER</span>
                                  <div style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{item.username} (ID: {item.user_id})</div>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>FULL SHA-256</span>
                                  <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-main)' }}>{item.sha256}</div>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ENTROPY</span>
                                  <div style={{ fontWeight: 700 }}>{item.entropy} / 8.0 ({item.entropy_category})</div>
                                </div>
                              </div>

                              {item.metadata?.signals?.length > 0 && (
                                <div>
                                  <strong style={{ color: 'var(--accent-color)' }}>Correlated Evidence Signals:</strong>
                                  <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                    {item.metadata.signals.map((sig, idx) => (
                                      <li key={idx}>{sig}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {analyses.length} platform file analysis records
        </div>
      </div>
    </AdminSidebar>
  );
}
