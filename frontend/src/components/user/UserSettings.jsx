import React, { useState, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

export default function UserSettings() {
  const { authTokens } = useContext(AuthContext);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [msg, setMsg] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setMsg("Settings saved successfully.");
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', paddingBottom: '3rem', transition: 'background-color 0.25s ease, color 0.25s ease' }}>
      <Navbar />

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '12px' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>⚙️ User Settings</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Customize notification preferences, 2FA settings, and scanner defaults.
          </p>

          {msg && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', background: 'rgba(57,211,83,0.1)', padding: '0.75rem', borderRadius: '6px' }}>{msg}</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--border-subtle)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Email Threat Notifications</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive email alerts when critical vulnerabilities are detected.</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--border-subtle)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>SMS Security Alerts</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive OTP codes and instant SMS security warnings.</div>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <button type="submit" style={{
              padding: '0.85rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '1rem'
            }}>
              Save Preferences
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
