import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

export default function AdminLogin() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const { adminLoginUser, verifyAdminLogin } = useContext(AuthContext);
  const { isDark } = useTheme();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    if (step === 1) {
      const result = await adminLoginUser(username, password);
      setLoading(false);

      if (result.success) {
        if (result.otpRequired) {
          setNotice(result.message || "Admin OTP sent to your email.");
          setStep(2);
        }
      } else {
        setError(result.error);
      }
    } else {
      const result = await verifyAdminLogin(username, password, otp);
      setLoading(false);

      if (!result.success) {
        setError(result.error);
      }
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Top Right Theme Toggle */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      <div
        className="glass-panel"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: 'clamp(1.75rem, 5vw, 3rem)',
          width: 'min(100%, 450px)',
          textAlign: 'center',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.98)',
          boxShadow: isDark
            ? '0 0 40px rgba(248, 81, 73, 0.15), 0 16px 48px rgba(0,0,0,0.5)'
            : '0 20px 50px rgba(239, 68, 68, 0.1), 0 4px 16px rgba(0,0,0,0.04)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>🚨</div>
        <h2 style={{ margin: 0, fontSize: '1.65rem', color: 'var(--danger-color)', letterSpacing: '-0.02em', fontWeight: 800 }}>
          SOC Analyst Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 2rem 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
          Admin Authentication & Command Center
        </p>

        {notice && (
          <div style={{
            color: 'var(--success-color)',
            marginBottom: '1.25rem',
            background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.12)',
            border: '1px solid var(--success-color)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.88rem'
          }}>
            {notice}
          </div>
        )}
        {error && (
          <div style={{
            color: 'var(--danger-color)',
            marginBottom: '1.25rem',
            background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.12)',
            border: '1px solid var(--danger-color)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.88rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {step === 1 ? (
            <>
              <input
                type="text"
                placeholder="Admin Email or Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                required
              />
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                required
              />
            </>
          ) : (
            <>
              <p style={{ color: 'var(--success-color)', fontSize: '0.88rem', fontWeight: 600 }}>Security OTP sent to registered admin email and phone number.</p>
              <input
                type="text"
                placeholder="Enter 6-digit Security OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  padding: '0.85rem',
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--danger-color)',
                  color: 'var(--danger-color)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  letterSpacing: '0.4rem',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
                maxLength={6}
                required
              />
            </>
          )}

          <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
            <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-fluid"
            style={{
              padding: '0.9rem',
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              marginTop: '0.5rem',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 16px rgba(220,38,38,0.35)'
            }}
          >
            {loading ? 'Authenticating SOC Credentials...' : (step === 1 ? 'Log In to SOC Console' : 'Authorize Admin Session')}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>←</span> Return to User Portal
          </Link>
        </div>

        <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
          🔒 Administrator Access Only. Public registration is prohibited.
        </div>
      </div>
    </div>
  );
}
