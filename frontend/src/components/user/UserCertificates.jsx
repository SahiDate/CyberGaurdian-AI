import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ShieldCheck, Award, Download, ExternalLink, Eye, RotateCw,
  CheckCircle2, XCircle, Clock, AlertCircle, FileText, ChevronRight, X
} from 'lucide-react';

const API = 'http://localhost:8000';

export default function UserCertificates() {
  const { authTokens, user } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [certificates, setCertificates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [activeTab, setActiveTab] = useState('certificates'); // 'certificates' | 'eligibility'
  const [selectedCert, setSelectedCert] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = getAuthHeaders();
      const [certsRes, assessRes] = await Promise.all([
        fetch(`${API}/api/certificates/`, { headers }),
        fetch(`${API}/api/user/eligible-assessments/`, { headers })
      ]);

      if (certsRes.ok) {
        const certsData = await certsRes.json();
        setCertificates(certsData.results || certsData);
      }
      if (assessRes.ok) {
        const assessData = await assessRes.json();
        setAssessments(assessData.assessments || []);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to fetch certificate and assessment records.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (assessmentId, assessmentType) => {
    setGeneratingFor(assessmentId);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/assessments/${encodeURIComponent(assessmentId)}/certificate/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ assessment_type: assessmentType })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedCert(data);
        await fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to generate certificate.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Network error while requesting certificate generation.');
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      color: 'var(--text-main, #f8fafc)',
      paddingBottom: '4rem'
    }}>
      <Navbar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1.25rem' }}>
        {/* Page Title & Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.35rem',
              fontSize: '1.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <Award size={28} color="#00c9a7" />
              Cybersecurity Analysis Completion Certificates
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem' }}>
              Formal verification certificates issued upon completion of end-to-end security scans, SOC analysis, and reports.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
              borderRadius: '8px',
              color: 'var(--text-main, #f8fafc)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} />
            {errorMsg}
          </div>
        )}

        {/* Top Summary Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Certificates
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#00c9a7', marginTop: '0.25rem' }}>
              {certificates.filter(c => c.status === 'VALID').length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
              Cryptographically verifiable online
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Completed Assessments
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
              {reports.length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
              Eligible for completion certification
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tamper-Proof Verification
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
              100%
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
              Vector QR code with SHA-256 tokens
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => setActiveTab('certificates')}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'certificates' ? '2px solid #00c9a7' : '2px solid transparent',
              color: activeTab === 'certificates' ? '#00c9a7' : 'var(--text-muted, #94a3b8)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            My Issued Certificates ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('eligibility')}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'eligibility' ? '2px solid #00c9a7' : '2px solid transparent',
              color: activeTab === 'eligibility' ? '#00c9a7' : 'var(--text-muted, #94a3b8)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Assessment Eligibility Checklist ({reports.length})
          </button>
        </div>

        {/* Tab 1: Issued Certificates */}
        {activeTab === 'certificates' && (
          <div>
            {certificates.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3.5rem 1rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.12))',
                borderRadius: '12px'
              }}>
                <Award size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>No Certificates Generated Yet</h3>
                <p style={{ color: 'var(--text-muted, #94a3b8)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.88rem' }}>
                  Complete a security assessment and generate a security report to become eligible for your official CyberGuardian AI Completion Certificate.
                </p>
                <button
                  onClick={() => setActiveTab('eligibility')}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#00c9a7',
                    color: '#060913',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  View Assessment Eligibility
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                {certificates.map(cert => {
                  const isValid = cert.status === 'VALID';
                  return (
                    <div key={cert.id} style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: `1px solid ${isValid ? 'rgba(0, 201, 167, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      borderRadius: '14px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div>
                        {/* Header: ID & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: '#38bdf8'
                          }}>
                            {cert.certificate_id}
                          </span>
                          <span style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isValid ? '#34d399' : '#f87171',
                            border: `1px solid ${isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            {cert.status}
                          </span>
                        </div>

                        {/* Assessment Type & Identifier */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8'
                          }}>
                            {cert.assessment_type ? cert.assessment_type.replace(/_/g, ' ') : 'Security Assessment'}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)' }}>
                            {cert.assessment_id || cert.certificate_id}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.65rem', wordBreak: 'break-all' }}>
                          Target: <strong style={{ color: 'var(--text-main, #e2e8f0)' }}>{cert.target}</strong>
                        </div>

                        {/* Result Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#34d399',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          marginBottom: '1rem'
                        }}>
                          <CheckCircle2 size={12} /> {cert.result_status || 'SAFE / NO RISK'}
                        </div>

                        {/* Metadata row */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                          marginBottom: '1.25rem'
                        }}>
                          <div>
                            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Recipient: </span>
                            <strong>{cert.recipient_name}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Issued: </span>
                            <strong>{cert.issue_date}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setSelectedCert(cert)}
                          style={{
                            flex: 1,
                            padding: '0.55rem',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '8px',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Eye size={14} /> Preview
                        </button>

                        <a
                          href={`${API}/api/certificates/${cert.certificate_id}/download/`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            flex: 1,
                            padding: '0.55rem',
                            background: 'rgba(0, 201, 167, 0.12)',
                            border: '1px solid rgba(0, 201, 167, 0.3)',
                            borderRadius: '8px',
                            color: '#00c9a7',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Download size={14} /> Download
                        </a>

                        <Link
                          to={`/verify/certificate/${cert.certificate_id}`}
                          target="_blank"
                          style={{
                            padding: '0.55rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                            borderRadius: '8px',
                            color: 'var(--text-main, #f8fafc)',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Verify Certificate Online"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Assessment Eligibility Checklist */}
        {activeTab === 'eligibility' && (
          <div>
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted, #94a3b8)',
              lineHeight: 1.5
            }}>
              <strong style={{ color: '#38bdf8' }}>Certificate Rule: </strong>
              A CyberGuardian AI Completion Certificate is earned for ANY single completed security assessment meeting the <strong style={{ color: '#34d399' }}>SAFE / NO-RISK</strong> criteria. You do <span style={{ textDecoration: 'underline' }}>not</span> need to run all scanners or SOC analysis — ONE qualifying assessment is sufficient!
            </div>

            {assessments.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.12))',
                borderRadius: '12px'
              }}>
                <Award size={42} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No Certificate is Currently Available</h3>
                <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem', maxWidth: '520px', margin: '0 auto 1.25rem' }}>
                  Complete any eligible CyberGuardian AI security assessment with a SAFE / NO-RISK result to become eligible.
                </p>
                <Link
                  to="/dashboard"
                  style={{
                    display: 'inline-block',
                    padding: '0.55rem 1.25rem',
                    background: '#00c9a7',
                    color: '#060913',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none'
                  }}
                >
                  Start New Scan
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assessments.map(item => {
                  const isSafe = item.is_eligible || item.result === 'SAFE';
                  const isCertified = item.already_certified;
                  const isGenerating = generatingFor === item.id;

                  return (
                    <div key={item.id} style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: `1px solid ${isSafe ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)'}`,
                      borderRadius: '12px',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1.25rem'
                    }}>
                      <div style={{ flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                            {item.id}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            fontWeight: 600
                          }}>
                            {item.name}
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 700 }}>
                          {item.target}
                        </h4>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
                          Result: <strong style={{ color: isSafe ? '#34d399' : '#f87171' }}>{item.result}</strong> • Risk Level: <strong>{item.risk_level}</strong>
                          {item.created_at && ` • ${new Date(item.created_at).toLocaleDateString()}`}
                        </div>
                      </div>

                      {/* Result & Eligibility Status */}
                      <div style={{ flex: '1 1 240px' }}>
                        {isSafe ? (
                          <div>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              color: '#34d399',
                              background: 'rgba(16, 185, 129, 0.12)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              marginBottom: '0.35rem'
                            }}>
                              <CheckCircle2 size={15} /> SAFE / NO RISK CRITERIA MET
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #94a3b8)' }}>
                              Assessment completed cleanly with zero critical threats.
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              color: '#f87171',
                              background: 'rgba(239, 68, 68, 0.12)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              marginBottom: '0.35rem'
                            }}>
                              <AlertCircle size={15} /> NOT ELIGIBLE (RISKS DETECTED)
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '300px' }}>
                              {item.reason}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {isCertified ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link
                              to={`/verify/certificate/${item.certificate_id}`}
                              target="_blank"
                              style={{
                                padding: '0.55rem 1rem',
                                background: 'rgba(0, 201, 167, 0.15)',
                                border: '1px solid rgba(0, 201, 167, 0.3)',
                                borderRadius: '8px',
                                color: '#00c9a7',
                                textDecoration: 'none',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Award size={15} /> Certificate Issued ({item.certificate_id})
                            </Link>
                          </div>
                        ) : isSafe ? (
                          <button
                            onClick={() => handleGenerateCertificate(item.id, item.type)}
                            disabled={isGenerating}
                            style={{
                              padding: '0.65rem 1.25rem',
                              background: 'linear-gradient(135deg, #00c9a7 0%, #008775 100%)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#060913',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              boxShadow: '0 4px 12px rgba(0, 201, 167, 0.35)'
                            }}
                          >
                            <Award size={16} />
                            {isGenerating ? 'Generating Certificate...' : 'Get Certificate'}
                          </button>
                        ) : (
                          <button
                            disabled
                            style={{
                              padding: '0.55rem 1rem',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: '#64748b',
                              cursor: 'not-allowed',
                              fontSize: '0.82rem',
                              fontWeight: 600
                            }}
                            title="Only SAFE / NO RISK assessments can receive a completion certificate."
                          >
                            Not Eligible
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Certificate Preview Modal */}
        {selectedCert && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: 'var(--panel-bg, #0f172a)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
              borderRadius: '16px',
              maxWidth: '920px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxSizing: 'border-box',
              position: 'relative'
            }}>
              {/* Modal Close */}
              <button
                onClick={() => setSelectedCert(null)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={24} color="#00c9a7" />
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                  Certificate Preview
                </h3>
              </div>

              {/* Embedded PDF Canvas Preview Frame */}
              <div style={{
                width: '100%',
                height: '480px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '1.5rem',
                background: '#fff'
              }}>
                <iframe
                  src={`${API}/api/certificates/${selectedCert.certificate_id}/preview/#toolbar=0`}
                  title="Certificate PDF Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>

              {/* Modal Footer Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
                    {selectedCert.certificate_id}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Recipient: {selectedCert.recipient_name} • Status: {selectedCert.status}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link
                    to={`/verify/certificate/${selectedCert.certificate_id}`}
                    target="_blank"
                    style={{
                      padding: '0.65rem 1.2rem',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <ExternalLink size={15} /> Verify Online
                  </Link>

                  <a
                    href={`${API}/api/certificates/${selectedCert.certificate_id}/download/`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.65rem 1.4rem',
                      background: '#00c9a7',
                      color: '#060913',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Download size={15} /> Download PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
