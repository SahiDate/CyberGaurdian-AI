import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const RISK_CONFIG = {
  high:      { color: '#f85149', label: 'High Risk' },
  medium:    { color: '#e3b341', label: 'Medium Risk' },
  good:      { color: '#388bfd', label: 'Good' },
  excellent: { color: '#39d353', label: 'Excellent' },
};

export default function AdminScans() {
  const { authTokens } = useContext(AuthContext);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchScans(); }, []);

  const fetchScans = async () => {
    try {
      const res = await fetch(`${API}/api/admin/scans/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setScans(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = scans.filter(s => {
    const matchRisk = riskFilter === 'all' || s.risk_level === riskFilter;
    const matchSearch = !search ||
      s.domain?.toLowerCase().includes(search.toLowerCase()) ||
      s.url?.toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const riskCounts = scans.reduce((acc, s) => { acc[s.risk_level] = (acc[s.risk_level] || 0) + 1; return acc; }, {});

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1400px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>🔍 Security Monitoring</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            All platform-wide scans — website, SSL, WHOIS, port, URL, threat checks.
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[['all', 'Total', scans.length, '#388bfd'], ...Object.entries(RISK_CONFIG).map(([k, v]) => [k, v.label, riskCounts[k] || 0, v.color])].map(([k, label, count, color]) => (
            <button key={k} onClick={() => { setRiskFilter(k); setPage(1); }} style={{
              padding: '0.85rem', borderRadius: '9px', border: `1px solid ${riskFilter === k ? color : 'rgba(255,255,255,0.07)'}`,
              background: riskFilter === k ? `${color}18` : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: riskFilter === k ? color : '#fff' }}>{count}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search by domain or URL..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: '100%', maxWidth: '480px', marginBottom: '1.25rem', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
        />

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading scans...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No scans found.</div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['#', 'Domain', 'HTTPS', 'Score', 'Risk Level', 'Scanned At', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(scan => {
                    const rc = RISK_CONFIG[scan.risk_level] || { color: '#8b949e', label: scan.risk_level };
                    return (
                      <React.Fragment key={scan.id}>
                        <tr
                          style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                          onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                        >
                          <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>#{scan.id}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>{scan.domain}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{scan.is_https ? '✅' : '❌'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: scan.security_score >= 70 ? '#39d353' : scan.security_score >= 40 ? '#e3b341' : '#f85149' }}>
                            {scan.security_score}/100
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: `${rc.color}22`, color: rc.color, border: `1px solid ${rc.color}44` }}>
                              {scan.risk_level_display || rc.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{new Date(scan.scanned_at).toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.3)' }}>{expanded === scan.id ? '▲' : '▼'}</td>
                        </tr>
                        {expanded === scan.id && (
                          <tr>
                            <td colSpan={7} style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.3)' }}>
                              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                <strong style={{ color: '#58a6ff' }}>Scan Metadata:</strong> Domain: {scan.domain} | IP: {scan.ip_address || 'N/A'} | Server: {scan.server_header || 'N/A'}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>‹ Prev</button>
            <span style={{ padding: '0.4rem 0.85rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.83rem' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>Next ›</button>
          </div>
        )}

        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          {filtered.length} scans found, showing page {page} of {totalPages || 1}
        </div>
      </div>
    </AdminSidebar>
  );
}
