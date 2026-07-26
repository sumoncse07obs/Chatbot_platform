import { useEffect, useState } from 'react';
import {
  AdminUser,
  changeAdminUserPassword,
  changeAdminUserRole,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '@/components/admin/module/user/api/userapi';
import { useToast } from '@/components/shared/toast/ToastProvider';
import type { Role } from '@/types';

type CreateUserForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  is_active: boolean;
};

const emptyCreateForm: CreateUserForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'user',
  is_active: true,
};

const inputClass =
  'min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const labelClass = 'grid gap-2 text-sm font-bold text-slate-700';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const darkButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-950 bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

export default function AdminUsersPage() {
  const toast = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadUsers(showSuccess = false) {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      setUsers(data);

      if (showSuccess) {
        toast.success('Users refreshed successfully.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser() {
    if (!createForm.email.trim()) {
      toast.error('Email is required.');
      return;
    }

    if (!createForm.password.trim()) {
      toast.error('Password is required.');
      return;
    }

    try {
      setCreating(true);

      await createAdminUser({
        first_name: createForm.first_name || null,
        last_name: createForm.last_name || null,
        email: createForm.email,
        phone: createForm.phone || null,
        password: createForm.password,
        role: createForm.role,
        is_active: createForm.is_active,
      });

      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      await loadUsers();
      toast.success('User created successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: number, role: Role) {
    try {
      await changeAdminUserRole(userId, role);
      await loadUsers();
      toast.success('User role updated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleToggleActive(user: AdminUser) {
    try {
      await updateAdminUser(user.id, {
        is_active: !user.is_active,
      });

      await loadUsers();
      toast.success(`User marked as ${user.is_active ? 'inactive' : 'active'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleSaveEdit() {
    if (!editingUser) return;

    try {
      setSavingEdit(true);

      await updateAdminUser(editingUser.id, {
        first_name: editingUser.first_name || null,
        last_name: editingUser.last_name || null,
        phone: editingUser.phone || null,
        is_active: editingUser.is_active,
      });

      setEditingUser(null);
      await loadUsers();
      toast.success('User updated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handlePasswordChange() {
    if (!passwordUser) return;

    if (newPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    try {
      setChangingPassword(true);

      await changeAdminUserPassword(passwordUser.id, newPassword);

      setPasswordUser(null);
      setNewPassword('');
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDelete(user: AdminUser) {
    if (user.role === 'admin') {
      toast.error('Admin users cannot be deleted.');
      return;
    }

    if (!confirm(`Delete ${user.email}?`)) return;

    try {
      await deleteAdminUser(user.id);
      await loadUsers();
      toast.success('User deleted successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Users</h2>
            <p className="mt-1 text-sm text-slate-500">{users.length} total users</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className={darkButtonClass} onClick={() => setShowCreateModal(true)}>
              + Add User
            </button>
            <button className={darkButtonClass} onClick={() => loadUsers(true)}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200 hover:bg-slate-50/80">
                    <td className="p-4 align-middle">
                      <strong className="block text-slate-950">
                        {user.first_name || ''} {user.last_name || ''}
                      </strong>
                      <small className="mt-1 block text-slate-500">ID: {user.id}</small>
                    </td>

                    <td className="p-4 align-middle text-slate-700">{user.email}</td>
                    <td className="p-4 align-middle text-slate-700">{user.phone || '-'}</td>

                    <td className="p-4 align-middle">
                      <select
                        className="min-h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-blue-500"
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.id, event.target.value as Role)}
                      >
                        <option value="admin">Admin</option>
                        <option value="customer">Customer</option>
                        <option value="user">User</option>
                      </select>
                    </td>

                    <td className="p-4 align-middle">
                      <button
                        className={`rounded-full px-3 py-2 text-xs font-black ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="p-4 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <button className={buttonClass} onClick={() => setEditingUser(user)}>
                          Edit
                        </button>
                        <button className={buttonClass} onClick={() => setPasswordUser(user)}>
                          Password
                        </button>
                        <button
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-950">Add User</h2>

            <div className="mt-5 grid gap-4">
              <label className={labelClass}>
                First Name
                <input
                  className={inputClass}
                  value={createForm.first_name}
                  onChange={(event) => setCreateForm({ ...createForm, first_name: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Last Name
                <input
                  className={inputClass}
                  value={createForm.last_name}
                  onChange={(event) => setCreateForm({ ...createForm, last_name: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Email
                <input
                  className={inputClass}
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Phone
                <input
                  className={inputClass}
                  value={createForm.phone}
                  onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Password
                <input
                  className={inputClass}
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Role
                <select
                  className={inputClass}
                  value={createForm.role}
                  onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}
                >
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                  <option value="user">User</option>
                </select>
              </label>

              <label className={labelClass}>
                Status
                <select
                  className={inputClass}
                  value={createForm.is_active ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      is_active: event.target.value === 'active',
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className={buttonClass}
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm(emptyCreateForm);
                }}
              >
                Cancel
              </button>
              <button className={darkButtonClass} onClick={handleCreateUser} disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-950">Edit User</h2>

            <div className="mt-5 grid gap-4">
              <label className={labelClass}>
                First Name
                <input
                  className={inputClass}
                  value={editingUser.first_name || ''}
                  onChange={(event) => setEditingUser({ ...editingUser, first_name: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Last Name
                <input
                  className={inputClass}
                  value={editingUser.last_name || ''}
                  onChange={(event) => setEditingUser({ ...editingUser, last_name: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Phone
                <input
                  className={inputClass}
                  value={editingUser.phone || ''}
                  onChange={(event) => setEditingUser({ ...editingUser, phone: event.target.value })}
                />
              </label>

              <label className={labelClass}>
                Status
                <select
                  className={inputClass}
                  value={editingUser.is_active ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEditingUser({
                      ...editingUser,
                      is_active: event.target.value === 'active',
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className={buttonClass} onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button className={darkButtonClass} onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-950">Change Password</h2>
            <p className="mt-1 text-sm text-slate-500">{passwordUser.email}</p>

            <label className={`${labelClass} mt-5`}>
              New Password
              <input
                className={inputClass}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className={buttonClass}
                onClick={() => {
                  setPasswordUser(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </button>
              <button className={darkButtonClass} onClick={handlePasswordChange} disabled={changingPassword}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
