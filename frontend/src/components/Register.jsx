import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function Register() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);
  
  const { registerUser, verifyRegistration, resendRegistrationOTP } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Timer countdown for resend OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    if (step === 1) {
      const cleanUsername = username.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      const result = await registerUser(cleanUsername, cleanEmail, password, phone);
      setLoading(false);
      
      if (result.success) {
        setStep(2);
        setResendTimer(30);
        setSuccessMsg(`Verification code dispatched to ${cleanEmail}`);
        if (result.username) setUsername(result.username);
      } else {
        setError(result.error || 'Registration failed. Please check your information.');
      }
    } else {
      const cleanUsername = username.trim();
      const result = await verifyRegistration(cleanUsername, otp);
      setLoading(false);
      
      if (result.success) {
        setSuccessMsg('Account verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1200);
      } else {
        setError(result.error || 'Invalid OTP code. Please check and try again.');
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setError(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim();
    const result = await resendRegistrationOTP(cleanUsername);
    setResending(false);

    if (result.success) {
      setResendTimer(45);
      setSuccessMsg(result.message || 'A fresh verification code has been dispatched.');
    } else {
      setError(result.error || 'Failed to resend code. Please try again.');
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

      {/* Main Glass Register Card */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: 'clamp(1.75rem, 5vw, 2.75rem)',
          width: 'min(100%, 460px)',
          textAlign: 'center',
          borderRadius: '16px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '-0.02em' }}>
          CyberGuardian AI
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 1.5rem 0', fontSize: '0.92rem', fontWeight: 500 }}>
          {step === 1 ? 'Create your account for autonomous security protection' : 'Verify your email to activate account'}
        </p>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: step === 1 ? 'var(--accent-color)' : 'var(--success-color)'
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: step === 1 ? 'var(--accent-color)' : 'var(--success-color)',
              color: '#fff',
              fontSize: '0.75rem'
            }}>
              {step === 1 ? '1' : '✓'}
            </span>
            Account Info
          </div>
          <div style={{ width: '30px', height: '2px', background: step === 2 ? 'var(--accent-color)' : 'var(--border-subtle)' }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: step === 2 ? 'var(--accent-color)' : 'var(--text-muted)'
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: step === 2 ? 'var(--accent-color)' : 'var(--border-subtle)',
              color: step === 2 ? '#fff' : 'var(--text-muted)',
              fontSize: '0.75rem'
            }}>
              2
            </span>
            Verification
          </div>
        </div>
        
        {/* Error Notification */}
        {error && (
          <div style={{
            color: 'var(--danger-color)',
            marginBottom: '1.25rem',
            background: isDark ? 'rgba(248, 81, 73, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger-color)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.88rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span>
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}

        {/* Success / Status Notification */}
        {successMsg && (
          <div style={{
            color: 'var(--success-color)',
            marginBottom: '1.25rem',
            background: isDark ? 'rgba(46, 160, 67, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            border: '1px solid var(--success-color)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.88rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>✅</span>
            <div style={{ flex: 1 }}>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {step === 1 ? (
            <>
              <div style={{ textAlign: 'left' }}>
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                <input 
                  type="email" 
                  placeholder="Email address (e.g. alex@example.com)" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ position: 'relative', textAlign: 'left' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password (minimum 6 characters)" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 2.8rem 0.85rem 1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0.25rem'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>

              <div style={{ textAlign: 'left' }}>
                <input 
                  type="tel" 
                  placeholder="Phone Number (e.g. +91 9876543210)" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Used for Multi-Factor Authentication (OTP).
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{
                background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                padding: '0.9rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '0.5rem',
                textAlign: 'left',
                fontSize: '0.88rem'
              }}>
                <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  Account: <span style={{ color: 'var(--accent-color)' }}>{username}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Target: {email}
                </div>
              </div>

              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                style={{
                  padding: '0.85rem',
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--accent-color)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  letterSpacing: '0.45rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                maxLength={6}
                required
                autoFocus
              />

              {/* Resend OTP & Edit Details Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem',
                marginTop: '0.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontSize: '0.84rem'
                  }}
                >
                  ← Edit details
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--accent-color)',
                    cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    padding: 0,
                    fontSize: '0.84rem'
                  }}
                >
                  {resending ? 'Sending...' : (resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code')}
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-fluid"
            style={{
              padding: '0.9rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              marginTop: '0.75rem',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Processing...' : (step === 1 ? 'Register Account' : 'Verify & Complete')}
          </button>
        </form>
        
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 700, textDecoration: 'none' }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
