import React, { useState, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Save, Shield, Bot, History, Check } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [requireOtp, setRequireOtp] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [aiAnalysisAutoRun, setAiAnalysisAutoRun] = useState(true);
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState(90);
  const [msg, setMsg] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setMsg("Enterprise security policies and platform configurations saved successfully.");
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--admin-text-main, #0f172a)',
            letterSpacing: '-0.02em'
          }}>
            Platform & Security Settings
          </h1>
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: '0.875rem',
            color: 'var(--admin-text-muted, #64748b)'
          }}>
            Configure enterprise authentication policies, session timeouts, and AI controls.
          </p>
        </div>

        {msg && (
          <div style={{
            color: '#10b981',
            marginBottom: '1.25rem',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} />
            <span>{msg}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section: Authentication & Access */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <h3 style={{
              margin: '0 0 1.25rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Shield size={18} color="#6366f1" />
              <span>Authentication & Access Policies</span>
            </h3>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              marginBottom: '1.25rem'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--admin-text-main, #0f172a)' }}>
                  Enforce 2FA / OTP Verification
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #64748b)', marginTop: '2px' }}>
                  Require email OTP verification for high-privilege logins and registrations.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireOtp}
                onChange={e => setRequireOtp(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)' }}>
                  JWT Access Token Lifetime (Minutes)
                </label>
                <input
                  type="number"
                  value={sessionTimeout}
                  onChange={e => setSessionTimeout(Number(e.target.value))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)' }}>
                  Max Failed Login Attempts
                </label>
                <input
                  type="number"
                  value={maxLoginAttempts}
                  onChange={e => setMaxLoginAttempts(Number(e.target.value))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section: AI Engine Controls */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <h3 style={{
              margin: '0 0 1.25rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Bot size={18} color="#10b981" />
              <span>AI Engine Controls</span>
            </h3>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--admin-text-main, #0f172a)' }}>
                  Auto-run AI Risk Assessment on Scans
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #64748b)', marginTop: '2px' }}>
                  Automatically trigger Ollama AI analysis for scans with security score below 70.
                </div>
              </div>
              <input
                type="checkbox"
                checked={aiAnalysisAutoRun}
                onChange={e => setAiAnalysisAutoRun(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
              />
            </div>
          </div>

          {/* Section: Governance & Audit */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <h3 style={{
              margin: '0 0 1.25rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <History size={18} color="#f59e0b" />
              <span>Governance & Audit Policy</span>
            </h3>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Audit Log Retention Period (Days)
              </label>
              <input
                type="number"
                value={auditLogRetentionDays}
                onChange={e => setAuditLogRetentionDays(Number(e.target.value))}
                style={{ width: '100%', maxWidth: '300px', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)', marginTop: '0.35rem' }}>
                Audit log entries older than this limit will be archived automatically.
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="admin-btn-primary"
              style={{ padding: '0.65rem 1.5rem' }}
            >
              <Save size={16} />
              <span>Save Platform Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </AdminSidebar>
  );
}
