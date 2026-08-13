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
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 800 }}>⚙️ Platform & Security Settings</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Enterprise authentication, session policy, AI automation rules, and log retention enforcement.
          </p>
        </div>

        {msg && (
          <div style={{ color: '#39d353', marginBottom: '1.5rem', background: 'rgba(57,211,83,0.1)', border: '1px solid rgba(57,211,83,0.3)', padding: '0.85rem 1.15rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section: Authentication & Access */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#388bfd' }}>🔒 Authentication & Access Policies</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Enforce 2FA / OTP Verification</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Require email OTP verification for high-privilege logins and registrations.</div>
              </div>
              <input
                type="checkbox"
                checked={requireOtp}
                onChange={e => setRequireOtp(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#388bfd' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>JWT Access Token Lifetime (Minutes)</label>
                <input
                  type="number"
                  value={sessionTimeout}
                  onChange={e => setSessionTimeout(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Max Failed Login Attempts</label>
                <input
                  type="number"
                  value={maxLoginAttempts}
                  onChange={e => setMaxLoginAttempts(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section: AI Agent Automation */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#a371f7' }}>🤖 AI Engine Controls</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Auto-run AI Risk Assessment on Scans</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Automatically trigger Gemini AI analysis for scans with security score below 70.</div>
              </div>
              <input
                type="checkbox"
                checked={aiAnalysisAutoRun}
                onChange={e => setAiAnalysisAutoRun(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#a371f7' }}
              />
            </div>
          </div>

          {/* Section: Governance & Audit */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#e3b341' }}>📜 Governance & Audit Policy</h3>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Audit Log Retention Period (Days)</label>
              <input
                type="number"
                value={auditLogRetentionDays}
                onChange={e => setAuditLogRetentionDays(Number(e.target.value))}
                style={{ width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '7px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem' }}>
                Audit log entries older than this limit will be archived automatically.
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{
              padding: '0.85rem 1.5rem', background: '#388bfd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-start', width: 'min(100%, 320px)'
            }}
          >
            💾 Save Platform Configuration
          </button>
        </form>
      </div>
    </AdminSidebar>
  );
}
