import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const tokens = localStorage.getItem('authTokens');
    if (tokens) {
      try {
        const payload = JSON.parse(atob(JSON.parse(tokens).access.split('.')[1]));
        return { username: payload.username };
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [authTokens, setAuthTokens] = useState(() => {
    const tokens = localStorage.getItem('authTokens');
    return tokens ? JSON.parse(tokens) : null;
  });
  
  const navigate = useNavigate();

  const loginUser = async (username, password) => {
    const response = await fetch('http://localhost:8000/api/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (response.status === 200) {
      if (data.otp_required) {
        return { success: true, otpRequired: true };
      }
      setAuthTokens(data);
      const payload = JSON.parse(atob(data.access.split('.')[1]));
      setUser({ username: payload.username });
      localStorage.setItem('authTokens', JSON.stringify(data));
      navigate('/dashboard');
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Login failed' };
    }
  };

  const verifyLogin = async (username, password, otp) => {
    const response = await fetch('http://localhost:8000/api/verify-login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, otp }),
    });
    const data = await response.json();
    if (response.status === 200) {
      setAuthTokens(data);
      const payload = JSON.parse(atob(data.access.split('.')[1]));
      setUser({ username: payload.username });
      localStorage.setItem('authTokens', JSON.stringify(data));
      navigate('/dashboard');
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Invalid OTP' };
    }
  };

  const registerUser = async (username, email, password, phone_number) => {
    const response = await fetch('http://localhost:8000/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, phone_number }),
    });
    const data = await response.json();
    if (response.status === 201) {
      return { success: true };
    } else {
      return { success: false, error: data };
    }
  };

  const verifyRegistration = async (username, otp) => {
    const response = await fetch('http://localhost:8000/api/verify-registration/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp }),
    });
    const data = await response.json();
    if (response.status === 200) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Verification failed' };
    }
  };

  const logoutUser = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem('authTokens');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, authTokens, loginUser, verifyLogin, registerUser, verifyRegistration, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
