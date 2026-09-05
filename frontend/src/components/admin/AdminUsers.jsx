import React, { useState, useEffect, useContext } from 'react';
import AdminSidebar from '../shared/AdminSidebar';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Users, Search, RotateCw, X, Shield, Eye, Trash2 } from 'lucide-react';

export default function AdminUsers() {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();
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
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Page Header */}
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
              User Management
            </h1>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--admin-text-muted, #64748b)'
            }}>
              Inspect registered accounts, update roles, and manage permissions.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={fetchUsers} className="admin-btn-secondary" title="Refresh Users">
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

        {/* Card Container */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          {/* Search Bar */}
          <div style={{ marginBottom: '1.25rem', position: 'relative', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Loading users list...</p>
          ) : filteredUsers.length > 0 ? (
            <div className="table-responsive-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>USERNAME</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-muted, #64748b)' }}>#{u.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main, #0f172a)' }}>{u.username}</td>
                      <td style={{ color: 'var(--admin-text-muted, #64748b)' }}>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          style={{
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SOC_ANALYST">SOC_ANALYST</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={u.status}
                          onChange={(e) => handleUpdateStatus(u.id, e.target.value)}
                          style={{
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                        </select>
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          className="admin-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#64748b', margin: 0, textAlign: 'center', padding: '2rem 0' }}>No users found matching query.</p>
          )}
        </div>

        {/* User Inspection Modal */}
        {selectedUserDetail && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
          }}>
            <div className="admin-card" style={{
              maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
              padding: '2rem', borderRadius: '16px',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)' }}>
                  User Details: #{selectedUserDetail.user.id} {selectedUserDetail.user.username}
                </h2>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#64748b' }}>Email:</span> <strong style={{ color: 'var(--admin-text-main, #0f172a)' }}>{selectedUserDetail.user.email}</strong></div>
                <div><span style={{ color: '#64748b' }}>Role:</span> <strong style={{ color: 'var(--admin-text-main, #0f172a)' }}>{selectedUserDetail.user.role}</strong></div>
                <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: 'var(--admin-text-main, #0f172a)' }}>{selectedUserDetail.user.status}</strong></div>
                <div><span style={{ color: '#64748b' }}>Joined:</span> <strong style={{ color: 'var(--admin-text-main, #0f172a)' }}>{new Date(selectedUserDetail.user.created_at).toLocaleString()}</strong></div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '1.5rem 0 0.75rem', color: 'var(--admin-text-main, #0f172a)' }}>
                User Isolated Records
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#6366f1' }}>{selectedUserDetail.scans.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Scans</div>
                </div>
                <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981' }}>{selectedUserDetail.reports.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Reports</div>
                </div>
                <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b' }}>{selectedUserDetail.threats.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Threats</div>
                </div>
                <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444' }}>{selectedUserDetail.incidents.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>Incidents</div>
                </div>
              </div>

              {selectedUserDetail.scans.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--admin-text-main, #0f172a)', fontWeight: 700 }}>Recent User Scans</h4>
                  <ul style={{ fontSize: '0.82rem', color: '#64748b', paddingLeft: '1.2rem', margin: 0 }}>
                    {selectedUserDetail.scans.slice(0, 5).map((s, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--admin-text-main, #0f172a)', fontWeight: 600 }}>{s.domain}</span> — Score: {s.security_score}/100 ({s.risk_level_display})
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
