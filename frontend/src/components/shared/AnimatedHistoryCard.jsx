import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Inline Icons
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const TerminalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const ArrowUpRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"></line>
    <polyline points="7 7 17 7 17 17"></polyline>
  </svg>
);

export default function AnimatedHistoryCard({
  title = "Scanning History Stream",
  type = "scanner", // 'scanner' | 'soc'
  items = [],
  loading = false,
  onSelectItem = null,
  emptyMessage = "No historical scan records found."
}) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timelineTab, setTimelineTab] = useState('current'); // 'current' | 'past' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [animDirection, setAnimDirection] = useState('next');
  const [isAnimating, setIsAnimating] = useState(false);

  // Styling tokens
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accentColor = 'var(--accent-color, #6366f1)';

  // Safe normalized items
  const normalizedItems = useMemo(() => {
    return (items || []).map((item, idx) => {
      const target = item.domain || item.target || item.url || item.original_filename || item.filename || `Record #${item.id || idx + 1}`;
      const timestamp = item.scanned_at || item.created_at || item.timestamp || new Date().toISOString();
      const score = item.security_score ?? item.risk_score ?? null;
      const rawSev = (item.risk_level || item.severity || item.threat_level || (score !== null && score < 50 ? 'HIGH' : 'LOW')).toUpperCase();
      
      let severityClass = 'low';
      if (rawSev.includes('CRIT')) severityClass = 'critical';
      else if (rawSev.includes('HIGH')) severityClass = 'high';
      else if (rawSev.includes('MED')) severityClass = 'medium';

      return {
        ...item,
        _displayTarget: target,
        _timestamp: new Date(timestamp),
        _score: score,
        _severity: rawSev,
        _severityClass: severityClass
      };
    });
  }, [items]);

  // Timeline categorization
  const categorized = useMemo(() => {
    const today = new Date();
    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const currentItems = [];
    const pastItems = [];

    normalizedItems.forEach((item) => {
      const itemDate = item._timestamp;
      if (isSameDay(itemDate, today)) {
        currentItems.push(item);
      } else {
        pastItems.push(item);
      }
    });

    return {
      current: currentItems,
      past: pastItems,
      all: normalizedItems
    };
  }, [normalizedItems]);

  // Current tab items filtered by search
  const filteredTabItems = useMemo(() => {
    const tabList = categorized[timelineTab] || [];
    if (!searchQuery.trim()) return tabList;
    const q = searchQuery.toLowerCase().trim();
    return tabList.filter(item =>
      item._displayTarget.toLowerCase().includes(q) ||
      item._severity.toLowerCase().includes(q) ||
      (item.summary && item.summary.toLowerCase().includes(q))
    );
  }, [categorized, timelineTab, searchQuery]);

  // Reset index if bounds change
  useEffect(() => {
    if (currentIndex >= normalizedItems.length && normalizedItems.length > 0) {
      setCurrentIndex(0);
    }
  }, [normalizedItems.length, currentIndex]);

  // Auto-cycle animation when collapsed
  useEffect(() => {
    if (isExpanded || isPaused || normalizedItems.length <= 1) return;

    const timer = setInterval(() => {
      setAnimDirection('next');
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % normalizedItems.length);
      setTimeout(() => setIsAnimating(false), 400);
    }, 4500);

    return () => clearInterval(timer);
  }, [isExpanded, isPaused, normalizedItems.length]);

  const handleNext = (e) => {
    e?.stopPropagation();
    if (normalizedItems.length <= 1) return;
    setAnimDirection('next');
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % normalizedItems.length);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (normalizedItems.length <= 1) return;
    setAnimDirection('prev');
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + normalizedItems.length) % normalizedItems.length);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const currentItem = normalizedItems[currentIndex] || null;

  // Format relative timestamp
  const formatTime = (date) => {
    if (!date || isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400 && date.getDate() === now.getDate()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Severity Badging Helpers
  const getBadgeStyle = (sevClass) => {
    switch (sevClass) {
      case 'critical':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
          text: isDark ? '#f87171' : '#dc2626',
          border: isDark ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid #fecaca'
        };
      case 'high':
        return {
          bg: isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5',
          text: isDark ? '#fb923c' : '#ea580c',
          border: isDark ? '1px solid rgba(251, 146, 60, 0.3)' : '1px solid #fed7aa'
        };
      case 'medium':
        return {
          bg: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3',
          text: isDark ? '#facc15' : '#ca8a04',
          border: isDark ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid #fde047'
        };
      case 'low':
      default:
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
          text: isDark ? '#34d399' : '#059669',
          border: isDark ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid #bbf7d0'
        };
    }
  };

  return (
    <div
      className="admin-card history-stream-card"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        borderRadius: '12px',
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
        marginBottom: 'var(--space-32)',
        overflow: 'hidden',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease'
      }}
    >
      {/* Card Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '1rem 1.35rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isExpanded ? `1px solid ${cardBorder}` : 'none',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
          transition: 'background-color 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Pulsing Live Dot */}
          <div style={{
            position: 'relative',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              position: 'absolute',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.4)',
              animation: 'pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: textMain }}>
                {title}
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff',
                color: isDark ? '#818cf8' : '#4f46e5',
                letterSpacing: '0.02em'
              }}>
                {normalizedItems.length} Total
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: '2px' }}>
              {isExpanded
                ? "Showing categorized timeline (Current / Today, Recent Past, All History)"
                : "Live 1-by-1 feed • Click to expand full history"}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isExpanded && normalizedItems.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handlePrev}
                title="Previous Scan"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: `1px solid ${cardBorder}`,
                  background: isDark ? '#0f172a' : '#f8fafc',
                  color: textMain,
                  cursor: 'pointer'
                }}
              >
                <ChevronLeftIcon />
              </button>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: `1px solid ${cardBorder}`,
                  background: isDark ? '#0f172a' : '#f8fafc',
                  color: isPaused ? '#f59e0b' : textMain,
                  cursor: 'pointer'
                }}
              >
                {isPaused ? <PlayIcon /> : <PauseIcon />}
              </button>

              <button
                type="button"
                onClick={handleNext}
                title="Next Scan"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: `1px solid ${cardBorder}`,
                  background: isDark ? '#0f172a' : '#f8fafc',
                  color: textMain,
                  cursor: 'pointer'
                }}
              >
                <ChevronRightIcon />
              </button>
            </div>
          )}

          {/* Expand / Collapse Pill Button */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
            color: isDark ? '#a5b4fc' : '#4338ca',
            fontSize: '0.82rem',
            fontWeight: 700,
            border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #c7d2fe',
            transition: 'all 0.2s ease'
          }}>
            <span>{isExpanded ? "Collapse" : "Expand All History"}</span>
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        </div>
      </div>

      {/* Mode 1: Collapsed 1-by-1 Animated Card */}
      {!isExpanded && (
        <div style={{ padding: '1.25rem 1.5rem', position: 'relative' }}>
          {loading ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: textMuted }}>
              <div className="spinner" style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(99, 102, 241, 0.2)',
                borderTop: '2px solid var(--accent-color, #6366f1)',
                borderRadius: '50%',
                margin: '0 auto 10px auto',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Loading telemetry history...</span>
            </div>
          ) : !currentItem ? (
            <div style={{
              padding: '1.75rem',
              textAlign: 'center',
              color: textMuted,
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <HistoryIcon />
              <span>{emptyMessage}</span>
            </div>
          ) : (
            <div
              key={currentItem.id || currentIndex}
              className={`history-slide-item ${isAnimating ? (animDirection === 'next' ? 'slide-in-right' : 'slide-in-left') : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
                animation: 'cardFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Left Item Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '260px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: type === 'soc'
                    ? (isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff')
                    : (isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff'),
                  color: type === 'soc' ? (isDark ? '#c084fc' : '#9333ea') : (isDark ? '#818cf8' : '#6366f1'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {type === 'soc' ? <TerminalIcon /> : <GlobeIcon />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: textMain,
                      fontFamily: 'monospace',
                      letterSpacing: '-0.01em'
                    }}>
                      {currentItem._displayTarget}
                    </span>
                    {/* Severity Badge */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      backgroundColor: getBadgeStyle(currentItem._severityClass).bg,
                      color: getBadgeStyle(currentItem._severityClass).text,
                      border: getBadgeStyle(currentItem._severityClass).border
                    }}>
                      {currentItem._severity}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: textMuted, flexWrap: 'wrap' }}>
                    <span>{formatTime(currentItem._timestamp)}</span>
                    {currentItem._score !== null && (
                      <>
                        <span>•</span>
                        <span style={{
                          fontWeight: 700,
                          color: currentItem._score >= 80 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                        }}>
                          Score: {currentItem._score}/100
                        </span>
                      </>
                    )}
                    {currentItem.analysis_type && (
                      <>
                        <span>•</span>
                        <span>{currentItem.analysis_type}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Action & Counter Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: textMuted }}>
                  Item <strong style={{ color: textMain }}>{currentIndex + 1}</strong> of {normalizedItems.length}
                </div>

                {onSelectItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(currentItem);
                    }}
                    className="admin-btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{type === 'soc' ? 'Load Target' : 'Scan Target'}</span>
                    <ArrowUpRightIcon />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dots progress indicator */}
          {normalizedItems.length > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              marginTop: '1.1rem'
            }}>
              {normalizedItems.slice(0, 10).map((_, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  style={{
                    width: currentIndex === idx ? '20px' : '6px',
                    height: '6px',
                    borderRadius: '4px',
                    backgroundColor: currentIndex === idx ? accentColor : (isDark ? '#334155' : '#cbd5e1'),
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              ))}
              {normalizedItems.length > 10 && (
                <span style={{ fontSize: '0.7rem', color: textMuted, marginLeft: '4px' }}>
                  +{normalizedItems.length - 10} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Expanded Full Categorized History View */}
      {isExpanded && (
        <div style={{
          padding: '1.5rem',
          animation: 'expandDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backgroundColor: isDark ? '#172033' : '#fafafa'
        }}>
          {/* Top Bar: Timeline Segment Tabs & Search Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap'
          }}>
            {/* Timeline Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              borderRadius: '10px',
              backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
              border: `1px solid ${cardBorder}`
            }}>
              <button
                type="button"
                onClick={() => setTimelineTab('current')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: timelineTab === 'current' ? accentColor : 'transparent',
                  color: timelineTab === 'current' ? '#ffffff' : textMuted,
                  transition: 'all 0.2s ease'
                }}
              >
                <span>⚡ Current (Today)</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: timelineTab === 'current' ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                  color: timelineTab === 'current' ? '#fff' : textMain
                }}>
                  {categorized.current.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimelineTab('past')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: timelineTab === 'past' ? accentColor : 'transparent',
                  color: timelineTab === 'past' ? '#ffffff' : textMuted,
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🕒 Recent Past</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: timelineTab === 'past' ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                  color: timelineTab === 'past' ? '#fff' : textMain
                }}>
                  {categorized.past.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimelineTab('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: timelineTab === 'all' ? accentColor : 'transparent',
                  color: timelineTab === 'all' ? '#ffffff' : textMuted,
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📜 All History</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: timelineTab === 'all' ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                  color: timelineTab === 'all' ? '#fff' : textMain
                }}>
                  {categorized.all.length}
                </span>
              </button>
            </div>

            {/* Search filter input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              border: `1px solid ${cardBorder}`,
              minWidth: '220px',
              flex: '1 1 220px',
              maxWidth: '340px'
            }}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Search history records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: textMain,
                  fontSize: '0.85rem',
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: textMuted,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of Categorized Items */}
          {filteredTabItems.length === 0 ? (
            <div style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderRadius: '10px',
              border: `1px solid ${cardBorder}`,
              color: textMuted,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <HistoryIcon />
              <div style={{ fontWeight: 600, color: textMain }}>
                {timelineTab === 'current'
                  ? "No scans recorded today yet"
                  : timelineTab === 'past'
                  ? "No scans found in recent past records"
                  : "No matching history found"}
              </div>
              <div style={{ fontSize: '0.82rem' }}>
                {searchQuery ? "Try refining your search keyword above." : "New scans and analyses will automatically stream into this timeline."}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '440px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredTabItems.map((item, idx) => {
                const bStyle = getBadgeStyle(item._severityClass);
                return (
                  <div
                    key={item.id || idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      border: `1px solid ${cardBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = cardBorder}
                  >
                    {/* Left info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: type === 'soc'
                          ? (isDark ? 'rgba(168, 85, 247, 0.15)' : '#f3e8ff')
                          : (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff'),
                        color: type === 'soc' ? (isDark ? '#c084fc' : '#9333ea') : (isDark ? '#818cf8' : '#6366f1'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {type === 'soc' ? <TerminalIcon /> : <GlobeIcon />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: textMain, fontFamily: 'monospace' }}>
                            {item._displayTarget}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '5px',
                            textTransform: 'uppercase',
                            backgroundColor: bStyle.bg,
                            color: bStyle.text,
                            border: bStyle.border
                          }}>
                            {item._severity}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{formatTime(item._timestamp)}</span>
                          {item._score !== null && (
                            <>
                              <span>•</span>
                              <span style={{ fontWeight: 600 }}>Score: {item._score}/100</span>
                            </>
                          )}
                          {item.summary && (
                            <>
                              <span>•</span>
                              <span style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.summary}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right quick inspect action */}
                    {onSelectItem && (
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: `1px solid ${cardBorder}`,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                          color: textMain,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = accentColor;
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
                          e.currentTarget.style.color = textMain;
                        }}
                      >
                        <span>{type === 'soc' ? 'Load' : 'Scan'}</span>
                        <ArrowUpRightIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom collapse button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: `1px solid ${cardBorder}`,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: textMuted,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ChevronUpIcon />
              <span>Collapse Stream</span>
            </button>
          </div>
        </div>
      )}

      {/* Global CSS animations for 1-by-1 cycling card */}
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-in-right {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .slide-in-left {
          animation: slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
