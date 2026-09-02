import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';

const API = 'http://localhost:8000';

const SEVERITY_COLORS = {
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#f87171' },
  HIGH:     { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#fb923c' },
  MEDIUM:   { bg: 'rgba(234, 179, 8, 0.15)',  border: '#eab308', text: '#fde047' },
  LOW:      { bg: 'rgba(34, 197, 94, 0.15)',  border: '#22c55e', text: '#4ade80' },
};

export default function AdminSOCAnalysis() {
  const { authTokens } = useContext(AuthContext);
  const [analyses, setAnalyses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [threatLevelFilter, setThreatLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = authTokens?.access || localStorage.getItem('access_token');

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    fetchAnalytics();
    fetchAnalyses();
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchAnalytics();
      fetchAnalyses();
    });
    return () => unsubscribe();
  }, [severityFilter, threatLevelFilter, statusFilter, search]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/soc/analytics/`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load SOC analytics:', err);
    }
  };

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/admin/soc/?`;
      if (search) url += `q=${encodeURIComponent(search)}&`;
      if (severityFilter) url += `severity=${encodeURIComponent(severityFilter)}&`;
      if (threatLevelFilter) url += `threat_level=${encodeURIComponent(threatLevelFilter)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await fetch(url, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data);
      }
    } catch (err) {
      console.error('Failed to load platform SOC analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/soc/${id}/`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRecord(data);
      }
    } catch (err) {
      console.error('Failed to inspect SOC record:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800 }}>
              <span>🧠</span> SOC Analysis Engine Operations
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Platform-wide correlated multi-module security evidence, unified threat scores, and audit logging.
            </p>
          </div>
          <button
            onClick={fetchAnalyses}
            className="glass-panel"
            style={{
              padding: '0.55rem 1.1rem',
              background: 'rgba(56,139,253,0.15)',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
          >
            🔄 Refresh SOC Stream
          </button>
        </div>

        {/* Analytics KPIs */}
        {analytics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Total Analyses</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{analytics.total_analyses}</div>
            </div>
            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--accent-color)', padding: '1.25rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-color)' }}>Analyses Today</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.2rem' }}>+{analytics.analyses_today}</div>
            </div>
            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', padding: '1.25rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--warning-color)' }}>High/Crit Threats</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning-color)', marginTop: '0.2rem' }}>{analytics.threats_detected}</div>
            </div>
            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', padding: '1.25rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--danger-color)' }}>Critical Severities</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--danger-color)', marginTop: '0.2rem' }}>
                {analytics.severity_breakdown?.critical || 0}
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search by target, user, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAnalyses()}
            className="glass-panel"
            style={{
              flex: '1 1 240px',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="glass-panel"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={threatLevelFilter}
            onChange={(e) => setThreatLevelFilter(e.target.value)}
            className="glass-panel"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}
          >
            <option value="">All Threat Levels</option>
            <option value="CRITICAL">Critical Threat</option>
            <option value="HIGH">High Threat</option>
            <option value="MEDIUM">Medium Threat</option>
            <option value="LOW">Low Threat</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
          </select>
          <button
            onClick={fetchAnalyses}
            className="glass-panel"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--accent-color)',
              background: 'var(--accent-color)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Apply Filter
          </button>
        </div>

        {/* Analyses Table */}
        <div className="glass-panel" style={{
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>Loading platform telemetry...</div>
          ) : analyses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No SOC analyses matching filters.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>ID</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>User</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Target</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Type</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Risk Score</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Severity</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Threat Level</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Findings</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Created At</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((rec) => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>#{rec.id}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontWeight: 700 }}>{rec.username}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{rec.target}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{rec.analysis_type}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: SEVERITY_COLORS[rec.severity]?.text || 'var(--accent-color)' }}>
                        {rec.risk_score}/100
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.73rem',
                          fontWeight: 800,
                          background: SEVERITY_COLORS[rec.severity]?.bg,
                          color: SEVERITY_COLORS[rec.severity]?.text
                        }}>
                          {rec.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>{rec.threat_level}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rec.findings?.length || 0}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(rec.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleInspect(rec.id)}
                          className="glass-panel"
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--accent-color)',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: 'var(--accent-color)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Deep Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deep Inspection Modal */}
        {selectedRecord && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              borderRadius: '16px',
              width: '100%',
              maxWidth: '950px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              border: '1px solid var(--accent-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 800 }}>
                    Platform SOC Inspection #{selectedRecord.id}: {selectedRecord.target}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Owner: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{selectedRecord.username}</span> • Type: {selectedRecord.analysis_type}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 700 }}>Executive Summary:</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.25rem', lineHeight: 1.5 }}>{selectedRecord.summary}</div>
              </div>

              {/* Correlations */}
              {selectedRecord.correlations && selectedRecord.correlations.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--warning-color)', fontWeight: 700 }}>Cross-Module Correlations:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedRecord.correlations.map((c, i) => (
                      <div key={i} className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>[{c.rule_id}] {c.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{c.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontWeight: 700 }}>Unified Findings ({selectedRecord.findings?.length || 0}):</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedRecord.findings?.map((f, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{f.finding_id}: {f.title}</span>
                        <span style={{ color: SEVERITY_COLORS[f.severity]?.text }}>{f.severity}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{f.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '0.25rem', fontWeight: 600 }}>Sources: {f.sources?.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="glass-panel"
                  style={{
                    padding: '0.6rem 1.6rem',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-color)',
                    background: 'var(--accent-color)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
