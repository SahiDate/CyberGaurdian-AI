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
    const matchType = typeFilter === 'ALL' || item.detected_type?.toUpperCase() === typeFilter;
    const matchSev = sevFilter === 'ALL' || item.severity?.toUpperCase() === sevFilter;
    const matchSearch = !search ||
      item.original_filename?.toLowerCase().includes(search.toLowerCase()) ||
      item.sha256?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSev && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            📁 Static File Security Analyzer
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
            Analyze PE executables, scripts, documents, and archives without executing files. Includes YARA matching, Shannon entropy, and VirusTotal hash lookup.
          </p>
        </div>

        {/* Upload Card */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.75rem', marginBottom: '2rem' }}>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#388bfd' : 'rgba(255,255,255,0.15)'}`,
              background: dragActive ? 'rgba(56,139,253,0.05)' : 'rgba(0,0,0,0.2)',
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
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>
              {selectedFile ? selectedFile.name : 'Drag & Drop file here, or click to browse'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>
              {selectedFile
                ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                : 'Supports PE (.exe, .dll), Scripts (.js, .ps1, .py), Docs (.pdf, .docx), Archives (.zip). Max 25 MB.'}
            </div>
          </div>

          {errorMsg && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(248,81,73,0.12)', border: '1px solid #f85149', borderRadius: '8px', color: '#f85149', fontSize: '0.85rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem' }}>
            {selectedFile && (
              <button
                onClick={() => setSelectedFile(null)}
                style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || analyzing}
              style={{
                padding: '0.6rem 1.5rem',
                background: selectedFile && !analyzing ? '#388bfd' : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
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
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(56,139,253,0.3)', borderRadius: '12px', padding: '1.75rem', marginBottom: '2.5rem' }}>
            
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
                  FILE ANALYSIS RESULT
                </div>
                <h2 style={{ margin: '0.2rem 0 0', color: '#fff', fontSize: '1.35rem', fontWeight: 800 }}>
                  {currentResult.original_filename}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#388bfd', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  SHA-256: {currentResult.sha256}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>SEVERITY</div>
                <div style={{ marginTop: '0.3rem' }}>
                  <SevBadge severity={currentResult.severity} />
                </div>
              </div>
            </div>

            {/* Metric Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>THREAT SCORE</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: SEVERITY_STYLES[currentResult.severity]?.color || '#fff' }}>
                  {currentResult.threat_score}/100
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Confidence: {currentResult.confidence}%</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>DETECTED TYPE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                  {currentResult.detected_type}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{(currentResult.file_size / 1024).toFixed(1)} KB</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>SHANNON ENTROPY</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: currentResult.entropy_category === 'HIGH' ? '#e3b341' : '#fff', marginTop: '0.2rem' }}>
                  {currentResult.entropy} / 8.0
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Category: {currentResult.entropy_category}</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>VIRUSTOTAL REPUTATION</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: currentResult.virustotal_detections?.malicious > 0 ? '#f85149' : '#39d353', marginTop: '0.2rem' }}>
                  {currentResult.virustotal_detections?.malicious || 0} Malicious
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Hash Lookup Only</div>
              </div>
            </div>

            {/* YARA & Signals */}
            {currentResult.yara_matches?.length > 0 && (
              <div style={{ marginBottom: '1.5rem', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <strong style={{ color: '#f85149' }}>🛡️ YARA Static Rule Matches:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                  {currentResult.yara_matches.map((m, idx) => (
                    <li key={idx}>
                      <strong style={{ color: '#fff' }}>{m.rule_name}</strong> [{m.severity}] — {m.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentResult.metadata?.signals?.length > 0 && (
              <div>
                <strong style={{ color: '#58a6ff' }}>🔍 Correlated Security Evidence Signals:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.6 }}>
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
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
            📜 My File Analysis History
          </h3>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              placeholder="Search history by filename, hash..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 250px', padding: '0.55rem 0.9rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', fontSize: '0.85rem' }}
            />

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '0.55rem 0.9rem', background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              <option value="ALL">All File Types</option>
              <option value="PE">Windows PE Executable</option>
              <option value="SCRIPT">Script File</option>
              <option value="DOCUMENT">Document</option>
              <option value="ARCHIVE">Archive</option>
            </select>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
            {historyLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading file analysis history...</div>
            ) : filteredHistory.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No previous file analyses recorded.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Filename', 'Type', 'Size', 'SHA-256', 'Score', 'Severity', 'Analyzed At'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }} onClick={() => setCurrentResult(item)}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#fff' }}>{item.original_filename}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.7)' }}>{item.detected_type}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.5)' }}>{(item.file_size / 1024).toFixed(1)} KB</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#388bfd', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.sha256?.substring(0, 16)}...</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: SEVERITY_STYLES[item.severity]?.color || '#fff' }}>{item.threat_score}/100</td>
                      <td style={{ padding: '0.75rem 1rem' }}><SevBadge severity={item.severity} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
