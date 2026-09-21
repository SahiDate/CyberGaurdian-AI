import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const API = 'http://localhost:8000';

export default function SOCAnalysis() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();

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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Dynamic severity colors tailored for both dark & light modes
  const getSeverityStyle = (severity) => {
    const sev = (severity || 'LOW').toUpperCase();
    if (sev === 'CRITICAL') {
      return {
        bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
        border: isDark ? '#ef4444' : '#fca5a5',
        text: isDark ? '#f87171' : '#dc2626'
      };
    }
    if (sev === 'HIGH') {
      return {
        bg: isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5',
        border: isDark ? '#f97316' : '#fdba74',
        text: isDark ? '#fb923c' : '#ea580c'
      };
    }
    if (sev === 'MEDIUM') {
      return {
        bg: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3',
        border: isDark ? '#eab308' : '#fde047',
        text: isDark ? '#fde047' : '#ca8a04'
      };
    }
    return {
      bg: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
      border: isDark ? '#22c55e' : '#86efac',
      text: isDark ? '#4ade80' : '#16a34a'
    };
  };

  const getThreatLevelStyle = (threatLevel) => {
    const tl = (threatLevel || 'LOW').toUpperCase();
    if (tl === 'CRITICAL') {
      return { bg: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2', text: isDark ? '#fca5a5' : '#dc2626' };
    }
    if (tl === 'HIGH') {
      return { bg: isDark ? 'rgba(249, 115, 22, 0.25)' : '#ffedd5', text: isDark ? '#fdba74' : '#ea580c' };
    }
    if (tl === 'MEDIUM') {
      return { bg: isDark ? 'rgba(234, 179, 8, 0.25)' : '#fef9c3', text: isDark ? '#fef08a' : '#ca8a04' };
    }
    if (tl === 'REVIEW_REQUIRED') {
      return { bg: isDark ? 'rgba(168, 85, 247, 0.25)' : '#f3e8ff', text: isDark ? '#d8b4fe' : '#9333ea' };
    }
    return { bg: isDark ? 'rgba(34, 197, 94, 0.25)' : '#dcfce7', text: isDark ? '#86efac' : '#16a34a' };
  };

  // Complete design tokens for perfect Light & Dark mode contrast
  const theme = {
    bg: isDark ? 'transparent' : 'var(--bg-color, #f8fafc)',
    cardBg: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
    cardBorder: isDark ? 'var(--border-color, #334155)' : 'var(--border-color, #e2e8f0)',
    headerBg: isDark
      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    headerBorder: isDark ? 'var(--border-color, #334155)' : '#e2e8f0',
    headerTitle: isDark ? '#38bdf8' : '#0284c7',
    headerSubtitle: isDark ? 'var(--text-muted, #94a3b8)' : '#64748b',
    headerBadgeBg: isDark ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe',
    headerBadgeBorder: isDark ? 'rgba(56, 189, 248, 0.4)' : '#bae6fd',
    headerBadgeText: isDark ? '#38bdf8' : '#0284c7',

    labelColor: isDark ? '#f8fafc' : '#0f172a',
    inputBg: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
    inputBorder: isDark ? 'var(--border-color, #475569)' : '#cbd5e1',
    inputText: isDark ? '#ffffff' : '#0f172a',

    findBtnBg: isDark ? 'rgba(51, 65, 85, 0.5)' : '#f1f5f9',
    findBtnBorder: isDark ? '#64748b' : '#cbd5e1',
    findBtnText: isDark ? '#cbd5e1' : '#334155',

    presetBtnBg: isDark ? 'rgba(51, 65, 85, 0.4)' : '#eff6ff',
    presetBtnBorder: isDark ? 'rgba(71, 85, 105, 0.4)' : '#bfdbfe',
    presetBtnText: isDark ? '#93c5fd' : '#2563eb',

    subcardBg: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
    subcardBorder: isDark ? '#334155' : '#e2e8f0',
    subcardText: isDark ? '#e2e8f0' : '#1e293b',
    subcardMuted: isDark ? '#94a3b8' : '#64748b',

    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? 'var(--text-muted, #94a3b8)' : '#64748b',
    textBody: isDark ? '#cbd5e1' : '#334155',

    tableBorder: isDark ? 'var(--border-color, #334155)' : '#e2e8f0',
    tableRowBorder: isDark ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9',
    tableHeaderColor: isDark ? '#94a3b8' : '#64748b',
    tableRowHover: isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(241, 245, 249, 0.8)',

    inspectBtnBg: isDark ? 'rgba(100, 116, 139, 0.15)' : '#f1f5f9',
    inspectBtnBorder: isDark ? '#64748b' : '#cbd5e1',
    inspectBtnText: isDark ? '#e2e8f0' : '#334155',

    modalBg: isDark ? '#1e293b' : '#ffffff',
    modalBorder: isDark ? '#334155' : '#e2e8f0',
    modalSubcardBg: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
    modalSubcardBorder: isDark ? '#334155' : '#e2e8f0',
    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)'
  };

  const token = authTokens?.access || localStorage.getItem('access_token');

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const handleDownloadPdf = async (id, targetVal) => {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${API}/api/soc/${id}/pdf/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTarget = (targetVal || 'target').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `SOC_Analysis_${cleanTarget}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed", err);
      alert("Could not download SOC Analysis PDF report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textMain,
      transition: 'background-color 0.25s ease, color 0.25s ease',
      paddingBottom: '4rem'
    }}>
      <Navbar />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', color: theme.textMain }}>
        {/* Header Banner */}
        <div style={{
          background: theme.headerBg,
          border: `1px solid ${theme.headerBorder}`,
          borderRadius: '12px',
          padding: '1.75rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: theme.boxShadow
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: theme.headerTitle, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>🧠</span> SOC Analysis Engine
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: theme.headerSubtitle, fontSize: '0.95rem' }}>
              Deterministic multi-vector correlation across Threat Intel, Files, SSL, WHOIS, URLs, and Ports.
            </p>
          </div>
          <div style={{
            background: theme.headerBadgeBg,
            border: `1px solid ${theme.headerBadgeBorder}`,
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            color: theme.headerBadgeText,
            fontWeight: '600'
          }}>
            100% Deterministic Engine
          </div>
        </div>

        {/* Target Input Card */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: theme.boxShadow
        }}>
          <form onSubmit={handleAnalyze}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontWeight: '600', fontSize: '0.95rem', color: theme.labelColor }}>
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
                    border: `1px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #2563eb)'}
                  onBlur={(e) => e.target.style.borderColor = theme.inputBorder}
                />
                <button
                  type="button"
                  onClick={handlePreCorrelate}
                  disabled={preCorrelating || !target.trim()}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme.findBtnBorder}`,
                    background: theme.findBtnBg,
                    color: theme.findBtnText,
                    fontWeight: '600',
                    cursor: preCorrelating ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease'
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
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {loading ? '🧠 Correlating Telemetry...' : '⚡ Run SOC Analysis'}
                </button>
              </div>

              {/* Quick Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>Quick presets:</span>
                {['example.com', 'phish-bank-secure.xyz', 'api.internal-corp.net'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    style={{
                      background: theme.presetBtnBg,
                      border: `1px solid ${theme.presetBtnBorder}`,
                      color: theme.presetBtnText,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Options */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: theme.textMain, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoCorrelate}
                    onChange={(e) => setAutoCorrelate(e.target.checked)}
                  />
                  <span>Auto-correlate all recent scans for this target domain/IP</span>
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
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
              border: '1px solid #ef4444',
              color: isDark ? '#f87171' : '#dc2626',
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
              background: theme.subcardBg,
              border: `1px solid ${theme.subcardBorder}`
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: isDark ? '#38bdf8' : '#0284c7' }}>
                🔗 Discovered User Telemetry Artifacts for Target:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(matchedArtifacts).map(([source, records]) => (
                  <div key={source} style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    background: isDark
                      ? (records.length ? 'rgba(30, 41, 59, 0.8)' : 'rgba(15, 23, 42, 0.4)')
                      : (records.length ? '#ffffff' : '#f1f5f9'),
                    border: `1px solid ${records.length ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? '#334155' : '#e2e8f0')}`,
                    boxShadow: isDark ? 'none' : (records.length ? '0 1px 3px rgba(0,0,0,0.04)' : 'none')
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '0.8rem', color: records.length ? theme.textMain : theme.textMuted }}>
                      {source.toUpperCase().replace('_', ' ')}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: records.length ? (isDark ? '#4ade80' : '#16a34a') : theme.textMuted,
                      marginTop: '0.25rem',
                      fontWeight: records.length ? 600 : 400
                    }}>
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
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '12px',
            padding: '1.75rem',
            marginBottom: '2rem',
            boxShadow: theme.boxShadow
          }}>
            {/* Top Result Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              borderBottom: `1px solid ${theme.cardBorder}`,
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SOC Assessment Record #{currentResult.id} • {currentResult.analysis_type}
                </div>
                <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: theme.textMain }}>
                  {currentResult.target}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleDownloadPdf(currentResult.id, currentResult.target)}
                  disabled={downloadingPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.95rem',
                    background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                    border: `1px solid ${isDark ? '#38bdf8' : '#0284c7'}`,
                    color: isDark ? '#38bdf8' : '#0284c7',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: downloadingPdf ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Download SOC Correlation Assessment Report as a PDF"
                >
                  <span>📄</span>
                  <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Report'}</span>
                </button>
                {(() => {
                  const sStyle = getSeverityStyle(currentResult.severity);
                  return (
                    <span style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      background: sStyle.bg,
                      border: `1px solid ${sStyle.border}`,
                      color: sStyle.text
                    }}>
                      {currentResult.severity} SEVERITY
                    </span>
                  );
                })()}
                {(() => {
                  const tStyle = getThreatLevelStyle(currentResult.threat_level);
                  return (
                    <span style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      background: tStyle.bg,
                      color: tStyle.text
                    }}>
                      {currentResult.threat_level} THREAT
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Metric KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}>
              <div style={{ background: theme.subcardBg, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.subcardBorder}` }}>
                <div style={{ fontSize: '0.8rem', color: theme.textMuted }}>Risk Score</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: getSeverityStyle(currentResult.severity).text }}>
                  {currentResult.risk_score}<span style={{ fontSize: '1rem', color: theme.textMuted }}>/100</span>
                </div>
              </div>
              <div style={{ background: theme.subcardBg, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.subcardBorder}` }}>
                <div style={{ fontSize: '0.8rem', color: theme.textMuted }}>Confidence</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: isDark ? '#38bdf8' : '#0284c7' }}>
                  {currentResult.confidence}%
                </div>
              </div>
              <div style={{ background: theme.subcardBg, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.subcardBorder}` }}>
                <div style={{ fontSize: '0.8rem', color: theme.textMuted }}>Telemetry Sources</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: theme.textMain }}>
                  {currentResult.evidence_sources?.length || 0}
                </div>
              </div>
              <div style={{ background: theme.subcardBg, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.subcardBorder}` }}>
                <div style={{ fontSize: '0.8rem', color: theme.textMuted }}>Unified Findings</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: theme.textMain }}>
                  {currentResult.findings?.length || 0}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{
              background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f0f9ff',
              borderLeft: `4px solid ${isDark ? '#38bdf8' : '#0284c7'}`,
              borderRadius: '4px 8px 8px 4px',
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              color: theme.textMain
            }}>
              <div style={{ fontWeight: '600', color: isDark ? '#38bdf8' : '#0284c7', marginBottom: '0.25rem' }}>
                Executive SOC Summary:
              </div>
              {currentResult.summary}
            </div>

            {/* Active Correlations */}
            {currentResult.correlations && currentResult.correlations.length > 0 && (
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: isDark ? '#fb923c' : '#ea580c', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔥</span> Cross-Module Correlation Insights ({currentResult.correlations.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {currentResult.correlations.map((corr, idx) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: isDark ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed',
                      border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : '#fed7aa'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: isDark ? '#fdba74' : '#c2410c' }}>
                          [{corr.rule_id}] {corr.title}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: isDark ? 'rgba(0,0,0,0.3)' : '#ffedd5',
                          color: isDark ? '#fdba74' : '#9a3412',
                          fontWeight: 600
                        }}>
                          Sources: {corr.sources?.join(' + ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.textBody }}>
                        {corr.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unified Findings List */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: theme.textMain, marginBottom: '0.75rem' }}>
                🛡️ Unified Security Findings ({currentResult.findings?.length || 0})
              </h3>
              {(!currentResult.findings || currentResult.findings.length === 0) ? (
                <div style={{ color: theme.textMuted, fontSize: '0.9rem' }}>No anomalous findings recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {currentResult.findings.map((f, idx) => {
                    const fSev = getSeverityStyle(f.severity);
                    return (
                      <div key={idx} style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: theme.subcardBg,
                        border: `1px solid ${fSev.border}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: '600', color: theme.textMain, fontSize: '0.95rem' }}>
                            <span style={{ color: isDark ? '#38bdf8' : '#0284c7', marginRight: '0.5rem' }}>{f.finding_id}:</span>
                            {f.title}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              background: fSev.bg,
                              color: fSev.text
                            }}>
                              {f.severity}
                            </span>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0',
                              color: theme.textBody
                            }}>
                              {f.confidence}% Conf.
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: theme.textBody, marginBottom: '0.5rem' }}>
                          {f.description}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: theme.textMuted }}>
                          <div>Traceable Sources: {f.sources?.join(', ')}</div>
                          {f.recommendation && (
                            <div style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 500 }}>💡 {f.recommendation}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actionable Recommendations */}
            {currentResult.recommendations && currentResult.recommendations.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: isDark ? '#4ade80' : '#16a34a', marginBottom: '0.75rem' }}>
                  💡 Actionable Remediation Guidance
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {currentResult.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ fontSize: '0.9rem', color: theme.textBody }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ingested Sources Badges */}
            <div style={{ borderTop: `1px solid ${theme.cardBorder}`, paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>Ingested Telemetry Sources:</span>
              {currentResult.evidence_sources?.map((s) => (
                <span key={s} style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  background: isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe',
                  border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                  color: isDark ? '#38bdf8' : '#0284c7',
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
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: theme.textMain, fontWeight: 700 }}>
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
                border: `1px solid ${theme.inputBorder}`,
                background: theme.inputBg,
                color: theme.inputText,
                fontSize: '0.85rem',
                outline: 'none',
                minWidth: '220px'
              }}
            />
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: theme.textMuted }}>Loading records...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: theme.textMuted }}>
              No prior SOC analyses found. Enter a target above to generate one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.tableBorder}`, color: theme.tableHeaderColor }}>
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
                  {filteredHistory.map((item) => {
                    const itemSev = getSeverityStyle(item.severity);
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: `1px solid ${theme.tableRowBorder}`,
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem', color: theme.textMuted }}>#{item.id}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: theme.textMain }}>{item.target}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold', color: itemSev.text }}>
                          {item.risk_score}/100
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: itemSev.bg,
                            color: itemSev.text
                          }}>
                            {item.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: theme.textBody }}>
                          {item.threat_level}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: theme.textMuted }}>
                          {item.evidence_sources?.length || 0} source(s)
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: theme.textMuted }}>
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleDownloadPdf(item.id, item.target)}
                              disabled={downloadingPdf}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: `1px solid ${isDark ? '#38bdf8' : '#0284c7'}`,
                                background: isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe',
                                color: isDark ? '#38bdf8' : '#0284c7',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: downloadingPdf ? 'not-allowed' : 'pointer'
                              }}
                              title="Download PDF Report"
                            >
                              📥 PDF
                            </button>
                            <button
                              onClick={() => setSelectedHistoryItem(item)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                border: `1px solid ${theme.inspectBtnBorder}`,
                                background: theme.inspectBtnBg,
                                color: theme.inspectBtnText,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div style={{
              background: theme.modalBg,
              border: `1px solid ${theme.modalBorder}`,
              borderRadius: '12px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              color: theme.textMain,
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700 }}>
                  SOC Record #{selectedHistoryItem.id}: {selectedHistoryItem.target}
                </h3>
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.textMuted,
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '0 0.5rem'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: theme.modalSubcardBg, padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${theme.modalSubcardBorder}` }}>
                <div style={{ fontSize: '0.85rem', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 'bold' }}>Executive Summary:</div>
                <div style={{ fontSize: '0.9rem', color: theme.textBody, marginTop: '0.25rem', lineHeight: 1.5 }}>{selectedHistoryItem.summary}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: theme.textMain }}>Security Findings:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedHistoryItem.findings?.map((f, i) => (
                    <div key={i} style={{ background: theme.modalSubcardBg, padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.modalSubcardBorder}` }}>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: theme.textMain }}>
                        {f.finding_id}: {f.title} ({f.severity})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: theme.textMuted, marginTop: '0.25rem' }}>{f.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => handleDownloadPdf(selectedHistoryItem.id, selectedHistoryItem.target)}
                  disabled={downloadingPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? '#38bdf8' : '#0284c7'}`,
                    background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                    color: isDark ? '#38bdf8' : '#0284c7',
                    fontWeight: '600',
                    cursor: downloadingPdf ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>📄</span>
                  <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Report'}</span>
                </button>
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    border: `1px solid ${theme.findBtnBorder}`,
                    background: theme.findBtnBg,
                    color: theme.findBtnText,
                    fontWeight: '600',
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
