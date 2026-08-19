import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
        setError(JSON.stringify(result.error));
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: '#0a0d12', zIndex: 999, overflowY: 'auto', padding: '1rem', boxSizing: 'border-box' }}>
      <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', width: 'min(100%, 420px)', textAlign: 'center', boxSizing: 'border-box' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-color)' }}>CyberGuardian AI</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Register for Autonomous Protection.</p>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <input 
                type="tel" 
                placeholder="Phone Number (e.g., +1234567890)" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
                required
              />
            </>
          ) : (
            <>
              <p style={{ color: 'var(--success-color)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Verification code sent to your registered <strong>Email</strong> and <strong>Phone Number</strong>.
              </p>
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
            {loading ? 'Processing...' : (step === 1 ? 'Register Account' : 'Verify & Complete')}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Login here</Link>
        </div>
      </div>
    </div>
  );
}
