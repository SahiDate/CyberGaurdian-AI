import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimatedCount } from '../hooks/useAnimatedCount';
import { AuthContext } from '../context/AuthContext';
import { emitSecurityEvent } from '../utils/securityEventBus';
import AnimatedHistoryCard from './shared/AnimatedHistoryCard';
import ErrorBoundary from './shared/ErrorBoundary';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const SUPPORTED_EXTENSIONS = [
  '.log', '.txt', '.out', '.err', '.trace',
  '.bat', '.cmd', '.ps1', '.sh', '.bash', '.py', '.js',
  '.json', '.xml', '.csv', '.conf', '.cfg', '.ini', '.yaml', '.yml'
];

const BINARY_EXTENSIONS = [
  '.exe', '.dll', '.apk', '.elf', '.zip', '.rar', '.iso', '.bin',
  '.msi', '.sys', '.dmg', '.tar', '.gz', '.7z', '.bz2', '.xz',
  '.so', '.dylib', '.class', '.jar', '.war', '.ear'
];

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

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const AwardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
);

// Stat Card Subcomponent
function MetricCard({ title, targetValue, chipText, chipClass, icon, valueColor }) {
  const animatedVal = useAnimatedCount(typeof targetValue === 'number' ? targetValue : parseInt(targetValue, 10) || 0);
  const displayVal = typeof targetValue === 'string' && targetValue.includes('%') ? targetValue : animatedVal;

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
        {displayVal}
      </p>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function LogAnalyzer() {
  return (
    <ErrorBoundary title="Log Analyzer Encountered an Issue">
      <LogAnalyzerInner />
    </ErrorBoundary>
  );
}

function LogAnalyzerInner() {
  const navigate = useNavigate();
  const { authTokens } = useContext(AuthContext);

  // Input states — File and Raw Logs are strictly separated
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [fileError, setFileError] = useState('');
  const [isBinaryFile, setIsBinaryFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [logText, setLogText] = useState('');

  // Execution & UI state
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [results, setResults] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [suggestFileAnalyzer, setSuggestFileAnalyzer] = useState(false);

  // Event Viewer Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Certificate & Report Actions
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certSuccessMessage, setCertSuccessMessage] = useState('');

  // History state
  const [socHistory, setSocHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileInputRef = useRef(null);

  const fetchSocHistory = async () => {
    setHistoryLoading(true);
    try {
      const headers = {};
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }
      const res = await fetch('http://localhost:8000/api/soc/history/', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSocHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch SOC history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchSocHistory();
  }, [authTokens?.access]);

  // Validate and ingest File object (never puts local path into logText)
  const processSelectedFile = (file) => {
    if (!file) return;

    setFileError('');
    setIsBinaryFile(false);
    setFilePreview('');
    setAnalysisError('');
    setSuggestFileAnalyzer(false);

    const name = file.name || 'unnamed.log';
    const lowerName = name.toLowerCase();
    const ext = lowerName.lastIndexOf('.') !== -1 ? lowerName.slice(lowerName.lastIndexOf('.')) : '';

    // 1. Check binary extensions
    if (BINARY_EXTENSIONS.includes(ext)) {
      setIsBinaryFile(true);
      setFileError(`This file appears to be a binary/non-log file (${ext}). Please use the File Analyzer module for malware/file analysis.`);
      setSelectedFile(file);
      setFileMetadata({
        name,
        size: file.size,
        formattedSize: formatBytes(file.size),
        type: 'BINARY'
      });
      return;
    }

    // 2. Check file size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File is too large for SOC Log Analysis (${formatBytes(file.size)}). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      setSelectedFile(null);
      setFileMetadata(null);
      return;
    }

    // 3. Supported text / script / log extensions
    const isSupported = SUPPORTED_EXTENSIONS.includes(ext) || ext === '';
    const fileCategory = (['.bat', '.cmd', '.ps1', '.sh', '.py', '.js'].includes(ext)) ? 'SCRIPT' : (ext === '.csv' || ext === '.xml' || ext === '.json' ? 'DATA' : 'LOG');

    setSelectedFile(file);
    setFileMetadata({
      name,
      size: file.size,
      formattedSize: formatBytes(file.size),
      type: fileCategory,
      extension: ext || 'none'
    });

    // 4. Read safe preview (first 8 KB)
    const previewSlice = file.slice(0, 8192);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      // Quick check if sample looks binary (excessive control chars or nulls)
      if (text.includes('\x00')) {
        setIsBinaryFile(true);
        setFileError(`This file contains binary characters and cannot be processed as a text log. Please use File Analyzer.`);
        return;
      }
      const lines = text.split(/\r?\n/).slice(0, 10).join('\n');
      setFilePreview(lines);
    };
    reader.onerror = () => {
      setFileError("Could not read file preview.");
    };
    reader.readAsText(previewSlice);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileMetadata(null);
    setFilePreview('');
    setFileError('');
    setIsBinaryFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectHistoryItem = (item) => {
    if (!item) return;
    const isSafe = (item.risk_score === 0) || (item.severity === 'LOW') || (item.threat_level === 'LOW');
    setResults({
      analysis_id: `SOC-2026-${String(item.id).padStart(6, '0')}`,
      assessment_id: `CG-SOC-${String(item.id).padStart(6, '0')}`,
      input_source: item.target,
      log_format: item.source_records?.log_format || 'Generic Log',
      result: isSafe ? 'SAFE' : 'THREAT_DETECTED',
      risk_level: item.severity || item.threat_level || (isSafe ? 'NO_RISK' : 'HIGH'),
      risk_score: item.risk_score ?? (isSafe ? 0 : 75),
      confidence: item.confidence || 95,
      summary: item.summary || `Historical SOC analysis for ${item.target}`,
      recommendations: item.recommendations || [],
      certificate_eligible: isSafe,
      parsed_logs: Array.isArray(item.findings) ? item.findings : [],
      total_requests: item.source_records?.total_requests || 0,
      unique_ips_count: item.source_records?.unique_ips_count || 1,
      error_rate: item.source_records?.error_rate || 0,
      ai_analysis: {
        summary: item.summary,
        severity: item.severity,
        recommendations: item.recommendations
      }
    });

    const detailInfo = [
      `# Historical SOC Record: ${item._displayTarget || item.target || 'Server Incident'}`,
      `# Severity: ${item.severity || 'N/A'} | Threat Level: ${item.threat_level || 'N/A'}`,
      `# Risk Score: ${item.risk_score ?? (isSafe ? 0 : 75)}/100`,
      `# Summary: ${item.summary || 'Historical security event record'}`,
      item.findings && Array.isArray(item.findings) && item.findings.length > 0
        ? `# Findings:\n# - ${item.findings.map(f => typeof f === 'string' ? f : (f.title || f.description || JSON.stringify(f))).join('\n# - ')}`
        : ''
    ].filter(Boolean).join('\n');

    setLogText(detailInfo);
    handleRemoveFile();
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Analyze Logs Action
  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (isBinaryFile) {
      setAnalysisError("Binary files cannot be processed as logs. Please use the File Analyzer module.");
      setSuggestFileAnalyzer(true);
      return;
    }

    if (!selectedFile && !logText.trim()) {
      setAnalysisError("Please upload a supported log file or paste log content before starting analysis.");
      return;
    }

    setLoading(true);
    setLoadingStage(1);
    setAnalysisError('');
    setSuggestFileAnalyzer(false);
    setCertSuccessMessage('');

    // Progressive loading stage simulator
    const stageTimer1 = setTimeout(() => setLoadingStage(2), 300);
    const stageTimer2 = setTimeout(() => setLoadingStage(3), 800);
    const stageTimer3 = setTimeout(() => setLoadingStage(4), 1300);

    try {
      const headers = {};
      if (authTokens?.access) {
        headers['Authorization'] = `Bearer ${authTokens.access}`;
      }

      let response;

      // Case A: Uploading actual File via multipart/form-data
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('log_file', selectedFile);
        formData.append('analysis_type', 'log');
        formData.append('source', 'user_upload');

        response = await fetch('http://localhost:8000/api/soc/analyze/', {
          method: 'POST',
          headers, // Do NOT set Content-Type header; browser assigns boundary
          body: formData
        });
      } else {
        // Case B: Pasting Raw Log Text via JSON
        headers['Content-Type'] = 'application/json';
        response = await fetch('http://localhost:8000/api/soc/analyze/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            raw_logs: logText,
            log_text: logText,
            analysis_type: 'log',
            source: 'manual_input'
          })
        });
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error("Unable to parse server response. Check backend connection.");
      }

      if (response.ok && data?.success !== false) {
        setResults(data);
        emitSecurityEvent('SOC_LOG_ANALYZED', data);
        fetchSocHistory();
        window.scrollTo({ top: 380, behavior: 'smooth' });
      } else {
        // Handle specific error codes
        if (response.status === 415 || data?.suggest_file_analyzer || data?.error?.code === 'BINARY_FILE_DETECTED') {
          setSuggestFileAnalyzer(true);
          setAnalysisError(data?.error?.message || "This file appears to be a binary/non-log file. Please use the File Analyzer module for malware/file analysis.");
        } else if (response.status === 413 || data?.error?.code === 'FILE_TOO_LARGE') {
          setAnalysisError(data?.error?.message || "Uploaded file is too large for SOC Log Analysis.");
        } else if (response.status === 401) {
          setAnalysisError("Your authentication session has expired. Please log in again.");
        } else if (response.status === 403) {
          setAnalysisError("You are not authorized to perform SOC analysis.");
        } else {
          const errMsg = data?.error?.message || data?.error || data?.message || data?.detail || "Log analysis failed. Please verify log contents and try again.";
          setAnalysisError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        }
      }
    } catch (err) {
      console.error("SOC analysis request error:", err);
      setAnalysisError(err?.message || "Could not connect to the SOC analysis service. Please verify server status.");
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setLoading(false);
      setLoadingStage(0);
    }
  };

  // Certificate Generation Integration
  const handleGenerateCertificate = async () => {
    if (!results) return;
    const assessmentId = results.assessment_id || (results.analysis_id ? results.analysis_id.replace('SOC-', 'CG-SOC-') : '');
    if (!assessmentId) {
      alert("No valid assessment ID available for certificate issuance.");
      return;
    }

    setGeneratingCert(true);
    setCertSuccessMessage('');
    try {
      let token = authTokens?.access;
      if (!token) {
        try {
          const stored = localStorage.getItem('authTokens');
          if (stored) token = JSON.parse(stored)?.access;
        } catch (e) {}
      }

      const res = await fetch(`http://localhost:8000/api/assessments/${encodeURIComponent(assessmentId)}/certificate/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ assessment_type: 'SOC_ANALYSIS' })
      });
      const data = await res.json();
      if (res.ok) {
        setCertSuccessMessage(`Certificate successfully issued: ${data.certificate_id || 'CG-CERT'}`);
      } else {
        alert(data.error || "Could not generate certificate. Ensure analysis has a clean SAFE result.");
      }
    } catch (err) {
      console.error("Certificate generation error:", err);
      alert("Failed to connect to certificate service.");
    } finally {
      setGeneratingCert(false);
    }
  };

  // PDF Report Download
  const handleDownloadPdf = async () => {
    if (!results) return;
    setDownloadingPdf(true);
    try {
      const payload = {
        target: results.input_source || "SOC_Log_Analysis",
        ai_analysis: results.ai_analysis || {},
        security_headers: {},
        ssl: {},
        open_ports: [],
        severity: results.severity || results.ai_analysis?.severity || (results.result === 'SAFE' ? 'LOW' : 'HIGH'),
        score: results.risk_score || 0
      };
      const res = await fetch('http://localhost:8000/api/reports/quick-pdf/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SOC_Log_Analysis_Report_${results.analysis_id || 'result'}.pdf`;
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
    switch (sev?.toLowerCase()) {
      case 'critical': return 'var(--danger-color, #ef4444)';
      case 'high': return '#ff7b72';
      case 'medium': return '#e3b341';
      case 'low':
      case 'no_risk': return 'var(--success-color, #22c55e)';
      default: return 'var(--text-muted, #94a3b8)';
    }
  };

  // Safe filtered logs
  const parsedLogsSafe = Array.isArray(results?.parsed_logs) ? results.parsed_logs : [];
  const filteredLogs = parsedLogsSafe.filter(log => {
    if (!log) return false;
    const ipStr = String(log.ip || '');
    const pathStr = String(log.path || '');
    const methodStr = String(log.method || '');
    const threatReasonStr = String(log.threat_reason || '');

    const matchesSearch =
      !searchQuery ||
      ipStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pathStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      methodStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threatReasonStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'threats' ? Boolean(log.is_threat) :
      statusFilter === 'success' ? (Number(log.status) < 400) :
      statusFilter === 'error' ? (Number(log.status) >= 400) : true;

    return matchesSearch && matchesStatus;
  });

  const isSubmitDisabled = loading || (!selectedFile && !logText.trim()) || isBinaryFile;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24, 24px)' }}>
      {/* Input Panel */}
      <div className="glass-panel" style={{ padding: 'var(--space-24, 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16, 16px)' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-color, #2563eb)', fontSize: '1.35rem', fontWeight: '700' }}>
            Log Analyzer Input
          </h2>
          <span className="chip-badge chip-accent">
            <FileTextIcon /> SOC Engine
          </span>
        </div>
        <p style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: 'var(--space-24, 24px)', fontSize: '0.95rem' }}>
          Upload Nginx, Apache, SSH, Firewall, or script logs, or paste raw log lines below to initiate SOC threat correlation.
        </p>

        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24, 24px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-20, 20px)', alignItems: 'stretch' }}>
            
            {/* Left: Paste Raw Logs Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main, #f8fafc)' }}>
                  Paste Raw Logs
                </label>
                {logText && (
                  <button
                    type="button"
                    onClick={() => setLogText('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear Text
                  </button>
                )}
              </div>
              <textarea
                value={logText}
                onChange={(e) => {
                  setLogText(e.target.value);
                  setAnalysisError('');
                }}
                placeholder="2026-09-21 10:22:31 sshd[1234]: Failed password for root from 192.168.1.20&#10;192.168.1.50 - - [21/Sep/2026:10:22:35 +0000] &quot;POST /wp-login.php HTTP/1.1&quot; 401 230"
                rows={7}
                style={{
                  width: '100%',
                  flex: 1,
                  padding: '14px',
                  background: 'var(--input-bg, rgba(15, 23, 42, 0.6))',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                  color: 'var(--text-main, #f8fafc)',
                  borderRadius: 'var(--radius-sm, 8px)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: '1.4'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                {logText ? `${logText.split('\n').filter(Boolean).length} lines entered` : 'Enter log lines directly or upload a file on the right.'}
              </span>
            </div>

            {/* Right: Drag & Drop / File Upload */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main, #f8fafc)' }}>
                Upload Log / Security Evidence File
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? '2px dashed var(--accent-color, #2563eb)' : '2px dashed var(--border-color, rgba(255, 255, 255, 0.18))',
                  borderRadius: 'var(--radius-md, 10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 'var(--space-20, 20px)',
                  background: isDragging ? 'rgba(37, 99, 235, 0.12)' : 'var(--panel-bg, rgba(30, 41, 59, 0.5))',
                  transition: 'all 0.2s ease',
                  flex: 1,
                  minHeight: '160px',
                  textAlign: 'center'
                }}
              >
                {!selectedFile ? (
                  <>
                    <div style={{ color: 'var(--accent-color, #2563eb)', marginBottom: '8px' }}>
                      <FileTextIcon />
                    </div>
                    <span style={{ color: 'var(--text-main, #f8fafc)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                      Drag & drop log file here
                    </span>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.8rem', marginBottom: '14px' }}>
                      Supports .log, .txt, .bat, .ps1, .sh, .py, .csv, .json (max {MAX_FILE_SIZE_MB}MB)
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".log,.txt,.out,.err,.trace,.bat,.cmd,.ps1,.sh,.py,.js,.json,.xml,.csv,.conf,.cfg,.ini,.yaml,.yml"
                      onChange={handleFileInputChange}
                      id="log-file-input"
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="log-file-input"
                      className="glass-panel btn-fluid"
                      style={{
                        padding: '8px 20px',
                        background: 'var(--panel-bg, rgba(30, 41, 59, 0.8))',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
                        color: 'var(--text-main, #f8fafc)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      Choose File
                    </label>
                  </>
                ) : (
                  <div style={{ width: '100%', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: isBinaryFile ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                          color: isBinaryFile ? '#ef4444' : 'var(--accent-color, #2563eb)'
                        }}>
                          {isBinaryFile ? <AlertTriangleIcon /> : <FileTextIcon />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main, #f8fafc)', wordBreak: 'break-all' }}>
                            {fileMetadata?.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                            <span>Size: <strong>{fileMetadata?.formattedSize}</strong></span>
                            <span>Format: <strong>{fileMetadata?.type}</strong></span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    {filePreview && !isBinaryFile && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted, #94a3b8)',
                        maxHeight: '75px',
                        overflowY: 'hidden',
                        whiteSpace: 'pre',
                        textOverflow: 'ellipsis'
                      }}>
                        <div style={{ color: 'var(--accent-color, #38bdf8)', fontWeight: 600, marginBottom: '2px', fontSize: '0.7rem' }}>
                          SAFE PREVIEW (First Lines):
                        </div>
                        {filePreview}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {fileError && (
                <div style={{ marginTop: '8px', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangleIcon />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              {selectedFile ? `Ready to analyze uploaded file: ${fileMetadata?.name}` : (logText.trim() ? `Ready to analyze pasted logs (${logText.trim().split('\n').length} lines)` : 'Select a log file or paste log text to start analysis.')}
            </span>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="glass-panel btn-fluid"
              style={{
                padding: '12px 28px',
                fontSize: '0.95rem',
                background: !isSubmitDisabled ? 'var(--accent-color, #2563eb)' : 'rgba(128, 128, 128, 0.15)',
                color: !isSubmitDisabled ? '#fff' : 'var(--text-muted, #64748b)',
                cursor: !isSubmitDisabled ? 'pointer' : 'not-allowed',
                border: 'none',
                borderRadius: 'var(--radius-sm, 6px)',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: !isSubmitDisabled ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
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
                  <span>Analyzing Security Logs...</span>
                </>
              ) : (
                <>
                  <ShieldIcon />
                  <span>Analyze Logs</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Card (Guarantees no blank page on error) */}
      {analysisError && (
        <div className="glass-panel" style={{
          padding: 'var(--space-20, 20px)',
          borderLeft: '4px solid var(--danger-color, #ef4444)',
          background: 'rgba(239, 68, 68, 0.08)',
          borderRadius: 'var(--radius-sm, 8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: '#ef4444', marginTop: '2px' }}>
                <AlertTriangleIcon />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#ef4444', fontSize: '1.05rem', fontWeight: 700 }}>
                  Analysis Failed
                </h4>
                <p style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  {analysisError}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {suggestFileAnalyzer && (
                <button
                  type="button"
                  onClick={() => navigate('/file-analyzer')}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--accent-color, #2563eb)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Open in File Analyzer
                </button>
              )}
              <button
                type="button"
                onClick={() => setAnalysisError('')}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-main, #f8fafc)',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Progress Stages */}
      {loading && (
        <div className="glass-panel" style={{ padding: 'var(--space-32, 32px)', textAlign: 'center' }}>
          <div className="spinner" style={{
            margin: '0 auto 1.25rem',
            width: '44px',
            height: '44px',
            border: '3px solid rgba(88, 166, 255, 0.15)',
            borderTop: '3px solid var(--accent-color, #2563eb)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px 0', color: 'var(--text-main, #f8fafc)' }}>
            Analyzing Security Logs...
          </h3>
          <p style={{ color: 'var(--text-muted, #94a3b8)', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
            Parsing event formats, executing heuristic threat detection, and generating SOC risk metrics.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
            <span style={{ color: loadingStage >= 1 ? '#4ade80' : 'inherit' }}>
              {loadingStage >= 1 ? '✓' : '○'} Ingest & Validation
            </span>
            <span style={{ color: loadingStage >= 2 ? '#4ade80' : 'inherit' }}>
              {loadingStage >= 2 ? '✓' : '○'} Log Normalization
            </span>
            <span style={{ color: loadingStage >= 3 ? '#4ade80' : 'inherit' }}>
              {loadingStage >= 3 ? '✓' : '○'} Threat Heuristics
            </span>
            <span style={{ color: loadingStage >= 4 ? '#4ade80' : 'inherit' }}>
              {loadingStage >= 4 ? '✓' : '○'} SOC Assessment
            </span>
          </div>
        </div>
      )}

      {/* SOC ANALYSIS COMPLETE Result Section */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24, 24px)' }}>
          
          {/* Header Card: Result & Certificate Eligibility */}
          <div className="glass-panel" style={{
            padding: 'var(--space-24, 24px)',
            borderLeft: `6px solid ${getSeverityColor(results.risk_level || results.ai_analysis?.severity)}`,
            background: 'var(--panel-bg, rgba(30, 41, 59, 0.6))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                    SOC ANALYSIS COMPLETE
                  </h2>
                  <span style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 800 }}>✓</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Analysis ID: <strong style={{ color: 'var(--accent-color, #38bdf8)' }}>{results.analysis_id || 'SOC-2026-000001'}</strong></span>
                  <span>Input: <strong>{results.input_source || (selectedFile ? selectedFile.name : 'Raw Logs')}</strong></span>
                  <span>Format: <strong>{results.log_format || 'Generic'}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: '#38bdf8',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: downloadingPdf ? 'not-allowed' : 'pointer'
                  }}
                  title="Download SOC Log Analysis as PDF"
                >
                  <span>📄</span>
                  <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Report'}</span>
                </button>

                {results.certificate_eligible && (
                  <button
                    type="button"
                    onClick={handleGenerateCertificate}
                    disabled={generatingCert}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: '#22c55e',
                      border: '1px solid #16a34a',
                      borderRadius: 'var(--radius-sm, 6px)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: generatingCert ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                    }}
                    title="Claim your official verification certificate"
                  >
                    <AwardIcon />
                    <span>{generatingCert ? 'Issuing...' : 'Get Certificate'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/certificates')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: 'var(--text-main, #f8fafc)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                  title="View all earned certificates and eligibility"
                >
                  <span>🏆</span>
                  <span>Certificates Hub</span>
                </button>
              </div>
            </div>

            {/* Final Result / Risk Badge / Score Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '14px 18px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Final Result</span>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: results.result === 'SAFE' || results.risk_level === 'NO_RISK' ? 'var(--success-color, #22c55e)' : 'var(--danger-color, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px'
                }}>
                  {results.result === 'SAFE' || results.risk_level === 'NO_RISK' ? '✓ SAFE' : '⚠ THREAT DETECTED'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Level</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: getSeverityColor(results.risk_level), marginTop: '2px' }}>
                  {results.risk_level || 'LOW'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: getSeverityColor(results.risk_level), marginTop: '2px' }}>
                  {results.risk_score ?? 0} / 100
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                  {results.confidence || 96}%
                </div>
              </div>
            </div>

            {/* Certificate Eligibility Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderRadius: '8px',
              background: results.certificate_eligible ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${results.certificate_eligible ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.25rem' }}>{results.certificate_eligible ? '🏆' : 'ℹ️'}</span>
                <div>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: results.certificate_eligible ? '#4ade80' : '#f87171'
                  }}>
                    {results.certificate_eligible ? '✓ CERTIFICATE ELIGIBLE' : 'Certificate Not Eligible'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {results.certificate_eligible
                      ? 'This log analysis completed with a validated SAFE result. You are qualified for a CyberGuardian Security Certificate.'
                      : 'The SOC analysis detected active security threats or elevated risk. Certificates require a clean SAFE assessment.'}
                  </div>
                </div>
              </div>

              {results.certificate_eligible && (
                <button
                  type="button"
                  onClick={handleGenerateCertificate}
                  disabled={generatingCert}
                  className="btn-fluid"
                  style={{
                    padding: '8px 18px',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: generatingCert ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  <AwardIcon />
                  <span>{generatingCert ? 'Issuing...' : 'Get Certificate'}</span>
                </button>
              )}
            </div>

            {certSuccessMessage && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                borderRadius: '6px',
                color: '#4ade80',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>✓ {certSuccessMessage}</span>
                <button
                  type="button"
                  onClick={() => navigate('/certificates')}
                  style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                >
                  View in Certificates →
                </button>
              </div>
            )}

            {/* AI Summary */}
            <p style={{ fontSize: '1.05rem', marginBottom: 'var(--space-20, 20px)', lineHeight: '1.6', color: 'var(--text-main, #f8fafc)' }}>
              {results.summary || results.ai_analysis?.summary}
            </p>
            
            {/* Playbook recommendations */}
            {results.ai_analysis?.recommendations?.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '10px', fontSize: '1rem', color: 'var(--text-main, #f8fafc)', fontWeight: '700' }}>
                  SOC Remediation Playbook:
                </h4>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6', margin: 0 }}>
                  {results.ai_analysis.recommendations.map((rec, i) => (
                    <li key={i} style={{ marginBottom: '6px', color: 'var(--text-main, #f8fafc)', fontSize: '0.9rem' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-16, 16px)' }}>
            <MetricCard
              title="Events Analyzed"
              targetValue={results.events_analyzed || results.total_requests || 0}
              chipText="Processed"
              chipClass="chip-accent"
              icon={<FileTextIcon />}
            />
            <MetricCard
              title="Unique IP Hosts"
              targetValue={results.unique_ips_count || 0}
              chipText="Tracked"
              chipClass="chip-accent"
              icon={<ShieldIcon />}
              valueColor="var(--accent-color, #2563eb)"
            />
            <MetricCard
              title="Log Error Rate"
              targetValue={`${results.error_rate || 0}%`}
              chipText="Error %"
              chipClass={(results.error_rate || 0) > 20 ? 'chip-danger' : 'chip-success'}
              icon={<ActivityIcon />}
              valueColor={(results.error_rate || 0) > 20 ? 'var(--danger-color, #ef4444)' : 'var(--text-main, #f8fafc)'}
            />
            <MetricCard
              title="Indicators Detected"
              targetValue={results.indicators_detected ?? ((results.brute_force_ips?.length || 0) + (results.directory_scans?.length || 0) + (results.suspicious_commands?.length || 0))}
              chipText="Flagged"
              chipClass={((results.indicators_detected || 0) > 0) ? 'chip-danger' : 'chip-success'}
              icon={<AlertTriangleIcon />}
              valueColor={((results.indicators_detected || 0) > 0) ? 'var(--danger-color, #ef4444)' : 'var(--success-color, #22c55e)'}
            />
          </div>

          {/* Threats Analysis Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-20, 20px)' }}>
            
            {/* Brute Force Hosts */}
            <div className="glass-panel" style={{ padding: 'var(--space-20, 20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ color: 'var(--danger-color, #ef4444)', margin: 0, fontSize: '1.1rem' }}>
                  Flagged Brute Force Hosts
                </h3>
                <span className="chip-badge chip-danger"><AlertTriangleIcon /> Brute-Force</span>
              </div>
              {results.brute_force_ips?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {results.brute_force_ips.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(248, 81, 73, 0.08)', border: '1px solid rgba(248, 81, 73, 0.2)', padding: '10px 14px', borderRadius: 'var(--radius-sm, 6px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main, #f8fafc)' }}>IP: {item.ip}</strong>
                        <span style={{ color: '#ff7b72', fontWeight: '700', fontSize: '0.8rem' }}>{item.failed_count} failed attempts</span>
                      </div>
                      {item.paths?.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                          <strong>Target Paths:</strong> {item.paths.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted, #94a3b8)', margin: 0, fontSize: '0.9rem' }}>No brute-force attempt patterns detected.</p>
              )}
            </div>

            {/* Directory Scanner Hosts */}
            <div className="glass-panel" style={{ padding: 'var(--space-20, 20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ color: 'var(--danger-color, #ef4444)', margin: 0, fontSize: '1.1rem' }}>
                  Flagged Directory Scanners
                </h3>
                <span className="chip-badge chip-danger"><SearchIcon /> Scanner</span>
              </div>
              {results.directory_scans?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {results.directory_scans.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(248, 81, 73, 0.08)', border: '1px solid rgba(248, 81, 73, 0.2)', padding: '10px 14px', borderRadius: 'var(--radius-sm, 6px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main, #f8fafc)' }}>IP: {item.ip}</strong>
                        <span style={{ color: '#ff7b72', fontWeight: '700', fontSize: '0.8rem' }}>{item.count} probes</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                        <strong>Paths Scanned:</strong> {item.paths?.slice(0, 3).join(', ')} {item.paths?.length > 3 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted, #94a3b8)', margin: 0, fontSize: '0.9rem' }}>No directory scanning probes detected.</p>
              )}
            </div>
          </div>

          {/* Suspicious Script Commands (if any detected from static analysis) */}
          {results.suspicious_commands?.length > 0 && (
            <div className="glass-panel" style={{ padding: 'var(--space-20, 20px)', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ color: '#ef4444', margin: 0, fontSize: '1.1rem' }}>
                  Suspicious Script Commands Detected (Static Analysis)
                </h3>
                <span className="chip-badge chip-danger"><AlertTriangleIcon /> Static Detection</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.suspicious_commands.map((cmd, i) => (
                  <div key={i} style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#ff7b72', fontSize: '0.85rem' }}>Line {cmd.line}: {cmd.reason}</strong>
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>{cmd.severity}</span>
                    </div>
                    <code style={{ fontSize: '0.8rem', color: 'var(--text-main, #f8fafc)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {cmd.command}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Event Viewer */}
          <div className="glass-panel" style={{ padding: 'var(--space-24, 24px)' }}>
            <h3 style={{ color: 'var(--accent-color, #2563eb)', marginBottom: 'var(--space-16, 16px)', fontSize: '1.2rem', margin: '0 0 16px 0' }}>
              Log Event Viewer ({filteredLogs.length} events)
            </h3>
            
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--space-16, 16px)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs by IP, path, method, or reason..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--input-bg, rgba(15, 23, 42, 0.6))',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                    color: 'var(--text-main, #f8fafc)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  background: 'var(--input-bg, rgba(15, 23, 42, 0.6))',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                  color: 'var(--text-main, #f8fafc)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
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
                  <tr style={{ borderBottom: '2px solid var(--border-color, rgba(255,255,255,0.1))', color: 'var(--text-muted, #94a3b8)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 14px' }}>Client Host IP</th>
                    <th style={{ padding: '12px 14px' }}>Timestamp</th>
                    <th style={{ padding: '12px 14px' }}>Method</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px' }}>Request / Event Path</th>
                    <th style={{ padding: '12px 14px' }}>Analysis Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} style={{
                      borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                      fontSize: '0.85rem',
                      background: log.is_threat ? 'rgba(248, 81, 73, 0.05)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-main, #f8fafc)' }}>
                        {log.ip || 'Local'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.8rem' }}>
                        {log.timestamp || 'N/A'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(128, 128, 128, 0.15)',
                          color: 'var(--text-main, #f8fafc)',
                          borderRadius: 'var(--radius-sm, 4px)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          fontFamily: 'monospace'
                        }}>
                          {log.method || 'GET'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          color: Number(log.status) >= 400 ? 'var(--danger-color, #ef4444)' : 'var(--success-color, #22c55e)',
                          fontWeight: '700'
                        }}>
                          {log.status || 200}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-main, #f8fafc)', wordBreak: 'break-all', maxWidth: '280px' }}>
                        {log.path || '/'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {log.is_threat ? (
                          <span className="chip-badge chip-danger" style={{ fontSize: '0.75rem' }}>
                            <AlertTriangleIcon />
                            {log.threat_reason || 'Flagged Threat'}
                          </span>
                        ) : (
                          <span className="chip-badge chip-success" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success-color, #22c55e)', fontSize: '0.75rem' }}>
                            Clean Event
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 'var(--space-32, 32px)', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                        No events found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* 1-by-1 Animated SOC Analysis History Card */}
      <AnimatedHistoryCard
        title="SOC & Log Analysis Stream"
        type="soc"
        items={socHistory}
        loading={historyLoading}
        onSelectItem={handleSelectHistoryItem}
        emptyMessage="No SOC log analyses recorded yet. Submit logs above to initiate analysis."
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
