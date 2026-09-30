import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const detectTargetType = (tgt) => {
  if (!tgt) return 'Unknown';
  const clean = tgt.trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(clean)) {
    if (clean.startsWith('127.') || clean === '0.0.0.0') return 'IPv4 (Loopback)';
    if (clean.startsWith('10.') || clean.startsWith('192.168.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return 'IPv4 (Private RFC1918)';
    return 'IPv4 (Public)';
  }
  if (clean.includes(':')) return 'IPv6 Address';
  if (/^[a-fA-F0-9]{32,64}$/.test(clean)) return 'File Hash (SHA256/MD5)';
  if (clean.includes('.')) return 'Domain Name';
  return 'Hostname';
};

const SeverityBadge = ({ severity, isDark }) => {
  const sUpper = (severity || 'LOW').toUpperCase();
  const cfgLight = {
    CRITICAL: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
    HIGH:     { bg: '#ffedd5', color: '#ea580c', border: '#fdba74' },
    MEDIUM:   { bg: '#fef9c3', color: '#b45309', border: '#fde047' },
    LOW:      { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  };
  const cfgDark = {
    CRITICAL: { bg: 'rgba(248,81,73,0.2)', color: '#f85149', border: '#f85149' },
    HIGH:     { bg: 'rgba(210,153,34,0.2)', color: '#e3b341', border: '#d29922' },
    MEDIUM:   { bg: 'rgba(56,139,253,0.2)', color: '#58a6ff', border: '#388bfd' },
    LOW:      { bg: 'rgba(57,211,83,0.2)', color: '#39d353', border: '#39d353' },
  };
  const map = isDark ? cfgDark : cfgLight;
  const s = map[sUpper] || {
    bg: isDark ? 'rgba(139,148,158,0.2)' : '#f1f5f9',
    color: isDark ? '#8b949e' : '#475569',
    border: isDark ? '#8b949e' : '#cbd5e1'
  };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      padding: '0.22rem 0.65rem',
      borderRadius: '6px',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.5px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }}></span>
      {sUpper}
    </span>
  );
};

const StatusBadge = ({ status, isDark }) => {
  const st = (status || 'UNKNOWN').toUpperCase();
  const cfgLight = {
    COMPLETED: { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: 'COMPLETED' },
    RUNNING:   { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', label: 'RUNNING' },
    FAILED:    { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: 'FAILED' },
    FAILED_AI: { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'AI OFFLINE (SOC FALLBACK)' },
  };
  const cfgDark = {
    COMPLETED: { bg: 'rgba(57,211,83,0.18)', color: '#39d353', border: 'rgba(57,211,83,0.5)', label: 'COMPLETED' },
    RUNNING:   { bg: 'rgba(56,139,253,0.18)', color: '#58a6ff', border: 'rgba(56,139,253,0.5)', label: 'RUNNING' },
    FAILED:    { bg: 'rgba(248,81,73,0.18)', color: '#f85149', border: 'rgba(248,81,73,0.5)', label: 'FAILED' },
    FAILED_AI: { bg: 'rgba(210,153,34,0.18)', color: '#e3b341', border: 'rgba(210,153,34,0.5)', label: 'AI OFFLINE (SOC FALLBACK)' },
  };
  const map = isDark ? cfgDark : cfgLight;
  const s = map[st] || {
    bg: isDark ? 'rgba(139,148,158,0.18)' : '#f1f5f9',
    color: isDark ? '#8b949e' : '#475569',
    border: isDark ? '#8b949e' : '#cbd5e1',
    label: st
  };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      padding: '0.22rem 0.65rem',
      borderRadius: '6px',
      fontSize: '0.72rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem'
    }}>
      {st === 'COMPLETED' ? '✓' : st === 'FAILED' ? '✕' : st === 'RUNNING' ? '●' : '⚠'} {s.label}
    </span>
  );
};

