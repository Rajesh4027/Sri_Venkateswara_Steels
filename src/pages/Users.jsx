import { useState, useMemo } from 'react';
import Ic from '../components/Icon';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export default function Users({ users, setUsers, currentUser, toast }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Delete safety state with 6-digit code
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');

  // Password visibility map for table rows: { [userId]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Form state for Add / Edit
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'Store Manager',
    active: true
  });

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.trim().toLowerCase();
      const matchQuery = !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q);

      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All' ||
        (statusFilter === 'Active' ? u.active !== false : u.active === false);

      return matchQuery && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.active !== false).length;
    const admins = users.filter(u => u.role === 'Admin').length;
    const staff = users.filter(u => u.role !== 'Admin').length;
    return { total, active, admins, staff };
  }, [users]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setForm({
      name: '',
      username: '',
      password: '123',
      email: '',
      phone: '',
      role: 'Store Manager',
      active: true
    });
    setShowModalPassword(false);
    setShowAddModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || '',
      username: u.username || '',
      password: u.password || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'Store Manager',
      active: u.active !== false
    });
    setShowModalPassword(false);
  };

  // Save Add
  const handleSaveAdd = () => {
    if (!form.name.trim()) {
      toast('Please enter Full Name');
      return;
    }
    const cleanUser = form.username.trim().toLowerCase();
    if (!cleanUser) {
      toast('Please enter a Username');
      return;
    }
    if (users.some(u => (u.username || '').toLowerCase() === cleanUser)) {
      toast('This username already exists. Choose another.');
      return;
    }
    if (!form.password.trim()) {
      toast('Please set a Password for the user');
      return;
    }

    const newUser = {
      id: Date.now(),
      name: form.name.trim(),
      username: cleanUser,
      password: form.password.trim(),
      email: form.email.trim() || `${cleanUser}@svsteels.in`,
      phone: form.phone.trim() || '',
      role: form.role,
      active: form.active,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setUsers([...users, newUser]);
    setShowAddModal(false);
    toast(`User account "${newUser.name}" created successfully!`);
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editingUser) return;
    if (!form.name.trim()) {
      toast('Please enter Full Name');
      return;
    }
    const cleanUser = form.username.trim().toLowerCase();
    if (!cleanUser) {
      toast('Please enter a Username');
      return;
    }
    if (users.some(u => u.id !== editingUser.id && (u.username || '').toLowerCase() === cleanUser)) {
      toast('This username is taken by another account.');
      return;
    }
    if (!form.password.trim()) {
      toast('Password cannot be empty');
      return;
    }

    const updated = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: form.name.trim(),
          username: cleanUser,
          password: form.password.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          active: form.active
        };
      }
      return u;
    });

    setUsers(updated);
    setEditingUser(null);
    toast(`User "${form.name}" updated successfully!`);
  };

  // Quick Password Change
  const handleSavePasswordChange = () => {
    if (!passwordModalUser) return;
    if (!newPasswordValue.trim()) {
      toast('Please enter a new password');
      return;
    }

    setUsers(users.map(u => u.id === passwordModalUser.id ? { ...u, password: newPasswordValue.trim() } : u));
    setPasswordModalUser(null);
    setNewPasswordValue('');
    toast(`Password for @${passwordModalUser.username} updated!`);
  };

  // Toggle Status
  const handleToggleStatus = (u) => {
    if (currentUser && currentUser.id === u.id) {
      toast('Cannot disable your own active account!');
      return;
    }
    const nextStatus = !u.active;
    setUsers(users.map(item => item.id === u.id ? { ...item, active: nextStatus } : item));
    toast(`Account @${u.username} ${nextStatus ? 'Activated' : 'Disabled'}`);
  };

  // Trigger Delete with 6-digit random code
  const handleTriggerDelete = (u) => {
    if (currentUser && currentUser.id === u.id) {
      toast('Cannot delete the currently logged-in account!');
      return;
    }
    if (u.role === 'Admin' && stats.admins <= 1) {
      toast('Cannot delete the sole Administrator account!');
      return;
    }

    const randomCode = String(Math.floor(100000 + Math.random() * 900000));
    setDeleteCode(randomCode);
    setUserEnteredCode('');
    setDeleteConfirmUser(u);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    if (userEnteredCode.trim() !== deleteCode) {
      toast('Incorrect 6-digit code! Deletion cancelled.');
      return;
    }

    setUsers(users.filter(u => u.id !== deleteConfirmUser.id));
    toast(`User "${deleteConfirmUser.name}" deleted permanently.`);
    setDeleteConfirmUser(null);
    setDeleteCode('');
    setUserEnteredCode('');
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: res }));
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Admin':
        return { background: 'var(--navy)', color: 'var(--gold2)', border: '1px solid var(--navy2)' };
      case 'Store Manager':
      case 'Store':
        return { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' };
      case 'Billing Staff':
      case 'Billing':
        return { background: '#DBEAFE', color: '#1E40AF', border: '1px solid #93C5FD' };
      case 'Auditor':
        return { background: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE' };
      default:
        return { background: 'var(--steelbg)', color: 'var(--ink)', border: '1px solid var(--line)' };
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.02em' }}>
            {t('userPortalTitle')}
          </h2>
          <div style={{ fontSize: 13.5, color: 'var(--mut)', marginTop: 3 }}>
            {t('userPortalDesc')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn gold" onClick={handleOpenAdd}>
            <Ic n="plus" s={16} /> {t('addNewUserBtn')}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="four" style={{ gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <small className="mut">{t('totalUsersCount')}</small>
          <div className="stat-val" style={{ color: 'var(--navy)' }}>{stats.total}</div>
          <small className="mut">Registered accounts</small>
        </div>
        <div className="stat-card">
          <small className="mut">{t('activeUsersCount')}</small>
          <div className="stat-val" style={{ color: 'var(--grn)' }}>{stats.active}</div>
          <small className="mut">Ready to sign in</small>
        </div>
        <div className="stat-card">
          <small className="mut">{t('administratorsCount')}</small>
          <div className="stat-val" style={{ color: 'var(--gold)' }}>{stats.admins}</div>
          <small className="mut">Full system privileges</small>
        </div>
        <div className="stat-card">
          <small className="mut">{t('storeBillingStaffCount')}</small>
          <div className="stat-val" style={{ color: 'var(--blue)' }}>{stats.staff}</div>
          <small className="mut">Operational operators</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="tb" style={{ background: '#fff', padding: 14, borderRadius: 14, border: '1px solid var(--line)', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 11, top: 11, color: 'var(--mut)' }}>
            <Ic n="search" s={15} />
          </span>
          <input
            className="in"
            style={{ width: '100%', paddingLeft: 34 }}
            placeholder={t('searchUsersPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="in"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ fontWeight: 600 }}
        >
          <option value="All">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Store Manager">Store Manager</option>
          <option value="Billing Staff">Billing Staff</option>
          <option value="Auditor">Auditor</option>
        </select>

        <select
          className="in"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ fontWeight: 600 }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Disabled">Disabled Only</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 14, background: '#fff' }}>
        <table className="inward-table" style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th style={{ width: 230 }}>{t('colUserDetails')}</th>
              <th style={{ width: 140 }}>{t('colRole')}</th>
              <th style={{ width: 140 }}>{t('colUsername')}</th>
              <th style={{ width: 170 }}>{t('colPassword')}</th>
              <th style={{ width: 180 }}>{t('colContactInfo')}</th>
              <th style={{ width: 100 }}>{t('colUserStatus')}</th>
              <th style={{ width: 130, textAlign: 'center' }}>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mut)' }}>
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const isPasswordVisible = !!visiblePasswords[u.id];
                const isCurrent = currentUser && currentUser.id === u.id;

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: u.role === 'Admin' ? 'var(--navy)' : 'var(--steelbg)',
                          color: u.role === 'Admin' ? 'var(--gold)' : 'var(--navy)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 14,
                          fontWeight: 800,
                          flexShrink: 0,
                          border: '2px solid var(--line)'
                        }}>
                          {u.name ? u.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--navy)' }}>
                            {u.name} {isCurrent && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--mut)' }}>
                            Joined {u.createdAt || 'Jan 2024'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        ...getRoleBadgeStyle(u.role)
                      }}>
                        {u.role}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--navy)',
                        background: 'var(--steelbg)',
                        padding: '4px 8px',
                        borderRadius: 6
                      }}>
                        @{u.username}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 700,
                          color: isPasswordVisible ? 'var(--ink)' : 'var(--mut)',
                          background: isPasswordVisible ? '#FFFBEB' : '#F1F5F9',
                          padding: '4px 8px',
                          borderRadius: 6,
                          minWidth: 70,
                          textAlign: 'center'
                        }}>
                          {isPasswordVisible ? u.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          className="ib"
                          style={{ width: 28, height: 28 }}
                          onClick={() => togglePasswordVisibility(u.id)}
                          title={isPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                          <Ic n={isPasswordVisible ? 'eyeOff' : 'eye'} s={14} />
                        </button>
                        <button
                          type="button"
                          className="ib"
                          style={{ width: 28, height: 28, color: 'var(--navy)' }}
                          onClick={() => {
                            setPasswordModalUser(u);
                            setNewPasswordValue(u.password || '');
                          }}
                          title="Change password"
                        >
                          <Ic n="key" s={14} />
                        </button>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <div style={{ color: 'var(--ink)' }}>{u.email || '-'}</div>
                        {u.phone && <div style={{ color: 'var(--mut)', fontSize: 11.5 }}>📞 {u.phone}</div>}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer'
                        }}
                        title={u.active ? 'Click to disable' : 'Click to activate'}
                      >
                        <span className={`pill ${u.active !== false ? 'ok' : 'out'}`}>
                          {u.active !== false ? t('userActiveBadge') : t('userDisabledBadge')}
                        </span>
                      </button>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn sm"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User Details & Password"
                        >
                          <Ic n="edit" s={13} /> {t('editAction')}
                        </button>
                        <button
                          type="button"
                          className="btn sm red"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                          onClick={() => handleTriggerDelete(u)}
                          title="Delete User"
                        >
                          <Ic n="trash" s={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Add New User */}
      {showAddModal && (
        <Modal title="Add New User Account" subtitle="Create credentials and assign operator permissions" onClose={() => setShowAddModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field-group">
              <label className="field-label">Full Name *</label>
              <input
                className="in"
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">Username (For Login) *</label>
                <input
                  className="in"
                  placeholder="e.g. ramesh or store2"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                />
              </div>

              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="field-label">Password *</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--navy)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    onClick={generateRandomPassword}
                  >
                    Generate Random
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="in"
                    type={showModalPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ width: '100%', paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--mut)',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                  >
                    <Ic n={showModalPassword ? 'eyeOff' : 'eye'} s={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">Email Address</label>
                <input
                  className="in"
                  type="email"
                  placeholder="user@svsteels.in"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Phone Number</label>
                <input
                  className="in"
                  placeholder="e.g. 9842101234"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">Assigned Role *</label>
                <select
                  className="in"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Admin">Admin (Full Access &amp; Settings)</option>
                  <option value="Store Manager">Store Manager (Inward &amp; Stock)</option>
                  <option value="Billing Staff">Billing Staff (Issue Bills &amp; History)</option>
                  <option value="Auditor">Auditor (View Reports &amp; GST Only)</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Account Status</label>
                <select
                  className="in"
                  value={form.active ? '1' : '0'}
                  onChange={e => setForm({ ...form, active: e.target.value === '1' })}
                >
                  <option value="1">Active (Can Log In)</option>
                  <option value="0">Disabled (Access Blocked)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn pri" onClick={handleSaveAdd}>
                <Ic n="plus" s={15} /> Create User Account
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Edit User & Password */}
      {editingUser && (
        <Modal title={`Edit User: ${editingUser.name}`} subtitle={`Editing credentials for @${editingUser.username}`} onClose={() => setEditingUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field-group">
              <label className="field-label">Full Name *</label>
              <input
                className="in"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">Username (Editable) *</label>
                <input
                  className="in"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                />
              </div>

              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="field-label">Password (Editable) *</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--navy)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    onClick={generateRandomPassword}
                  >
                    Generate Random
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="in"
                    type={showModalPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ width: '100%', paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--mut)',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                  >
                    <Ic n={showModalPassword ? 'eyeOff' : 'eye'} s={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">Email Address</label>
                <input
                  className="in"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Phone Number</label>
                <input
                  className="in"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">Role</label>
                <select
                  className="in"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Admin">Admin</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Billing Staff">Billing Staff</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Status</label>
                <select
                  className="in"
                  value={form.active ? '1' : '0'}
                  onChange={e => setForm({ ...form, active: e.target.value === '1' })}
                >
                  <option value="1">Active</option>
                  <option value="0">Disabled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button type="button" className="btn pri" onClick={handleSaveEdit}>
                <Ic n="save" s={15} /> Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Quick Change Password */}
      {passwordModalUser && (
        <Modal title={`Change Password for ${passwordModalUser.name}`} subtitle={`Username: @${passwordModalUser.username}`} onClose={() => setPasswordModalUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field-group">
              <label className="field-label">New Password *</label>
              <input
                className="in"
                placeholder="Enter new password"
                value={newPasswordValue}
                onChange={e => setNewPasswordValue(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn" onClick={() => setPasswordModalUser(null)}>
                Cancel
              </button>
              <button type="button" className="btn pri" onClick={handleSavePasswordChange}>
                <Ic n="key" s={15} /> Update Password
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Delete Confirmation with 6-digit random code */}
      {deleteConfirmUser && (
        <Modal title="Confirm User Deletion" subtitle="This action cannot be undone" onClose={() => setDeleteConfirmUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: '#FDECEA',
              border: '1.5px solid #F87171',
              borderRadius: 12,
              padding: 14,
              color: '#991B1B',
              fontSize: 13.5
            }}>
              <b>Warning:</b> You are about to permanently delete operator <b>{deleteConfirmUser.name}</b> (@{deleteConfirmUser.username}).
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 14,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 4 }}>
                Enter this 6-digit verification code to confirm:
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: 'var(--navy)', fontFamily: 'monospace' }}>
                {deleteCode}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Type 6-digit code here *</label>
              <input
                className="in"
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: 3, fontWeight: 800 }}
                maxLength={6}
                placeholder="______"
                value={userEnteredCode}
                onChange={e => setUserEnteredCode(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn" onClick={() => setDeleteConfirmUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn red"
                disabled={userEnteredCode.trim() !== deleteCode}
                onClick={handleConfirmDelete}
              >
                <Ic n="trash" s={15} /> Permanently Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
