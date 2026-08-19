import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SEVERITY_COLORS = {
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#f87171' },
  HIGH:     { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#fb923c' },
  MEDIUM:   { bg: 'rgba(234, 179, 8, 0.15)',  border: '#eab308', text: '#fde047' },
  LOW:      { bg: 'rgba(34, 197, 94, 0.15)',  border: '#22c55e', text: '#4ade80' },
};

const THREAT_LEVEL_COLORS = {
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.25)', text: '#fca5a5' },
  HIGH:     { bg: 'rgba(249, 115, 22, 0.25)', text: '#fdba74' },
  MEDIUM:   { bg: 'rgba(234, 179, 8, 0.25)',  text: '#fef08a' },
  LOW:      { bg: 'rgba(34, 197, 94, 0.25)',  text: '#86efac' },
  REVIEW_REQUIRED: { bg: 'rgba(168, 85, 247, 0.25)', text: '#d8b4fe' }
};

export default function SOCAnalysis() {
  const { authTokens } = useContext(AuthContext);
  const [target, setTarget] = useState('');
  const [autoCorrelate, setAutoCorrelate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preCorrelating, setPreCorrelating] = useState(false);
  const [matchedArtifacts, setMatchedArtifacts] = useState(null);
  const [error, setError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [selectedSources, setSelectedSources] = useState({});

  const token = authTokens?.access || localStorage.getItem('access_token');

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/api/soc/history/`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load SOC analysis history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePreCorrelate = async () => {
    if (!target.trim()) {
      setError('Please enter a target domain, URL, IP, or file hash first.');
      return;
    }
    setError('');
    setPreCorrelating(true);
    setMatchedArtifacts(null);
    try {
      const res = await fetch(
        `${API}/api/soc/correlate-target/?target=${encodeURIComponent(target.trim())}`,
        { headers: getHeaders() }
      );
      const data = await res.json();
      if (res.ok) {
        setMatchedArtifacts(data.matched_records);
      } else {
        setError(data?.error || 'Failed to discover related scan records.');
      }
    } catch (err) {
      setError('Failed to discover related scan records.');
    } finally {
      setPreCorrelating(false);
    }
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    if (!target.trim()) {
      setError('Please provide a target domain, URL, IP, or file hash.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const payload = {
        target: target.trim(),
        auto_correlate: autoCorrelate,
        source_scan_ids: selectedSources
      };
      const res = await fetch(`${API}/api/soc/analyze/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentResult(data);
        fetchHistory();
      } else {
        setError(data?.error || 'SOC Analysis failed to process. Verify input.');
      }
    } catch (err) {
      setError('SOC Analysis failed to process. Verify input.');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) =>
    item.target.toLowerCase().includes(historySearch.toLowerCase()) ||
    (item.summary && item.summary.toLowerCase().includes(historySearch.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color, #0f172a)' }}>
      <Navbar />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', color: 'var(--text-color, #e2e8f0)' }}>
      {/* Header Banner */}
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
            <span>🧠</span> SOC Analysis Engine
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '0.95rem' }}>
            Deterministic multi-vector correlation across Threat Intel, Files, SSL, WHOIS, URLs, and Ports.
          </p>
        </div>
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid #38bdf8',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          color: '#38bdf8',
          fontWeight: '600'
        }}>
          100% Deterministic Engine
        </div>
      </div>

      {/* Target Input Card */}
      <div style={{
        background: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <form onSubmit={handleAnalyze}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontWeight: '600', fontSize: '0.95rem', color: '#f8fafc' }}>
              Target Identifier (Domain, URL, IPv4/IPv6, or SHA-256 File Hash)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. example.com, https://phish-login.xyz/auth, 198.51.100.25, or file hash"
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #475569)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handlePreCorrelate}
                disabled={preCorrelating || !target.trim()}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #64748b',
                  background: 'rgba(51, 65, 85, 0.5)',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  cursor: preCorrelating ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {preCorrelating ? '🔍 Searching...' : '🔍 Find Recent Scans'}
              </button>
              <button
                type="submit"
                disabled={loading || !target.trim()}
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                {loading ? '🧠 Correlating Telemetry...' : '⚡ Run SOC Analysis'}
              </button>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>Quick presets:</span>
              {['example.com', 'phish-bank-secure.xyz', 'api.internal-corp.net'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTarget(t)}
                  style={{
                    background: 'rgba(51, 65, 85, 0.4)',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    color: '#93c5fd',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoCorrelate}
                  onChange={(e) => setAutoCorrelate(e.target.checked)}
                />
                Auto-correlate all recent scans for this target domain/IP
              </label>
            </div>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#f87171',
            fontSize: '0.9rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Matched Artifacts Preview */}
        {matchedArtifacts && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid #334155'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#38bdf8' }}>
              🔗 Discovered User Telemetry Artifacts for Target:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(matchedArtifacts).map(([source, records]) => (
                <div key={source} style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  background: records.length ? 'rgba(30, 41, 59, 0.8)' : 'rgba(15, 23, 42, 0.4)',
                  border: records.length ? '1px solid #475569' : '1px dashed #334155'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: records.length ? '#e2e8f0' : '#64748b' }}>
                    {source.toUpperCase().replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: records.length ? '#4ade80' : '#94a3b8', marginTop: '0.25rem' }}>
                    {records.length ? `${records.length} recent record(s) found` : 'No prior scans'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analysis Result Display */}
      {currentResult && (
        <div style={{
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          padding: '1.75rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          {/* Top Result Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid var(--border-color, #334155)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                SOC Assessment Record #{currentResult.id} • {currentResult.analysis_type}
              </div>
              <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: '#f8fafc' }}>
                {currentResult.target}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                background: SEVERITY_COLORS[currentResult.severity]?.bg || 'rgba(100,116,139,0.2)',
                border: `1px solid ${SEVERITY_COLORS[currentResult.severity]?.border || '#64748b'}`,
                color: SEVERITY_COLORS[currentResult.severity]?.text || '#94a3b8'
              }}>
                {currentResult.severity} SEVERITY
              </span>
              <span style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                background: THREAT_LEVEL_COLORS[currentResult.threat_level]?.bg || 'rgba(56,189,248,0.2)',
                color: THREAT_LEVEL_COLORS[currentResult.threat_level]?.text || '#38bdf8'
              }}>
                {currentResult.threat_level} THREAT
              </span>
            </div>
          </div>

          {/* Metric KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>Risk Score</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: SEVERITY_COLORS[currentResult.severity]?.text || '#38bdf8' }}>
                {currentResult.risk_score}<span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span>
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>Confidence</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#38bdf8' }}>
                {currentResult.confidence}%
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>Telemetry Sources</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f8fafc' }}>
                {currentResult.evidence_sources?.length || 0}
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>Unified Findings</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f8fafc' }}>
                {currentResult.findings?.length || 0}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderLeft: '4px solid #38bdf8',
            borderRadius: '4px 8px 8px 4px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            fontSize: '0.95rem',
            lineHeight: '1.6'
          }}>
            <div style={{ fontWeight: '600', color: '#38bdf8', marginBottom: '0.25rem' }}>Executive SOC Summary:</div>
            {currentResult.summary}
          </div>

          {/* Active Correlations */}
          {currentResult.correlations && currentResult.correlations.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fb923c', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔥</span> Cross-Module Correlation Insights ({currentResult.correlations.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentResult.correlations.map((corr, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: 'rgba(249, 115, 22, 0.1)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#fdba74' }}>
                        [{corr.rule_id}] {corr.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', color: '#fdba74' }}>
                        Sources: {corr.sources?.join(' + ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                      {corr.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Findings List */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.75rem' }}>
              🛡️ Unified Security Findings ({currentResult.findings?.length || 0})
            </h3>
            {(!currentResult.findings || currentResult.findings.length === 0) ? (
              <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem' }}>No anomalous findings recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentResult.findings.map((f, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${SEVERITY_COLORS[f.severity]?.border || '#334155'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '0.95rem' }}>
                        <span style={{ color: '#38bdf8', marginRight: '0.5rem' }}>{f.finding_id}:</span>
                        {f.title}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: SEVERITY_COLORS[f.severity]?.bg,
                          color: SEVERITY_COLORS[f.severity]?.text
                        }}>
                          {f.severity}
                        </span>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: 'rgba(51, 65, 85, 0.5)',
                          color: '#cbd5e1'
                        }}>
                          {f.confidence}% Conf.
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                      {f.description}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                      <div>Traceable Sources: {f.sources?.join(', ')}</div>
                      {f.recommendation && (
                        <div style={{ color: '#38bdf8' }}>💡 {f.recommendation}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Recommendations */}
          {currentResult.recommendations && currentResult.recommendations.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#4ade80', marginBottom: '0.75rem' }}>
                💡 Actionable Remediation Guidance
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentResult.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ingested Sources Badges */}
          <div style={{ borderTop: '1px solid var(--border-color, #334155)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>Ingested Telemetry Sources:</span>
            {currentResult.evidence_sources?.map((s) => (
              <span key={s} style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* History Table Card */}
      <div style={{
        background: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
            📜 Your SOC Analysis History
          </h3>
          <input
            type="text"
            placeholder="Search history..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #475569)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>Loading records...</div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>
            No prior SOC analyses found. Enter a target above to generate one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #334155)', color: 'var(--text-muted, #94a3b8)' }}>
                  <th style={{ padding: '0.75rem' }}>ID</th>
                  <th style={{ padding: '0.75rem' }}>Target</th>
                  <th style={{ padding: '0.75rem' }}>Risk Score</th>
                  <th style={{ padding: '0.75rem' }}>Severity</th>
                  <th style={{ padding: '0.75rem' }}>Threat Level</th>
                  <th style={{ padding: '0.75rem' }}>Sources</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>#{item.id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#f8fafc' }}>{item.target}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: SEVERITY_COLORS[item.severity]?.text || '#38bdf8' }}>
                      {item.risk_score}/100
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: SEVERITY_COLORS[item.severity]?.bg,
                        color: SEVERITY_COLORS[item.severity]?.text
                      }}>
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {item.threat_level}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {item.evidence_sources?.length || 0} source(s)
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedHistoryItem(item)}
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

      {/* Detail Inspection Modal */}
      {selectedHistoryItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#38bdf8' }}>
                SOC Record #{selectedHistoryItem.id}: {selectedHistoryItem.target}
              </h3>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 'bold' }}>Executive Summary:</div>
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{selectedHistoryItem.summary}</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Security Findings:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedHistoryItem.findings?.map((f, i) => (
                  <div key={i} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#f8fafc' }}>
                      {f.finding_id}: {f.title} ({f.severity})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>{f.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: '1px solid #64748b',
                  background: '#334155',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
