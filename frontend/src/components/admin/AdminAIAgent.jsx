import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SeverityBadge = ({ severity }) => {
  const cfg = {
    CRITICAL: { bg: 'rgba(248,81,73,0.18)', color: '#f85149', border: '#f85149' },
    HIGH: { bg: 'rgba(210,153,34,0.18)', color: '#d29922', border: '#d29922' },
    MEDIUM: { bg: 'rgba(230,192,60,0.18)', color: '#e3b341', border: '#e3b341' },
    LOW: { bg: 'rgba(57,211,83,0.18)', color: '#39d353', border: '#39d353' },
  };
  const s = cfg[severity] || { bg: 'rgba(139,148,158,0.18)', color: '#8b949e', border: '#8b949e' };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: 700
    }}>
      {severity || 'UNKNOWN'}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = {
    COMPLETED: { color: '#39d353', bg: 'rgba(57,211,83,0.12)' },
    FAILED: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
    FAILED_AI: { color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
    RUNNING: { color: '#388bfd', bg: 'rgba(56,139,253,0.12)' }
  };
  const s = cfg[status] || { color: '#8b949e', bg: 'rgba(139,148,158,0.12)' };
  return (
    <span style={{
      ...s,
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: 700
    }}>
      {status === 'FAILED_AI' ? 'AI OFFLINE (FALLBACK)' : status || 'UNKNOWN'}
    </span>
  );
};

export default function AdminAIAgent() {
  const { authTokens } = useContext(AuthContext);

  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [selectedSession, setSelectedSession] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchAnalytics();
  }, [statusFilter, severityFilter]);

  const fetchSessions = async () => {
    try {
      let url = `${API}/api/admin/agent/?`;
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (severityFilter !== 'ALL') url += `severity=${severityFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setSessions(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/agent/analytics/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const inspectSessionDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/admin/agent/${id}/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        setSelectedSession(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = sessions.filter(s =>
    !search ||
    s.target?.toLowerCase().includes(search.toLowerCase()) ||
    s.username?.toLowerCase().includes(search.toLowerCase()) ||
    s.summary?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        {/* Title */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 800 }}>
            🧠 Autonomous AI Agent Observability
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Telemetry, LangGraph execution steps, tool registry decisions, and deterministic SOC scores.
          </p>
        </div>

        {/* Analytics Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            ['Total Sessions', analytics?.total_sessions ?? sessions.length, '#388bfd'],
            ['Completed', analytics?.status_breakdown?.completed ?? 0, '#39d353'],
            ['High / Critical', (analytics?.severity_breakdown?.high || 0) + (analytics?.severity_breakdown?.critical || 0), '#f85149'],
            ['Avg Steps', analytics?.avg_steps ?? 0, '#a371f7'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.8px', marginBottom: '0.3rem' }}>{label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
          <input
            placeholder="Search by target, user, or summary..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
          />

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.65rem 1rem', background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">Running</option>
            <option value="FAILED">Failed</option>
            <option value="FAILED_AI">AI Offline (Fallback)</option>
          </select>

          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.65rem 1rem', background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading AI Agent sessions...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No AI Agent session records match your filters.</div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '760px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['#', 'User', 'Target', 'Status', 'SOC Risk', 'Severity', 'Confidence', 'Tools Used', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(sess => (
                    <tr key={sess.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>#{sess.id}</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{sess.username}</td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#58a6ff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.target}</td>
                      <td style={{ padding: '0.65rem 1rem' }}><StatusBadge status={sess.status} /></td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: sess.risk_score >= 50 ? '#f85149' : '#39d353' }}>{sess.risk_score}/100</td>
                      <td style={{ padding: '0.65rem 1rem' }}><SeverityBadge severity={sess.severity} /></td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{sess.confidence}%</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {(sess.tools_used || []).slice(0, 3).map(t => (
                            <span key={t} style={{ background: 'rgba(56,139,253,0.12)', color: '#58a6ff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>{t}</span>
                          ))}
                          {(sess.tools_used || []).length > 3 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>+{sess.tools_used.length - 3}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{new Date(sess.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => inspectSessionDetail(sess.id)}
                          style={{ padding: '0.3rem 0.65rem', background: 'rgba(56,139,253,0.12)', border: '1px solid #388bfd', borderRadius: '6px', color: '#58a6ff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Inspect
                        </button>
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

        {/* Drilldown Modal */}
        {selectedSession && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <div style={{
              background: '#0d1117',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#58a6ff' }}>
                    Agent Session #{selectedSession.id}: {selectedSession.target}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                    Triggered by <strong>{selectedSession.username}</strong> on {new Date(selectedSession.created_at).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSession(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ marginTop: '0.2rem' }}><StatusBadge status={selectedSession.status} /></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>SOC Risk</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedSession.risk_score >= 50 ? '#f85149' : '#39d353' }}>{selectedSession.risk_score}/100</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Severity</div>
                  <div style={{ marginTop: '0.2rem' }}><SeverityBadge severity={selectedSession.severity} /></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Confidence</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#388bfd' }}>{selectedSession.confidence}%</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Executive Summary</h4>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '6px', fontSize: '0.85rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.85)' }}>
                  {selectedSession.summary || 'No summary recorded.'}
                </div>
              </div>

              {/* Execution Steps */}
              {selectedSession.steps && selectedSession.steps.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>LangGraph Execution Steps ({selectedSession.steps.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSession.steps.map((step, idx) => (
                      <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#58a6ff', fontWeight: 700 }}>
                          <span>Step {step.step_number}: {step.action}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{step.status}</span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.2rem' }}>
                          {step.reasoning_summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setSelectedSession(null)}
                  style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
