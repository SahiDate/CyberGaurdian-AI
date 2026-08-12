import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { loginUser, verifyLogin } = useContext(AuthContext);

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: '#0a0d12', zIndex: 999, overflowY: 'auto' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '420px', textAlign: 'center', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h2 style={{ marginBottom: '0.25rem', color: 'var(--accent-color)' }}>CyberGuardian AI</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>User Portal Authentication</p>
        
        {notice && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', background: 'rgba(57,211,83,0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{notice}</div>}
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', background: 'rgba(248,81,73,0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {step === 1 ? (
            <>
              <input 
                type="text" 
                placeholder="Email or Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', fontSize: '0.95rem' }}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', fontSize: '0.95rem' }}
                required
              />
            </>
          ) : (
            <>
              <p style={{ color: 'var(--success-color)', fontSize: '0.9rem' }}>Enter the 6-digit OTP code sent to your email.</p>
              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', textAlign: 'center', letterSpacing: '0.4rem', fontSize: '1.2rem' }}
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

          <button type="submit" disabled={loading} style={{ padding: '0.75rem', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '0.5rem' }}>
            {loading ? 'Processing...' : (step === 1 ? 'Log In to User Portal' : 'Verify & Log In')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'none' }}>Register here</Link>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
          <Link to="/admin/login" style={{ color: '#8b949e', textDecoration: 'none' }}>
            🔒 SOC Analyst Console
          </Link>
        </div>
      </div>
    </div>
  );
}
