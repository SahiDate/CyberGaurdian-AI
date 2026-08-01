import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { loginUser, verifyLogin } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (step === 1) {
      const result = await loginUser(username, password);
      setLoading(false);
      
      if (result.success) {
        if (result.otpRequired) {
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-color)' }}>CyberGuardian AI</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>One Input, Autonomous Protection.</p>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {step === 1 ? (
            <>
              <input 
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
                required
              />
            </>
          ) : (
            <>
              <p style={{ color: 'var(--success-color)' }}>Login credentials accepted! Check your terminal for the OTP.</p>
              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.2rem' }}
                maxLength={6}
                required
              />
            </>
          )}

          <button type="submit" disabled={loading} style={{ padding: '0.75rem', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>
            {loading ? 'Processing...' : (step === 1 ? 'Login' : 'Verify & Login')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          Need an account? <Link to="/register" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}
