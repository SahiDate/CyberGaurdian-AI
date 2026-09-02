import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';

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

  useEffect(() => {
    fetchScans();
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchScans();
    });
    return () => unsubscribe();
  }, []);

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
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>🔍 Security Monitoring</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            All platform-wide scans — website, SSL, WHOIS, port, URL, threat checks.
          </p>
        </div>

        {/* Summary cards / filter tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          {[['all', 'Total', scans.length, 'var(--accent-color)'], ...Object.entries(RISK_CONFIG).map(([k, v]) => [k, v.label, riskCounts[k] || 0, v.color])].map(([k, label, count, color]) => {
            const isSelected = riskFilter === k;
            return (
              <button
                key={k}
                onClick={() => { setRiskFilter(k); setPage(1); }}
                className="glass-panel"
                style={{
                  padding: '0.95rem 1rem',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${color}` : '1px solid var(--border-subtle)',
                  background: isSelected ? `${color}20` : 'var(--panel-bg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 4px 20px ${color}35` : 'var(--panel-shadow)',
                }}
              >
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isSelected ? color : 'var(--text-main)', lineHeight: 1.2 }}>{count}</div>
                <div style={{ fontSize: '0.72rem', color: isSelected ? color : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginTop: '0.3rem' }}>{label}</div>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            placeholder="Search by domain or URL..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '0.7rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Table Card */}
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading scans...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>No scans found.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['#', 'Domain', 'HTTPS', 'Score', 'Risk Level', 'Scanned At', ''].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(scan => {
                    const rc = RISK_CONFIG[scan.risk_level] || { color: '#8b949e', label: scan.risk_level };
                    return (
                      <React.Fragment key={scan.id}>
                        <tr
                          style={{ borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                          onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(88,166,255,0.06)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>#{scan.id}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{scan.domain}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>{scan.is_https ? '✅' : '❌'}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: scan.security_score >= 70 ? '#39d353' : scan.security_score >= 40 ? '#e3b341' : '#f85149' }}>
                            {scan.security_score}/100
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: `${rc.color}18`, color: rc.color, border: `1px solid ${rc.color}40`, display: 'inline-block' }}>
                              {scan.risk_level_display || rc.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(scan.scanned_at).toLocaleString()}</td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{expanded === scan.id ? '▲' : '▼'}</td>
                        </tr>
                        {expanded === scan.id && (
                          <tr>
                            <td colSpan={7} style={{ padding: '1rem 1.5rem', background: 'rgba(88,166,255,0.04)', borderTop: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--accent-color)' }}>Scan Metadata:</strong> Domain: {scan.domain} | IP: {scan.ip_address || 'N/A'} | Server: {scan.server_header || 'N/A'}
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="glass-panel"
              style={{ padding: '0.45rem 0.95rem', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.83rem', opacity: page === 1 ? 0.4 : 1 }}
            >
              ‹ Prev
            </button>
            <span style={{ padding: '0.45rem 0.95rem', color: 'var(--text-muted)', fontSize: '0.83rem', fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="glass-panel"
              style={{ padding: '0.45rem 0.95rem', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.83rem', opacity: page === totalPages ? 0.4 : 1 }}
            >
              Next ›
            </button>
          </div>
        )}

        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filtered.length} scans found, showing page {page} of {totalPages || 1}
        </div>
      </div>
    </AdminSidebar>
  );
}
