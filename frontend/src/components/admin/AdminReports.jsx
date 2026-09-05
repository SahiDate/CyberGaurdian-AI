import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FileCheck, RotateCw, Search, Download, X, Eye } from 'lucide-react';

const API = 'http://localhost:8000';
const PAGE_SIZE = 15;

const StatusBadge = ({ status }) => {
  const map = {
    COMPLETED: { bg: '#10b981', label: 'Completed' },
    PARTIAL:   { bg: '#f59e0b', label: 'Partial' },
    FAILED:    { bg: '#ef4444', label: 'Failed' },
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

export default function AdminReports() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);

  const getAuthHeaders = () => {
    let token = authTokens?.access;
    if (!token) {
      try {
        const stored = localStorage.getItem('authTokens');
        if (stored) token = JSON.parse(stored)?.access;
      } catch (e) {}
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchReports();
    fetchAnalytics();
  }, [authTokens]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/reports/`, {
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.results || data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/reports/analytics/`, {
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const downloadReportFile = async (id, format) => {
    try {
      const res = await fetch(`${API}/api/admin/reports/${id}/download/?format=${format}`, {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) {
        alert("Failed to download format.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CyberGuardian_Report_${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const inspectReportDetail = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/reports/${id}/`, {
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) setSelectedReport(await res.json());
    } catch (e) {
      console.error(e);
    }
  };


  const filtered = reports.filter(r => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      r.report_id?.toLowerCase().includes(term) ||
      r.target?.toLowerCase().includes(term) ||
      r.username?.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSeverity = severityFilter === 'ALL' || r.severity === severityFilter;
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
              Security Reports
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Platform-wide audit artifacts, SOC scoring, and multi-format compliance exports.
            </p>
          </div>

          <button onClick={() => { fetchReports(); fetchAnalytics(); }} className="admin-btn-secondary">
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Analytics Summary Cards (Metis Style matching requested options) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {/* Card 1: Total Records */}
          <div className="admin-card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--admin-text-muted, #64748b)' }}>
              Total Records
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', margin: '0.2rem 0' }}>
              {analytics?.total_reports ?? reports.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
              Generated audit reports
            </div>
          </div>

          {/* Card 2: Completed */}
          <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
              Completed
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', margin: '0.2rem 0' }}>
              {analytics?.status_breakdown?.completed ?? reports.filter(r => r.status === 'COMPLETED').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Successfully finalized
            </div>
          </div>

          {/* Card 3: High / Critical Risk */}
          <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ef4444' }}>
              High / Critical Risk
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444', margin: '0.2rem 0' }}>
              {(analytics?.severity_breakdown?.high || 0) + (analytics?.severity_breakdown?.critical || 0) || reports.filter(r => ['HIGH', 'CRITICAL'].includes(r.severity)).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Requires mitigation
            </div>
          </div>

          {/* Card 4: AVG SOC Risk */}
          <div className="admin-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>
              AVG SOC Risk
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b', margin: '0.2rem 0' }}>
              {analytics?.avg_risk_score ?? (reports.length > 0 ? Math.round(reports.reduce((acc, r) => acc + (r.risk_score || 0), 0) / reports.length) : 0)}/100
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
              Platform risk average
            </div>
          </div>
        </div>

        {/* Reports Table Container Card */}
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
                placeholder="Search report ID, target, or user..."
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
                <option value="PARTIAL">Partial</option>
                <option value="FAILED">Failed</option>
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
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>Loading security reports...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>No security reports found matching criteria.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>REPORT ID</th>
                    <th>USER</th>
                    <th>TARGET</th>
                    <th>STATUS</th>
                    <th>SOC RISK</th>
                    <th>SEVERITY</th>
                    <th>DATE</th>
                    <th>EXPORTS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(rpt => (
                    <tr key={rpt.id}>
                      <td style={{ fontWeight: 700, color: '#6366f1' }}>{rpt.report_id || `RPT-${rpt.id}`}</td>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>{rpt.username || 'User'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rpt.target || rpt.domain}
                      </td>
                      <td><StatusBadge status={rpt.status} /></td>
                      <td style={{ fontWeight: 700, color: (rpt.risk_score || rpt.security_score || 0) >= 50 ? '#ef4444' : '#10b981' }}>
                        {rpt.risk_score ?? rpt.security_score ?? 0}/100
                      </td>
                      <td><SeverityBadge severity={rpt.severity || (rpt.risk_level === 'high' ? 'HIGH' : 'LOW')} /></td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {new Date(rpt.created_at || rpt.scanned_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => downloadReportFile(rpt.id, 'pdf')}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => downloadReportFile(rpt.id, 'json')}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: 'rgba(99, 102, 241, 0.08)',
                              color: '#6366f1',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            JSON
                          </button>
                          <button
                            onClick={() => downloadReportFile(rpt.id, 'csv')}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            CSV
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => inspectReportDetail(rpt.id)}
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
                Showing page {page} of {totalPages} ({filtered.length} total)
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
        {selectedReport && (
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
                    {selectedReport.report_id} — {selectedReport.target}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted, #64748b)', marginTop: '0.25rem' }}>
                    Owner: <strong style={{ color: '#6366f1' }}>{selectedReport.username}</strong> | Type: <strong>{selectedReport.report_type}</strong> | Created: {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'pdf')} className="admin-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>PDF</button>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'json')} className="admin-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>JSON</button>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'csv')} className="admin-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>CSV</button>
                  <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: '0.5rem' }}><X size={20} /></button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                  <div style={{ marginTop: '0.2rem' }}><StatusBadge status={selectedReport.status} /></div>
                </div>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>SOC Risk</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: (selectedReport.risk_score || 0) >= 50 ? '#ef4444' : '#10b981' }}>{selectedReport.risk_score || 0}/100</div>
                </div>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Severity</div>
                  <div style={{ marginTop: '0.2rem' }}><SeverityBadge severity={selectedReport.severity} /></div>
                </div>
                <div className="admin-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1' }}>{selectedReport.confidence || 0}%</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Executive Summary</h4>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--admin-text-main, #0f172a)' }}>
                  {selectedReport.summary || 'No summary recorded.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setSelectedReport(null)}
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
