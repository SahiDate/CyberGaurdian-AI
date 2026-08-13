import React, { useState } from 'react';
import { useAnimatedCount } from '../hooks/useAnimatedCount';

// Inline Icon Helpers
const AlertTriangleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

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

// Stat Card Subcomponent with Animated Numbers & Chip Badges
function MetricCard({ title, targetValue, chipText, chipClass, icon, valueColor }) {
  const animatedVal = useAnimatedCount(targetValue);

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-24)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>{title}</span>
        <span className={`chip-badge ${chipClass}`}>
          {icon}
          {chipText}
        </span>
      </div>
      <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0, color: valueColor || 'var(--text-main)', letterSpacing: '-0.02em' }}>
        {animatedVal}
      </p>
    </div>
  );
}

export default function LogAnalyzer() {
  const [logText, setLogText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!logText.trim()) return;

    setLoading(true);
    setResults(null);
    try {
      const response = await fetch('http://localhost:8000/api/analyze-logs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ log_text: logText })
      });
      const data = await response.json();
      if (response.status === 200) {
        setResults(data);
      } else {
        alert(data.error || "Failed to analyze logs.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'critical': return 'var(--danger-color)';
      case 'high': return '#ff7b72';
      case 'medium': return '#e3b341';
      case 'low': return 'var(--success-color)';
      default: return 'var(--text-muted)';
    }
  };

  // Filter parsed logs
  const filteredLogs = results?.parsed_logs?.filter(log => {
    const matchesSearch = 
      log.ip.includes(searchQuery) || 
      log.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.method && log.method.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'threats' ? log.is_threat :
      statusFilter === 'success' ? log.status < 400 :
      statusFilter === 'error' ? log.status >= 400 : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      {/* Input Panel */}
      <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '1.35rem', fontWeight: '700' }}>
            Log Analyzer Input
          </h2>
          <span className="chip-badge chip-accent">
            <FileTextIcon /> SOC Engine
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-24)', fontSize: '0.95rem' }}>
          Upload Nginx, Apache, or SSH logs, or paste raw log lines below to initiate threat intelligence analysis.
        </p>

        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-16)', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Paste Raw Logs</label>
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Paste log content here..."
                rows={6}
                style={{
                  width: '100%',
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 'var(--space-24)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <FileTextIcon />
              <span style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                Drag & drop log file here or
              </span>
              <input
                type="file"
                accept=".log,.txt,*.txt"
                onChange={handleFileUpload}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <label
                htmlFor="file-upload"
                className="glass-panel btn-fluid"
                style={{
                  padding: '8px 20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Choose File
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !logText.trim()}
            className="glass-panel btn-fluid"
            style={{
              padding: '14px',
              fontSize: '1rem',
              background: logText.trim() ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
              color: logText.trim() ? '#fff' : 'var(--text-muted)',
              cursor: logText.trim() && !loading ? 'pointer' : 'not-allowed',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite'
                }}></span>
                <span>Analyzing Log Entries...</span>
              </>
            ) : (
              'Analyze Logs'
            )}
          </button>
        </form>
      </div>

      {loading && (
        <div className="glass-panel" style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
          <div className="spinner" style={{
            margin: '0 auto 1.5rem',
            width: '48px',
            height: '48px',
            border: '3px solid rgba(88, 166, 255, 0.15)',
            borderTop: '3px solid var(--accent-color)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Running AI Threat Diagnostics...</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Parsing formatting rules, checking scan targets, and feeding to local AI agent.
          </p>
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
          
          {/* AI Analysis Card */}
          <div className="glass-panel" style={{ padding: 'var(--space-24)', borderLeft: `5px solid ${getSeverityColor(results.ai_analysis?.severity)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ color: getSeverityColor(results.ai_analysis?.severity), margin: 0, fontSize: '1.35rem' }}>
                AI SOC Analysis: {results.ai_analysis?.severity} Risk
              </h2>
              <span className={`chip-badge ${results.ai_analysis?.severity?.toLowerCase() === 'critical' ? 'chip-danger' : 'chip-warning'}`}>
                <ShieldIcon />
                {results.ai_analysis?.severity} Risk Level
              </span>
            </div>
            <p style={{ fontSize: '1.05rem', marginBottom: 'var(--space-24)', lineHeight: '1.6' }}>
              {results.ai_analysis?.summary}
            </p>
            
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: '#ffffff' }}>SOC Remediation Playbook:</h3>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6', margin: 0 }}>
              {results.ai_analysis?.recommendations?.map((rec, i) => (
                <li key={i} style={{ marginBottom: '8px', color: 'var(--text-main)' }}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-16)' }}>
            <MetricCard
              title="Total Requests"
              targetValue={results.total_requests}
              chipText="Processed"
              chipClass="chip-accent"
              icon={<FileTextIcon />}
            />
            <MetricCard
              title="Unique IP Hosts"
              targetValue={results.unique_ips_count}
              chipText="Tracked"
              chipClass="chip-accent"
              icon={<ShieldIcon />}
              valueColor="var(--accent-color)"
            />
            <MetricCard
              title="Log Error Rate"
              targetValue={`${results.error_rate}%`}
              chipText="Error %"
              chipClass={results.error_rate > 20 ? 'chip-danger' : 'chip-success'}
              icon={<ActivityIcon />}
              valueColor={results.error_rate > 20 ? 'var(--danger-color)' : 'var(--text-main)'}
            />
            <MetricCard
              title="Flagged Threats"
              targetValue={(results.brute_force_ips?.length || 0) + (results.directory_scans?.length || 0)}
              chipText="Flagged"
              chipClass={(results.brute_force_ips?.length + results.directory_scans?.length) > 0 ? 'chip-danger' : 'chip-success'}
              icon={<AlertTriangleIcon />}
              valueColor={(results.brute_force_ips?.length + results.directory_scans?.length) > 0 ? 'var(--danger-color)' : 'var(--success-color)'}
            />
          </div>

          {/* Threats analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-24)' }}>
            
            {/* Brute Force Hosts */}
            <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--danger-color)', margin: 0, fontSize: '1.15rem' }}>
                  Flagged Brute Force Hosts
                </h3>
                <span className="chip-badge chip-danger"><AlertTriangleIcon /> Brute-Force</span>
              </div>
              {results.brute_force_ips?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.brute_force_ips.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(248, 81, 73, 0.08)', border: '1px solid rgba(248, 81, 73, 0.2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>IP: {item.ip}</strong>
                        <span style={{ color: '#ff7b72', fontWeight: '700', fontSize: '0.85rem' }}>{item.failed_count} failed logins</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>Target Paths:</strong> {item.paths.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No brute-force attempt patterns detected.</p>
              )}
            </div>

            {/* Directory Scanner Hosts */}
            <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--danger-color)', margin: 0, fontSize: '1.15rem' }}>
                  Flagged Directory Scanners
                </h3>
                <span className="chip-badge chip-danger"><SearchIcon /> Scanner</span>
              </div>
              {results.directory_scans?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.directory_scans.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(248, 81, 73, 0.08)', border: '1px solid rgba(248, 81, 73, 0.2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>IP: {item.ip}</strong>
                        <span style={{ color: '#ff7b72', fontWeight: '700', fontSize: '0.85rem' }}>{item.count} suspicious requests</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>Paths Scanned:</strong> {item.paths.slice(0, 3).join(', ')} {item.paths.length > 3 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No directory scanning scans detected.</p>
              )}
            </div>
          </div>

          {/* Log Event Viewer */}
          <div className="glass-panel" style={{ padding: 'var(--space-24)' }}>
            <h3 style={{ color: 'var(--accent-color)', marginBottom: 'var(--space-16)', fontSize: '1.2rem', margin: '0 0 16px 0' }}>
              Log Event Viewer
            </h3>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--space-16)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs by IP, path, or method..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(22, 27, 34, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="all">All Events</option>
                <option value="threats">Threats Only</option>
                <option value="success">Success (2xx/3xx)</option>
                <option value="error">Errors (4xx/5xx)</option>
              </select>
            </div>

            {/* Table */}
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px' }}>Client Host IP</th>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Method</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Request Path</th>
                    <th style={{ padding: '12px 16px' }}>Analysis Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.9rem',
                      background: log.is_threat ? 'rgba(248, 81, 73, 0.04)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>{log.ip}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          fontFamily: 'monospace'
                        }}>{log.method}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          color: log.status >= 400 ? '#ff7b72' : '#56d364',
                          fontWeight: '700'
                        }}>{log.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.path}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {log.is_threat ? (
                          <span className="chip-badge chip-danger">
                            <AlertTriangleIcon />
                            {log.threat_reason}
                          </span>
                        ) : (
                          <span className="chip-badge chip-success" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            Clean Event
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No events found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
