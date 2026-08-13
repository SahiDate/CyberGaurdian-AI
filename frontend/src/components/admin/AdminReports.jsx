import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

export default function AdminReports() {
  const { authTokens } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scans'); // 'scans' | 'user_reports'
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scansRes, reportsRes] = await Promise.all([
        fetch(`${API}/api/admin/scans/`, { headers: { Authorization: `Bearer ${authTokens?.access}` } }),
        fetch(`${API}/api/reports/`, { headers: { Authorization: `Bearer ${authTokens?.access}` } }),
      ]);
      if (scansRes.ok) setScans(await scansRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredScans = scans.filter(s => {
    const matchSearch = !search || s.domain?.toLowerCase().includes(search.toLowerCase()) || s.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || s.risk_level === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1400px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>📑 Scan Reports & Documentation</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
              Comprehensive security scan logs, user-generated compliance reports, and audit artifacts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => exportCSV(scans, `CyberGuardian_Scans_${new Date().toISOString().slice(0, 10)}`)}
              style={{ padding: '0.6rem 1.1rem', background: 'rgba(57,211,83,0.1)', border: '1px solid rgba(57,211,83,0.3)', color: '#39d353', borderRadius: '7px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}
            >
              📥 Export CSV
            </button>
            <button
              onClick={fetchData}
              style={{ padding: '0.6rem 1.1rem', background: 'rgba(56,139,253,0.1)', border: '1px solid rgba(56,139,253,0.3)', color: '#388bfd', borderRadius: '7px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setTab('scans')}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: tab === 'scans' ? '#388bfd' : 'transparent',
              color: tab === 'scans' ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            🔍 System Scan Records ({scans.length})
          </button>
          <button
            onClick={() => setTab('user_reports')}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: tab === 'user_reports' ? '#388bfd' : 'transparent',
              color: tab === 'user_reports' ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            📋 User Reports ({reports.length})
          </button>
        </div>

        {/* Controls */}
        {tab === 'scans' && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Search by domain, user email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '240px', maxWidth: '400px', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
            />
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="all" style={{ background: '#161b22' }}>All Risk Levels</option>
              <option value="high" style={{ background: '#161b22' }}>High Risk</option>
              <option value="medium" style={{ background: '#161b22' }}>Medium Risk</option>
              <option value="good" style={{ background: '#161b22' }}>Good</option>
              <option value="excellent" style={{ background: '#161b22' }}>Excellent</option>
            </select>
          </div>
        )}

        {/* Content Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading report data...</div>
          ) : tab === 'scans' ? (
            filteredScans.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No scan records matching your filter.</div>
            ) : (
              <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['ID', 'User Email', 'Domain', 'HTTPS', 'Security Score', 'Risk Level', 'Scanned At'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>#{s.id}</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{s.user_email || 'System'}</td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#388bfd' }}>{s.domain}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>{s.is_https ? '🔒 HTTPS' : '⚠️ HTTP'}</td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 800 }}>
                        <span style={{ color: s.security_score >= 80 ? '#39d353' : s.security_score >= 50 ? '#e3b341' : '#f85149' }}>
                          {s.security_score}/100
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          background: s.risk_level === 'high' ? 'rgba(248,81,73,0.15)' : s.risk_level === 'medium' ? 'rgba(227,179,65,0.15)' : 'rgba(57,211,83,0.15)',
                          color: s.risk_level === 'high' ? '#f85149' : s.risk_level === 'medium' ? '#e3b341' : '#39d353',
                        }}>
                          {s.risk_level?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{new Date(s.scanned_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )
          ) : (
            reports.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No user reports created yet.</div>
            ) : (
              <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '500px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['ID', 'Report Title', 'Format', 'Created At', 'File Size'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>#{r.id}</td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: '#fff' }}>{r.title || r.name || `Report #${r.id}`}</td>
                      <td style={{ padding: '0.7rem 1rem', color: '#388bfd', fontFamily: 'monospace' }}>{r.report_type || 'PDF'}</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{r.file_size ? `${(r.file_size / 1024).toFixed(1)} KB` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )
          )}
        </div>
      </div>
    </AdminSidebar>
  );
}
