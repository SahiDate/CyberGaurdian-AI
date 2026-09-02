import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';

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

export default function AdminWhois() {
  const { authTokens } = useContext(AuthContext);
  const [lookups, setLookups] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('ALL');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [selectedLookup, setSelectedLookup] = useState(null);

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/whois/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        }),
        fetch(`${API}/api/admin/whois/analytics/`, {
          headers: { Authorization: `Bearer ${authTokens?.access}` },
        })
      ]);

      if (listRes.ok) setLookups(await listRes.json());
      if (statsRes.ok) setAnalytics(await statsRes.json());
    } catch (e) {
      console.error("Error fetching admin WHOIS data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = lookups.filter(item => {
    const term = search.toLowerCase();
    const matchesSearch =
      (item.domain || '').toLowerCase().includes(term) ||
      (item.registrar || '').toLowerCase().includes(term) ||
      (item.registrant_org || '').toLowerCase().includes(term) ||
      (item.username || '').toLowerCase().includes(term);

    const matchesAge = ageFilter === 'ALL' || item.age_category === ageFilter;
    const matchesSev = sevFilter === 'ALL' || item.severity?.toUpperCase() === sevFilter;

    return matchesSearch && matchesAge && matchesSev;
  });

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              🌐 SOC Platform WHOIS & Domain Intelligence
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Authoritative RDAP domain age tracking, newly registered domain telemetry, and registrar distribution.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="glass-panel"
            style={{
              padding: '0.55rem 1.1rem',
              background: 'rgba(56,139,253,0.15)',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
          >
            🔄 Refresh Analytics
          </button>
        </div>

        {/* Real DB Analytics Stats Cards */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Domain Lookups</div>
              <div style={{ color: 'var(--text-main)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_lookups}</div>
              <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>+{analytics.lookups_today} today</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Domains (&lt;90d)</div>
              <div style={{ color: 'var(--warning-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.new_domains}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>High suspicion indicator</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--danger-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expired Domains</div>
              <div style={{ color: 'var(--danger-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expired_domains}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Domain takeover risk</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--warning-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expiring &lt; 30 Days</div>
              <div style={{ color: 'var(--warning-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expiring_soon}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Lapse monitoring</div>
            </div>

            <div className="glass-panel" style={{ borderLeft: '3.5px solid var(--accent-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Privacy Protected</div>
              <div style={{ color: 'var(--accent-color)', fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.privacy_protected}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Redacted registrant</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search domain, registrar, registrant, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-panel"
            style={{
              flex: '1 1 280px',
              padding: '0.65rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />

          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="glass-panel"
            style={{
              padding: '0.65rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Age Categories</option>
            <option value="NEW">New (&lt; 90d)</option>
            <option value="YOUNG">Young (90d-1y)</option>
            <option value="ESTABLISHED">Established</option>
            <option value="LEGACY">Legacy (&gt; 10y)</option>
          </select>

          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="glass-panel"
            style={{
              padding: '0.65rem 1rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Platform-wide Lookups Table */}
        <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>Loading platform WHOIS telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>No WHOIS lookups match current criteria.</div>
          ) : (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--panel-bg)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>User / Account</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Domain</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Registrar</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Age Category</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Expires In</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>DNSSEC</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Threat Score</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Queried At</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const ageBadge = AGE_BADGE_STYLES[row.age_category] || AGE_BADGE_STYLES.UNKNOWN;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                          {row.username || `User #${row.user_id}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {row.domain}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.registrar}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ color: ageBadge.color, background: ageBadge.bg, border: `1px solid ${ageBadge.border}`, padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.73rem', fontWeight: 700 }}>
                            {row.age_category}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: (row.days_until_expiration ?? 0) <= 0 ? 'var(--danger-color)' : (row.days_until_expiration ?? 0) <= 30 ? 'var(--warning-color)' : 'var(--text-main)', fontWeight: 600 }}>
                          {row.days_until_expiration !== null ? `${row.days_until_expiration}d` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: row.dnssec === 'SIGNED' ? 'var(--success-color)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {row.dnssec}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: row.threat_score >= 75 ? 'var(--danger-color)' : row.threat_score >= 50 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            onClick={() => setSelectedLookup(row)}
                            className="glass-panel"
                            style={{
                              background: 'rgba(56,139,253,0.15)',
                              border: '1px solid var(--accent-color)',
                              borderRadius: '6px',
                              color: 'var(--accent-color)',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 700
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

        {/* Modal Inspector */}
        {selectedLookup && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              border: '1px solid var(--accent-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    WHOIS Record: {selectedLookup.domain}
                  </h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{selectedLookup.username}</span> | Target: {selectedLookup.target}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLookup(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Registrar:</div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{selectedLookup.registrar || 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Registrant Organization:</div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedLookup.registrant_org || 'Privacy Protected / Redacted'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Country:</div>
                  <div style={{ color: 'var(--text-main)' }}>{selectedLookup.registrant_country || 'N/A'}</div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Created (Registration):</div>
                  <div style={{ color: 'var(--text-main)' }}>{selectedLookup.created_date ? new Date(selectedLookup.created_date).toUTCString() : 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Expires:</div>
                  <div style={{ color: 'var(--text-main)' }}>{selectedLookup.expires_date ? new Date(selectedLookup.expires_date).toUTCString() : 'N/A'}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Domain Age:</div>
                  <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>{selectedLookup.domain_age_days ? `${selectedLookup.domain_age_days} days` : 'N/A'}</div>
                </div>
              </div>

              {/* Nameservers */}
              {selectedLookup.nameservers?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Authoritative Nameservers ({selectedLookup.nameservers.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selectedLookup.nameservers.map((ns, idx) => (
                      <div key={idx} className="glass-panel" style={{ color: 'var(--accent-color)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {ns}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Indicators */}
              {selectedLookup.security_indicators?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--warning-color)', marginBottom: '0.5rem' }}>
                    Security Indicators ({selectedLookup.security_indicators.length})
                  </div>
                  {selectedLookup.security_indicators.map((ind, idx) => (
                    <div key={idx} className="glass-panel" style={{ borderLeft: '3.5px solid var(--warning-color)', padding: '0.75rem 1rem', marginBottom: '0.5rem', borderRadius: '0 8px 8px 0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ind.type}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>{ind.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Structured SOC Evidence</div>
                <pre className="glass-panel" style={{ borderRadius: '8px', padding: '1rem', color: 'var(--success-color)', fontSize: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {JSON.stringify(selectedLookup.structured_evidence || selectedLookup, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminSidebar>
  );
}
