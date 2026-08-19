import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
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
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0d12', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
              🌐 SOC Platform WHOIS & Domain Intelligence
            </h1>
            <p style={{ color: '#8b949e', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Authoritative RDAP domain age tracking, newly registered domain telemetry, and registrar distribution.
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              color: '#c9d1d9',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            🔄 Refresh Analytics
          </button>
        </div>

        {/* Real DB Analytics Stats Cards */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Domain Lookups</div>
              <div style={{ color: '#f0f6fc', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.total_lookups}</div>
              <div style={{ color: '#58a6ff', fontSize: '0.75rem', marginTop: '0.25rem' }}>+{analytics.lookups_today} today</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>New Domains (&lt;90d)</div>
              <div style={{ color: '#e3b341', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.new_domains}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>High suspicion indicator</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Expired Domains</div>
              <div style={{ color: '#f85149', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expired_domains}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Domain takeover risk</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Expiring &lt; 30 Days</div>
              <div style={{ color: '#e3b341', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.expiring_soon}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Lapse monitoring</div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Privacy Protected</div>
              <div style={{ color: '#58a6ff', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{analytics.privacy_protected}</div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>Redacted registrant</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search domain, registrar, registrant, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 280px',
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '0.85rem'
            }}
          />

          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
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
            style={{
              padding: '0.5rem 0.75rem',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
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
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>Loading platform WHOIS telemetry...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>No WHOIS lookups match current criteria.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117', textAlign: 'left', color: '#8b949e' }}>
                    <th style={{ padding: '0.85rem' }}>User / Account</th>
                    <th style={{ padding: '0.85rem' }}>Domain</th>
                    <th style={{ padding: '0.85rem' }}>Registrar</th>
                    <th style={{ padding: '0.85rem' }}>Age Category</th>
                    <th style={{ padding: '0.85rem' }}>Expires In</th>
                    <th style={{ padding: '0.85rem' }}>DNSSEC</th>
                    <th style={{ padding: '0.85rem' }}>Threat Score</th>
                    <th style={{ padding: '0.85rem' }}>Queried At</th>
                    <th style={{ padding: '0.85rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const ageBadge = AGE_BADGE_STYLES[row.age_category] || AGE_BADGE_STYLES.UNKNOWN;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '0.85rem', color: '#58a6ff', fontWeight: 600 }}>
                          {row.username || `User #${row.user_id}`}
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 700, color: '#f0f6fc' }}>
                          {row.domain}
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.registrar}
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{ color: ageBadge.color, background: ageBadge.bg, border: `1px solid ${ageBadge.border}`, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {row.age_category}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem', color: (row.days_until_expiration ?? 0) <= 0 ? '#f85149' : (row.days_until_expiration ?? 0) <= 30 ? '#e3b341' : '#c9d1d9' }}>
                          {row.days_until_expiration !== null ? `${row.days_until_expiration}d` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.85rem', color: row.dnssec === 'SIGNED' ? '#39d353' : '#8b949e' }}>
                          {row.dnssec}
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 800, color: row.threat_score >= 75 ? '#f85149' : row.threat_score >= 50 ? '#e3b341' : '#39d353' }}>
                          {row.threat_score}/100
                        </td>
                        <td style={{ padding: '0.85rem', color: '#8b949e', fontSize: '0.78rem' }}>
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <button
                            onClick={() => setSelectedLookup(row)}
                            style={{
                              background: '#21262d',
                              border: '1px solid #30363d',
                              borderRadius: '4px',
                              color: '#58a6ff',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>
                    WHOIS Investigation: {selectedLookup.domain}
                  </h2>
                  <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    User: <span style={{ color: '#58a6ff' }}>{selectedLookup.username}</span> | Registrar: {selectedLookup.registrar}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLookup(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8b949e',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ color: '#8b949e' }}>Created Date:</div>
                  <div style={{ color: '#f0f6fc', fontWeight: 600 }}>{selectedLookup.created_date ? new Date(selectedLookup.created_date).toUTCString() : 'N/A'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>Expires Date:</div>
                  <div style={{ color: '#f0f6fc', fontWeight: 600 }}>{selectedLookup.expires_date ? new Date(selectedLookup.expires_date).toUTCString() : 'N/A'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>Updated Date:</div>
                  <div style={{ color: '#c9d1d9' }}>{selectedLookup.updated_date ? new Date(selectedLookup.updated_date).toUTCString() : 'N/A'}</div>
                </div>

                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ color: '#8b949e' }}>Registrant Org:</div>
                  <div style={{ color: '#58a6ff', fontWeight: 600 }}>{selectedLookup.registrant_org || 'NOT_AVAILABLE'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>Registrant Country:</div>
                  <div style={{ color: '#c9d1d9' }}>{selectedLookup.registrant_country || 'NOT_AVAILABLE'}</div>
                  <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>DNSSEC:</div>
                  <div style={{ color: selectedLookup.dnssec === 'SIGNED' ? '#39d353' : '#8b949e' }}>{selectedLookup.dnssec}</div>
                </div>
              </div>

              {/* Nameservers */}
              {selectedLookup.nameservers?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6fc', marginBottom: '0.5rem' }}>
                    Authoritative Nameservers ({selectedLookup.nameservers.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '100px', overflowY: 'auto' }}>
                    {selectedLookup.nameservers.map((ns, idx) => (
                      <div key={idx} style={{ background: '#0d1117', border: '1px solid #30363d', color: '#58a6ff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {ns}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Indicators */}
              {selectedLookup.security_indicators?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e3b341', marginBottom: '0.5rem' }}>
                    Security Indicators ({selectedLookup.security_indicators.length})
                  </div>
                  {selectedLookup.security_indicators.map((ind, idx) => (
                    <div key={idx} style={{ background: '#0d1117', borderLeft: '3px solid #e3b341', padding: '0.65rem 0.85rem', marginBottom: '0.5rem', borderRadius: '0 6px 6px 0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: '#f0f6fc' }}>{ind.type}</div>
                      <div style={{ color: '#8b949e' }}>{ind.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6fc', marginBottom: '0.5rem' }}>Structured SOC Evidence</div>
                <pre style={{ background: '#010409', border: '1px solid #30363d', borderRadius: '8px', padding: '1rem', color: '#7ee787', fontSize: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {JSON.stringify(selectedLookup.structured_evidence || selectedLookup, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
