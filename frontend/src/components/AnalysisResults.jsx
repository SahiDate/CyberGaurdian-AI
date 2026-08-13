import React from 'react';

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ServerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/>
    <line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>
);

export default function AnalysisResults({ results }) {
  if (!results) return null;

  const { target, security_headers, ssl, open_ports, threat_intel, ai_analysis } = results;

  const getSeverityColor = (sev) => {
    switch(sev?.toLowerCase()) {
      case 'critical': return 'var(--danger-color)';
      case 'high': return '#ff7b72';
      case 'medium': return '#e3b341';
      case 'low': return 'var(--success-color)';
      default: return 'var(--text-muted)';
    }
  };

  const getChipClass = (sev) => {
    switch(sev?.toLowerCase()) {
      case 'critical':
      case 'high': return 'chip-danger';
      case 'medium': return 'chip-warning';
      case 'low': return 'chip-success';
      default: return 'chip-accent';
    }
  };

  return (
    <div style={{ marginTop: 'var(--space-24)', display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      {/* AI Analysis Main Summary Card */}
      <div className="glass-panel" style={{ padding: 'var(--space-24)', borderLeft: `5px solid ${getSeverityColor(ai_analysis?.severity)}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ color: getSeverityColor(ai_analysis?.severity), margin: 0, fontSize: '1.35rem' }}>
            AI Analysis: {ai_analysis?.severity} Risk
          </h2>
          <span className={`chip-badge ${getChipClass(ai_analysis?.severity)}`}>
            <ShieldIcon />
            {ai_analysis?.severity || 'Assessed'} Risk Level
          </span>
        </div>
        
        <p style={{ fontSize: '1.05rem', lineHeight: '1.6', marginBottom: 'var(--space-24)' }}>{ai_analysis?.summary}</p>
        
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#ffffff' }}>Recommendations:</h3>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6', margin: 0 }}>
          {ai_analysis?.recommendations?.map((rec, i) => (
            <li key={i} style={{ marginBottom: '8px', color: 'var(--text-main)' }}>{rec}</li>
          ))}
        </ul>
      </div>

      {/* Grid of Intel Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-24)' }}>
        
        {/* Threat Intelligence */}
        <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>Threat Intelligence</h3>
            <span className="chip-badge chip-accent"><ActivityIcon /> VirusTotal</span>
          </div>
          <p style={{ margin: '0 0 8px 0' }}><strong>Status:</strong> {threat_intel?.status}</p>
          <p style={{ margin: '0 0 8px 0' }}><strong>Positives:</strong> {threat_intel?.positives} / {threat_intel?.total}</p>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{threat_intel?.details}</p>
        </div>

        {/* SSL Certificate */}
        <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>SSL Certificate</h3>
            <span className="chip-badge chip-accent"><LockIcon /> SSL/TLS</span>
          </div>
          <p style={{ margin: '0 0 8px 0' }}><strong>Status:</strong> {ssl?.status}</p>
          {ssl?.issuer && <p style={{ margin: '0 0 8px 0' }}><strong>Issuer:</strong> {ssl?.issuer}</p>}
          {ssl?.expires && <p style={{ margin: '0 0 8px 0' }}><strong>Expires:</strong> {ssl?.expires}</p>}
          {ssl?.error && <p style={{ color: 'var(--danger-color)', margin: 0 }}>{ssl.error}</p>}
        </div>

        {/* Security Headers */}
        <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>Security Headers</h3>
            <span className="chip-badge chip-accent"><ShieldIcon /> Headers</span>
          </div>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>
            {security_headers && Object.entries(security_headers).map(([k, v]) => (
              <li key={k}><strong>{k}:</strong> {v}</li>
            ))}
          </ul>
        </div>

        {/* Port Scan */}
        <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>Port Scan</h3>
            <span className="chip-badge chip-accent"><ServerIcon /> Nmap</span>
          </div>
          <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}><strong>Open Ports Found:</strong></p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {open_ports?.length > 0 ? open_ports.map(port => (
              <span key={port} className="chip-badge chip-accent" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: '#fff' }}>
                Port {port}
              </span>
            )) : <span style={{ color: 'var(--text-muted)' }}>None detected</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
