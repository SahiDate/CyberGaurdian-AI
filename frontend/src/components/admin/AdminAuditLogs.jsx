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
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>📜 Audit Logs</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Immutable audit trail of all administrator actions on the platform.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Search by action, admin, target..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, minWidth: '280px', maxWidth: '480px', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => { setLoading(true); fetchLogs(); }}
            style={{ padding: '0.6rem 1.1rem', background: 'rgba(56,139,253,0.1)', border: '1px solid rgba(56,139,253,0.3)', color: '#388bfd', borderRadius: '7px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}
          >
            ↺ Refresh
          </button>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
            {filtered.length} entries
          </span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading audit logs...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              {search ? 'No logs matching your search.' : 'No audit log entries yet.'}
            </div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['Timestamp', 'Admin', 'Action', 'Target User', 'Target Record', 'IP', 'Result'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => (
                    <tr key={log.id || i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#388bfd', whiteSpace: 'nowrap' }}>
                        {log.admin_username || log.admin || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#fff', fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{log.target_user || '—'}</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.target_record || '—'}</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.ip_address || '—'}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <span style={{ padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 700, background: log.result === 'SUCCESS' ? 'rgba(57,211,83,0.12)' : 'rgba(248,81,73,0.12)', color: log.result === 'SUCCESS' ? '#39d353' : '#f85149' }}>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>‹ Prev</button>
            <span style={{ padding: '0.4rem 0.85rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.83rem' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>Next ›</button>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
