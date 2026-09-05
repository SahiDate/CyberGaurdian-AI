import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ShieldAlert, RotateCw, Search, ChevronDown, ChevronUp, AlertCircle, ExternalLink } from 'lucide-react';

const SEV_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

export default function AdminThreats() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
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
    try {
      const h = { Authorization: `Bearer ${authTokens?.access}` };
      const [tRes, aRes] = await Promise.all([
        fetch('http://localhost:8000/api/admin/threats/', { headers: h }),
        fetch('http://localhost:8000/api/admin/threats/analytics/', { headers: h }),
      ]);
      if (tRes.ok) {
        const tData = await tRes.json();
        setThreats(Array.isArray(tData) ? tData : (tData.results || []));
      }
      if (aRes.ok) setAnalytics(await aRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const threatsList = Array.isArray(threats) ? threats : [];
  const filtered = threatsList.filter(t => {
    const matchSearch =
      t.target?.toLowerCase().includes(search.toLowerCase()) ||
      t.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.data_source?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === 'ALL' || t.severity === sevFilter;
    const matchType = typeFilter === 'ALL' || t.target_type === typeFilter;
    const matchProv = providerFilter === 'ALL' || (t.data_source && t.data_source.toLowerCase().includes(providerFilter.toLowerCase()));
    return matchSearch && matchSev && matchType && matchProv;
  });

  const TABS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              letterSpacing: '-0.02em'
            }}>
              Threat Intelligence
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Platform-wide threat intelligence detections across all users and modules.
            </p>
          </div>

          <button onClick={fetchData} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh Feeds</span>
          </button>
        </div>

        {/* Analytics Summary Cards (Metis Style) */}
        {analytics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div className="admin-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
                Total Threat Checks
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
                {analytics.total_checks}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
                +{analytics.scans_today} today
              </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ef4444' }}>
                Critical Detections
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444', margin: '0.2rem 0' }}>
                {analytics.severity_breakdown?.critical || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Threat score ≥ 75
              </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #f97316' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f97316' }}>
                High Detections
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f97316', margin: '0.2rem 0' }}>
                {analytics.severity_breakdown?.high || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Threat score 50–74
              </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
                Low / Clean
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', margin: '0.2rem 0' }}>
                {analytics.severity_breakdown?.low || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Threat score &lt; 25
              </div>
            </div>
          </div>
        )}

        {/* Card Container for Table & Filters */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          {/* Severity Filter Tabs & Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div className="admin-pill-group">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setSevFilter(tab)}
                  className={`admin-pill-btn ${sevFilter === tab ? 'active' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Search target or user..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
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
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
              >
                <option value="ALL">All Providers</option>
                <option value="VirusTotal">VirusTotal</option>
                <option value="AbuseIPDB">AbuseIPDB</option>
                <option value="urlscan">urlscan.io</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
              Loading platform threat intelligence records...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
              No threat intelligence records found matching filters.
            </div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>USER</th>
                    <th>TARGET</th>
                    <th>TYPE</th>
                    <th>PROVIDERS</th>
                    <th>SCORE</th>
                    <th>SEVERITY</th>
                    <th>STATUS</th>
                    <th>DETECTED AT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const sev = SEV_CONFIG[t.severity] || { color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <React.Fragment key={t.id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                        >
                          <td style={{ fontWeight: 600, color: 'var(--admin-text-muted, #64748b)' }}>#{t.id}</td>
                          <td style={{ fontWeight: 600, color: '#6366f1' }}>{t.username || 'System'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.target}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: isDark ? '#334155' : '#f1f5f9', color: 'var(--admin-text-muted, #64748b)', fontWeight: 600 }}>
                              {t.target_type}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #64748b)' }}>
                            {t.data_source || 'Internal Engine'}
                          </td>
                          <td style={{ fontWeight: 700, color: t.threat_score >= 70 ? '#ef4444' : t.threat_score >= 40 ? '#f59e0b' : '#10b981' }}>
                            {t.threat_score}/100
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 9px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: `${sev.color}15`,
                              color: sev.color,
                              border: `1px solid ${sev.color}35`,
                              display: 'inline-block'
                            }}>
                              {t.severity}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted, #64748b)' }}>
                              {t.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--admin-text-muted, #64748b)', whiteSpace: 'nowrap' }}>
                            {new Date(t.created_at || t.timestamp).toLocaleDateString()}
                          </td>
                          <td style={{ color: '#94a3b8' }}>
                            {expanded === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                        </tr>

                        {expanded === t.id && (
                          <tr>
                            <td colSpan={10} style={{ padding: '1.25rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-main, #0f172a)' }}>
                                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#6366f1' }}>Threat Evaluation Summary</div>
                                <div style={{ color: 'var(--admin-text-muted, #64748b)', lineHeight: 1.6 }}>
                                  Target: {t.target} | Target Type: {t.target_type} | Engine Score: {t.threat_score} | Severity: {t.severity}
                                </div>
                                {t.details && (
                                  <pre style={{
                                    marginTop: '0.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    overflowX: 'auto',
                                    color: 'var(--admin-text-main, #0f172a)'
                                  }}>
                                    {typeof t.details === 'object' ? JSON.stringify(t.details, null, 2) : t.details}
                                  </pre>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminSidebar>
  );
}
