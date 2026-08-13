import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function AdminLogin() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const { adminLoginUser, verifyAdminLogin } = useContext(AuthContext);

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: '#070a0e', zIndex: 999, overflowY: 'auto', padding: '1rem', boxSizing: 'border-box' }}>
      <div className="glass-panel" style={{
        padding: 'clamp(1.5rem, 5vw, 3rem)',
        width: 'min(100%, 440px)',
        textAlign: 'center',
        borderRadius: '12px',
        border: '1px solid rgba(248, 81, 73, 0.3)',
        boxShadow: '0 0 30px rgba(248, 81, 73, 0.08)',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚨</div>
        <h2 style={{ marginBottom: '0.25rem', color: '#f85149', letterSpacing: '0.5px' }}>
          SOC Analyst Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Admin Authentication & Command Center
        </p>

        {notice && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', background: 'rgba(57,211,83,0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{notice}</div>}
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', background: 'rgba(248,81,73,0.15)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid var(--danger-color)' }}>{error}</div>}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {step === 1 ? (
            <>
              <input
                type="text"
                placeholder="Admin Email or Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', fontSize: '0.95rem' }}
                required
              />
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', fontSize: '0.95rem' }}
                required
              />
            </>
          ) : (
            <>
              <p style={{ color: 'var(--success-color)', fontSize: '0.85rem' }}>Security OTP generated. Check console or registered admin email.</p>
              <input
                type="text"
                placeholder="Enter 6-digit Security OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid #f85149', color: '#fff', borderRadius: '6px', textAlign: 'center', letterSpacing: '0.4rem', fontSize: '1.2rem' }}
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

          <button type="submit" disabled={loading} style={{
            padding: '0.85rem',
            background: 'linear-gradient(135deg, #da3633, #f85149)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '1rem',
            marginTop: '0.5rem',
            letterSpacing: '0.5px'
          }}>
            {loading ? 'Authenticating SOC Credentials...' : (step === 1 ? 'Log In to SOC Console' : 'Authorize Admin Session')}
          </button>
        </form>

        {/* Note: Public Registration is strictly disabled and NOT displayed for Admin Portal */}
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          🔒 Administrator Access Only. Public registration is prohibited.
        </div>
      </div>
    </div>
  );
}
