import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 30%, #161b22 0%, #0d1117 100%)',
        color: '#c9d1d9',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        padding: '2rem 1rem',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          margin: 'auto',
          background: 'rgba(22, 27, 34, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid #30363d',
          borderRadius: '16px',
          padding: '2rem 1.8rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(56, 139, 253, 0.1)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 0.75rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1f6feb, #388bfd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              boxShadow: '0 0 20px rgba(56, 139, 253, 0.4)',
            }}
          >
            🛡️
          </div>
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.45rem', fontWeight: '700', letterSpacing: '0.5px' }}>
            CyberGuardian AI
          </h2>
          <p style={{ margin: '0.3rem 0 0', color: '#8b949e', fontSize: '0.85rem' }}>
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
            marginBottom: '1.2rem',
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: step === 1 ? '#1f6feb' : '#21262d',
              color: step === 1 ? '#ffffff' : '#8b949e',
              border: '1px solid',
              borderColor: step === 1 ? '#388bfd' : '#30363d',
              transition: 'all 0.3s ease',
            }}
          >
            1. Verify Email
          </div>
          <div style={{ width: '20px', height: '1px', background: '#30363d' }} />
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: step === 2 ? '#1f6feb' : '#21262d',
              color: step === 2 ? '#ffffff' : '#8b949e',
              border: '1px solid',
              borderColor: step === 2 ? '#388bfd' : '#30363d',
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
              background: 'rgba(46, 160, 67, 0.15)',
              border: '1px solid #2ea043',
              color: '#56d364',
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
              background: 'rgba(248, 81, 73, 0.15)',
              border: '1px solid #f85149',
              color: '#ff7b72',
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
                  color: '#8b949e',
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600',
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
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#ffffff',
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
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'linear-gradient(135deg, #1f6feb, #238636)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(31, 111, 235, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? 'Dispatching OTP Email...' : 'Send Reset Code to Email'}
            </button>
          </form>
        ) : (
          /* STEP 2: OTP Verification & Password Reset */
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label
                  style={{
                    color: '#8b949e',
                    fontSize: '0.82rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600',
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
                    color: resendCooldown > 0 ? '#484f58' : '#58a6ff',
                    fontSize: '0.8rem',
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
                  background: '#0d1117',
                  border: '1px solid #388bfd',
                  borderRadius: '8px',
                  color: '#58a6ff',
                  fontSize: '1.4rem',
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
              <p style={{ margin: '0.35rem 0 0', color: '#6e7681', fontSize: '0.78rem', textAlign: 'center' }}>
                OTP sent to <span style={{ color: '#c9d1d9' }}>{email}</span> (Expires in 10 minutes)
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  color: '#8b949e',
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600',
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
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#ffffff',
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
                    color: '#8b949e',
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
                  <div style={{ height: '4px', background: '#21262d', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: strength.percent,
                        height: '100%',
                        background: strength.color,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strength.color, marginTop: '2px', display: 'block' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  color: '#8b949e',
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600',
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
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#ffffff',
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
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'linear-gradient(135deg, #1f6feb, #388bfd)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(31, 111, 235, 0.4)',
                transition: 'all 0.2s ease',
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
            marginTop: '1.2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #21262d',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#8b949e',
          }}
        >
          Remembered your password?{' '}
          <Link to="/login" style={{ color: '#58a6ff', textDecoration: 'none', fontWeight: '600' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
