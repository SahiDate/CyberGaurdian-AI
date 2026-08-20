import React, { useRef, useState, useEffect } from 'react';

/**
 * Apple fluid tab bar with critically-damped spring active indicator slider
 * and pointer-down physics.
 */
export default function FluidTabs({ tabs, activeTab, onChange }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [pressedTab, setPressedTab] = useState(null);

  const updateIndicator = () => {
    const activeElement = tabRefs.current[activeTab];
    const container = containerRef.current;
    if (activeElement && container) {
      const activeRect = activeElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setIndicatorStyle({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
        opacity: 1
      });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="fluid-tab-container table-responsive-container"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '4px',
        gap: '4px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        marginBottom: '24px',
        maxWidth: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        transition: 'background-color 300ms ease, border-color 300ms ease'
      }}
    >
      {/* Sliding spring background pill */}
      <div
        className="fluid-tab-indicator"
        style={{
          position: 'absolute',
          top: '4px',
          bottom: '4px',
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
          background: 'var(--accent-color, #58a6ff)',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(88, 166, 255, 0.35)',
          // Critically damped spring feel (damping ~1.0, response ~0.3s)
          transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isPressed = pressedTab === tab.id;

        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[tab.id] = el)}
            onPointerDown={() => {
              setPressedTab(tab.id);
              onChange(tab.id);
            }}
            onPointerUp={() => setPressedTab(null)}
            onPointerLeave={() => setPressedTab(null)}
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: isActive ? '#ffffff' : 'var(--text-muted, #8b949e)',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              outline: 'none',
              userSelect: 'none',
              transform: isPressed ? 'scale(0.97)' : 'scale(1)',
              transition: 'transform 100ms ease-out, color 200ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
