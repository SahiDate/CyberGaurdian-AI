import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';

export default function AdminUsers() {
  const { authTokens } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/users/', {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setMsg(`Role updated for user.`);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens?.access}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setMsg(`Status updated for user.`);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        setMsg(`User deleted.`);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete user.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleInspectUser = async (userId) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/`, {
        headers: { 'Authorization': `Bearer ${authTokens?.access}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUserDetail(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ maxWidth: '1200px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', fontWeight: 800 }}>👥 User Management</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Inspect registered accounts, update roles (`USER` / `ADMIN`), modify account statuses (`ACTIVE` / `INACTIVE` / `SUSPENDED`).
            </p>
          </div>
        </div>

        {msg && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', background: 'rgba(57,211,83,0.1)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(57,211,83,0.3)', fontWeight: 600 }}>{msg}</div>}

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-panel"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '10px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Loading users list...</p>
          ) : filteredUsers.length > 0 ? (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '650px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--panel-bg)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>ID</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Username</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Role</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>#{u.id}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{u.username}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          className="glass-panel"
                          style={{
                            background: u.role === 'ADMIN' ? 'rgba(248,81,73,0.15)' : 'rgba(56,139,253,0.15)',
                            color: u.role === 'ADMIN' ? 'var(--danger-color)' : 'var(--accent-color)',
                            border: `1px solid ${u.role === 'ADMIN' ? 'var(--danger-color)' : 'var(--accent-color)'}`,
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SOC_ANALYST">SOC_ANALYST</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={u.status}
                          onChange={(e) => handleUpdateStatus(u.id, e.target.value)}
                          className="glass-panel"
                          style={{
                            background: u.status === 'ACTIVE' ? 'rgba(57,211,83,0.15)' : 'rgba(248,81,73,0.15)',
                            color: u.status === 'ACTIVE' ? 'var(--success-color)' : 'var(--danger-color)',
                            border: `1px solid ${u.status === 'ACTIVE' ? 'var(--success-color)' : 'var(--danger-color)'}`,
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          className="glass-panel"
                          style={{
                            background: 'rgba(56,139,253,0.15)',
                            border: '1px solid var(--accent-color)',
                            color: 'var(--accent-color)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.78rem'
                          }}
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="glass-panel"
                          style={{
                            background: 'rgba(248,81,73,0.15)',
                            border: '1px solid var(--danger-color)',
                            color: 'var(--danger-color)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.78rem'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '2rem 0' }}>No users found matching query.</p>
          )}
        </div>

        {/* Selected User Inspection Modal */}
        {selectedUserDetail && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
              padding: '2rem', borderRadius: '16px', border: '1px solid var(--accent-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '1.3rem', fontWeight: 800 }}>
                  👤 User Details: #{selectedUserDetail.user.id} {selectedUserDetail.user.username}
                </h2>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{selectedUserDetail.user.email}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Role:</span> <strong>{selectedUserDetail.user.role}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong>{selectedUserDetail.user.status}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Joined:</span> <strong>{new Date(selectedUserDetail.user.created_at).toLocaleString()}</strong></div>
              </div>

              <h3 style={{ color: 'var(--accent-color)', fontSize: '1.05rem', fontWeight: 700, margin: '1.5rem 0 0.5rem' }}>📊 User Isolated Records</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-color)' }}>{selectedUserDetail.scans.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Scans</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success-color)' }}>{selectedUserDetail.reports.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Reports</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning-color)' }}>{selectedUserDetail.threats.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Threat Findings</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger-color)' }}>{selectedUserDetail.incidents.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Incidents</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a371f7' }}>{selectedUserDetail.file_analyses.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>File Analyses</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-color)' }}>{selectedUserDetail.ai_activities.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>AI Activity Logs</div>
                </div>
              </div>

              {selectedUserDetail.scans.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>Recent User Scans</h4>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', margin: 0 }}>
                    {selectedUserDetail.scans.slice(0, 5).map((s, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{s.domain}</span> — Score: {s.security_score}/100 ({s.risk_level_display})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
