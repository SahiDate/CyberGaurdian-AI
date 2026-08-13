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
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>🚨 Threat Intelligence SOC Monitor</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
              Platform-wide threat intelligence detections across all users and modules.
            </p>
          </div>

          <button
            onClick={fetchData}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(56,139,253,0.15)',
              border: '1px solid #388bfd',
              color: '#388bfd',
              borderRadius: '6px',
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
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Checks</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{analytics.total_checks}</div>
              <div style={{ fontSize: '0.75rem', color: '#388bfd', marginTop: '0.3rem' }}>{analytics.scans_today} today</div>
            </div>

            <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#f85149', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Critical Detections</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f85149', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.critical || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>Threat score ≥ 75</div>
            </div>

            <div style={{ background: 'rgba(227,179,65,0.08)', border: '1px solid rgba(227,179,65,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#e3b341', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>High Detections</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e3b341', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.high || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>Threat score 50–74</div>
            </div>

            <div style={{ background: 'rgba(57,211,83,0.08)', border: '1px solid rgba(57,211,83,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#39d353', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Low / Clean</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#39d353', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.low || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>Threat score &lt; 25</div>
            </div>
          </div>
        )}

        {/* Severity Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const cfg = SEV_CONFIG[tab] || { color: '#fff', bg: 'rgba(255,255,255,0.08)' };
            const active = sevFilter === tab;
            return (
              <button key={tab} onClick={() => setSevFilter(tab)} style={{
                padding: '0.45rem 1rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.5px',
                background: active ? cfg.color : 'rgba(255,255,255,0.05)',
                color: active ? '#fff' : cfg.color || 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s',
              }}>
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
            style={{ flex: '1 1 280px', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
          />

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem' }}
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
            style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Providers</option>
            <option value="VirusTotal">VirusTotal</option>
            <option value="AbuseIPDB">AbuseIPDB</option>
            <option value="urlscan">urlscan.io</option>
          </select>
        </div>

        {/* Platform Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading platform threat intelligence records...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No threat intelligence records found matching filters.</div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['ID', 'User', 'Target', 'Type', 'Providers', 'Score', 'Severity', 'Status', 'Detected At', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <React.Fragment key={t.id}>
                      <tr
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: expanded === t.id ? 'rgba(56,139,253,0.05)' : 'transparent' }}
                        onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                      >
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>#{t.id}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#388bfd' }}>{t.username || 'System'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.target}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                            {t.target_type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>{t.provider}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: SEV_CONFIG[t.severity?.toUpperCase()]?.color || '#fff' }}>
                          {t.threat_score}/100
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}><SevBadge severity={t.severity} /></td>
                        <td style={{ padding: '0.75rem 1rem', color: t.status === 'SUCCESS' ? '#39d353' : '#e3b341', fontSize: '0.75rem', fontWeight: 600 }}>{t.status}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{new Date(t.detected_at).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#388bfd', fontSize: '0.9rem' }}>{expanded === t.id ? '▲' : '▼'}</td>
                      </tr>

                      {expanded === t.id && (
                        <tr>
                          <td colSpan={10} style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.35)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.6 }}>
                              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>RECORD OWNER</span>
                                  <div style={{ fontWeight: 700, color: '#388bfd' }}>{t.username} (ID: {t.user_id})</div>
                                </div>
                                <div>
                                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>EVIDENCE CONFIDENCE</span>
                                  <div style={{ fontWeight: 700 }}>{t.confidence}%</div>
                                </div>
                                <div>
                                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>INDICATORS</span>
                                  <div style={{ fontWeight: 700, color: '#f85149' }}>
                                    {t.malicious_count || 0} Malicious / {t.suspicious_count || 0} Suspicious / {t.harmless_count || 0} Clean
                                  </div>
                                </div>
                              </div>

                              {t.error_message && (
                                <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(248,81,73,0.1)', color: '#f85149', marginBottom: '1rem', fontSize: '0.8rem' }}>
                                  <strong>Provider Warning / Error:</strong> {t.error_message}
                                </div>
                              )}

                              {t.detection_summary?.signals?.length > 0 && (
                                <div>
                                  <strong style={{ color: '#58a6ff' }}>Correlated Evidence Signals:</strong>
                                  <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
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

        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          Showing {filtered.length} of {threats.length} platform threat records
        </div>
      </div>
    </AdminSidebar>
  );
}
