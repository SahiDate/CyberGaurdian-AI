import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SEV_CONFIG = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.12)' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.12)' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.12)' },
  UNKNOWN:  { color: '#8b949e', bg: 'rgba(139,148,158,0.12)' },
};

const SevBadge = ({ severity }) => {
  const cfg = SEV_CONFIG[severity?.toUpperCase()] || SEV_CONFIG.UNKNOWN;
  return (
    <span style={{ ...cfg, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
      {severity || 'UNKNOWN'}
    </span>
  );
};

export default function AdminThreats() {
  const { authTokens } = useContext(AuthContext);
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchThreats(); }, []);

  const fetchThreats = async () => {
    try {
      const res = await fetch(`${API}/api/admin/threats-list/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setThreats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = threats.filter(t => {
    const matchSev = sevFilter === 'ALL' || (t.severity?.toUpperCase() === sevFilter);
    const matchSearch = !search ||
      t.target?.toLowerCase().includes(search.toLowerCase()) ||
      t.threat_type?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const sevCounts = threats.reduce((acc, t) => {
    const k = (t.severity || 'UNKNOWN').toUpperCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const TABS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>🚨 Threat Intelligence</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Platform-wide threat detections across all scans and users.
          </p>
        </div>

        {/* Severity Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
                {tab} {tab !== 'ALL' && sevCounts[tab] ? `(${sevCounts[tab]})` : tab === 'ALL' ? `(${threats.length})` : ''}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            placeholder="Search by target, threat type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: '480px', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading threats...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No threats found.</div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['ID', 'Target', 'Threat Type', 'Severity', 'Indicators', 'Detected At', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <React.Fragment key={t.id}>
                      <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }} onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>#{t.id}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>{t.target || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{t.threat_type || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><SevBadge severity={t.severity} /></td>
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{t.indicator_count ?? 0}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{new Date(t.detected_at).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#388bfd', fontSize: '1rem' }}>{expanded === t.id ? '▲' : '▼'}</td>
                      </tr>
                      {expanded === t.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.3)' }}>
                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                              <strong style={{ color: '#58a6ff' }}>Threat Details:</strong> {t.description || t.details || 'No detailed indicator logs recorded for this threat event.'}
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
          {filtered.length} of {threats.length} threats shown
        </div>
      </div>
    </AdminSidebar>
  );
}
