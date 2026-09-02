import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { subscribeSecurityEvents } from '../../utils/securityEventBus';

const API = 'http://localhost:8000';

const STATUS_CONFIG = {
  OPEN:          { color: '#f85149', bg: 'rgba(248,81,73,0.12)',  label: 'OPEN' },
  INVESTIGATING: { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', label: 'INVESTIGATING' },
  CONTAINED:     { color: '#388bfd', bg: 'rgba(56,139,253,0.12)', label: 'CONTAINED' },
  RESOLVED:      { color: '#39d353', bg: 'rgba(57,211,83,0.12)',  label: 'RESOLVED' },
  CLOSED:        { color: '#8b949e', bg: 'rgba(139,148,158,0.12)',label: 'CLOSED' },
};

const SEV_CONFIG = {
  CRITICAL: '#f85149', HIGH: '#e3b341', MEDIUM: '#388bfd', LOW: '#39d353',
};

const StatusBadge = ({ s }) => {
  const c = STATUS_CONFIG[s] || STATUS_CONFIG.OPEN;
  return <span style={{ ...c, padding: '0.18rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>{c.label}</span>;
};

export default function AdminIncidents() {
  const { authTokens } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchIncidents();
    const unsubscribe = subscribeSecurityEvents(() => {
      fetchIncidents();
    });
    return () => unsubscribe();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API}/api/admin/incidents/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) setIncidents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!selected || (!newStatus && !notes)) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API}/api/admin/incidents/${selected.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authTokens?.access}` },
        body: JSON.stringify({ ...(newStatus && { status: newStatus }), ...(notes && { notes }) }),
      });
      if (res.ok) {
        const updated = await res.json();
        setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
        setSelected(updated);
        setMsg('Incident updated successfully.');
        setNewStatus('');
        setNotes('');
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  };

  const filtered = incidents.filter(i => {
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
    const matchSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = incidents.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1300px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>🔥 Incident Management</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Track, update, and investigate security incidents across the platform.
          </p>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['ALL', 'OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'].map(s => {
            const cfg = STATUS_CONFIG[s] || { color: 'var(--text-main)', bg: 'var(--input-bg)' };
            const active = statusFilter === s;
            const cnt = s === 'ALL' ? incidents.length : statusCounts[s] || 0;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className="glass-panel" style={{
                padding: '0.45rem 1rem', borderRadius: '20px', border: active ? `1px solid ${cfg.color || 'var(--accent-color)'}` : '1px solid var(--border-color)', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.75rem',
                background: active ? (cfg.color || 'var(--accent-color)') : 'var(--input-bg)',
                color: active ? '#fff' : (cfg.color || 'var(--text-muted)'),
                transition: 'all 0.15s',
              }}>
                {s} ({cnt})
              </button>
            );
          })}
        </div>

        <input
          placeholder="Search incidents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="glass-panel"
          style={{ width: '100%', maxWidth: '400px', marginBottom: '1.25rem', padding: '0.65rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: selected ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '1.25rem' }}>
          {/* Table */}
          <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {loading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading incidents...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No incidents found.</div>
            ) : (
              <div className="table-responsive-container" style={{ margin: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '550px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['ID', 'Title', 'Severity', 'Status', 'Created', ''].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => (
                    <tr
                      key={inc.id}
                      onClick={() => { setSelected(inc); setNewStatus(''); setNotes(''); }}
                      style={{ borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', background: selected?.id === inc.id ? 'rgba(56,139,253,0.08)' : 'transparent', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={e => { if (selected?.id !== inc.id) e.currentTarget.style.backgroundColor = 'rgba(88,166,255,0.05)'; }}
                      onMouseLeave={e => { if (selected?.id !== inc.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>#{inc.id}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{inc.title}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: SEV_CONFIG[inc.severity] || 'var(--text-muted)', fontWeight: 800, fontSize: '0.78rem' }}>{inc.severity}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}><StatusBadge s={inc.status} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(inc.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-color)', fontWeight: 800 }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="glass-panel" style={{ borderRadius: '14px', padding: '1.5rem', height: 'fit-content', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Incident #{selected.id}</h3>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{selected.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <StatusBadge s={selected.status} />
                  <span style={{ color: SEV_CONFIG[selected.severity] || 'var(--text-muted)', fontWeight: 800, fontSize: '0.78rem', background: 'rgba(56,139,253,0.1)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>{selected.severity}</span>
                </div>
                <div className="glass-panel" style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto', padding: '0.85rem', borderRadius: '8px' }}>
                  {selected.description || 'No description.'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 700 }}>Update Incident</h4>

                {msg && <div style={{ color: 'var(--success-color)', fontSize: '0.8rem', marginBottom: '0.75rem', background: 'rgba(57,211,83,0.1)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 600 }}>{msg}</div>}

                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: newStatus ? 'var(--text-main)' : 'var(--text-muted)', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">— Change Status —</option>
                  {['OPEN','INVESTIGATING','CONTAINED','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <textarea
                  placeholder="Add investigation notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                />

                <button
                  onClick={handleUpdate}
                  disabled={updating || (!newStatus && !notes)}
                  className="glass-panel"
                  style={{
                    width: '100%', padding: '0.7rem', background: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)', color: '#fff', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                    opacity: (!newStatus && !notes) ? 0.4 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {updating ? 'Updating...' : '✓ Update Incident'}
                </button>
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Created: {new Date(selected.created_at).toLocaleString()}<br />
                Updated: {new Date(selected.updated_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filtered.length} of {incidents.length} incidents shown
        </div>
      </div>
    </AdminSidebar>
  );
}
