import React, { useState } from 'react';

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
      case 'high': return '#d73a49';
      case 'medium': return '#d18616';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Log Analyzer Input</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Upload Nginx, Apache, or SSH logs, or paste raw log lines below to initiate threat intelligence analysis.
        </p>

        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Paste Raw Logs</label>
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Paste log content here..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              height: '100%',
              minHeight: '160px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <span style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Drag log file here or</span>
              <input
                type="file"
                accept=".log,.txt,*.txt"
                onChange={handleFileUpload}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <label
                htmlFor="file-upload"
                className="glass-panel"
                style={{
                  padding: '0.5rem 1.5rem',
                  background: 'var(--border-color)',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Choose File
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !logText.trim()}
            className="glass-panel"
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              background: logText.trim() ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
              color: logText.trim() ? '#fff' : 'var(--text-muted)',
              cursor: logText.trim() ? 'pointer' : 'not-allowed',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Analyzing Log Entries...' : 'Analyze Logs'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{
            margin: '0 auto 1.5rem',
            width: '50px',
            height: '50px',
            border: '3px solid rgba(88, 166, 255, 0.1)',
            borderTop: '3px solid var(--accent-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h3>Running AI Threat Diagnostics...</h3>
          <p style={{ color: 'var(--text-muted)' }}>Parsing formatting rules, checking scan targets, and feeding to local Llama3 agent.</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* AI Analysis Card */}
          <div className="glass-panel" style={{ padding: '2rem', borderLeft: `5px solid ${getSeverityColor(results.ai_analysis?.severity)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: getSeverityColor(results.ai_analysis?.severity) }}>
                AI SOC Analysis: {results.ai_analysis?.severity} Risk
              </h2>
              <span style={{
                background: getSeverityColor(results.ai_analysis?.severity),
                color: '#fff',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}>
                {results.ai_analysis?.severity} Risk Level
              </span>
            </div>
            <p style={{ fontSize: '1.15rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {results.ai_analysis?.summary}
            </p>
            
            <h3 style={{ marginBottom: '0.75rem' }}>SOC Remediation Playbook:</h3>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6' }}>
              {results.ai_analysis?.recommendations?.map((rec, i) => (
                <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Requests</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{results.total_requests}</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Unique IP Hosts</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--accent-color)' }}>{results.unique_ips_count}</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Log Error Rate</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: results.error_rate > 20 ? 'var(--danger-color)' : 'var(--text-main)' }}>
                {results.error_rate}%
              </p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Flagged Threats</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: (results.brute_force_ips?.length + results.directory_scans?.length) > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                {results.brute_force_ips?.length + results.directory_scans?.length}
              </p>
            </div>
          </div>

          {/* Threats analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Brute Force Hosts */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--danger-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                🚨 Flagged Brute Force Hosts
              </h3>
              {results.brute_force_ips?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {results.brute_force_ips.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(248, 81, 73, 0.05)', border: '1px dashed var(--danger-color)', padding: '1rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>IP: {item.ip}</strong>
                        <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{item.failed_count} failed logins</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>Paths Target:</strong> {item.paths.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No brute-force attempt patterns detected.</p>
              )}
            </div>

            {/* Directory Scanner Hosts */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--danger-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                🔍 Flagged Directory Scanners
              </h3>
              {results.directory_scans?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {results.directory_scans.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(248, 81, 73, 0.05)', border: '1px dashed var(--danger-color)', padding: '1rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>IP: {item.ip}</strong>
                        <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{item.count} suspicious requests</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>Paths Scanned:</strong> {item.paths.slice(0, 3).join(', ')} {item.paths.length > 3 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No directory scanning scans detected.</p>
              )}
            </div>
          </div>

          {/* Top URL Scans & Full table filter */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--accent-color)', marginBottom: '1.5rem' }}>Log Event Viewer</h3>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs by IP, path, or method..."
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '6px'
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Events</option>
                <option value="threats">Threats Only</option>
                <option value="success">Success (2xx/3xx)</option>
                <option value="error">Errors (4xx/5xx)</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.75rem' }}>Client Host IP</th>
                    <th style={{ padding: '0.75rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem' }}>Method</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Request Path / Message</th>
                    <th style={{ padding: '0.75rem' }}>Analysis Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} style={{
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      background: log.is_threat ? 'rgba(248, 81, 73, 0.02)' : 'transparent'
                    }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{log.ip}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.15rem 0.4rem',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>{log.method}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          color: log.status >= 400 ? 'var(--danger-color)' : 'var(--success-color)',
                          fontWeight: 'bold'
                        }}>{log.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.path}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {log.is_threat ? (
                          <span style={{
                            background: 'rgba(248,81,73,0.15)',
                            color: 'var(--danger-color)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            border: '1px solid rgba(248,81,73,0.3)',
                            fontWeight: 'bold'
                          }}>
                            {log.threat_reason}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Clean Event</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
