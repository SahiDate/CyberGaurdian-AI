import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, Download, ExternalLink, ArrowLeft } from 'lucide-react';

const API = 'http://localhost:8000';

export default function CertificateVerification() {
  const { certificateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (certificateId) {
      verifyCertificate(certificateId);
    }
  }, [certificateId]);

  const verifyCertificate = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/public/certificates/${encodeURIComponent(id)}/verify/`);
      if (res.ok) {
        const data = await res.json();
        setCert(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Certificate not found or invalid.');
        setCert(errData);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to reach CyberGuardian AI verification service. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = cert?.is_valid || cert?.status === 'VALID';
  const isRevoked = cert?.status === 'REVOKED';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 15%, #0d1a33 0%, #060913 100%)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem 4rem 1rem',
      boxSizing: 'border-box'
    }}>
      {/* Top Brand Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '780px',
        marginBottom: '2.5rem',
        padding: '0.75rem 1.25rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #00c9a7 0%, #005f73 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              CYBERGUARDIAN AI
            </h1>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '0.05em' }}>
              PUBLIC CERTIFICATE VERIFICATION PORTAL
            </div>
          </div>
        </div>

        <Link to="/login" style={{
          fontSize: '0.82rem',
          color: '#38bdf8',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.4rem 0.8rem',
          borderRadius: '6px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)'
        }}>
          Portal Login <ExternalLink size={13} />
        </Link>
      </header>

      {/* Main Verification Card */}
      <main style={{
        width: '100%',
        maxWidth: '780px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: `1px solid ${isValid ? 'rgba(16, 185, 129, 0.35)' : isRevoked ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '18px',
        padding: '2.5rem 2rem',
        boxShadow: isValid
          ? '0 20px 50px rgba(0, 201, 167, 0.12), 0 0 0 1px rgba(16, 185, 129, 0.15)'
          : isRevoked
          ? '0 20px 50px rgba(239, 68, 68, 0.12), 0 0 0 1px rgba(239, 68, 68, 0.15)'
          : '0 20px 40px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow corner accent */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px',
          borderRadius: '50%',
          background: isValid ? 'radial-gradient(circle, rgba(0, 201, 167, 0.25) 0%, transparent 70%)' : isRevoked ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)' : 'transparent',
          pointerEvents: 'none'
        }} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{
              width: '44px', height: '44px', border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8', borderRadius: '50%', margin: '0 auto 1.25rem',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Verifying Certificate Cryptographic Authenticity...</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Querying CyberGuardian immutable security ledger for {certificateId}</p>
          </div>
        ) : isValid ? (
          /* VALID CERTIFICATE STATE */
          <div>
            {/* Status Pill */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.55rem 1.4rem',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                <CheckCircle2 size={20} /> ✓ VALID CERTIFICATE
              </div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '1rem 0 0.25rem', color: '#f8fafc' }}>
                CyberGuardian AI Certificate Verified
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                This certificate has been cryptographically confirmed as authentic and issued by CyberGuardian AI.
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Certificate Identifier
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
                  {cert.certificate_id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Issued To
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {cert.recipient_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Assessment Type
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>
                  {cert.assessment_type ? cert.assessment_type.replace(/_/g, ' ') : (cert.title || 'Cybersecurity Assessment')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Assessment Identifier
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'monospace', color: '#94a3b8' }}>
                  {cert.assessment_id || cert.certificate_id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Assessment Result
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <CheckCircle2 size={14} /> {cert.result_status || 'SAFE / NO RISK'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Evaluated Target
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {cert.target}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Issue Date
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>
                  {cert.issue_date}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Issuing Authority
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={16} /> CyberGuardian AI
                </div>
              </div>
            </div>

            {/* Legal Notice */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.75rem',
              color: '#94a3b8',
              lineHeight: 1.5,
              marginBottom: '1.75rem'
            }}>
              <strong>Notice:</strong> This certificate confirms that CyberGuardian AI successfully completed an automated cybersecurity assessment for the selected target and the assessment result met the configured SAFE / NO-RISK eligibility criteria. It does not claim to be a government certificate, accredited certification, or guarantee absolute absence of vulnerabilities.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a
                href={`${API}/api/certificates/${cert.certificate_id}/download/`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.3rem',
                  background: '#00c9a7',
                  color: '#060913',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(0, 201, 167, 0.3)'
                }}
              >
                <Download size={16} /> Download Official PDF Certificate
              </a>
            </div>
          </div>
        ) : isRevoked ? (
          /* REVOKED CERTIFICATE STATE */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.55rem 1.4rem',
                borderRadius: '9999px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                <AlertTriangle size={20} /> ⚠ REVOKED CERTIFICATE
              </div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '1rem 0 0.25rem', color: '#f87171' }}>
                Certificate Revoked
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                This certificate was formerly issued by CyberGuardian AI but has been revoked by platform administrators.
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Certificate ID</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'monospace', color: '#f87171' }}>{cert.certificate_id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Original Recipient</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>{cert.recipient_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Revocation Timestamp</div>
                  <div style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{cert.revoked_at ? new Date(cert.revoked_at).toLocaleString() : 'Recorded'}</div>
                </div>
              </div>

              {cert.revocation_reason && (
                <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.15)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Revocation Reason</div>
                  <div style={{ fontSize: '0.9rem', color: '#fca5a5' }}>{cert.revocation_reason}</div>
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
              This record is preserved for immutable compliance and security audit verification.
            </p>
          </div>
        ) : (
          /* NOT FOUND / INVALID STATE */
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
              color: '#f87171'
            }}>
              <ShieldAlert size={28} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#f8fafc' }}>
              Certificate Not Found
            </h2>
            <p style={{ color: '#94a3b8', maxWidth: '440px', margin: '0 auto 1.75rem', fontSize: '0.88rem' }}>
              No active or revoked certificate exists with the identifier <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{certificateId}</span>. Please verify the QR code or link.
            </p>
            <Link to="/login" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.2rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              <ArrowLeft size={16} /> Return to CyberGuardian Platform
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
        CyberGuardian AI Cybersecurity Platform • Cryptographically Sealed Verification Ledger
      </footer>
    </div>
  );
}
