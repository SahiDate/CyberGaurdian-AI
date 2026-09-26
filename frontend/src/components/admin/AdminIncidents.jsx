import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Flame, RotateCw, Search, CheckCircle, AlertTriangle, X, Plus } from 'lucide-react';
import { emitSecurityEvent } from '../../utils/securityEventBus';

const API = 'http://localhost:8000';

const STATUS_CONFIG = {
  OPEN:          { color: '#ef4444', label: 'Open' },
  INVESTIGATING: { color: '#f59e0b', label: 'Investigating' },
  CONTAINED:     { color: '#3b82f6', label: 'Contained' },
  RESOLVED:      { color: '#10b981', label: 'Resolved' },
  CLOSED:        { color: '#64748b', label: 'Closed' },
};

const SEV_CONFIG = {
  CRITICAL: { color: '#ef4444' },
  HIGH:     { color: '#f97316' },
  MEDIUM:   { color: '#f59e0b' },
  LOW:      { color: '#10b981' },
};

export default function AdminIncidents() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
  const location = useLocation();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => location.state?.selectedIncident || null);
  const [newStatus, setNewStatus] = useState(() => location.state?.selectedIncident?.status || '');
  const [notes, setNotes] = useState(() => location.state?.selectedIncident?.resolution_notes || '');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState(null);

  // New Incident Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState('HIGH');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Handle URL query parameter ?id=... from Notification Bell click or navigation state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get('id') || (location.state?.selectedIncident ? String(location.state.selectedIncident.id) : null);
    if (targetId) {
      const match = incidents.find(i => String(i.id) === String(targetId)) || location.state?.selectedIncident;
      if (match) {
        setSelected(match);
        setNewStatus(match.status);
        setNotes(match.resolution_notes || '');
        // Clear status filter and search so target incident is always visible in the table
        setStatusFilter('ALL');
        setSearch('');

        // Smooth scroll and focus highlight
        setTimeout(() => {
          const rowEl = document.getElementById(`incident-row-${match.id}`);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            rowEl.style.transition = 'outline 0.3s ease, background-color 0.3s ease';
            rowEl.style.outline = '2px solid #6366f1';
            setTimeout(() => {
              if (rowEl) rowEl.style.outline = 'none';
            }, 2500);
          }
          const panelEl = document.getElementById('incident-details-panel');
          if (panelEl && window.innerWidth <= 1024) {
            panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    }
  }, [location.search, location.state, incidents]);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API}/api/admin/incidents/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/admin/incidents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          severity: newSeverity,
          description: newDesc.trim(),
          status: 'OPEN'
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMsg(`Incident #${created.id} created successfully.`);
        emitSecurityEvent('INCIDENT_CREATED', created);
        setNewTitle('');
        setNewDesc('');
        setCreateModalOpen(false);
        await fetchIncidents();
        setSelected(created);
        setTimeout(() => setMsg(null), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API}/api/admin/incidents/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTokens?.access}`,
        },
        body: JSON.stringify({ status: newStatus || selected?.status, notes: notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMsg(`Incident #${id} updated successfully.`);
        emitSecurityEvent('INCIDENT_UPDATED', { id, status: newStatus || selected?.status });
        fetchIncidents();
        setSelected(updated);
        setNotes('');
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = incidents.filter(i => {
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
    const matchSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = incidents.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--admin-text-main, #0f172a)',
              letterSpacing: '-0.02em'
            }}>
              Incident Management
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Track, update, and resolve platform security incidents.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.55rem 1rem',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} />
              <span>New Incident</span>
            </button>
            <button onClick={fetchIncidents} className="admin-btn-secondary">
              <RotateCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            color: '#10b981',
            marginBottom: '1.25rem',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}>
            {msg}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'].map(s => {
            const active = statusFilter === s;
            const cnt = s === 'ALL' ? incidents.length : statusCounts[s] || 0;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`admin-pill-btn ${active ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  backgroundColor: active ? '#6366f1' : (isDark ? '#1e293b' : '#ffffff'),
                  color: active ? '#ffffff' : 'var(--admin-text-muted, #64748b)',
                  border: `1px solid ${active ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')}`,
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {s} ({cnt})
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1.5fr 1fr' : '1fr', gap: '1.25rem' }}>
          {/* Incidents Table Card */}
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem', position: 'relative', maxWidth: '360px' }}>
              <input
                type="text"
                placeholder="Search incidents by title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 1rem 0.55rem 2.4rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {loading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>Loading incidents...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>No incidents found.</div>
            ) : (
              <div className="table-responsive-container" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>TITLE</th>
                      <th>SEVERITY</th>
                      <th>STATUS</th>
                      <th>CREATED</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inc => {
                      const sev = SEV_CONFIG[inc.severity] || { color: '#64748b' };
                      const st = STATUS_CONFIG[inc.status] || { color: '#64748b' };
                      const isRowSelected = selected?.id === inc.id;

                      return (
                        <tr
                          key={inc.id}
                          id={`incident-row-${inc.id}`}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isRowSelected ? (isDark ? 'rgba(99, 102, 241, 0.12)' : '#eef2ff') : 'transparent',
                            borderLeft: isRowSelected ? '4px solid #6366f1' : '4px solid transparent',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            setSelected(inc);
                            setNewStatus(inc.status);
                            setNotes(inc.resolution_notes || '');
                          }}
                        >
                          <td style={{ fontWeight: 600, color: 'var(--admin-text-muted, #64748b)' }}>#{inc.id}</td>
                          <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>{inc.title}</td>
                          <td>
                            <span style={{
                              padding: '2px 9px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: `${sev.color}15`,
                              color: sev.color,
                              border: `1px solid ${sev.color}35`,
                              display: 'inline-block'
                            }}>
                              {inc.severity}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 9px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: `${st.color}15`,
                              color: st.color,
                              border: `1px solid ${st.color}35`,
                              display: 'inline-block'
                            }}>
                              {inc.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--admin-text-muted, #64748b)', fontSize: '0.78rem' }}>
                            {new Date(inc.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.75rem' }}>
                            View ›
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Incident Details & Resolution Panel */}
          {selected && (
            <div id="incident-details-panel" className="admin-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)' }}>
                  Incident #{selected.id}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', marginBottom: '0.35rem' }}>
                  {selected.title}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted, #64748b)', lineHeight: 1.5 }}>
                  {selected.description || 'No description provided.'}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Update Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="CONTAINED">CONTAINED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Resolution Notes
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Document investigation steps or remediation details..."
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <button
                onClick={() => handleUpdate(selected.id)}
                disabled={updating}
                className="admin-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {updating ? 'Updating...' : 'Save Incident State'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Incident Modal */}
      {createModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderRadius: '14px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.25rem',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Create Security Incident
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#94a3b8' : '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateIncident} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.4rem' }}>
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suspicious Brute-Force Auth on Admin Gateway"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.4rem' }}>
                  Severity Level
                </label>
                <select
                  value={newSeverity}
                  onChange={e => setNewSeverity(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.4rem' }}>
                  Description / Investigation Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide context, impacted resources, or telemetry alerts..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="admin-btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={creating}
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                >
                  {creating ? 'Dispatching...' : 'Dispatch Incident Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminSidebar>
  );
}
