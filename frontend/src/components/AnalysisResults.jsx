import React, { useState } from 'react';

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

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const RefreshCwIcon = ({ spinning }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      animation: spinning ? 'spin 0.8s linear infinite' : 'none',
      transformOrigin: 'center'
    }}
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export default function AnalysisResults({ results, onBack, onRefresh, loading, target }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  if (!results) return null;

  const { security_headers, ssl, open_ports, threat_intel, ai_analysis, is_phishing, phishing_indicators } = results;
  const displayTarget = target || results.target || 'Target';
  const isPhishing = Boolean(is_phishing || ai_analysis?.is_phishing || threat_intel?.status === 'Malicious' || threat_intel?.category?.includes('Phishing'));
  const indicators = phishing_indicators || threat_intel?.indicators || [];

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const payload = {
        target: displayTarget,
        ai_analysis,
        security_headers,
        ssl,
        open_ports,
        threat_intel,
        severity: ai_analysis?.severity || 'LOW',
        is_phishing: isPhishing,
        indicators
      };
      const res = await fetch('http://localhost:8000/api/reports/quick-pdf/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTarget = (displayTarget || 'scan').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Security_Scan_${safeTarget}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed", err);
      alert("Could not generate PDF report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

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
      
      {/* Top Action Bar with Back to Dashboard, PDF Download & Refresh Scan */}
      <div className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: 'var(--radius-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '560px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontWeight: '500' }}>Target:</span>
            <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.95rem' }}>{displayTarget}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn-fluid"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              borderRadius: 'var(--radius-sm)',
              color: '#38bdf8',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: downloadingPdf ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Download scan results as a PDF report"
          >
            <span>📄</span>
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Phishing Warning Banner */}
      {isPhishing && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.15) 100%)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-sm)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          boxShadow: '0 6px 28px rgba(239, 68, 68, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '2rem' }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                MALICIOUS PHISHING THREAT DETECTED
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#fee2e2', fontSize: '0.92rem' }}>
                CyberGuardian AI flagged this target as an active credential theft or brand impersonation campaign. DO NOT enter passwords or submit sensitive data!
              </p>
            </div>
          </div>
          {indicators.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {indicators.map((ind, idx) => (
                <span key={idx} style={{
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: '1px solid rgba(248, 113, 113, 0.6)',
                  color: '#ffffff',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  ⚠️ {ind}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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
        
        <p style={{ fontSize: '1.05rem', lineHeight: '1.6', marginBottom: 'var(--space-24)', color: 'var(--text-main)' }}>
          {ai_analysis?.summary}
        </p>
        
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-main)', fontWeight: '700' }}>
          Recommendations:
        </h3>
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
          <p style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}><strong>Status:</strong> {threat_intel?.status}</p>
          <p style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}><strong>Positives:</strong> {threat_intel?.positives} / {threat_intel?.total}</p>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{threat_intel?.details}</p>
        </div>

        {/* SSL Certificate */}
        <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>SSL Certificate</h3>
            <span className="chip-badge chip-accent"><LockIcon /> SSL/TLS</span>
          </div>
          <p style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}><strong>Status:</strong> {ssl?.status}</p>
          {ssl?.issuer && <p style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}><strong>Issuer:</strong> {ssl?.issuer}</p>}
          {ssl?.expires && <p style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}><strong>Expires:</strong> {ssl?.expires}</p>}
          {ssl?.error && <p style={{ color: 'var(--danger-color)', margin: 0 }}>{ssl.error}</p>}
        </div>

        {/* Security Headers */}
        <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>Security Headers</h3>
            <span className="chip-badge chip-accent"><ShieldIcon /> Headers</span>
          </div>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
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
          <p style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Open Ports Found:</strong></p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {open_ports?.length > 0 ? open_ports.map(port => (
              <span key={port} className="chip-badge chip-accent" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                Port {port}
              </span>
            )) : <span style={{ color: 'var(--text-muted)' }}>None detected</span>}
          </div>
        </div>

      </div>

      {/* Bottom Quick Return / Refresh Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: 'var(--space-16)' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="glass-panel btn-fluid"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeftIcon />
            <span>Back to Dashboard Home</span>
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="btn-fluid"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: loading ? 'rgba(37, 99, 235, 0.7)' : 'var(--accent-color)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCwIcon spinning={loading} />
            <span>{loading ? 'Refreshing...' : 'Re-scan & Refresh Target'}</span>
          </button>
        )}
      </div>

    </div>
  );
}
