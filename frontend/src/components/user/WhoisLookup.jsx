import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../shared/Navbar';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000';

const AGE_BADGE_STYLES = {
  NEW:         { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', border: '#e3b341', label: '🆕 New (< 90d)' },
  YOUNG:       { color: '#388bfd', bg: 'rgba(56,139,253,0.15)', border: '#388bfd', label: '🌱 Young (90d-1y)' },
  ESTABLISHED: { color: '#39d353', bg: 'rgba(57,211,83,0.15)', border: '#39d353', label: '🛡️ Established' },
  LEGACY:      { color: '#bc8cff', bg: 'rgba(188,140,255,0.15)', border: '#bc8cff', label: '🏛️ Legacy (> 10y)' },
  UNKNOWN:     { color: '#8b949e', bg: 'rgba(139,148,158,0.15)', border: '#8b949e', label: 'Unknown' },
};

const EXP_BADGE_STYLES = {
  ACTIVE:        { color: '#39d353', bg: 'rgba(57,211,83,0.15)', border: '#39d353', label: 'Active' },
  EXPIRING_SOON: { color: '#e3b341', bg: 'rgba(227,179,65,0.15)', border: '#e3b341', label: '⚠️ Expiring Soon' },
  EXPIRED:       { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: '#f85149', label: '⛔ Expired' },
  UNKNOWN:       { color: '#8b949e', bg: 'rgba(139,148,158,0.15)', border: '#8b949e', label: 'Unknown' },
};

export default function WhoisLookup() {
  const { authTokens } = useContext(AuthContext);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterAge, setFilterAge] = useState('ALL');
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/whois/history/`, {
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

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    if (!domain.trim()) {
      setErrorMsg('Please enter a valid domain name.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/whois/lookup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({ domain: domain.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.domain?.[0] || data.error || 'Failed to fetch WHOIS records.');
      }
      setCurrentResult(data);
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLookup = (sampleDomain) => {
    setDomain(sampleDomain);
  };

  const filteredHistory = history.filter(item => {
    const matchesDomain = (item.domain || '').toLowerCase().includes(filterQuery.toLowerCase());
    const matchesAge = filterAge === 'ALL' || item.age_category === filterAge;
    return matchesDomain && matchesAge;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🌐</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              WHOIS & RDAP Domain Intelligence
            </h1>
          </div>
          <p style={{ color: '#8b949e', fontSize: '0.95rem', margin: 0 }}>
            Query authoritative domain registration records, creation and expiration dates, registrar metadata, authoritative nameservers, and domain age security posture.
          </p>
        </div>

        {/* Lookup Card */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '12px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)',
          marginBottom: '2rem'
        }}>
          <form onSubmit={handleLookup}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 500px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Domain Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. github.com, microsoft.com, or openai.org"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#f0f6fc',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.75rem',
                    background: loading ? '#21262d' : 'linear-gradient(135deg, #238636 0%, #1f6feb 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(35,134,54,0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Querying RDAP/WHOIS...
                    </>
                  ) : (
                    <>🔎 Lookup Domain</>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick chips */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6e7681', fontWeight: 600 }}>Quick Targets:</span>
            {['google.com', 'github.com', 'wikipedia.org', 'iana.org', 'cloudflare.com'].map(chip => (
              <button
                key={chip}
                onClick={() => quickLookup(chip)}
                style={{
                  background: 'rgba(48, 54, 61, 0.4)',
                  border: '1px solid #30363d',
                  borderRadius: '16px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.75rem',
                  color: '#8b949e',
                  cursor: 'pointer'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', borderRadius: '8px', color: '#ff7b72', fontSize: '0.88rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Current Result Details */}
        {currentResult && (
          <div style={{
            background: 'rgba(22, 27, 34, 0.95)',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '1.75rem',
            marginBottom: '2.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #21262d', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
                  {currentResult.domain}
                </h2>
                <div style={{ color: '#8b949e', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  Registrar: <span style={{ color: '#58a6ff', fontWeight: 600 }}>{currentResult.registrar || 'NOT_AVAILABLE'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Age Badge */}
                {(() => {
                  const ageBadge = AGE_BADGE_STYLES[currentResult.age_category] || AGE_BADGE_STYLES.UNKNOWN;
                  return (
                    <span style={{ color: ageBadge.color, background: ageBadge.bg, border: `1px solid ${ageBadge.border}`, padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800 }}>
                      {ageBadge.label}
                    </span>
                  );
                })()}

                {/* Expiration Badge */}
                {(() => {
                  const expBadge = EXP_BADGE_STYLES[currentResult.expiration_category] || EXP_BADGE_STYLES.UNKNOWN;
                  return (
                    <span style={{ color: expBadge.color, background: expBadge.bg, border: `1px solid ${expBadge.border}`, padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800 }}>
                      {expBadge.label}
                    </span>
                  );
                })()}

                {/* Threat Score */}
                <span style={{
                  color: currentResult.threat_score >= 75 ? '#f85149' : currentResult.threat_score >= 50 ? '#e3b341' : currentResult.threat_score >= 25 ? '#388bfd' : '#39d353',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #30363d',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}>
                  Threat Score: {currentResult.threat_score}/100 ({currentResult.severity})
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Domain Age</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: '#f0f6fc' }}>
                  {currentResult.domain_age_days !== null ? `${Math.floor(currentResult.domain_age_days / 365)}y ${currentResult.domain_age_days % 365}d` : 'Unknown'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Expires In</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: (currentResult.days_until_expiration ?? 0) <= 0 ? '#f85149' : (currentResult.days_until_expiration ?? 0) <= 30 ? '#e3b341' : '#39d353' }}>
                  {currentResult.days_until_expiration !== null ? `${currentResult.days_until_expiration} Days` : 'Unknown'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>DNSSEC Security</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: currentResult.dnssec === 'SIGNED' ? '#39d353' : '#8b949e' }}>
                  {currentResult.dnssec === 'SIGNED' ? '🛡️ Signed' : '⚪ Unsigned'}
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase' }}>Registrant Country</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: '#58a6ff' }}>
                  {currentResult.registrant_country || 'NOT_AVAILABLE'}
                </div>
              </div>
            </div>

            {/* Registration Details & Nameservers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f6fc', marginTop: 0, marginBottom: '0.75rem' }}>
                  📋 Registration Timestamps
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: '#8b949e' }}>Created Date:</span> <span style={{ color: '#f0f6fc', fontWeight: 600 }}>{currentResult.created_date ? new Date(currentResult.created_date).toUTCString() : 'NOT_AVAILABLE'}</span></div>
                  <div><span style={{ color: '#8b949e' }}>Updated Date:</span> <span style={{ color: '#c9d1d9' }}>{currentResult.updated_date ? new Date(currentResult.updated_date).toUTCString() : 'NOT_AVAILABLE'}</span></div>
                  <div><span style={{ color: '#8b949e' }}>Expires Date:</span> <span style={{ color: '#c9d1d9' }}>{currentResult.expires_date ? new Date(currentResult.expires_date).toUTCString() : 'NOT_AVAILABLE'}</span></div>
                  <div><span style={{ color: '#8b949e' }}>Registry ID:</span> <span style={{ color: '#8b949e', fontFamily: 'monospace' }}>{currentResult.registry_domain_id || 'NOT_AVAILABLE'}</span></div>
                  <div>
                    <span style={{ color: '#8b949e' }}>Registrant Org:</span>{' '}
                    {currentResult.registrant_org === 'REDACTED_FOR_PRIVACY' ? (
                      <span style={{ color: '#e3b341', background: 'rgba(227,179,65,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>🔒 REDACTED FOR PRIVACY</span>
                    ) : (
                      <span style={{ color: '#f0f6fc', fontWeight: 600 }}>{currentResult.registrant_org || 'NOT_AVAILABLE'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f6fc', marginTop: 0, marginBottom: '0.75rem' }}>
                  🌐 Authoritative Nameservers
                </h3>
                {currentResult.nameservers?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
                    {currentResult.nameservers.map((ns, idx) => (
                      <div key={idx} style={{ background: 'rgba(56,139,253,0.08)', border: '1px solid rgba(56,139,253,0.2)', color: '#58a6ff', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {ns}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>No nameservers found.</span>
                )}
              </div>
            </div>

            {/* Security Indicators */}
            {currentResult.security_indicators?.length > 0 && (
              <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e3b341', marginTop: 0, marginBottom: '0.75rem' }}>
                  ⚠️ Security Observations ({currentResult.security_indicators.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {currentResult.security_indicators.map((ind, idx) => (
                    <div key={idx} style={{ borderLeft: '3px solid #e3b341', background: 'rgba(22, 27, 34, 0.6)', padding: '0.6rem 0.85rem', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '0.85rem' }}>{ind.type}</div>
                      <div style={{ color: '#8b949e', fontSize: '0.8rem' }}>{ind.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <div>
              <button
                onClick={() => setShowJson(!showJson)}
                style={{
                  background: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#8b949e',
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer'
                }}
              >
                {showJson ? '▲ Hide Structured Evidence' : '▼ View Structured SOC Evidence'}
              </button>
              {showJson && (
                <pre style={{
                  background: '#010409',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#7ee787',
                  fontSize: '0.78rem',
                  overflowX: 'auto',
                  marginTop: '0.75rem',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(currentResult.structured_evidence || currentResult, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Scan History Table */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f0f6fc', margin: 0 }}>
              📜 Your WHOIS Lookup History
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter domains..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <select
                value={filterAge}
                onChange={(e) => setFilterAge(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Ages</option>
                <option value="NEW">New (&lt; 90d)</option>
                <option value="YOUNG">Young (90d-1y)</option>
                <option value="ESTABLISHED">Established</option>
                <option value="LEGACY">Legacy (&gt; 10y)</option>
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>Loading WHOIS history...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', fontSize: '0.9rem' }}>
              No domain lookups recorded yet. Enter a domain above to perform your first query.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.75rem' }}>Domain</th>
                    <th style={{ padding: '0.75rem' }}>Registrar</th>
                    <th style={{ padding: '0.75rem' }}>Age Category</th>
                    <th style={{ padding: '0.75rem' }}>Expires In</th>
                    <th style={{ padding: '0.75rem' }}>DNSSEC</th>
                    <th style={{ padding: '0.75rem' }}>Threat Score</th>
                    <th style={{ padding: '0.75rem' }}>Queried At</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(row => {
                    const ageBadge = AGE_BADGE_STYLES[row.age_category] || AGE_BADGE_STYLES.UNKNOWN;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#f0f6fc' }}>{row.domain}</td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>{row.registrar}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: ageBadge.color, background: ageBadge.bg, border: `1px solid ${ageBadge.border}`, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {row.age_category}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: (row.days_until_expiration ?? 0) <= 0 ? '#f85149' : (row.days_until_expiration ?? 0) <= 30 ? '#e3b341' : '#c9d1d9' }}>
                          {row.days_until_expiration !== null ? `${row.days_until_expiration}d` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: row.dnssec === 'SIGNED' ? '#39d353' : '#8b949e' }}>
                          {row.dnssec}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: row.threat_score >= 75 ? '#f85149' : row.threat_score >= 50 ? '#e3b341' : '#39d353', fontWeight: 700 }}>
                            {row.threat_score}/100
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#8b949e' }}>
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => setCurrentResult(row)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #30363d',
                              borderRadius: '4px',
                              color: '#58a6ff',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
