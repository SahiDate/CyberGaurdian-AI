import React, { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const tokens = localStorage.getItem('authTokens');
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        const payload = JSON.parse(atob(parsed.access.split('.')[1]));
        return {
          id: payload.user_id || payload.id,
          username: payload.username,
          email: payload.email,
          role: payload.role || 'USER',
          status: payload.status || 'ACTIVE'
        };
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

  // Helper to decode token payload
  const handleTokenSuccess = (data, defaultRedirect) => {
    setAuthTokens(data);
    localStorage.setItem('authTokens', JSON.stringify(data));
    const payload = JSON.parse(atob(data.access.split('.')[1]));
    const userData = {
      id: payload.user_id || (data.user && data.user.id),
      username: payload.username,
      email: payload.email || (data.user && data.user.email),
      role: payload.role || (data.user && data.user.role) || 'USER',
      status: payload.status || (data.user && data.user.status) || 'ACTIVE'
    };
    setUser(userData);
    if (['ADMIN', 'SOC_ANALYST', 'SUPER_ADMIN'].includes(userData.role)) {
      navigate('/admin/dashboard');
    } else {
      navigate(defaultRedirect || '/dashboard');
    }
  };

  // User Login Flow (/api/login/)
  const loginUser = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.status === 200) {
        if (data.otp_required) {
          return { success: true, otpRequired: true, message: data.message };
        }
        handleTokenSuccess(data, '/dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed', status: response.status };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please ensure backend service is running.' };
    }
  };

  const verifyLogin = async (username, password, otp) => {
    try {
      const response = await fetch('http://localhost:8000/api/verify-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, otp }),
      });
      const data = await response.json();
      if (response.status === 200) {
        handleTokenSuccess(data, '/dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid OTP', status: response.status };
      }
    } catch (err) {
      return { success: false, error: 'Network error during OTP verification.' };
    }
  };

  // Admin Login Flow (/api/admin/login/) - Strictly NO Public Signup!
  const adminLoginUser = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.status === 200) {
        if (data.otp_required) {
          return { success: true, otpRequired: true, message: data.message };
        }
        handleTokenSuccess(data, '/admin/dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Admin Login failed', status: response.status };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please ensure backend service is running.' };
    }
  };

  const verifyAdminLogin = async (username, password, otp) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/verify-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, otp }),
      });
      const data = await response.json();
      if (response.status === 200) {
        handleTokenSuccess(data, '/admin/dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid OTP', status: response.status };
      }
    } catch (err) {
      return { success: false, error: 'Network error during Admin OTP verification.' };
    }
  };

  // User Registration Flow (USER role only)
  const registerUser = async (username, email, password, phone_number) => {
    try {
      const cleanUsername = (username || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPhone = (phone_number || '').trim();

      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          username: cleanUsername, 
          email: cleanEmail, 
          password, 
          phone_number: cleanPhone 
        }),
      });
      const data = await response.json();
      if (response.status === 201) {
        return { success: true, username: data.username || cleanUsername, data };
      } else {
        let errMsg = data.error;
        if (!errMsg && data.details) {
          const detailVals = Object.values(data.details).flat();
          errMsg = detailVals.join(' ');
        }
        if (!errMsg && typeof data === 'object') {
          const firstVal = Object.values(data)[0];
          errMsg = Array.isArray(firstVal) ? firstVal[0] : (typeof firstVal === 'string' ? firstVal : JSON.stringify(data));
        }
        return { success: false, error: errMsg || 'Registration failed. Please check your inputs.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error during registration. Ensure backend server is running.' };
    }
  };

  const verifyRegistration = async (username, otp) => {
    try {
      const cleanUsername = (username || '').trim();
      const cleanOtp = (otp || '').trim();

      const response = await fetch('http://localhost:8000/api/verify-registration/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: cleanUsername, otp: cleanOtp }),
      });
      const data = await response.json();
      if (response.status === 200) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Verification failed. Please check the OTP.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error during registration verification.' };
    }
  };

  const resendRegistrationOTP = async (username) => {
    try {
      const cleanUsername = (username || '').trim();
      const response = await fetch('http://localhost:8000/api/resend-registration-otp/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: cleanUsername }),
      });
      const data = await response.json();
      if (response.status === 200) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to resend verification code.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error resending OTP.' };
    }
  };

  // Password Reset Flow
  const forgotPassword = async (email) => {
    try {
      const response = await fetch('http://localhost:8000/api/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return { success: response.status === 200, message: data.message || data.error };
    } catch (err) {
      return { success: false, error: 'Network error sending password reset.' };
    }
  };

  const resetPassword = async (email, otp, new_password) => {
    try {
      const response = await fetch('http://localhost:8000/api/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password }),
      });
      const data = await response.json();
      if (response.status === 200) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Password reset failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error resetting password.' };
    }
  };

  const logoutUser = () => {
    const isAdmin = user && ['ADMIN', 'SOC_ANALYST', 'SUPER_ADMIN'].includes(user.role);
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem('authTokens');
    if (isAdmin) {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      authTokens,
      loginUser,
      verifyLogin,
      adminLoginUser,
      verifyAdminLogin,
      registerUser,
      verifyRegistration,
      resendRegistrationOTP,
      forgotPassword,
      resetPassword,
      logoutUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
