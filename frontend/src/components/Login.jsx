import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function Login() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { loginUser, verifyLogin } = useContext(AuthContext);
  const { isDark } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    
    if (step === 1) {
      const result = await loginUser(username, password);
      setLoading(false);
      
      if (result.success) {
        if (result.otpRequired) {
          setNotice(result.message || "OTP code sent to your email.");
          setStep(2);
        }
      } else {
        setError(result.error);
      }
    } else {
      const result = await verifyLogin(username, password, otp);
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

      {/* Main Glass Login Card */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: 'clamp(1.75rem, 5vw, 3rem)',
          width: 'min(100%, 440px)',
          textAlign: 'center',
          borderRadius: '16px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '-0.02em' }}>
          CyberGuardian AI
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 2rem 0', fontSize: '0.92rem', fontWeight: 500 }}>
          User Portal Authentication
        </p>
        
        {notice && (
          <div style={{
            color: 'var(--success-color)',
            marginBottom: '1.25rem',
            background: isDark ? 'rgba(63, 185, 80, 0.12)' : 'rgba(16, 185, 129, 0.12)',
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
            background: isDark ? 'rgba(248, 81, 73, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger-color)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.88rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {step === 1 ? (
            <>
              <input 
                type="text" 
                placeholder="Email or Username" 
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
                placeholder="Password" 
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
              <p style={{ color: 'var(--success-color)', fontSize: '0.9rem', fontWeight: 600 }}>
                Enter the 6-digit OTP code sent to your registered email & phone number.
              </p>
              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  padding: '0.85rem',
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--accent-color)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  letterSpacing: '0.4rem',
                  fontSize: '1.25rem',
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
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              marginTop: '0.5rem',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)'
            }}
          >
            {loading ? 'Processing...' : (step === 1 ? 'Log In to User Portal' : 'Verify & Log In')}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 700, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.82rem' }}>
          <Link to="/admin/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>🔒</span> SOC Analyst Console
          </Link>
        </div>
      </div>
    </div>
  );
}
