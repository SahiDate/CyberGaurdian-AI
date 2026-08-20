import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function Register() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { registerUser, verifyRegistration } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (step === 1) {
      const result = await registerUser(username, email, password, phone);
      setLoading(false);
      
      if (result.success) {
        setStep(2);
      } else {
        setError(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
      }
    } else {
      const result = await verifyRegistration(username, otp);
      setLoading(false);
      
      if (result.success) {
        navigate('/login');
      } else {
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

      {/* Main Glass Register Card */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: 'clamp(1.75rem, 5vw, 3rem)',
          width: 'min(100%, 450px)',
          textAlign: 'center',
          borderRadius: '16px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '-0.02em' }}>
          CyberGuardian AI
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 2rem 0', fontSize: '0.92rem', fontWeight: 500 }}>
          Register for Autonomous Protection
        </p>
        
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

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {step === 1 ? (
            <>
              <input 
                type="text" 
                placeholder="Username" 
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
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <input 
                type="tel" 
                placeholder="Phone Number (e.g., +1234567890)" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              <p style={{ color: 'var(--success-color)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                Verification code sent to your registered <strong>Email</strong> and <strong>Phone Number</strong>.
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
                  letterSpacing: '0.5rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
                maxLength={6}
                required
              />
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
              marginTop: '0.5rem',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)'
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
