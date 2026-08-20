import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { forgotPassword, resetPassword } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Cooldown timer for OTP Resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password strength logic
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: 'transparent', score: 0 };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: 'Weak', color: '#ef4444', percent: '33%' };
    if (score <= 4) return { label: 'Medium', color: '#f59e0b', percent: '66%' };
    return { label: 'Strong & Secure', color: '#10b981', percent: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setMessage(result.message || `OTP dispatched to ${email}. If you don't receive it within 1 minute, ask your administrator to check the server terminal.`);
      setStep(2);
      setResendCooldown(60);
    } else {
      setError(result.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setMessage('A new OTP has been dispatched to your email address.');
      setResendCooldown(60);
    } else {
      setError(result.error || 'Could not resend OTP.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await resetPassword(email, otp, newPassword);
    setLoading(false);

    if (result.success) {
      setMessage('🔑 Password updated successfully! Redirecting to login portal...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(result.error || 'Failed to reset password. Check your OTP and try again.');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Right Theme Toggle */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      <div
        className="glass-panel"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '460px',
          margin: 'auto',
          borderRadius: '16px',
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 0.75rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-color), #60a5fa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
          >
            🛡️
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            CyberGuardian AI
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Enterprise Password Recovery Service
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: step === 1 ? 'var(--accent-color)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
              color: step === 1 ? '#ffffff' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: step === 1 ? 'var(--accent-color)' : 'var(--border-subtle)',
              transition: 'all 0.3s ease',
            }}
          >
            1. Verify Email
          </div>
          <div style={{ width: '20px', height: '1px', background: 'var(--border-subtle)' }} />
          <div
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: step === 2 ? 'var(--accent-color)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
              color: step === 2 ? '#ffffff' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: step === 2 ? 'var(--accent-color)' : 'var(--border-subtle)',
              transition: 'all 0.3s ease',
            }}
          >
            2. Enter OTP & Reset
          </div>
        </div>

        {/* Dynamic Alerts */}
        {message && (
          <div
            style={{
              background: isDark ? 'rgba(63, 185, 80, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--success-color)',
              color: 'var(--success-color)',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
              lineHeight: '1.5',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: isDark ? 'rgba(248, 81, 73, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger-color)',
              color: 'var(--danger-color)',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
              lineHeight: '1.5',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Email Request */}
        {step === 1 ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                }}
              >
                Registered Email Address
              </label>
              <input
                type="email"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-fluid"
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'var(--accent-color)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
              }}
            >
              {loading ? 'Dispatching OTP Email...' : 'Send Reset Code to Email'}
            </button>
          </form>
        ) : (
          /* STEP 2: OTP Verification & Password Reset */
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '700',
                  }}
                >
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-color)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: resendCooldown > 0 ? 'default' : 'pointer',
                    padding: 0,
                    textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
              <input
                type="text"
                placeholder="1 2 3 4 5 6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--accent-color)',
                  borderRadius: '8px',
                  color: 'var(--accent-color)',
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontFamily: "'Courier New', monospace",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                maxLength={6}
                required
              />
              <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
                OTP sent to <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{email}</span> (Expires in 10 minutes)
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                }}
              >
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 2.8rem 0.85rem 1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ height: '4px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: strength.percent,
                        height: '100%',
                        background: strength.color,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strength.color, marginTop: '2px', display: 'block', fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                }}
              >
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-fluid"
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'var(--accent-color)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                marginTop: '0.5rem',
              }}
            >
              {loading ? 'Saving New Password...' : 'Reset & Save New Password'}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
          }}
        >
          Remembered your password?{' '}
          <Link to="/login" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: '700' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
