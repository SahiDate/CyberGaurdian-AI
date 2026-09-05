import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Radio, Search, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

const API = 'http://localhost:8000';
const PAGE_SIZE = 15;

const RISK_CONFIG = {
  critical: { color: '#ef4444', label: 'Critical' },
  high:     { color: '#f97316', label: 'High' },
  medium:   { color: '#f59e0b', label: 'Medium' },
  low:      { color: '#10b981', label: 'Low' },
  good:     { color: '#3b82f6', label: 'Good' },
  excellent:{ color: '#10b981', label: 'Excellent' },
};

export default function AdminScans() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await fetch(`${API}/api/admin/scans/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setScans(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = scans.filter(s => {
    const matchSearch = s.domain?.toLowerCase().includes(search.toLowerCase()) ||
      s.target_url?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || s.risk_level === riskFilter;
    return matchSearch && matchRisk;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const riskCounts = scans.reduce((acc, s) => { acc[s.risk_level] = (acc[s.risk_level] || 0) + 1; return acc; }, {});

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
              Security Monitoring
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Platform-wide scans — website, SSL, WHOIS, port, URL, and threat checks.
            </p>
          </div>

          <button onClick={fetchScans} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Summary Filter Cards (Metis Style) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.5rem'
        }}>
          {[['all', 'Total Scans', scans.length, '#6366f1'], ...Object.entries(RISK_CONFIG).map(([k, v]) => [k, v.label, riskCounts[k] || 0, v.color])].map(([k, label, count, color]) => {
            const isSelected = riskFilter === k;
            return (
              <button
                key={k}
                onClick={() => { setRiskFilter(k); setPage(1); }}
                className="admin-card"
                style={{
                  padding: '1rem',
                  border: isSelected ? `2px solid ${color}` : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  backgroundColor: isSelected ? (isDark ? `${color}20` : `${color}10`) : 'var(--admin-card-bg, #ffffff)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isSelected ? color : 'var(--admin-text-main, #0f172a)', lineHeight: 1.1 }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.72rem', color: isSelected ? color : 'var(--admin-text-muted, #64748b)', fontWeight: 600, marginTop: '0.35rem' }}>
                  {label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Table Container Card */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          {/* Search Bar */}
          <div style={{ marginBottom: '1.25rem', position: 'relative', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search by domain or URL..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading scans...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No scans found matching criteria.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th># ID</th>
                    <th>DOMAIN</th>
                    <th>HTTPS</th>
                    <th>SCORE</th>
                    <th>RISK LEVEL</th>
                    <th>SCANNED AT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(scan => {
                    const rc = RISK_CONFIG[scan.risk_level] || { color: '#64748b', label: scan.risk_level };
                    return (
                      <React.Fragment key={scan.id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                        >
                          <td style={{ fontWeight: 600, color: 'var(--admin-text-muted, #64748b)' }}>#{scan.id}</td>
                          <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>{scan.domain}</td>
                          <td>{scan.is_https ? '✅' : '❌'}</td>
                          <td style={{ fontWeight: 700, color: scan.security_score >= 70 ? '#10b981' : scan.security_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                            {scan.security_score}/100
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: `${rc.color}15`,
                              color: rc.color,
                              border: `1px solid ${rc.color}35`,
                              display: 'inline-block'
                            }}>
                              {scan.risk_level_display || rc.label}
                            </span>
                          </td>
                          <td style={{ color: 'var(--admin-text-muted, #64748b)' }}>
                            {new Date(scan.scanned_at).toLocaleString()}
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {expanded === scan.id ? '▲' : '▼'}
                          </td>
                        </tr>
                        {expanded === scan.id && (
                          <tr>
                            <td colSpan={7} style={{ padding: '1rem 1.25rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                              <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-main, #0f172a)', lineHeight: 1.6 }}>
                                <strong style={{ color: '#6366f1' }}>Scan Metadata:</strong> Domain: {scan.domain} | IP: {scan.ip_address || 'N/A'} | Server: {scan.server_header || 'N/A'}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Showing page {page} of {totalPages} ({filtered.length} total)
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="admin-btn-secondary"
                  style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="admin-btn-secondary"
                  style={{ opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminSidebar>
  );
}
