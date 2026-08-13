import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

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

  useEffect(() => { fetchIncidents(); }, []);

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
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>🔥 Incident Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
            Track, update, and investigate security incidents across the platform.
          </p>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['ALL', 'OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'].map(s => {
            const cfg = STATUS_CONFIG[s] || { color: '#fff', bg: 'rgba(255,255,255,0.08)' };
            const active = statusFilter === s;
            const cnt = s === 'ALL' ? incidents.length : statusCounts[s] || 0;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '0.4rem 0.9rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.75rem',
                background: active ? (cfg.color || '#388bfd') : 'rgba(255,255,255,0.05)',
                color: active ? '#fff' : (cfg.color || 'rgba(255,255,255,0.5)'),
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
          style={{ width: '100%', maxWidth: '400px', marginBottom: '1.25rem', padding: '0.6rem 0.9rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: selected ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '1.25rem' }}>
          {/* Table */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading incidents...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No incidents found.</div>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '550px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {['ID', 'Title', 'Severity', 'Status', 'Created', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => (
                    <tr
                      key={inc.id}
                      onClick={() => { setSelected(inc); setNewStatus(''); setNotes(''); }}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: selected?.id === inc.id ? 'rgba(56,139,253,0.08)' : 'transparent' }}
                    >
                      <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>#{inc.id}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{inc.title}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: SEV_CONFIG[inc.severity] || '#8b949e', fontWeight: 700, fontSize: '0.78rem' }}>{inc.severity}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusBadge s={inc.status} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{new Date(inc.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#388bfd' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Incident #{selected.id}</h3>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{selected.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <StatusBadge s={selected.status} />
                  <span style={{ color: SEV_CONFIG[selected.severity] || '#8b949e', fontWeight: 700, fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '0.18rem 0.55rem', borderRadius: '4px' }}>{selected.severity}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px' }}>
                  {selected.description || 'No description.'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Update Incident</h4>

                {msg && <div style={{ color: '#39d353', fontSize: '0.8rem', marginBottom: '0.75rem', background: 'rgba(57,211,83,0.1)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>{msg}</div>}

                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: newStatus ? '#fff' : 'rgba(255,255,255,0.4)', borderRadius: '7px', marginBottom: '0.75rem', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">— Change Status —</option>
                  {['OPEN','INVESTIGATING','CONTAINED','RESOLVED','CLOSED'].map(s => <option key={s} value={s} style={{ background: '#0d1117' }}>{s}</option>)}
                </select>

                <textarea
                  placeholder="Add investigation notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '7px', fontSize: '0.83rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                />

                <button
                  onClick={handleUpdate}
                  disabled={updating || (!newStatus && !notes)}
                  style={{
                    width: '100%', padding: '0.65rem', background: 'linear-gradient(135deg, #1f6feb, #388bfd)',
                    border: 'none', color: '#fff', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                    opacity: (!newStatus && !notes) ? 0.4 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {updating ? 'Updating...' : '✓ Update Incident'}
                </button>
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                Created: {new Date(selected.created_at).toLocaleString()}<br />
                Updated: {new Date(selected.updated_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          {filtered.length} of {incidents.length} incidents shown
        </div>
      </div>
    </AdminSidebar>
  );
}
