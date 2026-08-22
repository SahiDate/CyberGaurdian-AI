import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000';

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
      padding: '0.2rem 0.55rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.5px'
    }}>
      {severity || 'UNKNOWN'}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = {
    COMPLETED: { bg: 'rgba(57,211,83,0.15)', color: '#39d353' },
    PARTIAL: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
    GENERATING: { bg: 'rgba(56,139,253,0.15)', color: '#388bfd' },
    PENDING: { bg: 'rgba(163,113,247,0.15)', color: '#a371f7' },
    FAILED: { bg: 'rgba(248,81,73,0.15)', color: '#f85149' },
  };
  const s = cfg[status] || { bg: 'rgba(139,148,158,0.15)', color: '#8b949e' };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '0.2rem 0.55rem',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: 600
    }}>
      {status || 'UNKNOWN'}
    </span>
  );
};

export default function UserReports() {
  const { authTokens } = useContext(AuthContext);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Generation Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [reportType, setReportType] = useState('COMPREHENSIVE');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Selected Detail Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [severityFilter, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/reports/?`;
      if (severityFilter !== 'ALL') url += `severity=${severityFilter}&`;
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch(`${API_BASE}/api/reports/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({
          target: targetInput.trim(),
          report_type: reportType
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowGenModal(false);
        setTargetInput('');
        fetchReports();
        setSelectedReport(data);
      } else {
        setGenError(data.error || JSON.stringify(data));
      }
    } catch (err) {
      setGenError(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const inspectReportDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}/`, {
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
      const res = await fetch(`${API_BASE}/api/reports/${id}/${format}/`, {
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
      a.download = `Report_${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Download error: ${err.message}`);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        if (selectedReport?.id === id) setSelectedReport(null);
        fetchReports();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredReports = reports.filter(r =>
    !search ||
    r.target?.toLowerCase().includes(search.toLowerCase()) ||
    r.report_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              📑 Security Assessment Reports
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
              Deterministic audit documentation, SOC evidence correlation, and multi-format exports (PDF, JSON, CSV).
            </p>
          </div>

          <button
            onClick={() => setShowGenModal(true)}
            style={{
              padding: '0.65rem 1.3rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ⚡ Generate Report
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
          <input
            placeholder="Search by target or report ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '240px',
              padding: '0.65rem 1rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />

          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              background: '#161b22',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              background: '#161b22',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Reports Table Panel */}
        <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading security reports...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📑</div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No reports found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                Run security scans or generate a comprehensive assessment report for any target.
              </p>
              <button
                onClick={() => setShowGenModal(true)}
                style={{
                  padding: '0.5rem 1.1rem',
                  background: 'var(--accent-color)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Generate First Report
              </button>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color)' }}>
                    {['Report ID', 'Target', 'Type', 'Status', 'SOC Risk', 'Severity', 'Confidence', 'Date', 'Exports', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(rpt => (
                    <tr key={rpt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#58a6ff' }}>
                        {rpt.report_id || `RPT-${rpt.id}`}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rpt.target || rpt.domain || 'Target'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {rpt.report_type || 'EXECUTIVE'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <StatusBadge status={rpt.status} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: (rpt.risk_score || rpt.security_score || 0) >= 50 ? '#f85149' : '#39d353' }}>
                        {rpt.risk_score ?? rpt.security_score ?? 0}/100
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <SeverityBadge severity={rpt.severity || (rpt.risk_level === 'high' ? 'HIGH' : 'LOW')} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {rpt.confidence ? `${rpt.confidence}%` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(rpt.created_at || rpt.scanned_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => downloadReportFile(rpt.id, 'pdf')}
                            title="Download PDF"
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '4px', color: '#f85149', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => downloadReportFile(rpt.id, 'json')}
                            title="Export JSON"
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(56,139,253,0.12)', border: '1px solid rgba(56,139,253,0.3)', borderRadius: '4px', color: '#58a6ff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            JSON
                          </button>
                          <button
                            onClick={() => downloadReportFile(rpt.id, 'csv')}
                            title="Export CSV"
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(57,211,83,0.12)', border: '1px solid rgba(57,211,83,0.3)', borderRadius: '4px', color: '#39d353', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            CSV
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => inspectReportDetail(rpt.id)}
                          style={{
                            padding: '0.3rem 0.75rem',
                            background: 'rgba(56,139,253,0.15)',
                            border: '1px solid #388bfd',
                            borderRadius: '6px',
                            color: '#58a6ff',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            marginRight: '0.5rem'
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteReport(rpt.id)}
                          style={{
                            padding: '0.3rem 0.55rem',
                            background: 'rgba(248,81,73,0.1)',
                            border: '1px solid rgba(248,81,73,0.3)',
                            borderRadius: '6px',
                            color: '#f85149',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Generate Report Modal */}
        {showGenModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
          }}>
            <div style={{
              background: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '12px',
              maxWidth: '520px', width: '100%', padding: '1.75rem', boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>⚡ Generate Security Report</h3>
                <button onClick={() => setShowGenModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleGenerateReport}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    Target Host / Domain / IP / Hash
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. example.com, 192.168.1.1, or hash"
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff',
                      fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    style={{
                      width: '100%', padding: '0.7rem 0.9rem', background: '#161b22',
                      border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff',
                      fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                    }}
                  >
                    <option value="COMPREHENSIVE">📑 Comprehensive Security Assessment</option>
                    <option value="SOC_ASSESSMENT">🧠 SOC Security Assessment</option>
                    <option value="AI_SECURITY_ASSESSMENT">🤖 AI-Assisted Security Assessment</option>
                  </select>
                </div>

                {genError && (
                  <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(248,81,73,0.15)', border: '1px solid #f85149', borderRadius: '6px', color: '#f85149', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    ❌ {genError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowGenModal(false)}
                    style={{ padding: '0.6rem 1.1rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating || !targetInput.trim()}
                    style={{
                      padding: '0.6rem 1.4rem', background: generating ? 'rgba(56,139,253,0.4)' : 'var(--accent-color)',
                      border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: generating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {generating ? 'Generating Report...' : 'Build Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detailed Interactive Report Modal */}
        {selectedReport && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
          }}>
            <div style={{
              background: '#0d1117', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
              maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
              padding: '1.75rem', boxSizing: 'border-box'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#58a6ff', fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedReport.report_id} — {selectedReport.report_type}
                  </div>
                  <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem', color: '#fff' }}>
                    {selectedReport.title || `Security Report for ${selectedReport.target}`}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'pdf')} style={{ padding: '0.35rem 0.75rem', background: 'rgba(248,81,73,0.15)', border: '1px solid #f85149', color: '#f85149', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    PDF
                  </button>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'json')} style={{ padding: '0.35rem 0.75rem', background: 'rgba(56,139,253,0.15)', border: '1px solid #388bfd', color: '#58a6ff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    JSON
                  </button>
                  <button onClick={() => downloadReportFile(selectedReport.id, 'csv')} style={{ padding: '0.35rem 0.75rem', background: 'rgba(57,211,83,0.15)', border: '1px solid #39d353', color: '#39d353', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    CSV
                  </button>
                  <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
                </div>
              </div>

              {/* Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #f85149' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SOC Risk Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (selectedReport.risk_score || 0) >= 50 ? '#f85149' : '#39d353', marginTop: '0.2rem' }}>
                    {selectedReport.risk_score || 0}/100
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #d29922' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Severity Level</div>
                  <div style={{ marginTop: '0.35rem' }}><SeverityBadge severity={selectedReport.severity} /></div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #388bfd' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#388bfd', marginTop: '0.2rem' }}>
                    {selectedReport.confidence || 0}%
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #a371f7' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Report Status</div>
                  <div style={{ marginTop: '0.35rem' }}><StatusBadge status={selectedReport.status} /></div>
                </div>
              </div>

              {/* Executive Summary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Executive Security Summary
                </h4>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.88rem', lineHeight: '1.5', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {selectedReport.summary || 'Assessment completed successfully.'}
                </div>
              </div>

              {/* Module Summary */}
              {selectedReport.structured_data?.module_summary && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Security Module Telemetry
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    {Object.entries(selectedReport.structured_data.module_summary).map(([mod, st]) => (
                      <div key={mod} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{mod}</span>
                        <strong style={{ color: String(st).includes('COMPLETED') || String(st).includes('AVAILABLE') ? '#39d353' : '#d29922' }}>{String(st)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Findings */}
              {selectedReport.structured_data?.findings && selectedReport.structured_data.findings.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Unified Security Findings ({selectedReport.structured_data.findings.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedReport.structured_data.findings.map((f, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', borderLeft: `3px solid ${f.severity === 'CRITICAL' ? '#f85149' : f.severity === 'HIGH' ? '#d29922' : '#388bfd'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700 }}>
                          <span style={{ color: '#fff' }}>{f.title || f.type}</span>
                          <SeverityBadge severity={f.severity} />
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          {f.description || f.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {selectedReport.structured_data?.recommendations && selectedReport.structured_data.recommendations.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Defensive Recommendations
                  </h4>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {selectedReport.structured_data.recommendations.map((r, i) => (
                        <li key={i} style={{ color: 'var(--text-main)' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Footer / Close Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Generated by CyberGuardian AI on {new Date(selectedReport.created_at).toLocaleString()}</span>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
