import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SEV_CONFIG = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: '#f85149' },
  HIGH: { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: '#e3b341' },
  MEDIUM: { color: '#388bfd', bg: 'rgba(56,139,253,0.12)', border: '#388bfd' },
  LOW: { color: '#39d353', bg: 'rgba(57,211,83,0.12)', border: '#39d353' },
  UNKNOWN: { color: '#8b949e', bg: 'rgba(139,148,158,0.12)', border: '#8b949e' },
};

const SevBadge = ({ severity }) => {
  const cfg = SEV_CONFIG[severity?.toUpperCase()] || SEV_CONFIG.UNKNOWN;
  return (
    <span style={{
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border || 'transparent'}`,
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: 700
    }}>
      {severity || 'UNKNOWN'}
    </span>
  );
};

export default function AdminThreats() {
  const { authTokens } = useContext(AuthContext);
  const [threats, setThreats] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/threat-intelligence/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        }),
        fetch(`${API}/api/admin/threat-intelligence/analytics/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        })
      ]);

      if (listRes.ok) {
        setThreats(await listRes.json());
      }
      if (statsRes.ok) {
        setAnalytics(await statsRes.json());
      }
    } catch (e) {
      console.error("Error fetching admin threat data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = threats.filter(t => {
    const matchSev = sevFilter === 'ALL' || (t.severity?.toUpperCase() === sevFilter);
    const matchType = typeFilter === 'ALL' || (t.target_type?.toUpperCase() === typeFilter);
    const matchProv = providerFilter === 'ALL' || (t.provider?.toLowerCase().includes(providerFilter.toLowerCase()));
    const matchSearch = !search ||
      t.target?.toLowerCase().includes(search.toLowerCase()) ||
      t.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.provider?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchType && matchProv && matchSearch;
  });

  const TABS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>🚨 Threat Intelligence SOC Monitor</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
              Platform-wide threat intelligence detections across all users and modules.
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
            🔄 Refresh Feeds
          </button>
        </div>

        {/* Real DB Aggregation Analytics Metric Strip */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Checks</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{analytics.total_checks}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '0.3rem', fontWeight: 600 }}>+{analytics.scans_today} today</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--danger-color)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical Detections</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--danger-color)', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.critical || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Threat score ≥ 75</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>High Detections</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning-color)', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.high || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Threat score 50–74</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--success-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--success-color)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Low / Clean</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success-color)', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.low || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Threat score &lt; 25</div>
            </div>
          </div>
        )}

        {/* Severity Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const cfg = SEV_CONFIG[tab] || { color: 'var(--text-main)', bg: 'var(--panel-bg)' };
            const active = sevFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setSevFilter(tab)}
                className="glass-panel"
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '20px',
                  border: active ? `2px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  letterSpacing: '0.5px',
                  background: active ? `${cfg.color}25` : 'var(--panel-bg)',
                  color: active ? cfg.color : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Multi-Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search by target, user, or provider..."
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
            <option value="ALL">All Target Types</option>
            <option value="DOMAIN">Domain</option>
            <option value="URL">URL</option>
            <option value="IP">IP Address</option>
            <option value="FILE_HASH">File Hash</option>
          </select>

          <select
            value={providerFilter}
            onChange={e => setProviderFilter(e.target.value)}
            className="glass-panel"
            style={{ padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Providers</option>
            <option value="VirusTotal">VirusTotal</option>
            <option value="AbuseIPDB">AbuseIPDB</option>
            <option value="urlscan">urlscan.io</option>
          </select>
        </div>

        {/* Platform Table */}
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading platform threat intelligence records...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No threat intelligence records found matching filters.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['ID', 'User', 'Target', 'Type', 'Providers', 'Score', 'Severity', 'Status', 'Detected At', ''].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <React.Fragment key={t.id}>
                      <tr
                        style={{ borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', background: expanded === t.id ? 'rgba(56,139,253,0.08)' : 'transparent', transition: 'background-color 0.15s ease' }}
                        onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                        onMouseEnter={e => { if (expanded !== t.id) e.currentTarget.style.backgroundColor = 'rgba(88,166,255,0.05)'; }}
                        onMouseLeave={e => { if (expanded !== t.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>#{t.id}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-color)' }}>{t.username || 'System'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.target}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--panel-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                            {t.target_type}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{t.provider}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: SEV_CONFIG[t.severity?.toUpperCase()]?.color || 'var(--text-main)' }}>
                          {t.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}><SevBadge severity={t.severity} /></td>
                        <td style={{ padding: '0.85rem 1rem', color: t.status === 'SUCCESS' ? 'var(--success-color)' : 'var(--warning-color)', fontSize: '0.75rem', fontWeight: 700 }}>{t.status}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(t.detected_at).toLocaleString()}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontSize: '0.9rem' }}>{expanded === t.id ? '▲' : '▼'}</td>
                      </tr>

                      {expanded === t.id && (
                        <tr>
                          <td colSpan={10} style={{ padding: '1.25rem 1.5rem', background: 'rgba(56,139,253,0.04)', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>RECORD OWNER</span>
                                  <div style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{t.username} (ID: {t.user_id})</div>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>EVIDENCE CONFIDENCE</span>
                                  <div style={{ fontWeight: 700 }}>{t.confidence}%</div>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>INDICATORS</span>
                                  <div style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                                    {t.malicious_count || 0} Malicious / {t.suspicious_count || 0} Suspicious / {t.harmless_count || 0} Clean
                                  </div>
                                </div>
                              </div>

                              {t.error_message && (
                                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(248,81,73,0.1)', color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.8rem', border: '1px solid rgba(248,81,73,0.3)' }}>
                                  <strong>Provider Warning / Error:</strong> {t.error_message}
                                </div>
                              )}

                              {t.detection_summary?.signals?.length > 0 && (
                                <div>
                                  <strong style={{ color: 'var(--accent-color)' }}>Correlated Evidence Signals:</strong>
                                  <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                    {t.detection_summary.signals.map((sig, idx) => (
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
          Showing {filtered.length} of {threats.length} platform threat records
        </div>
      </div>
    </AdminSidebar>
  );
}
