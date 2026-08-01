import React from 'react';

export default function AnalysisResults({ results }) {
  if (!results) return null;

  const { target, security_headers, ssl, open_ports, threat_intel, ai_analysis } = results;

  const getSeverityColor = (sev) => {
    switch(sev?.toLowerCase()) {
      case 'critical': return 'var(--danger-color)';
      case 'high': return '#d73a49';
      case 'medium': return '#d18616';
      case 'low': return 'var(--success-color)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '2rem', borderLeft: `5px solid ${getSeverityColor(ai_analysis?.severity)}` }}>
        <h2 style={{ color: getSeverityColor(ai_analysis?.severity) }}>AI Analysis: {ai_analysis?.severity} Risk</h2>
        <p style={{ fontSize: '1.2rem' }}>{ai_analysis?.summary}</p>
        
        <h3>Recommendations:</h3>
        <ul>
          {ai_analysis?.recommendations?.map((rec, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>{rec}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)' }}>Threat Intelligence (VirusTotal)</h3>
          <p><strong>Status:</strong> {threat_intel?.status}</p>
          <p><strong>Positives:</strong> {threat_intel?.positives} / {threat_intel?.total}</p>
          <p>{threat_intel?.details}</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)' }}>SSL Certificate</h3>
          <p><strong>Status:</strong> {ssl?.status}</p>
          {ssl?.issuer && <p><strong>Issuer:</strong> {ssl?.issuer}</p>}
          {ssl?.expires && <p><strong>Expires:</strong> {ssl?.expires}</p>}
          {ssl?.error && <p style={{ color: 'var(--danger-color)' }}>{ssl.error}</p>}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)' }}>Security Headers</h3>
          <ul>
            {security_headers && Object.entries(security_headers).map(([k, v]) => (
              <li key={k}><strong>{k}:</strong> {v}</li>
            ))}
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)' }}>Port Scan</h3>
          <p><strong>Open Ports Found:</strong></p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {open_ports?.length > 0 ? open_ports.map(port => (
              <span key={port} style={{ padding: '0.25rem 0.75rem', background: 'var(--border-color)', borderRadius: '4px' }}>
                Port {port}
              </span>
            )) : <span>None detected</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
