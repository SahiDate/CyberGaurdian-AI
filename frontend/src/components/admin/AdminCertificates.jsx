import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Award, ShieldCheck, ShieldAlert, RotateCw, Search, Download,
  ExternalLink, Eye, X, AlertTriangle, History, CheckCircle2, User, Clock
} from 'lucide-react';

const API = 'http://localhost:8000';
const PAGE_SIZE = 15;

const StatusBadge = ({ status }) => {
  const isValid = status === 'VALID';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 9px',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      backgroundColor: isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
      color: isValid ? '#34d399' : '#f87171',
      border: `1px solid ${isValid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
    }}>
      {status}
    </span>
  );
};

export default function AdminCertificates() {
  const { authTokens, user } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [certificates, setCertificates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail & Audit Modal State
  const [selectedCert, setSelectedCert] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Revoke Modal State
  const [revokingCert, setRevokingCert] = useState(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  const getAuthHeaders = () => {
    let token = authTokens?.access;
    if (!token) {
      try {
        const stored = localStorage.getItem('authTokens');
        if (stored) token = JSON.parse(stored)?.access;
      } catch (e) {}
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchCertificates();
    fetchAnalytics();
  }, [page, statusFilter, assessmentTypeFilter, dateFilter]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/certificates/analytics/`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error("Failed to load certificate analytics:", e);
    }
  };

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/admin/certificates/?page=${page}&page_size=${PAGE_SIZE}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (assessmentTypeFilter !== 'ALL') url += `assessment_type=${assessmentTypeFilter}&`;
      if (dateFilter) url += `date=${dateFilter}&`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCertificates(data.results || data);
        setTotalCount(data.count || (data.results || data).length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCertificates();
  };

  const handleOpenDetails = async (cert) => {
    setSelectedCert(cert);
    setLoadingAudit(true);
    try {
      const res = await fetch(`${API}/api/admin/certificates/${cert.certificate_id}/audit/`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokingCert || !revocationReason.trim()) return;

    setRevoking(true);
    setRevokeError('');
    try {
      const res = await fetch(`${API}/api/certificates/${revokingCert.certificate_id}/revoke/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ revocation_reason: revocationReason })
      });
      if (res.ok) {
        const updated = await res.json();
        setRevokingCert(null);
        setRevocationReason('');
        if (selectedCert?.certificate_id === updated.certificate_id) {
          setSelectedCert(updated);
        }
        await fetchCertificates();
        await fetchAnalytics();
      } else {
        const err = await res.json();
        setRevokeError(err.error || err.revocation_reason?.[0] || 'Revocation failed.');
      }
    } catch (e) {
      setRevokeError('Network error while requesting revocation.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Award size={28} color="#00c9a7" />
              Certificate Administration & Ledger
            </h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted, #94a3b8)', fontSize: '0.88rem' }}>
              Inspect, verify, audit, and revoke CyberGuardian AI assessment completion certificates.
            </p>
          </div>

          <button
            onClick={() => { fetchCertificates(); fetchAnalytics(); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--admin-border, rgba(255, 255, 255, 0.1))',
              borderRadius: '8px',
              color: 'var(--admin-text-main, #f8fafc)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* 5 Metis KPI Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'var(--admin-card-bg, #1e293b)',
            border: '1px solid var(--admin-border, #334155)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Certificates
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--admin-text-main, #f8fafc)', marginTop: '0.25rem' }}>
              {analytics?.total_certificates ?? '—'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Lifetime issued
            </div>
          </div>

          <div style={{
            background: 'var(--admin-card-bg, #1e293b)',
            border: '1px solid var(--admin-border, #334155)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Valid Certificates
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
              {analytics?.valid_certificates ?? '—'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#34d399', marginTop: '0.2rem' }}>
              Cryptographically active
            </div>
          </div>

          <div style={{
            background: 'var(--admin-card-bg, #1e293b)',
            border: '1px solid var(--admin-border, #334155)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Revoked Certificates
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f87171', marginTop: '0.25rem' }}>
              {analytics?.revoked_certificates ?? '—'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '0.2rem' }}>
              Deauthorized by admin
            </div>
          </div>

          <div style={{
            background: 'var(--admin-card-bg, #1e293b)',
            border: '1px solid var(--admin-border, #334155)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Issued Today
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
              {analytics?.issued_today ?? '—'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '0.2rem' }}>
              Daily generation rate
            </div>
          </div>

          <div style={{
            background: 'var(--admin-card-bg, #1e293b)',
            border: '1px solid var(--admin-border, #334155)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Issued This Month
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.25rem' }}>
              {analytics?.issued_this_month ?? '—'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#a78bfa', marginTop: '0.2rem' }}>
              Current billing period
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          background: 'var(--admin-card-bg, #1e293b)',
          border: '1px solid var(--admin-border, #334155)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 320px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search certificate ID, recipient, user, or target..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--admin-border, #334155)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '0.55rem 1rem',
                background: '#00c9a7',
                color: '#060913',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Assessment Type Filter */}
            <select
              value={assessmentTypeFilter}
              onChange={e => { setAssessmentTypeFilter(e.target.value); setPage(1); }}
              style={{
                padding: '0.55rem 0.85rem',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--admin-border, #334155)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            >
              <option value="ALL">Assessment: All</option>
              <option value="WEBSITE_SCAN">Website Scan</option>
              <option value="URL_SCAN">URL Scan</option>
              <option value="IP_SCAN">IP Scan</option>
              <option value="PORT_SCAN">Port Scan</option>
              <option value="SSL_SCAN">SSL Scan</option>
              <option value="WHOIS_ANALYSIS">WHOIS Lookup</option>
              <option value="THREAT_INTELLIGENCE">Threat Intel</option>
              <option value="FILE_ANALYSIS">File Analysis</option>
              <option value="SOC_ANALYSIS">SOC Analysis</option>
              <option value="LOG_ANALYSIS">Log Analysis</option>
              <option value="COMPOSITE_REPORT">Security Report</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{
                padding: '0.55rem 0.85rem',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--admin-border, #334155)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="VALID">Status: Valid</option>
              <option value="REVOKED">Status: Revoked</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1); }}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--admin-border, #334155)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            {dateFilter && (
              <button
                onClick={() => { setDateFilter(''); setPage(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {/* Certificate Table */}
        <div style={{
          background: 'var(--admin-card-bg, #1e293b)',
          border: '1px solid var(--admin-border, #334155)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid var(--admin-border, #334155)' }}>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Certificate ID</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Recipient / User</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Assessment</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Assessment ID</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Target</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Result</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Issue Date</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', margin: '0 auto 0.75rem', animation: 'spin 0.8s linear infinite' }} />
                      Loading certificates...
                    </td>
                  </tr>
                ) : certificates.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No certificates match current filters.
                    </td>
                  </tr>
                ) : (
                  certificates.map(cert => {
                    const isValid = cert.status === 'VALID';
                    return (
                      <tr
                        key={cert.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                          {cert.certificate_id}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{cert.recipient_name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>@{cert.username}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)'
                          }}>
                            {cert.assessment_type?.replace(/_/g, ' ') || 'SECURITY ASSESSMENT'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          {cert.assessment_id || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cert.target}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.35)'
                          }}>
                            ✓ SAFE
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {cert.issue_date}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <StatusBadge status={cert.status} />
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleOpenDetails(cert)}
                              title="View Certificate Details & Audit History"
                              style={{
                                padding: '0.35rem 0.65rem',
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                borderRadius: '6px',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Eye size={13} /> View
                            </button>

                            <a
                              href={`${API}/api/certificates/${cert.certificate_id}/download/`}
                              target="_blank"
                              rel="noreferrer"
                              title="Download PDF"
                              style={{
                                padding: '0.35rem 0.65rem',
                                background: 'rgba(0, 201, 167, 0.1)',
                                border: '1px solid rgba(0, 201, 167, 0.25)',
                                borderRadius: '6px',
                                color: '#00c9a7',
                                textDecoration: 'none',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Download size={13} />
                            </a>

                            <Link
                              to={`/verify/certificate/${cert.certificate_id}`}
                              target="_blank"
                              title="Public Verification"
                              style={{
                                padding: '0.35rem 0.65rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                color: '#f8fafc',
                                textDecoration: 'none',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              <ExternalLink size={13} />
                            </Link>

                            {isValid && (
                              <button
                                onClick={() => { setRevokingCert(cert); setRevocationReason(''); setRevokeError(''); }}
                                title="Revoke Certificate"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '6px',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 600
                                }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.15)',
            borderTop: '1px solid var(--admin-border, #334155)',
            fontSize: '0.82rem',
            color: '#94a3b8'
          }}>
            <div>
              Showing {certificates.length} of {totalCount} certificates
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '0.35rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--admin-border, #334155)',
                  borderRadius: '6px',
                  color: page <= 1 ? '#64748b' : '#f8fafc',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: 600 }}>
                Page {page}
              </span>
              <button
                disabled={page * PAGE_SIZE >= totalCount}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '0.35rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--admin-border, #334155)',
                  borderRadius: '6px',
                  color: page * PAGE_SIZE >= totalCount ? '#64748b' : '#f8fafc',
                  cursor: page * PAGE_SIZE >= totalCount ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Certificate Details & Audit History Modal */}
        {selectedCert && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: 'var(--admin-card-bg, #1e293b)',
              border: '1px solid var(--admin-border, #334155)',
              borderRadius: '16px', maxWidth: '840px', width: '100%', maxHeight: '90vh',
              overflowY: 'auto', padding: '2rem', boxSizing: 'border-box', position: 'relative'
            }}>
              <button
                onClick={() => setSelectedCert(null)}
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Award size={24} color="#00c9a7" />
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                  Certificate Details & Audit Ledger
                </h3>
              </div>

              {/* Details Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
                background: 'rgba(0, 0, 0, 0.25)', padding: '1.25rem', borderRadius: '10px',
                border: '1px solid var(--admin-border, #334155)', marginBottom: '1.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Certificate ID</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>{selectedCert.certificate_id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Recipient</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedCert.recipient_name} (@{selectedCert.username})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ marginTop: '0.2rem' }}><StatusBadge status={selectedCert.status} /></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Assessment Type</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8' }}>{selectedCert.assessment_type?.replace(/_/g, ' ') || 'SECURITY ASSESSMENT'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Assessment ID</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#cbd5e1' }}>{selectedCert.assessment_id || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Target</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', wordBreak: 'break-all' }}>{selectedCert.target}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Assessment Result</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>✓ SAFE / NO RISK ({selectedCert.result_status || 'SAFE'})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Risk Level & Score</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{selectedCert.risk_level || 'NO_RISK'} (Score: {selectedCert.risk_score ?? 0}/100)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Report Reference</div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{selectedCert.report_id ? `Report #${selectedCert.report_id}` : 'Associated Assessment'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Issue Date</div>
                  <div style={{ fontSize: '0.85rem' }}>{selectedCert.issue_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Generation Time</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(selectedCert.created_at).toLocaleString()}</div>
                </div>
              </div>

              {selectedCert.status === 'REVOKED' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px', padding: '1rem', marginBottom: '1.75rem', color: '#fca5a5', fontSize: '0.85rem'
                }}>
                  <strong style={{ color: '#f87171' }}>Revocation Record:</strong> Revoked on {new Date(selectedCert.revoked_at).toLocaleString()}.
                  <div style={{ marginTop: '0.3rem' }}><strong>Reason:</strong> {selectedCert.revocation_reason}</div>
                </div>
              )}

              {/* Audit Timeline */}
              <div style={{ marginBottom: '1.75rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <History size={16} color="#38bdf8" /> Immutable Audit History ({auditLogs.length} Events)
                </h4>

                {loadingAudit ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Loading audit history...</div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>No audit records found for this certificate.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                    {auditLogs.map((log, i) => (
                      <div key={i} style={{
                        background: 'rgba(0, 0, 0, 0.2)', padding: '0.65rem 0.85rem', borderRadius: '6px',
                        borderLeft: `3px solid ${log.status === 'SUCCESS' || log.status === 'VALID' ? '#34d399' : '#f87171'}`,
                        fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <strong style={{ color: '#f8fafc' }}>{log.event_type}</strong>
                          <div style={{ color: '#94a3b8', marginTop: '0.15rem' }}>
                            Actor: {log.actor_username || log.actor_type} • Status: {log.status} {log.ip_address && `• IP: ${log.ip_address}`}
                          </div>
                          {log.failure_reason && <div style={{ color: '#f87171', marginTop: '0.15rem' }}>Reason: {log.failure_reason}</div>}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--admin-border, #334155)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a
                    href={`${API}/api/certificates/${selectedCert.certificate_id}/download/`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.55rem 1.1rem', background: '#00c9a7', color: '#060913',
                      borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    <Download size={15} /> Download PDF
                  </a>

                  <Link
                    to={`/verify/certificate/${selectedCert.certificate_id}`}
                    target="_blank"
                    style={{
                      padding: '0.55rem 1.1rem', background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px',
                      color: '#38bdf8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    <ExternalLink size={15} /> Open Verification Portal
                  </Link>
                </div>

                {selectedCert.status === 'VALID' && (
                  <button
                    onClick={() => { setRevokingCert(selectedCert); setRevocationReason(''); setRevokeError(''); }}
                    style={{
                      padding: '0.55rem 1.2rem', background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px',
                      color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem'
                    }}
                  >
                    Revoke Certificate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Revocation Reason Modal */}
        {revokingCert && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: 'var(--admin-card-bg, #1e293b)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '1.75rem',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', marginBottom: '0.75rem' }}>
                <AlertTriangle size={22} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Confirm Certificate Revocation
                </h3>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1rem', lineHeight: 1.5 }}>
                You are revoking certificate <strong style={{ color: '#38bdf8' }}>{revokingCert.certificate_id}</strong> issued to <strong>{revokingCert.recipient_name}</strong>.
                This action is permanent and will immediately mark the certificate as REVOKED on the public ledger.
              </p>

              <form onSubmit={handleRevokeSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    Mandatory Revocation Reason:
                  </label>
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    value={revocationReason}
                    onChange={e => setRevocationReason(e.target.value)}
                    placeholder="e.g. Invalidation of assessment findings, policy breach, or requested re-audit..."
                    rows={4}
                    style={{
                      width: '100%', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--admin-border, #334155)', borderRadius: '8px',
                      color: '#f8fafc', fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {revokeError && (
                  <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {revokeError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRevokingCert(null)}
                    style={{
                      padding: '0.55rem 1.1rem', background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none', borderRadius: '6px', color: '#f8fafc', cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={revoking || !revocationReason.trim()}
                    style={{
                      padding: '0.55rem 1.25rem', background: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem',
                      cursor: revoking ? 'wait' : 'pointer'
                    }}
                  >
                    {revoking ? 'Revoking...' : 'Confirm Revocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
