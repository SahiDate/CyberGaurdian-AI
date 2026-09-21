import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-panel" style={{
          padding: '2rem',
          margin: '1.5rem auto',
          maxWidth: '800px',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          background: 'rgba(239, 68, 68, 0.06)',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '1.75rem'
          }}>
            ⚠️
          </div>
          <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 700 }}>
            {this.props.title || "Interface Render Exception Prevented"}
          </h3>
          <p style={{ color: 'var(--text-muted, #94a3b8)', margin: '0 auto 1.5rem', maxWidth: '550px', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {this.props.message || "A component encountered an unexpected error during rendering. The page was protected from crashing to a blank screen."}
          </p>
          {this.state.error?.message && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#fca5a5',
              marginBottom: '1.5rem',
              textAlign: 'left',
              wordBreak: 'break-all',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {this.state.error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              className="btn-fluid"
              style={{
                padding: '0.65rem 1.5rem',
                background: 'var(--accent-color, #2563eb)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)'
              }}
            >
              🔄 Reload Component
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-fluid"
              style={{
                padding: '0.65rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-main, #f8fafc)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
