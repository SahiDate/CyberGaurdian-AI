import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const StatusBadge = ({ status }) => {
  const cfg = { COMPLETED: { color: '#39d353', bg: 'rgba(57,211,83,0.12)' }, FAILED: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' }, RUNNING: { color: '#388bfd', bg: 'rgba(56,139,253,0.12)' } };
  const s = cfg[status] || { color: '#8b949e', bg: 'rgba(139,148,158,0.12)' };
  return <span style={{ ...s, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>{status || 'UNKNOWN'}</span>;
};

export default function AdminAIAgent() {
  const { authTokens } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => { fetchActivities(); }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API}/api/admin/ai-activity/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setActivities(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = activities.filter(a =>
    !search ||
    a.target?.toLowerCase().includes(search.toLowerCase()) ||
    a.request_text?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const totalCompleted = activities.filter(a => a.execution_status === 'COMPLETED').length;
  const totalFailed = activities.filter(a => a.execution_status === 'FAILED').length;

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 800 }}>🧠 AI Agent Monitor</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Observability of AI agent decisions, tool selections, and execution results.
          </p>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            ['Total Requests', activities.length, '#388bfd'],
            ['Completed', totalCompleted, '#39d353'],
            ['Failed', totalFailed, '#f85149'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.8px', marginBottom: '0.3rem' }}>{label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>

        <input
          placeholder="Search by target or request..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: '100%', maxWidth: '480px', marginBottom: '1.25rem', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
        />

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading AI activities...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No AI activity records found.</div>
          ) : (
            <div className="table-responsive-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {['#', 'Target', 'User Request', 'Tools Selected', 'Status', 'Risk', 'Time', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(act => (
                  <React.Fragment key={act.id}>
                    <tr onClick={() => setExpanded(expanded === act.id ? null : act.id)} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>#{act.id}</td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#58a6ff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.target || '—'}</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.request_text}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {(act.tools_selected || []).slice(0, 3).map(t => (
                            <span key={t} style={{ background: 'rgba(56,139,253,0.15)', color: '#388bfd', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{t}</span>
                          ))}
                          {(act.tools_selected || []).length > 3 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>+{act.tools_selected.length - 3}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}><StatusBadge status={act.execution_status} /></td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: act.risk_score >= 70 ? '#f85149' : act.risk_score >= 40 ? '#e3b341' : '#39d353' }}>{act.risk_score}/100</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{new Date(act.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.65rem 1rem', color: '#388bfd' }}>{expanded === act.id ? '▲' : '▼'}</td>
                    </tr>
                    {expanded === act.id && (
                      <tr>
                        <td colSpan={8} style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.3)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', fontSize: '0.82rem' }}>
                            <div>
                              <div style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.8px' }}>User Request</div>
                              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '6px', color: '#fff', lineHeight: 1.6 }}>{act.request_text}</div>
                            </div>
                            <div>
                              <div style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.8px' }}>Tools Selected</div>
                              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '6px' }}>
                                {(act.tools_selected || []).length > 0
                                  ? (act.tools_selected || []).map(t => <div key={t} style={{ color: '#388bfd', marginBottom: '0.25rem' }}>• {t}</div>)
                                  : <span style={{ color: 'rgba(255,255,255,0.3)' }}>No tools recorded</span>
                                }
                              </div>
                            </div>
                            {act.result_summary && (
                              <div style={{ gridColumn: '1/-1' }}>
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.8px' }}>AI Summary</div>
                                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '6px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{act.result_summary}</div>
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
