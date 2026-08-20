import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', style = {} }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`glass-panel theme-toggle-btn ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        padding: '8px',
        borderRadius: 'var(--radius-sm, 8px)',
        cursor: 'pointer',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        outline: 'none',
        transition: 'transform 100ms ease, background-color 200ms ease, border-color 200ms ease',
        ...style
      }}
    >
      <div style={{ position: 'relative', width: '20px', height: '20px' }}>
        {/* Sun Icon (Visible in dark mode to switch to light, or vice-versa) */}
        <Sun
          size={20}
          style={{
            position: 'absolute',
            inset: 0,
            color: '#fbbf24',
            opacity: isDark ? 1 : 0,
            transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            pointerEvents: 'none'
          }}
        />

        {/* Moon Icon (Visible in light mode to switch to dark) */}
        <Moon
          size={20}
          style={{
            position: 'absolute',
            inset: 0,
            color: '#6366f1',
            opacity: isDark ? 0 : 1,
            transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            pointerEvents: 'none'
          }}
        />
      </div>

      <style>{`
        .theme-toggle-btn:active {
          transform: scale(0.90) !important;
        }
        .theme-toggle-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--accent-color) !important;
        }
      `}</style>
    </button>
  );
}
