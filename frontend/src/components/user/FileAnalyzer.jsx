import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const SEVERITY_STYLES = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: '#f85149' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: '#e3b341' },
  MEDIUM:   { color: '#388bfd', bg: 'rgba(56,139,253,0.12)', border: '#388bfd' },
  LOW:      { color: '#39d353', bg: 'rgba(57,211,83,0.12)', border: '#39d353' },
};

const SevBadge = ({ severity }) => {
  const cfg = SEVERITY_STYLES[severity?.toUpperCase()] || SEVERITY_STYLES.LOW;
  return (
    <span style={{
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      padding: '0.2rem 0.6rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 800,
      letterSpacing: '0.5px'
    }}>
      {severity || 'LOW'}
    </span>
  );
};

export default function FileAnalyzer() {
  const { authTokens } = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [dragActive, setDragActive] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async (id, filename) => {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${API}/api/file-analysis/${id}/pdf/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FileAnalysis_${filename || 'report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed", err);
      alert("Could not download PDF report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/file-analysis/history/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg("File exceeds the maximum 25 MB limit.");
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    setCurrentResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API}/api/file-analysis/analyze/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authTokens?.access}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentResult(data);
        fetchHistory();
      } else {
        setErrorMsg(data.error || "File analysis failed.");
      }
    } catch (e) {
      setErrorMsg("Network error contacting analysis server.");
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const fileName = item.original_filename || item.filename || item.stored_filename || '';
    const hash = item.sha256 || item.file_hash || '';
    const fileType = item.detected_type || item.file_type || '';
    const matchType = typeFilter === 'ALL' || fileType?.toUpperCase() === typeFilter;
    const matchSev = sevFilter === 'ALL' || item.severity?.toUpperCase() === sevFilter;
    const matchSearch = !search ||
      fileName.toLowerCase().includes(search.toLowerCase()) ||
      hash.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSev && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', color: 'var(--text-main)', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            📁 Static File Security Analyzer
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
            Analyze PE executables, scripts, documents, and archives without executing files. Includes YARA matching, Shannon entropy, and VirusTotal hash lookup.
          </p>
        </div>

        {/* Upload Card */}
        <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.75rem', marginBottom: '2rem' }}>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
              background: dragActive ? 'rgba(37,99,235,0.08)' : 'var(--panel-bg)',
              borderRadius: '10px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
            <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1.05rem' }}>
              {selectedFile ? selectedFile.name : 'Drag & Drop file here, or click to browse'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              {selectedFile
                ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                : 'Supports PE (.exe, .dll), Scripts (.js, .ps1, .py), Docs (.pdf, .docx), Archives (.zip). Max 25 MB.'}
            </div>
          </div>

          {errorMsg && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(248,81,73,0.12)', border: '1px solid var(--danger-color)', borderRadius: '8px', color: 'var(--danger-color)', fontSize: '0.85rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem' }}>
            {selectedFile && (
              <button
                onClick={() => setSelectedFile(null)}
                style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || analyzing}
              style={{
                padding: '0.6rem 1.5rem',
                background: selectedFile && !analyzing ? 'var(--accent-color)' : 'rgba(128,128,128,0.15)',
                border: 'none',
                color: selectedFile && !analyzing ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: selectedFile && !analyzing ? 'pointer' : 'not-allowed',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {analyzing ? '🔍 Analyzing File Static Structures...' : '🚀 Start Static Analysis'}
            </button>
          </div>
        </div>

        {/* Current Result View */}
        {currentResult && (
          <div className="glass-panel" style={{ border: '1px solid var(--accent-color)', borderRadius: '12px', padding: '1.75rem', marginBottom: '2.5rem' }}>
            
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  FILE ANALYSIS RESULT
                </div>
                <h2 style={{ margin: '0.2rem 0 0', color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 800 }}>
                  {currentResult.original_filename || currentResult.filename || 'Analyzed File'}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  SHA-256: {currentResult.sha256 || currentResult.file_hash || 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => handleDownloadPdf(currentResult.id, currentResult.original_filename || currentResult.filename)}
                  disabled={downloadingPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    background: 'rgba(56, 139, 253, 0.15)',
                    border: '1px solid #388bfd',
                    color: '#58a6ff',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: downloadingPdf ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Download File Security Assessment as a PDF report"
                >
                  <span>📄</span>
                  <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SEVERITY</div>
                  <div style={{ marginTop: '0.3rem' }}>
                    <SevBadge severity={currentResult.severity} />
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              
              <div style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>THREAT SCORE</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: SEVERITY_STYLES[currentResult.severity]?.color || 'var(--text-main)' }}>
                  {currentResult.threat_score}/100
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence: {currentResult.confidence}%</div>
              </div>

              <div style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>DETECTED TYPE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {currentResult.detected_type}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(currentResult.file_size / 1024).toFixed(1)} KB</div>
              </div>

              <div style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>SHANNON ENTROPY</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: currentResult.entropy_category === 'HIGH' ? 'var(--warning-color)' : 'var(--text-main)', marginTop: '0.2rem' }}>
                  {currentResult.entropy} / 8.0
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {currentResult.entropy_category}</div>
              </div>

              <div style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>VIRUSTOTAL REPUTATION</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: currentResult.virustotal_detections?.malicious > 0 ? 'var(--danger-color)' : 'var(--success-color)', marginTop: '0.2rem' }}>
                  {currentResult.virustotal_detections?.malicious || 0} Malicious
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hash Lookup Only</div>
              </div>
            </div>

            {/* YARA & Signals */}
            {currentResult.yara_matches?.length > 0 && (
              <div style={{ marginBottom: '1.5rem', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--danger-color)' }}>🛡️ YARA Static Rule Matches:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                  {currentResult.yara_matches.map((m, idx) => (
                    <li key={idx}>
                      <strong style={{ color: 'var(--text-main)' }}>{m.rule_name}</strong> [{m.severity}] — {m.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentResult.metadata?.signals?.length > 0 && (
              <div>
                <strong style={{ color: 'var(--accent-color)' }}>🔍 Correlated Security Evidence Signals:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {currentResult.metadata.signals.map((sig, idx) => (
                    <li key={idx}>{sig}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* History Section */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
            📜 My File Analysis History
          </h3>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              placeholder="Search history by filename, hash..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 250px', padding: '0.55rem 0.9rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', fontSize: '0.85rem' }}
            />

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '0.55rem 0.9rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              <option value="ALL">All File Types</option>
              <option value="PE">Windows PE Executable</option>
              <option value="SCRIPT">Script File</option>
              <option value="DOCUMENT">Document</option>
              <option value="ARCHIVE">Archive</option>
            </select>
          </div>

          <div className="glass-panel" style={{ borderRadius: '10px', overflow: 'hidden' }}>
            {historyLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading file analysis history...</div>
            ) : filteredHistory.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No previous file analyses recorded.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Filename', 'Type', 'Size', 'SHA-256', 'Score', 'Severity', 'Analyzed At', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(item => {
                    const displayName = item.original_filename || item.filename || item.stored_filename || 'Unnamed File';
                    const displayHash = item.sha256 || item.file_hash || '';
                    const displayType = item.detected_type || item.file_type || 'GENERIC';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => setCurrentResult(item)}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{displayName}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)' }}>{displayType}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{(item.file_size / 1024).toFixed(1)} KB</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-color)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {displayHash ? `${displayHash.substring(0, 16)}...` : '...'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: SEVERITY_STYLES[item.severity]?.color || 'var(--text-main)' }}>{item.threat_score}/100</td>
                        <td style={{ padding: '0.75rem 1rem' }}><SevBadge severity={item.severity} /></td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDownloadPdf(item.id, displayName)}
                            style={{
                              padding: '0.3rem 0.6rem',
                              background: 'rgba(56, 139, 253, 0.12)',
                              border: '1px solid #388bfd',
                              color: '#58a6ff',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Download PDF"
                          >
                            📥 PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
