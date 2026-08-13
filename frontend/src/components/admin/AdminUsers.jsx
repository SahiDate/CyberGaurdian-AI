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
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>👥 User Management</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Inspect registered accounts, update roles (`USER` / `ADMIN`), modify account statuses (`ACTIVE` / `INACTIVE` / `SUSPENDED`).
            </p>
          </div>
        </div>

        {msg && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', background: 'rgba(57,211,83,0.1)', padding: '0.75rem', borderRadius: '6px' }}>{msg}</div>}

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                borderRadius: '6px'
              }}
            />
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading users list...</p>
          ) : filteredUsers.length > 0 ? (
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '650px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.75rem' }}>Username</th>
                    <th style={{ padding: '0.75rem' }}>Email</th>
                    <th style={{ padding: '0.75rem' }}>Role</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem' }}>#{u.id}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{u.username}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          style={{
                            background: u.role === 'ADMIN' ? 'rgba(248,81,73,0.2)' : 'rgba(56,139,253,0.2)',
                            color: u.role === 'ADMIN' ? '#f85149' : '#388bfd',
                            border: '1px solid var(--border-color)',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="USER" style={{ background: '#121721', color: '#fff' }}>USER</option>
                          <option value="ADMIN" style={{ background: '#121721', color: '#fff' }}>ADMIN</option>
                          <option value="SOC_ANALYST" style={{ background: '#121721', color: '#fff' }}>SOC_ANALYST</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          value={u.status}
                          onChange={(e) => handleUpdateStatus(u.id, e.target.value)}
                          style={{
                            background: u.status === 'ACTIVE' ? 'rgba(57,211,83,0.2)' : 'rgba(248,81,73,0.2)',
                            color: u.status === 'ACTIVE' ? '#39d353' : '#f85149',
                            border: '1px solid var(--border-color)',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="ACTIVE" style={{ background: '#121721', color: '#fff' }}>ACTIVE</option>
                          <option value="INACTIVE" style={{ background: '#121721', color: '#fff' }}>INACTIVE</option>
                          <option value="SUSPENDED" style={{ background: '#121721', color: '#fff' }}>SUSPENDED</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          style={{
                            background: 'rgba(56,139,253,0.15)',
                            border: '1px solid #388bfd',
                            color: '#388bfd',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
                          }}
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{
                            background: 'rgba(248,81,73,0.15)',
                            border: '1px solid var(--danger-color)',
                            color: 'var(--danger-color)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
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
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No users found matching query.</p>
          )}
        </div>

        {/* Selected User Inspection Modal */}
        {selectedUserDetail && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="glass-panel" style={{
              maxWidth: '800px', width: '90%', maxHeight: '85vh', overflowY: 'auto',
              padding: '2rem', borderRadius: '12px', background: '#121721', border: '1px solid #388bfd'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#388bfd' }}>
                  👤 User Details: #{selectedUserDetail.user.id} {selectedUserDetail.user.username}
                </h2>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div><strong>Email:</strong> {selectedUserDetail.user.email}</div>
                <div><strong>Role:</strong> {selectedUserDetail.user.role}</div>
                <div><strong>Status:</strong> {selectedUserDetail.user.status}</div>
                <div><strong>Joined:</strong> {new Date(selectedUserDetail.user.created_at).toLocaleString()}</div>
              </div>

              <h3 style={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}>📊 User Isolated Records</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#388bfd' }}>{selectedUserDetail.scans.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scans</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#39d353' }}>{selectedUserDetail.reports.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reports</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e3b341' }}>{selectedUserDetail.threats.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Threat Findings</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f85149' }}>{selectedUserDetail.incidents.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incidents</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a371f7' }}>{selectedUserDetail.file_analyses.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>File Analyses</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#58a6ff' }}>{selectedUserDetail.ai_activities.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Activity Logs</div>
                </div>
              </div>

              {selectedUserDetail.scans.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Recent User Scans</h4>
                  <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    {selectedUserDetail.scans.slice(0, 5).map((s, idx) => (
                      <li key={idx}>{s.domain} — Score: {s.security_score}/100 ({s.risk_level_display})</li>
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
