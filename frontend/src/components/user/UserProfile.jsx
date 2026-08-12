import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

export default function UserProfile() {
  const { authTokens, user } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/profile/', {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setEmail(data.email || '');
        setPhoneNumber(data.phone_number || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const response = await fetch('http://localhost:8000/api/profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({ email, phone_number: phoneNumber })
      });
      if (response.ok) {
        setMsg("Profile updated successfully.");
      } else {
        setMsg("Failed to update profile.");
      }
    } catch (e) {
      setMsg("Error updating profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#fff', paddingBottom: '3rem' }}>
      <Navbar />

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '12px' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>👤 User Profile</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Manage account information and security contact details.
          </p>

          {msg && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', background: 'rgba(57,211,83,0.1)', padding: '0.75rem', borderRadius: '6px' }}>{msg}</div>}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Username</label>
              <input
                type="text"
                value={user ? user.username : ''}
                disabled
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Account Role</label>
              <input
                type="text"
                value={user ? user.role : 'USER'}
                disabled
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', fontWeight: 'bold', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phone Number (For SMS OTP)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}
                placeholder="+1234567890"
              />
            </div>

            <button type="submit" disabled={saving} style={{
              padding: '0.85rem',
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '1rem'
            }}>
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
