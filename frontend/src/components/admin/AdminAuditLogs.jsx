import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

export default function AdminAuditLogs() {
  const { authTokens } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/api/admin/logs/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_username?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_user_username?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_record?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const resultColor = (result) => result === 'SUCCESS' ? '#39d353' : '#f85149';

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>📜 Audit Logs</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Immutable audit trail of all administrator actions on the platform.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Search by action, admin, target..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="glass-panel"
            style={{ flex: 1, minWidth: '280px', maxWidth: '480px', padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => { setLoading(true); fetchLogs(); }}
            className="glass-panel"
            style={{ padding: '0.6rem 1.1rem', background: 'rgba(56,139,253,0.15)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 700 }}
          >
            ↺ Refresh
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filtered.length} entries
          </span>
        </div>

        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit logs...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {search ? 'No logs matching your search.' : 'No audit log entries yet.'}
            </div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Timestamp', 'Admin', 'Action', 'Target User', 'Target Record', 'IP', 'Result'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => (
                    <tr key={log.id || i} style={{ borderTop: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-color)', whiteSpace: 'nowrap' }}>
                        {log.admin_username || log.admin || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', fontWeight: 700 }}>{log.action}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', fontWeight: 600 }}>{log.target_user || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.target_record || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.ip_address || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: log.result === 'SUCCESS' ? 'rgba(57,211,83,0.15)' : 'rgba(248,81,73,0.15)', color: log.result === 'SUCCESS' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                          {log.result || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="glass-panel" style={{ padding: '0.4rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>‹ Prev</button>
            <span style={{ padding: '0.4rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="glass-panel" style={{ padding: '0.4rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>Next ›</button>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
