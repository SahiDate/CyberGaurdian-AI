import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { History, Search, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

const API = 'http://localhost:8000';
const PAGE_SIZE = 15;

export default function AdminAuditLogs() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/api/admin/audit-logs/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const logsList = Array.isArray(logs) ? logs : [];
  const filtered = logsList.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_username?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_user_username?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_record?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

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
              Audit Logs
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Immutable audit trail of all administrator actions across the platform.
            </p>
          </div>

          <button onClick={() => { setLoading(true); fetchLogs(); }} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Search action, admin, target..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.55rem 1rem 0.55rem 2.4rem',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', fontWeight: 600 }}>
              {filtered.length} entries recorded
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>Loading audit logs...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
              {search ? 'No logs matching your search.' : 'No audit log entries recorded yet.'}
            </div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>ADMIN</th>
                    <th>ACTION</th>
                    <th>TARGET USER</th>
                    <th>TARGET RECORD</th>
                    <th>IP ADDRESS</th>
                    <th>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => (
                    <tr key={log.id || i}>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, color: '#6366f1' }}>
                        {log.admin_username || 'System'}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>
                        {log.action}
                      </td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)' }}>
                        {log.target_user_username || '—'}
                      </td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.target_record || '—'}
                      </td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.ip_address || '—'}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: log.result === 'SUCCESS' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: log.result === 'SUCCESS' ? '#10b981' : '#ef4444',
                          border: `1px solid ${log.result === 'SUCCESS' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
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
                Page {page} of {totalPages}
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
