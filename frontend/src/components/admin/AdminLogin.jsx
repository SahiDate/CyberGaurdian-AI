import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';
import { Shield, Lock, ArrowLeft } from 'lucide-react';

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
    <div className="admin-portal" style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem',
      backgroundColor: isDark ? '#0f172a' : '#f4f6f9',
      boxSizing: 'border-box'
    }}>
      {/* Top Right Theme Toggle */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      <div
        className="admin-card"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: 'clamp(2rem, 5vw, 2.75rem)',
          width: 'min(100%, 420px)',
          textAlign: 'center',
          borderRadius: '16px',
          boxSizing: 'border-box',
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.06)'
        }}
      >
        {/* CyberGuardian Brand Badge */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
        }}>
          <Shield size={28} strokeWidth={2.4} />
        </div>

        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          color: 'var(--admin-text-main, #0f172a)',
          letterSpacing: '-0.02em',
          fontWeight: 800
        }}>
          CG SOC Admin
        </h2>
        <p style={{
          color: 'var(--admin-text-muted, #64748b)',
          margin: '0.35rem 0 1.75rem 0',
          fontSize: '0.82rem',
          fontWeight: 500
        }}>
          CyberGuardian AI • Administrator SOC Console
        </p>

        {notice && (
          <div style={{
            color: '#10b981',
            marginBottom: '1.25rem',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            textAlign: 'left'
          }}>
            {notice}
          </div>
        )}
        {error && (
          <div style={{
            color: '#ef4444',
            marginBottom: '1.25rem',
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          {step === 1 ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-muted, #64748b)', marginBottom: '0.35rem' }}>
                  Admin Username or Email
                </label>
                <input
                  type="text"
                  placeholder="Enter admin credentials"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-muted, #64748b)', marginBottom: '0.35rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <p style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                Security OTP sent to registered admin email.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-muted, #64748b)', marginBottom: '0.35rem' }}>
                  6-Digit Security OTP
                </label>
                <input
                  type="text"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    letterSpacing: '0.4rem',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                  maxLength={6}
                  required
                />
              </div>
            </>
          )}

          <div style={{ textAlign: 'right', marginTop: '-0.2rem' }}>
            <Link to="/forgot-password" style={{ color: 'var(--admin-text-muted, #64748b)', fontSize: '0.8rem', textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              fontSize: '0.92rem',
              marginTop: '0.35rem'
            }}
          >
            {loading ? 'Authenticating...' : (step === 1 ? 'Log In to SOC Console' : 'Authorize Admin Session')}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <Link to="/login" style={{ color: '#6366f1', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} />
            <span>Return to User Portal</span>
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #64748b)' }}>
            © 2026 CyberGuardian AI
          </div>
        </div>
      </div>
    </div>
  );
}
