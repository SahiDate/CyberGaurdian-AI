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
    PARTIAL: { color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
    FAILED: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
    GENERATING: { color: '#388bfd', bg: 'rgba(56,139,253,0.12)' }
  };
  const s = cfg[status] || { color: '#8b949e', bg: 'rgba(139,148,158,0.12)' };
  return (
    <span style={{ ...s, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
      {status || 'UNKNOWN'}
    </span>
  );
};

export default function AdminReports() {
  const { authTokens } = useContext(AuthContext);

  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchAnalytics();
  }, [statusFilter, severityFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/admin/reports/?`;
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (severityFilter !== 'ALL') url += `severity=${severityFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setReports(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/reports/analytics/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const inspectReportDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/admin/reports/${id}/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        setSelectedReport(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadReportFile = async (id, format) => {
    try {
      const res = await fetch(`${API}/api/admin/reports/${id}/${format}/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (!res.ok) {
        alert(`Failed to download ${format.toUpperCase()} report.`);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Admin_Report_${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Download error: ${err.message}`);
    }
  };

  const filtered = reports.filter(r =>
    !search ||
    r.target?.toLowerCase().includes(search.toLowerCase()) ||
    r.report_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.username?.toLowerCase().includes(search.toLowerCase()) ||
    r.summary?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1350px', fontFamily: "'Inter', sans-serif" }}>
        {/* Title */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 800, color: 'var(--text-main)' }}>
            📑 Security Reports Observability & Compliance
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Platform-wide audit artifacts, deterministic SOC scoring, and multi-format exports.
          </p>
        </div>

        {/* Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            ['Total Reports', analytics?.total_reports ?? reports.length, 'var(--accent-color)'],
            ['Completed', analytics?.status_breakdown?.completed ?? 0, 'var(--success-color)'],
            ['High / Critical', (analytics?.severity_breakdown?.high || 0) + (analytics?.severity_breakdown?.critical || 0), 'var(--danger-color)'],
            ['Avg SOC Risk', `${analytics?.avg_risk_score ?? 0}/100`, 'var(--warning-color)'],
          ].map(([label, val, color]) => (
            <div key={label} className="glass-panel" style={{ borderLeft: `3.5px solid ${color}`, borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.3rem' }}>{label}</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
          <input
            placeholder="Search by report ID, target, user..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="glass-panel"
            style={{ flex: 1, minWidth: '240px', padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
          />

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="glass-panel"
            style={{ padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            className="glass-panel"
            style={{ padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading security reports...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No security reports found matching your filters.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '820px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Report ID', 'User', 'Target', 'Status', 'SOC Risk', 'Severity', 'Confidence', 'Date', 'Exports', ''].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(rpt => (
                    <tr key={rpt.id} style={{ borderTop: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-color)' }}>{rpt.report_id || `RPT-${rpt.id}`}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', fontWeight: 600 }}>{rpt.username || 'User'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rpt.target || rpt.domain}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={rpt.status} /></td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: (rpt.risk_score || rpt.security_score || 0) >= 50 ? 'var(--danger-color)' : 'var(--success-color)' }}>{rpt.risk_score ?? rpt.security_score ?? 0}/100</td>
                      <td style={{ padding: '0.85rem 1rem' }}><SeverityBadge severity={rpt.severity || (rpt.risk_level === 'high' ? 'HIGH' : 'LOW')} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>{rpt.confidence ? `${rpt.confidence}%` : '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(rpt.created_at || rpt.scanned_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => downloadReportFile(rpt.id, 'pdf')} className="glass-panel" style={{ padding: '0.2rem 0.45rem', background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.3)', color: 'var(--danger-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>PDF</button>
                          <button onClick={() => downloadReportFile(rpt.id, 'json')} className="glass-panel" style={{ padding: '0.2rem 0.45rem', background: 'rgba(56,139,253,0.12)', border: '1px solid rgba(56,139,253,0.3)', color: 'var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>JSON</button>
                          <button onClick={() => downloadReportFile(rpt.id, 'csv')} className="glass-panel" style={{ padding: '0.2rem 0.45rem', background: 'rgba(57,211,83,0.12)', border: '1px solid rgba(57,211,83,0.3)', color: 'var(--success-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>CSV</button>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => inspectReportDetail(rpt.id)}
                          className="glass-panel"
                          style={{ padding: '0.35rem 0.75rem', background: 'rgba(56,139,253,0.15)', border: '1px solid var(--accent-color)', borderRadius: '6px', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="glass-panel" style={{ padding: '0.4rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>‹ Prev</button>
            <span style={{ padding: '0.4rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="glass-panel" style={{ padding: '0.4rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem' }}>Next ›</button>
          </div>
        )}

        {/* Drilldown Modal */}
        {selectedReport && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              borderRadius: '16px',
              maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
              padding: '2rem', boxSizing: 'border-box', border: '1px solid var(--accent-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 800 }}>
                    {selectedReport.report_id} — {selectedReport.target}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Owner: <strong style={{ color: 'var(--accent-color)' }}>{selectedReport.username}</strong> | Type: <strong>{selectedReport.report_type}</strong> | Created: {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'pdf')} className="glass-panel" style={{ padding: '0.35rem 0.75rem', background: 'rgba(248,81,73,0.15)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    PDF
                  </button>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'json')} className="glass-panel" style={{ padding: '0.35rem 0.75rem', background: 'rgba(56,139,253,0.15)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    JSON
                  </button>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'csv')} className="glass-panel" style={{ padding: '0.35rem 0.75rem', background: 'rgba(57,211,83,0.15)', border: '1px solid var(--success-color)', color: 'var(--success-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    CSV
                  </button>
                  <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.4rem', cursor: 'pointer', marginLeft: '0.5rem', lineHeight: 1 }}>✕</button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                  <div style={{ marginTop: '0.2rem' }}><StatusBadge status={selectedReport.status} /></div>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>SOC Risk</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: (selectedReport.risk_score || 0) >= 50 ? 'var(--danger-color)' : 'var(--success-color)' }}>{selectedReport.risk_score || 0}/100</div>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Severity</div>
                  <div style={{ marginTop: '0.2rem' }}><SeverityBadge severity={selectedReport.severity} /></div>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-color)' }}>{selectedReport.confidence || 0}%</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Executive Summary</h4>
                <div className="glass-panel" style={{ padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                  {selectedReport.summary || 'No summary recorded.'}
                </div>
              </div>

              {/* Findings */}
              {selectedReport.structured_data?.findings && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Key Findings ({selectedReport.structured_data.findings.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedReport.structured_data.findings.map((f, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)', fontWeight: 700 }}>
                          <span>{f.title || f.type}</span>
                          <SeverityBadge severity={f.severity} />
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>{f.description || f.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="glass-panel"
                  style={{ padding: '0.55rem 1.35rem', background: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
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
