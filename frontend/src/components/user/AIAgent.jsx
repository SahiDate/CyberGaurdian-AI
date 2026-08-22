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
      padding: '0.2rem 0.6rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
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
    RUNNING: { bg: 'rgba(56,139,253,0.15)', color: '#388bfd' },
    FAILED: { bg: 'rgba(248,81,73,0.15)', color: '#f85149' },
    FAILED_AI: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
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
      {status === 'FAILED_AI' ? 'AI OFFLINE (SOC FALLBACK)' : status}
    </span>
  );
};

export default function AIAgent() {
  const { authTokens } = useContext(AuthContext);

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

  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [activeTab, setActiveTab] = useState('AGENT'); // 'AGENT' or 'HISTORY'

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
    e.preventDefault();
    if (!target.trim()) return;

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
          target: target.trim(),
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              🤖 Autonomous AI Security Agent
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
              Local Qwen model orchestrated with LangGraph state machine & deterministic SOC Analysis Engine.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setActiveTab('AGENT'); setSelectedHistorySession(null); }}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'AGENT' ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)',
                color: activeTab === 'AGENT' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              ⚡ Run Agent
            </button>

            <button
              onClick={() => { setActiveTab('HISTORY'); }}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'HISTORY' ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)',
                color: activeTab === 'HISTORY' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              📜 Session History ({history.length})
            </button>
          </div>
        </div>

        {/* Runtime Diagnostics Banner */}
        {health && (
          <div style={{
            background: health.available && health.model_available ? 'rgba(57,211,83,0.06)' : 'rgba(210,153,34,0.08)',
            border: `1px solid ${health.available && health.model_available ? 'rgba(57,211,83,0.25)' : 'rgba(210,153,34,0.3)'}`,
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {health.available && health.model_available ? '🟢' : '🟡'}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  {health.message}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Runtime: <code>{health.base_url}</code> | Model: <code>{health.configured_model}</code>
                </div>
              </div>
            </div>

            {health.setup_instructions && (
              <div style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                💡 {health.setup_instructions}
              </div>
            )}
          </div>
        )}

        {activeTab === 'AGENT' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {/* Input Form Box */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <form onSubmit={handleStartAnalysis}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Security Target
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. example.com, https://app.example.com, 192.168.1.1, or SHA256 file hash"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      disabled={analyzing}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Analysis Mode
                    </label>
                    <select
                      value={analysisMode}
                      onChange={(e) => setAnalysisMode(e.target.value)}
                      disabled={analyzing}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#161b22',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="SECURITY_ASSESSMENT">🛡️ Defensive Assessment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Max Agent Steps
                    </label>
                    <select
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(e.target.value)}
                      disabled={analyzing}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#161b22',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="3">3 Steps (Fast)</option>
                      <option value="5">5 Steps (Standard)</option>
                      <option value="8">8 Steps (Comprehensive)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={analyzing || !target.trim()}
                    style={{
                      padding: '0.75rem 1.8rem',
                      background: analyzing ? 'rgba(56,139,253,0.3)' : 'var(--accent-color)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: analyzing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {analyzing ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                        Running Autonomous Security Analysis...
                      </>
                    ) : (
                      <>🚀 Start AI Analysis</>
                    )}
                  </button>
                </div>
              </form>

              {errorMsg && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(248,81,73,0.15)', border: '1px solid #f85149', borderRadius: '8px', color: '#f85149', fontSize: '0.85rem' }}>
                  ❌ {errorMsg}
                </div>
              )}
            </div>

            {/* Live Progress Box when analyzing */}
            {analyzing && (
              <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '12px', border: '1px solid rgba(56,139,253,0.3)', background: 'rgba(56,139,253,0.03)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧠 AI Security Agent Active
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    'Initializing LangGraph State Machine & Loading Context',
                    'Inspecting stored security telemetry & correlation baseline',
                    'Evaluating missing evidence with Qwen local model',
                    'Executing approved security tools through controlled registry',
                    'Recalculating deterministic risk score with Phase 8 SOC Engine'
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#58a6ff' }}></span>
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
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                        Autonomous Assessment Target
                      </div>
                      <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem', color: '#58a6ff' }}>
                        {displaySession.target}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={displaySession.status} />
                      <SeverityBadge severity={displaySession.severity} />
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #f85149' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Deterministic SOC Risk</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: displaySession.risk_score >= 50 ? '#f85149' : '#39d353', marginTop: '0.2rem' }}>
                        {displaySession.risk_score}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/100</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #388bfd' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Confidence Score</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#388bfd', marginTop: '0.2rem' }}>
                        {displaySession.confidence}%
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #d29922' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Threat Level</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e3b341', marginTop: '0.4rem' }}>
                        {displaySession.threat_level || 'LOW'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #a371f7' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Steps Executed</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a371f7', marginTop: '0.2rem' }}>
                        {displaySession.steps_completed || displaySession.steps?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Executive Security Summary
                    </h4>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {displaySession.summary || 'No summary generated.'}
                    </div>
                  </div>

                  {/* Evidence Sources & Tools Used */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        🛠️ Tools Selected & Executed
                      </h4>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(displaySession.tools_used || []).length > 0 ? (
                          displaySession.tools_used.map((tool, i) => (
                            <span key={i} style={{ background: 'rgba(56,139,253,0.12)', color: '#58a6ff', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {tool}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Baseline correlation only.</span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        📊 Evidence Sources Correlated
                      </h4>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(displaySession.evidence_sources || []).length > 0 ? (
                          displaySession.evidence_sources.map((src, i) => (
                            <span key={i} style={{ background: 'rgba(57,211,83,0.12)', color: '#39d353', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {src}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Initial target indicators.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Findings */}
                  {displaySession.findings && displaySession.findings.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ⚠️ Unified Security Findings ({displaySession.findings.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {displaySession.findings.map((finding, idx) => (
                          <div key={idx} style={{
                            padding: '0.85rem 1rem',
                            background: 'rgba(0,0,0,0.25)',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${finding.severity === 'CRITICAL' ? '#f85149' : finding.severity === 'HIGH' ? '#d29922' : '#388bfd'}`,
                            fontSize: '0.85rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                              <strong style={{ color: '#fff' }}>{finding.type || finding.title || 'Security Finding'}</strong>
                              <SeverityBadge severity={finding.severity} />
                            </div>
                            <div style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {finding.description || finding.summary}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {displaySession.recommendations && displaySession.recommendations.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        💡 Actionable Defensive Recommendations
                      </h4>
                      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px' }}>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                          {displaySession.recommendations.map((rec, idx) => (
                            <li key={idx} style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Step Execution Timeline */}
                  {displaySession.steps && displaySession.steps.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📜 Step-by-Step Execution Audit Trail
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {displaySession.steps.map((step, idx) => (
                          <div key={idx} style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            fontSize: '0.82rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 700, color: '#58a6ff' }}>
                                Step {step.step_number}: {step.action}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {step.status}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {step.reasoning_summary}
                            </div>
                          </div>
                        ))}
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
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
              📜 Your AI Agent Sessions
            </h3>

            {loadingHistory ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading session history...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No previous AI Agent sessions found.</div>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color)' }}>
                      {['#', 'Target', 'Status', 'Risk Score', 'Severity', 'Steps', 'Tools Used', 'Date', ''].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>#{s.id}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#58a6ff' }}>{s.target}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={s.status} /></td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: s.risk_score >= 50 ? '#f85149' : '#39d353' }}>{s.risk_score}/100</td>
                        <td style={{ padding: '0.75rem 1rem' }}><SeverityBadge severity={s.severity} /></td>
                        <td style={{ padding: '0.75rem 1rem' }}>{s.steps_completed || 0}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {(s.tools_used || []).join(', ') || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => { handleInspectSession(s.id); setActiveTab('AGENT'); }}
                            style={{
                              padding: '0.35rem 0.75rem',
                              background: 'rgba(56,139,253,0.15)',
                              border: '1px solid #388bfd',
                              borderRadius: '6px',
                              color: '#58a6ff',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600
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
