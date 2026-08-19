import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

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
  }, [severityFilter, threatLevelFilter, statusFilter]);

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          padding: '1.75rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🧠</span> SOC Analysis Engine Operations
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '0.95rem' }}>
            Platform-wide correlated multi-module security evidence, unified threat scores, and audit logging.
          </p>
        </div>
      </div>

      {/* Analytics KPIs */}
      {analytics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ background: 'var(--card-bg, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Total Analyses</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f8fafc' }}>{analytics.total_analyses}</div>
          </div>
          <div style={{ background: 'var(--card-bg, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Analyses Today</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#38bdf8' }}>{analytics.analyses_today}</div>
          </div>
          <div style={{ background: 'var(--card-bg, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>High/Crit Threats</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f87171' }}>{analytics.threats_detected}</div>
          </div>
          <div style={{ background: 'var(--card-bg, #1e293b)', padding: '1.25rem', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Critical Severities</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>
              {analytics.severity_breakdown?.critical || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{
        background: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search by target, user, or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchAnalyses()}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '0.55rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            fontSize: '0.9rem'
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
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            fontSize: '0.9rem'
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
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            background: '#0284c7',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Filter
        </button>
      </div>

      {/* Analyses Table */}
      <div style={{
        background: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading platform telemetry...</div>
        ) : analyses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No SOC analyses matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: 'var(--text-muted, #94a3b8)' }}>
                  <th style={{ padding: '0.75rem' }}>ID</th>
                  <th style={{ padding: '0.75rem' }}>User</th>
                  <th style={{ padding: '0.75rem' }}>Target</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Risk Score</th>
                  <th style={{ padding: '0.75rem' }}>Severity</th>
                  <th style={{ padding: '0.75rem' }}>Threat Level</th>
                  <th style={{ padding: '0.75rem' }}>Findings</th>
                  <th style={{ padding: '0.75rem' }}>Created At</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>#{rec.id}</td>
                    <td style={{ padding: '0.75rem', color: '#38bdf8' }}>{rec.username}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#f8fafc' }}>{rec.target}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>{rec.analysis_type}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: SEVERITY_COLORS[rec.severity]?.text || '#38bdf8' }}>
                      {rec.risk_score}/100
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: SEVERITY_COLORS[rec.severity]?.bg,
                        color: SEVERITY_COLORS[rec.severity]?.text
                      }}>
                        {rec.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{rec.threat_level}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{rec.findings?.length || 0}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(rec.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleInspect(rec.id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #38bdf8',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          fontSize: '0.8rem',
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '950px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#38bdf8' }}>
                  Platform SOC Inspection #{selectedRecord.id}: {selectedRecord.target}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Owner: {selectedRecord.username} • Type: {selectedRecord.analysis_type}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 'bold' }}>Executive Summary:</div>
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{selectedRecord.summary}</div>
            </div>

            {/* Correlations */}
            {selectedRecord.correlations && selectedRecord.correlations.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#fb923c' }}>Cross-Module Correlations:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedRecord.correlations.map((c, i) => (
                    <div key={i} style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '0.75rem', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fdba74', fontSize: '0.9rem' }}>[{c.rule_id}] {c.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Findings */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>Unified Findings ({selectedRecord.findings?.length || 0}):</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedRecord.findings?.map((f, i) => (
                  <div key={i} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{f.finding_id}: {f.title}</span>
                      <span style={{ color: SEVERITY_COLORS[f.severity]?.text }}>{f.severity}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>{f.description}</div>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.25rem' }}>Sources: {f.sources?.join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: '0.55rem 1.5rem',
                  borderRadius: '6px',
                  border: '1px solid #64748b',
                  background: '#334155',
                  color: '#fff',
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
    </div>
  );
}
