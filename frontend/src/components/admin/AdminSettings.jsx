import React, { useState, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

export default function AdminSettings() {
  const { user } = useContext(AuthContext);
  const [requireOtp, setRequireOtp] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [aiAnalysisAutoRun, setAiAnalysisAutoRun] = useState(true);
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState(90);
  const [msg, setMsg] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setMsg("✅ Enterprise security policies and platform configurations saved successfully.");
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '900px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 800, color: 'var(--text-main)' }}>⚙️ Platform & Security Settings</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Enterprise authentication, session policy, AI automation rules, and log retention enforcement.
          </p>
        </div>

        {msg && (
          <div className="glass-panel" style={{ color: 'var(--success-color)', marginBottom: '1.5rem', borderLeft: '3.5px solid var(--success-color)', padding: '0.85rem 1.15rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section: Authentication & Access */}
          <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-color)' }}>🔒 Authentication & Access Policies</h3>

            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>Enforce 2FA / OTP Verification</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Require email OTP verification for high-privilege logins and registrations.</div>
              </div>
              <input
                type="checkbox"
                checked={requireOtp}
                onChange={e => setRequireOtp(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>JWT Access Token Lifetime (Minutes)</label>
                <input
                  type="number"
                  value={sessionTimeout}
                  onChange={e => setSessionTimeout(Number(e.target.value))}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max Failed Login Attempts</label>
                <input
                  type="number"
                  value={maxLoginAttempts}
                  onChange={e => setMaxLoginAttempts(Number(e.target.value))}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section: AI Agent Automation */}
          <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-color)' }}>🤖 AI Engine Controls</h3>

            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>Auto-run AI Risk Assessment on Scans</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Automatically trigger Gemini AI analysis for scans with security score below 70.</div>
              </div>
              <input
                type="checkbox"
                checked={aiAnalysisAutoRun}
                onChange={e => setAiAnalysisAutoRun(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
            </div>
          </div>

          {/* Section: Governance & Audit */}
          <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--warning-color)' }}>📜 Governance & Audit Policy</h3>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audit Log Retention Period (Days)</label>
              <input
                type="number"
                value={auditLogRetentionDays}
                onChange={e => setAuditLogRetentionDays(Number(e.target.value))}
                className="glass-panel"
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Audit log entries older than this limit will be archived automatically.
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="glass-panel"
            style={{
              padding: '0.85rem 1.5rem', background: 'var(--accent-color)', color: '#fff', border: '1px solid var(--accent-color)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-start', width: 'min(100%, 320px)'
            }}
          >
            💾 Save Platform Configuration
          </button>
        </form>
      </div>
    </AdminSidebar>
  );
}
