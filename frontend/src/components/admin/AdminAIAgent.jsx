import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bot, RotateCw, Search, X, Eye } from 'lucide-react';

const API = 'http://localhost:8000';
const PAGE_SIZE = 15;

const StatusBadge = ({ status }) => {
  const map = {
    COMPLETED: { bg: '#10b981', label: 'Completed' },
    RUNNING:   { bg: '#3b82f6', label: 'Running' },
    FAILED:    { bg: '#ef4444', label: 'Failed' },
    FAILED_AI: { bg: '#f59e0b', label: 'AI Offline' },
  };
  const cfg = map[status] || { bg: '#64748b', label: status || 'Unknown' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 9px',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      backgroundColor: `${cfg.bg}15`,
      color: cfg.bg,
      border: `1px solid ${cfg.bg}35`
    }}>
      {cfg.label}
    </span>
  );
};

const SeverityBadge = ({ severity }) => {
  const map = {
    CRITICAL: '#ef4444',
    HIGH:     '#f97316',
    MEDIUM:   '#f59e0b',
    LOW:      '#10b981',
  };
  const color = map[severity] || '#64748b';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 9px',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      backgroundColor: `${color}15`,
      color,
      border: `1px solid ${color}35`
    }}>
      {severity || 'INFO'}
    </span>
  );
};

export default function AdminAIAgent() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchAnalytics();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/ai-agent/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/ai-agent/analytics/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const inspectSessionDetail = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/ai-agent/${id}/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) setSelectedSession(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const sessionsList = Array.isArray(sessions) ? sessions : [];
  const filtered = sessionsList.filter(s => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      s.target?.toLowerCase().includes(term) ||
      s.username?.toLowerCase().includes(term) ||
      s.summary?.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchSeverity = severityFilter === 'ALL' || s.severity === severityFilter;
    return matchSearch && matchStatus && matchSeverity;
  });

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
              Autonomous AI Agent Monitor
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Telemetry, LangGraph execution steps, tool decisions, and deterministic SOC scores.
            </p>
          </div>

          <button onClick={() => { fetchSessions(); fetchAnalytics(); }} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Analytics Summary Cards (Metis Style) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div className="admin-card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
              Total Sessions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
              {analytics?.total_sessions ?? sessions.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
              AI invocations
            </div>
          </div>

          <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
              Completed
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', margin: '0.2rem 0' }}>
              {analytics?.status_breakdown?.completed ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Resolved tasks
            </div>
          </div>

          <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ef4444' }}>
              High / Critical
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444', margin: '0.2rem 0' }}>
              {(analytics?.severity_breakdown?.high || 0) + (analytics?.severity_breakdown?.critical || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Flagged investigations
            </div>
          </div>

          <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>
              Avg Steps
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b', margin: '0.2rem 0' }}>
              {analytics?.avg_steps ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Decision cycles
            </div>
          </div>
        </div>

        {/* Sessions Table Card */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          {/* Filters */}
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
                placeholder="Search target, user, or summary..."
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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="RUNNING">Running</option>
                <option value="FAILED">Failed</option>
                <option value="FAILED_AI">AI Offline</option>
              </select>

              <select
                value={severityFilter}
                onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>Loading AI Agent sessions...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>No AI Agent session records match your filters.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th># ID</th>
                    <th>USER</th>
                    <th>TARGET</th>
                    <th>STATUS</th>
                    <th>SOC RISK</th>
                    <th>SEVERITY</th>
                    <th>CONFIDENCE</th>
                    <th>TOOLS USED</th>
                    <th>DATE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(sess => (
                    <tr key={sess.id}>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-muted, #64748b)' }}>#{sess.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>{sess.username}</td>
                      <td style={{ fontWeight: 600, color: '#6366f1', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sess.target}
                      </td>
                      <td><StatusBadge status={sess.status} /></td>
                      <td style={{ fontWeight: 700, color: sess.risk_score >= 50 ? '#ef4444' : '#10b981' }}>
                        {sess.risk_score}/100
                      </td>
                      <td><SeverityBadge severity={sess.severity} /></td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', fontWeight: 600 }}>{sess.confidence}%</td>
                      <td>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {(sess.tools_used || []).slice(0, 3).map(t => (
                            <span key={t} style={{
                              backgroundColor: isDark ? '#334155' : '#f1f5f9',
                              color: '#6366f1',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}>
                              {t}
                            </span>
                          ))}
                          {(sess.tools_used || []).length > 3 && (
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                              +{sess.tools_used.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {new Date(sess.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => inspectSessionDetail(sess.id)}
                          className="admin-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
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
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="admin-btn-secondary"
                  style={{ opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drilldown Modal */}
        {selectedSession && (
          <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
          }}>
            <div className="admin-card" style={{
              borderRadius: '16px',
              maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
              padding: '2rem', boxSizing: 'border-box',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--admin-text-main, #0f172a)', fontWeight: 700 }}>
                    Agent Session #{selectedSession.id}: {selectedSession.target}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted, #64748b)', marginTop: '0.25rem' }}>
                    Triggered by <strong style={{ color: '#6366f1' }}>{selectedSession.username}</strong> on {new Date(selectedSession.created_at).toLocaleString()}
                  </div>
                </div>

                <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                  <div style={{ marginTop: '0.2rem' }}><StatusBadge status={selectedSession.status} /></div>
                </div>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>SOC Risk</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedSession.risk_score >= 50 ? '#ef4444' : '#10b981' }}>{selectedSession.risk_score}/100</div>
                </div>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Severity</div>
                  <div style={{ marginTop: '0.2rem' }}><SeverityBadge severity={selectedSession.severity} /></div>
                </div>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1' }}>{selectedSession.confidence}%</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Executive Summary</h4>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--admin-text-main, #0f172a)' }}>
                  {selectedSession.summary || 'No summary recorded.'}
                </div>
              </div>

              {/* Execution Steps */}
              {selectedSession.steps && selectedSession.steps.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>LangGraph Execution Steps ({selectedSession.steps.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSession.steps.map((step, idx) => (
                      <div key={idx} style={{ padding: '0.75rem 1rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6366f1', fontWeight: 700 }}>
                          <span>Step {step.step_number}: {step.action}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{step.status}</span>
                        </div>
                        <div style={{ color: 'var(--admin-text-main, #0f172a)', marginTop: '0.2rem' }}>
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
                  className="admin-btn-primary"
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
