import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', style = {} }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`theme-toggle-btn ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        maxWidth: '40px',
        maxHeight: '40px',
        padding: 0,
        margin: 0,
        borderRadius: '8px',
        cursor: 'pointer',
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        outline: 'none',
        boxSizing: 'border-box',
        flexShrink: 0,
        transition: 'transform 100ms ease, background-color 200ms ease, border-color 200ms ease',
        ...style
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        {/* Sun Icon (Visible in dark mode to switch to light) */}
        <Sun
          size={19}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            color: '#fbbf24',
            opacity: isDark ? 1 : 0,
            transform: isDark
              ? 'translate(-50%, -50%) rotate(0deg) scale(1)'
              : 'translate(-50%, -50%) rotate(90deg) scale(0.5)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            pointerEvents: 'none'
          }}
        />

        {/* Moon Icon (Visible in light mode to switch to dark) */}
        <Moon
          size={19}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            color: '#6366f1',
            opacity: isDark ? 0 : 1,
            transform: isDark
              ? 'translate(-50%, -50%) rotate(-90deg) scale(0.5)'
              : 'translate(-50%, -50%) rotate(0deg) scale(1)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            pointerEvents: 'none'
          }}
        />
      </div>

      <style>{`
        .theme-toggle-btn {
          padding: 0 !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          max-width: 40px !important;
          max-height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          line-height: 1 !important;
        }
        .theme-toggle-btn:active {
          transform: scale(0.92) !important;
        }
        .theme-toggle-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--accent-color) !important;
        }
      `}</style>
    </button>
  );
}
