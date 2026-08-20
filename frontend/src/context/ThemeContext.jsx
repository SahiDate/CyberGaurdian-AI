import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const userKey = user?.id ? `theme_user_${user.id}` : (user?.username ? `theme_user_${user.username}` : 'theme');

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const activeUserKey = user?.id ? `theme_user_${user.id}` : (user?.username ? `theme_user_${user.username}` : 'theme');
      const savedTheme = localStorage.getItem(activeUserKey) || localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark';
  });

  // When active user / tenant changes, load their individual saved theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentKey = user?.id ? `theme_user_${user.id}` : (user?.username ? `theme_user_${user.username}` : 'theme');
      const userSavedTheme = localStorage.getItem(currentKey);
      if (userSavedTheme === 'light' || userSavedTheme === 'dark') {
        setTheme(userSavedTheme);
      }
    }
  }, [user?.id, user?.username]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    // Save to both global default and user-specific storage key
    localStorage.setItem('theme', theme);
    if (user?.id) {
      localStorage.setItem(`theme_user_${user.id}`, theme);
    }
    if (user?.username) {
      localStorage.setItem(`theme_user_${user.username}`, theme);
    }
  }, [theme, user?.id, user?.username]);

  // Listen for system theme changes if user hasn't explicitly set one
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem(userKey) && !localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [userKey]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, userThemeKey: userKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