export default function AIAgent() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [target, setTarget] = useState('');
  const [analysisMode, setAnalysisMode] = useState('SECURITY_ASSESSMENT');
  const [maxSteps, setMaxSteps] = useState(5);

  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const [analyzing, setAnalyzing] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');

  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [activeTab, setActiveTab] = useState('AGENT'); // 'AGENT' or 'HISTORY'

  // Comprehensive theme design tokens for pristine Light and Dark presentation
  const theme = {
    bg: isDark ? 'transparent' : 'var(--bg-color, #f8fafc)',
    cardBg: isDark ? 'rgba(22, 27, 34, 0.85)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.85)',
    subcardBg: isDark ? 'rgba(13, 17, 23, 0.75)' : '#f8fafc',
    subcardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    subcardHover: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
    inputBg: isDark ? 'rgba(13, 17, 23, 0.85)' : '#ffffff',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1',
    inputText: isDark ? '#f0f6fc' : '#0f172a',
    textMain: isDark ? '#f0f6fc' : '#0f172a',
    textMuted: isDark ? '#8b949e' : '#475569',
    tableHeaderBg: isDark ? 'rgba(13, 17, 23, 0.95)' : '#f1f5f9',
    tableHeaderColor: isDark ? '#94a3b8' : '#475569',
    tableRowBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
    tableRowHover: isDark ? 'rgba(56, 139, 253, 0.08)' : 'rgba(241, 245, 249, 0.85)',
    summaryBg: isDark ? 'rgba(13, 17, 23, 0.65)' : '#f8fafc',
    summaryBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    boxShadow: isDark ? '0 12px 36px rgba(0, 0, 0, 0.5)' : '0 8px 30px rgba(15, 23, 42, 0.06)',
    badgeBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    accentBlue: isDark ? '#58a6ff' : '#2563eb',
    accentGreen: isDark ? '#39d353' : '#15803d',
    accentOrange: isDark ? '#f97316' : '#ea580c',
    accentRed: isDark ? '#f85149' : '#dc2626',
    accentPurple: isDark ? '#a371f7' : '#7c3aed',
    accentAmber: isDark ? '#e3b341' : '#b45309'
  };

  useEffect(() => {
    fetchHealth();
    fetchHistory();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/health/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/history/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!target.trim()) return;

    // Gracefully clean trailing colons, slashes, or backslashes
    const normalizedTarget = target.trim().replace(/[:/\\]+$/, '');

    setErrorMsg('');
    setAnalyzing(true);
    setCurrentSession(null);

    try {
      const res = await fetch(`${API_BASE}/api/agent/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({
          target: normalizedTarget,
          analysis_mode: analysisMode,
          max_steps: parseInt(maxSteps, 10) || 5
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentSession(data);
        fetchHistory();
      } else {
        setErrorMsg(data.error || data.detail || JSON.stringify(data));
      }
    } catch (err) {
      setErrorMsg(`Failed to run AI Security Agent: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleInspectSession = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/${sessionId}/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedHistorySession(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const displaySession = currentSession || selectedHistorySession;

  // Threat level color helper for high-contrast presentation in light & dark
  const getThreatColor = (tl) => {
    const s = (tl || 'LOW').toUpperCase();
    if (s === 'CRITICAL') return theme.accentRed;
    if (s === 'HIGH') return theme.accentOrange;
    if (s === 'MEDIUM') return theme.accentAmber;
    return theme.accentGreen;
  };

  const filteredHistory = history.filter(s =>
    (s.target && s.target.toLowerCase().includes(historySearch.toLowerCase())) ||
    (s.status && s.status.toLowerCase().includes(historySearch.toLowerCase())) ||
    (s.severity && s.severity.toLowerCase().includes(historySearch.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <main className="responsive-page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(1rem, 2.5vw, 1.5rem) clamp(0.5rem, 2vw, 1.25rem) 3.5rem', boxSizing: 'border-box' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🤖</span>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', fontWeight: 800, color: theme.textMain }}>
                Autonomous AI Security Agent
              </h1>
            </div>
            <p style={{ color: theme.textMuted, margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Dual-stage Ollama engine (<code>cyberguardian-phishing:latest</code> ➔ <code>cyberguardian-ai:latest</code>) with LangGraph state machine & deterministic SOC correlation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', padding: '0.3rem', borderRadius: '10px', border: `1px solid ${theme.cardBorder}` }}>
            <button
              onClick={() => { setActiveTab('AGENT'); setSelectedHistorySession(null); }}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'AGENT' ? theme.accentBlue : 'transparent',
                color: activeTab === 'AGENT' ? '#ffffff' : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ Run Agent
            </button>

            <button
              onClick={() => { setActiveTab('HISTORY'); }}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'HISTORY' ? theme.accentBlue : 'transparent',
                color: activeTab === 'HISTORY' ? '#ffffff' : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease'
              }}
            >
              📜 Session History ({history.length})
            </button>
          </div>
        </div>

        {/* Runtime Diagnostics Banner */}
        {health && (
          <div style={{
            background: health.available && health.model_available 
              ? (isDark ? 'rgba(57,211,83,0.08)' : '#f0fdf4') 
              : (isDark ? 'rgba(210,153,34,0.1)' : '#fffbeb'),
            border: `1px solid ${health.available && health.model_available 
              ? (isDark ? 'rgba(57,211,83,0.3)' : '#86efac') 
              : (isDark ? 'rgba(210,153,34,0.3)' : '#fde68a')}`,
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8rem',
            boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>
                {health.available && health.model_available ? '🟢' : '🟡'}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: theme.textMain }}>
                  {health.message}
                </div>
                <div style={{ fontSize: '0.78rem', color: theme.textMuted, marginTop: '0.15rem' }}>
                  Runtime: <code style={{ color: theme.accentBlue }}>{health.base_url}</code> | Configured Models: <code style={{ color: theme.accentGreen }}>cyberguardian-phishing</code> ➔ <code style={{ color: theme.accentBlue }}>{health.configured_model}</code>
                </div>
              </div>
            </div>

            {health.setup_instructions && (
              <div style={{ fontSize: '0.75rem', background: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', color: theme.textMuted, padding: '0.35rem 0.75rem', borderRadius: '6px', border: `1px solid ${theme.cardBorder}` }}>
                💡 {health.setup_instructions}
              </div>
            )}
          </div>
        )}

        {activeTab === 'AGENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Input Form Box */}
            <div className="glass-panel" style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: theme.boxShadow
            }}>
              <form onSubmit={handleStartAnalysis}>
                <div className="form-row-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1.2rem', marginBottom: '1.25rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Security Target
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. example.com, https://app.example.com, 1.1.1.1, or SHA256 file hash"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      disabled={analyzing}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: theme.inputBg,
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        color: theme.inputText,
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease'
                      }}
                    />

                    {/* Quick Preset Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>Try sample:</span>
                      {['example.com', 'scanme.nmap.org', '1.1.1.1', '8.8.8.8'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTarget(preset)}
                          style={{
                            background: theme.subcardBg,
                            border: `1px solid ${theme.subcardBorder}`,
                            color: theme.accentBlue,
                            borderRadius: '4px',
                            padding: '0.15rem 0.5rem',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Analysis Mode
                    </label>
                    <select
                      value={analysisMode}
                      onChange={(e) => setAnalysisMode(e.target.value)}
                      disabled={analyzing}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: theme.inputBg,
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        color: theme.inputText,
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="SECURITY_ASSESSMENT">🛡️ Defensive Assessment</option>
                      <option value="PHISHING_AUDIT">🎣 Phishing & Brand Spoofing</option>
                      <option value="PERIMETER_RECON">🌐 Perimeter Reconnaissance</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Max Agent Steps
                    </label>
                    <select
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(e.target.value)}
                      disabled={analyzing}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: theme.inputBg,
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        color: theme.inputText,
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="3">3 Steps (Fast Assessment)</option>
                      <option value="5">5 Steps (Standard SOC)</option>
                      <option value="8">8 Steps (Comprehensive Deep Scan)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={analyzing || !target.trim()}
                    className="btn-full-mobile"
                    style={{
                      padding: '0.75rem 1.85rem',
                      minHeight: '44px',
                      justifyContent: 'center',
                      background: analyzing ? 'rgba(56,139,253,0.4)' : theme.accentBlue,
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: analyzing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    {analyzing ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '15px', height: '15px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                        Running Autonomous Security Analysis...
                      </>
                    ) : (
                      <>🚀 Start AI Analysis</>
                    )}
                  </button>
                </div>
              </form>

              {errorMsg && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1.15rem',
                  background: isDark ? 'rgba(248,81,73,0.12)' : '#fee2e2',
                  border: `1px solid ${isDark ? '#f85149' : '#fca5a5'}`,
                  borderRadius: '8px',
                  color: isDark ? '#f85149' : '#b91c1c',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>❌</span>
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Live Progress Box when analyzing */}
            {analyzing && (
              <div className="glass-panel" style={{
                background: theme.cardBg,
                border: `1px solid ${theme.accentBlue}`,
                borderRadius: '14px',
                padding: '1.75rem',
                boxShadow: theme.boxShadow
              }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: theme.accentBlue, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <span>🧠</span>
                  <span>AI Security Agent Executing Investigation...</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {[
                    'Initializing LangGraph State Machine & Validating Target RFC and SSRF restrictions',
                    'Inspecting stored historical security telemetry & establishing correlation baseline',
                    'Phase 1: Evaluating threat signatures with cyberguardian-phishing:latest model',
                    'Phase 2: Executing approved security tools through controlled registry via cyberguardian-ai:latest',
                    'Recalculating deterministic risk score with Phase 8 SOC Engine'
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', color: theme.textMuted }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.accentBlue }}></span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Display */}
            {displaySession && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Result Overview Banner */}
                <div className="glass-panel" style={{
                  background: theme.cardBg,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '14px',
                  padding: '1.75rem',
                  boxShadow: theme.boxShadow
                }}>
                  {/* Target Title & Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: `1px solid ${theme.cardBorder}`, paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                        Autonomous Assessment Target
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 1.55rem)', color: theme.accentBlue, wordBreak: 'break-all' }}>
                          {displaySession.target}
                        </h2>
                        <span style={{
                          background: theme.subcardBg,
                          border: `1px solid ${theme.subcardBorder}`,
                          color: theme.textMuted,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {detectTargetType(displaySession.target)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={displaySession.status} isDark={isDark} />
                      <SeverityBadge severity={displaySession.severity} isDark={isDark} />
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                    {/* SOC Risk */}
                    <div style={{
                      background: theme.subcardBg,
                      border: `1px solid ${theme.subcardBorder}`,
                      borderLeft: `4px solid ${displaySession.risk_score >= 50 ? theme.accentRed : theme.accentGreen}`,
                      padding: '1.1rem 1.25rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Deterministic SOC Risk
                      </div>
                      <div style={{
                        fontSize: '1.9rem',
                        fontWeight: 800,
                        color: displaySession.risk_score >= 50 ? theme.accentRed : theme.accentGreen,
                        marginTop: '0.35rem'
                      }}>
                        {displaySession.risk_score}<span style={{ fontSize: '0.95rem', color: theme.textMuted, fontWeight: 500 }}>/100</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(displaySession.risk_score, 100)}%`,
                          height: '100%',
                          background: displaySession.risk_score >= 50 ? theme.accentRed : theme.accentGreen,
                          borderRadius: '2px'
                        }} />
                      </div>
                    </div>

                    {/* Confidence */}
                    <div style={{
                      background: theme.subcardBg,
                      border: `1px solid ${theme.subcardBorder}`,
                      borderLeft: `4px solid ${theme.accentBlue}`,
                      padding: '1.1rem 1.25rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Confidence Score
                      </div>
                      <div style={{ fontSize: '1.9rem', fontWeight: 800, color: theme.accentBlue, marginTop: '0.35rem' }}>
                        {displaySession.confidence}%
                      </div>
                      <div style={{ width: '100%', height: '4px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(displaySession.confidence, 100)}%`,
                          height: '100%',
                          background: theme.accentBlue,
                          borderRadius: '2px'
                        }} />
                      </div>
                    </div>

                    {/* Threat Level */}
                    <div style={{
                      background: theme.subcardBg,
                      border: `1px solid ${theme.subcardBorder}`,
                      borderLeft: `4px solid ${getThreatColor(displaySession.threat_level || displaySession.severity)}`,
                      padding: '1.1rem 1.25rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Threat Level
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: getThreatColor(displaySession.threat_level || displaySession.severity),
                        marginTop: '0.45rem'
                      }}>
                        {displaySession.threat_level || displaySession.severity || 'LOW'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.35rem' }}>
                        Autonomous Rule Gate
                      </div>
                    </div>

                    {/* Steps Executed */}
                    <div style={{
                      background: theme.subcardBg,
                      border: `1px solid ${theme.subcardBorder}`,
                      borderLeft: `4px solid ${theme.accentPurple}`,
                      padding: '1.1rem 1.25rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Steps Executed
                      </div>
                      <div style={{ fontSize: '1.9rem', fontWeight: 800, color: theme.accentPurple, marginTop: '0.35rem' }}>
                        {displaySession.steps_completed || displaySession.steps?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.35rem' }}>
                        LangGraph Iterations
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                      Executive Security Summary
                    </h4>

                    {displaySession.status === 'FAILED' ? (
                      <div style={{
                        background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                        border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.35)' : '#fca5a5'}`,
                        borderRadius: '10px',
                        padding: '1.1rem 1.35rem',
                        color: isDark ? '#fca5a5' : '#b91c1c'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.95rem' }}>
                          <span>🛑</span>
                          <span>Security Assessment Interrupted</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                          {displaySession.summary || displaySession.error_message || 'The autonomous assessment halted due to a validation restriction.'}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: theme.summaryBg,
                        border: `1px solid ${theme.summaryBorder}`,
                        borderRadius: '10px',
                        padding: '1.1rem 1.35rem',
                        fontSize: '0.92rem',
                        lineHeight: '1.65',
                        color: theme.textMain
                      }}>
                        {displaySession.summary || 'No summary generated.'}
                      </div>
                    )}
                  </div>

                  {/* ══════════════════════════════════════════════════════════════════════
                      CORE FIX: ASSESSMENT TELEMETRY & ATTRIBUTES TABLE
                      ══════════════════════════════════════════════════════════════════════ */}
                  <div style={{
                    background: theme.subcardBg,
                    border: `1px solid ${theme.subcardBorder}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    marginBottom: '1.75rem'
                  }}>
                    <div style={{
                      padding: '0.9rem 1.25rem',
                      borderBottom: `1px solid ${theme.tableRowBorder}`,
                      background: theme.tableHeaderBg,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📋</span>
                        <span>Assessment Telemetry & Configuration Table</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                        CyberGuardian Engine v2.4
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <tbody>
                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', width: '25%', fontWeight: 600, color: theme.textMuted }}>Target Identifier</td>
                            <td style={{ padding: '0.75rem 1.25rem', width: '75%', color: theme.textMain, fontWeight: 700 }}>
                              <code>{displaySession.target}</code>
                            </td>
                          </tr>

                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>Classification</td>
                            <td style={{ padding: '0.75rem 1.25rem', color: theme.textMain }}>
                              <span style={{ background: theme.badgeBg, padding: '0.2rem 0.5rem', borderRadius: '4px', border: `1px solid ${theme.subcardBorder}` }}>
                                {detectTargetType(displaySession.target)}
                              </span>
                            </td>
                          </tr>

                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>Execution Status</td>
                            <td style={{ padding: '0.75rem 1.25rem' }}>
                              <StatusBadge status={displaySession.status} isDark={isDark} />
                            </td>
                          </tr>

                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>Severity & Threat Rating</td>
                            <td style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <SeverityBadge severity={displaySession.severity} isDark={isDark} />
                              <span style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                                (Deterministic Risk: <strong>{displaySession.risk_score}/100</strong>, Threat Level: <strong>{displaySession.threat_level || 'LOW'}</strong>)
                              </span>
                            </td>
                          </tr>

                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>AI Model Routing Pipeline</td>
                            <td style={{ padding: '0.75rem 1.25rem', color: theme.textMain }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ background: isDark ? 'rgba(56,139,253,0.15)' : '#eff6ff', color: theme.accentBlue, padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${isDark ? 'rgba(56,139,253,0.3)' : '#bfdbfe'}` }}>
                                  Stage 1: cyberguardian-phishing:latest
                                </span>
                                <span style={{ color: theme.textMuted }}>➔</span>
                                <span style={{ background: isDark ? 'rgba(57,211,83,0.15)' : '#f0fdf4', color: theme.accentGreen, padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${isDark ? 'rgba(57,211,83,0.3)' : '#bbf7d0'}` }}>
                                  Stage 2: cyberguardian-ai:latest
                                </span>
                              </div>
                            </td>
                          </tr>

                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>Tools Selected & Executed</td>
                            <td style={{ padding: '0.75rem 1.25rem', color: theme.textMain }}>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {(displaySession.tools_used || []).length > 0 ? (
                                  displaySession.tools_used.map((tool, i) => (
                                    <span key={i} style={{ background: isDark ? 'rgba(56,139,253,0.15)' : '#eff6ff', color: theme.accentBlue, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${isDark ? 'rgba(56,139,253,0.3)' : '#bfdbfe'}` }}>
                                      🛠️ {tool}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '0.82rem', color: theme.textMuted }}>Baseline correlation only (pre-flight validation).</span>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>Evidence Sources Correlated</td>
                            <td style={{ padding: '0.75rem 1.25rem', color: theme.textMain }}>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {(displaySession.evidence_sources || []).length > 0 ? (
                                  displaySession.evidence_sources.map((src, i) => (
                                    <span key={i} style={{ background: isDark ? 'rgba(57,211,83,0.15)' : '#f0fdf4', color: theme.accentGreen, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${isDark ? 'rgba(57,211,83,0.3)' : '#bbf7d0'}` }}>
                                      📊 {src}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '0.82rem', color: theme.textMuted }}>Initial target indicators & safety guardrails.</span>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: theme.textMuted }}>Validation / Safety Status</td>
                            <td style={{ padding: '0.75rem 1.25rem', color: theme.textMain }}>
                              {displaySession.error_message ? (
                                <span style={{ color: theme.accentRed, fontWeight: 600, fontSize: '0.85rem' }}>
                                  ⚠️ {displaySession.error_message}
                                </span>
                              ) : (
                                <span style={{ color: theme.accentGreen, fontWeight: 600, fontSize: '0.85rem' }}>
                                  ✓ Passed all SSRF and target RFC syntax checks.
                                </span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Unified Security Findings Table (if findings exist) */}
                  {displaySession.findings && displaySession.findings.length > 0 && (
                    <div style={{
                      background: theme.subcardBg,
                      border: `1px solid ${theme.subcardBorder}`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginBottom: '1.75rem'
                    }}>
                      <div style={{
                        padding: '0.9rem 1.25rem',
                        borderBottom: `1px solid ${theme.tableRowBorder}`,
                        background: theme.tableHeaderBg,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: theme.textMain,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>⚠️</span>
                          <span>Unified Security Findings ({displaySession.findings.length})</span>
                        </div>
                      </div>

                      <div className="table-responsive-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: theme.tableHeaderBg, borderBottom: `1px solid ${theme.tableRowBorder}`, textAlign: 'left' }}>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>#</th>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Finding / Threat Vector</th>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Severity</th>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Component / Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displaySession.findings.map((finding, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                                <td style={{ padding: '0.75rem 1rem', color: theme.textMuted }}>{idx + 1}</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: theme.textMain }}>
                                  {finding.type || finding.title || 'Security Finding'}
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <SeverityBadge severity={finding.severity} isDark={isDark} />
                                </td>
                                <td style={{ padding: '0.75rem 1rem', color: theme.textMuted, lineHeight: '1.45' }}>
                                  {finding.description || finding.summary || 'Details recorded during autonomous evaluation.'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {displaySession.recommendations && displaySession.recommendations.length > 0 && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                        💡 Actionable Defensive Recommendations
                      </h4>
                      <div style={{ background: theme.subcardBg, border: `1px solid ${theme.subcardBorder}`, padding: '1.1rem 1.35rem', borderRadius: '10px' }}>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                          {displaySession.recommendations.map((rec, idx) => (
                            <li key={idx} style={{ color: theme.textMain, lineHeight: '1.5' }}>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Step Execution Audit Trail Table */}
                  {displaySession.steps && displaySession.steps.length > 0 && (
                    <div style={{
                      background: theme.subcardBg,
                      border: `1px solid ${theme.subcardBorder}`,
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '0.9rem 1.25rem',
                        borderBottom: `1px solid ${theme.tableRowBorder}`,
                        background: theme.tableHeaderBg,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: theme.textMain,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>📜</span>
                        <span>Step-by-Step Execution Audit Trail ({displaySession.steps.length} Steps)</span>
                      </div>

                      <div className="table-responsive-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                          <thead>
                            <tr style={{ background: theme.tableHeaderBg, borderBottom: `1px solid ${theme.tableRowBorder}`, textAlign: 'left' }}>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Step</th>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Action</th>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Status</th>
                              <th style={{ padding: '0.75rem 1rem', color: theme.tableHeaderColor, fontWeight: 700 }}>Reasoning & Decision Summary</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displaySession.steps.map((step, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: theme.accentBlue }}>
                                  #{step.step_number || idx + 1}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: theme.textMain }}>
                                  {step.action}
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <StatusBadge status={step.status} isDark={isDark} />
                                </td>
                                <td style={{ padding: '0.75rem 1rem', color: theme.textMuted, lineHeight: '1.45' }}>
                                  {step.reasoning_summary || 'Action completed.'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'HISTORY' && (
          <div className="glass-panel" style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: theme.boxShadow
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📜</span>
                <span>AI Agent Session History</span>
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Filter sessions..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: theme.textMuted }}>
                Loading session history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: theme.textMuted }}>
                No AI Agent sessions found matching your criteria.
              </div>
            ) : (
              <div className="table-responsive-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: `1px solid ${theme.subcardBorder}`, borderRadius: '10px' }}>
                <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: theme.tableHeaderBg, borderBottom: `1px solid ${theme.tableRowBorder}`, textAlign: 'left' }}>
                      {['#', 'Target', 'Status', 'Risk Score', 'Severity', 'Steps', 'Tools Used', 'Date', ''].map(h => (
                        <th key={h} style={{ padding: '0.85rem 1rem', color: theme.tableHeaderColor, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(s => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${theme.tableRowBorder}`, transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '0.85rem 1rem', color: theme.textMuted, fontWeight: 600 }}>#{s.id}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: theme.accentBlue }}>{s.target}</td>
                        <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={s.status} isDark={isDark} /></td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: s.risk_score >= 50 ? theme.accentRed : theme.accentGreen }}>
                          {s.risk_score}/100
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}><SeverityBadge severity={s.severity} isDark={isDark} /></td>
                        <td style={{ padding: '0.85rem 1rem', color: theme.textMain, fontWeight: 600 }}>{s.steps_completed || 0}</td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: theme.textMuted }}>
                          {(s.tools_used || []).join(', ') || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => { handleInspectSession(s.id); setActiveTab('AGENT'); }}
                            style={{
                              padding: '0.4rem 0.85rem',
                              background: isDark ? 'rgba(56,139,253,0.15)' : '#eff6ff',
                              border: `1px solid ${isDark ? '#388bfd' : '#bfdbfe'}`,
                              borderRadius: '6px',
                              color: theme.accentBlue,
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              transition: 'all 0.15s ease'
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
        )}
      </main>
    </div>
  );
}
