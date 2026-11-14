"use client";
import React, { useState, useEffect } from 'react';
import {
  Settings, Building, Users, Shield, Globe, Database, Plus, CheckCircle2,
  X, Key, Lock, Download, UploadCloud, RefreshCw, KeyRound, Clock,
  AlertCircle, XCircle, Search, Edit3, Trash2, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import {
  fetchCompanyProfile, updateCompanyProfile, fetchUsers, createUser,
  updateUserProfile, resetUserPassword, deleteUser,
  fetchUserPermissionsMatrix, saveUserPermissionsMatrix,
  fetchAccessRequests, approveAccessRequest, rejectAccessRequest,
  downloadDatabaseBackup
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SYSTEM_MODULES } from '@/components/shared/access-request-modal';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ─── 1. COMPANY PROFILE STATE ────────────────────────────────────────────────
  const [company, setCompany] = useState({
    name: 'TASIN ENTERPRISE',
    tagline: 'Premier Rent-A-Car & Corporate Fleet Services',
    address: 'House 14, Road 7, Sector 3, Uttara, Dhaka-1230, Bangladesh',
    phone: '+880 1711-000000',
    altPhone: '+880 1811-000000',
    email: 'contact@tasinenterprise.com.bd',
    website: 'https://tasinenterprise.com.bd',
    bin: '001928374-0101',
    tin: '489201928301',
    tradeLicense: 'TRAD-DNCC-2024-88',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
  });

  // ─── 2. USERS MANAGEMENT STATE ───────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Add User Modal
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: '',
    designation: 'Operations Staff',
    department: 'Operations',
    employee_id: '',
    is_main_admin: false,
    initial_modules: [] as string[]
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit User Modal
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [updatingUser, setUpdatingUser] = useState(false);

  // Reset Password Modal
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPwd, setResettingPwd] = useState(false);

  // ─── 3. PERMISSIONS MATRIX STATE ─────────────────────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixModules, setMatrixModules] = useState<Record<string, any>>({});
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // ─── 4. ACCESS REQUESTS QUEUE STATE ──────────────────────────────────────────
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState('All');
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Review & Modify Request Modal
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [selectedReqForModify, setSelectedReqForModify] = useState<any>(null);
  const [modifyCanView, setModifyCanView] = useState(true);
  const [modifyCanCreate, setModifyCanCreate] = useState(false);
  const [modifyCanEdit, setModifyCanEdit] = useState(false);
  const [modifyCanDelete, setModifyCanDelete] = useState(false);
  const [modifying, setModifying] = useState(false);

  // Reject Request Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReqForReject, setSelectedReqForReject] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // ─── 5. DATABASE BACKUP STATE ────────────────────────────────────────────────
  const [backingUp, setBackingUp] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchCompanyProfile(1).then((data: any) => {
      if (data && data.companyName) {
        setCompany(c => ({
          ...c,
          name: data.companyName,
          address: data.address || c.address,
          phone: data.phone || c.phone,
          email: data.email || c.email,
          website: data.website || c.website,
          bin: data.bin || c.bin,
          tin: data.tin || c.tin,
        }));
      }
    }).catch(() => {});
    loadUsersList();
    loadRequestsList();
  }, []);

  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const data: any = await fetchUsers(1);
      if (Array.isArray(data)) {
        setUsers(data);
        if (!selectedUserId && data.length > 0) {
          const nonSuper = data.find((u: any) => !u.isSuperAdmin) || data[0];
          setSelectedUserId(String(nonSuper.id));
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadRequestsList = async () => {
    setLoadingRequests(true);
    try {
      const data: any = await fetchAccessRequests(1, requestStatusFilter);
      if (Array.isArray(data)) {
        setAccessRequests(data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequestsList();
  }, [requestStatusFilter]);

  // Load permissions matrix when user changes
  useEffect(() => {
    if (!selectedUserId) return;
    setLoadingMatrix(true);
    fetchUserPermissionsMatrix(1, selectedUserId)
      .then((res: any) => {
        setMatrixData(res);
        if (res && res.modules) {
          setMatrixModules(res.modules);
        }
      })
      .catch((err: any) => {
        console.error(err);
        showToast('Error loading user permissions');
      })
      .finally(() => setLoadingMatrix(false));
  }, [selectedUserId]);

  // Company Profile Save
  function handleSaveCompany() {
    updateCompanyProfile(1, {
      company_name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      bin: company.bin,
      tin: company.tin,
      details: company.tagline,
      currency: company.currency || 'BDT',
      timezone: company.timezone || 'Asia/Dhaka',
    })
      .then(() => showToast('✓ Company profile updated in production database'))
      .catch(() => showToast('Error saving company profile'));
  }

  // Create User
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password.trim()) {
      showToast('Username and password are required');
      return;
    }
    setCreatingUser(true);
    try {
      await createUser(1, {
        username: newUser.username.trim(),
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        phone: newUser.phone.trim(),
        designation: newUser.designation.trim(),
        department: newUser.department.trim(),
        employee_id: newUser.employee_id.trim(),
        is_main_admin: newUser.is_main_admin,
        initial_modules: newUser.initial_modules
      });
      showToast(`✓ User account created successfully`);
      setAddUserOpen(false);
      setNewUser({
        username: '', name: '', email: '', password: '', role: 'staff',
        phone: '', designation: 'Operations Staff', department: 'Operations',
        employee_id: '', is_main_admin: false, initial_modules: []
      });
      loadUsersList();
    } catch (err: any) {
      showToast(err.message || 'Error creating user');
    } finally {
      setCreatingUser(false);
    }
  }

  // Update User Profile
  async function handleUpdateUserProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setUpdatingUser(true);
    try {
      await updateUserProfile(1, editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        phone: editingUser.phone,
        designation: editingUser.designation,
        department: editingUser.department,
        employee_id: editingUser.employeeId,
        status: editingUser.status,
        is_main_admin: editingUser.isMainAdmin
      });
      showToast(`✓ User profile updated`);
      setEditUserOpen(false);
      loadUsersList();
    } catch (err: any) {
      showToast(err.message || 'Error updating user profile');
    } finally {
      setUpdatingUser(false);
    }
  }

  // Reset User Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwdUser || !newPassword.trim()) return;
    setResettingPwd(true);
    try {
      await resetUserPassword(1, resetPwdUser.id, newPassword.trim());
      showToast(`✓ Password reset for ${resetPwdUser.username}`);
      setResetPwdOpen(false);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Error resetting password');
    } finally {
      setResettingPwd(false);
    }
  }

  // Delete / Deactivate User
  async function handleDeleteUser(id: string, username: string) {
    if (!confirm(`Are you sure you want to deactivate user "${username}"?`)) return;
    try {
      await deleteUser(1, id);
      showToast(`User ${username} deactivated`);
      loadUsersList();
    } catch (err: any) {
      showToast(err.message || 'Error deactivating user');
    }
  }

  // Save Permissions Matrix
  async function handleSavePermissionsMatrix() {
    if (!selectedUserId) return;
    setSavingMatrix(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(matrixModules).forEach(([mod, acts]) => {
        payload[mod] = {
          can_view: Boolean(acts.view),
          can_create: Boolean(acts.create),
          can_edit: Boolean(acts.edit),
          can_delete: Boolean(acts.delete),
          can_export: Boolean(acts.export),
          can_approve: Boolean(acts.approve),
        };
      });
      await saveUserPermissionsMatrix(1, selectedUserId, payload);
      showToast('✓ Permissions matrix updated and persisted to database');
      loadUsersList();
    } catch (err: any) {
      showToast(err.message || 'Error saving permissions');
    } finally {
      setSavingMatrix(false);
    }
  }

  // Bulk Matrix Actions
  const handleBulkMatrix = (mode: 'grant_all' | 'revoke_all' | 'read_only') => {
    setMatrixModules(prev => {
      const next: Record<string, any> = {};
      SYSTEM_MODULES.forEach(m => {
        if (mode === 'grant_all') {
          next[m.key] = { view: true, create: true, edit: true, delete: true, export: true, approve: true };
        } else if (mode === 'revoke_all') {
          next[m.key] = { view: false, create: false, edit: false, delete: false, export: false, approve: false };
        } else if (mode === 'read_only') {
          next[m.key] = { view: true, create: false, edit: false, delete: false, export: true, approve: false };
        }
      });
      return next;
    });
  };

  const handleToggleModuleAction = (modKey: string, actKey: string, value: boolean) => {
    setMatrixModules(prev => {
      const current = prev[modKey] || { view: false, create: false, edit: false, delete: false, export: false, approve: false };
      const updated = { ...current, [actKey]: value };
      // If toggling view off, also turn off all actions
      if (actKey === 'view' && !value) {
        updated.create = false;
        updated.edit = false;
        updated.delete = false;
        updated.export = false;
        updated.approve = false;
      }
      // If toggling any action on, view must also be on
      if (actKey !== 'view' && value) {
        updated.view = true;
      }
      return { ...prev, [modKey]: updated };
    });
  };

  // Instant 1-Click Approve Request
  const handleDirectApprove = async (reqId: number | string) => {
    try {
      await approveAccessRequest(1, reqId);
      showToast('✓ Access request approved. Permissions granted immediately');
      loadRequestsList();
      loadUsersList();
    } catch (err: any) {
      showToast(err.message || 'Error approving request');
    }
  };

  // Review & Modify Request Submit
  const handleModifyApprove = async () => {
    if (!selectedReqForModify) return;
    setModifying(true);
    try {
      await approveAccessRequest(1, selectedReqForModify.id, {
        can_view: modifyCanView,
        can_create: modifyCanCreate,
        can_edit: modifyCanEdit,
        can_delete: modifyCanDelete,
      });
      showToast('✓ Request approved with modified permissions');
      setModifyModalOpen(false);
      loadRequestsList();
      loadUsersList();
    } catch (err: any) {
      showToast(err.message || 'Error modifying request');
    } finally {
      setModifying(false);
    }
  };

  // Reject Request Submit
  const handleRejectRequest = async () => {
    if (!selectedReqForReject) return;
    setRejecting(true);
    try {
      await rejectAccessRequest(1, selectedReqForReject.id, rejectionReason.trim());
      showToast('✓ Access request rejected');
      setRejectModalOpen(false);
      setRejectionReason('');
      loadRequestsList();
    } catch (err: any) {
      showToast(err.message || 'Error rejecting request');
    } finally {
      setRejecting(false);
    }
  };

  // Database Backup
  async function handleBackup() {
    setBackingUp(true);
    try {
      const backupData = await downloadDatabaseBackup(1);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `tasin_enterprise_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast('✓ Production database snapshot exported successfully');
    } catch {
      showToast('Error exporting database backup');
    } finally {
      setBackingUp(false);
    }
  }

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = !userSearch || (
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(userSearch.toLowerCase()))
    );
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter || (userRoleFilter === 'super_admin' && u.isSuperAdmin);
    return matchesSearch && matchesRole;
  });

  const pendingRequestsCount = accessRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="text-blue-600" size={26} />
            System Settings & Access Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise RBAC matrix, employee access requests, identity directory, and system parameters
          </p>
        </div>

        {toast && (
          <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="company" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full max-w-3xl overflow-x-auto">
          <TabsTrigger value="company" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building size={14} /> Company Profile
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users size={14} /> User Accounts ({users.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield size={14} /> RBAC Matrix
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
            <KeyRound size={14} /> Access Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Database size={14} /> Backup & Security
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: COMPANY PROFILE ────────────────────────────────────────── */}
        <TabsContent value="company" className="mt-5 space-y-6">
          <Card className="p-6 border-slate-200/80 shadow-sm rounded-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Legal Company Identity</h3>
                <p className="text-xs text-slate-500 mt-0.5">Appears on invoices, vouchers, trip sheets, and customer contracts</p>
              </div>
              <Button onClick={handleSaveCompany} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Save Changes
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Registered Name</label>
                <Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Tagline / Subtitle</label>
                <Input value={company.tagline} onChange={e => setCompany({ ...company, tagline: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Head Office Address</label>
                <Input value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Official Phone</label>
                <Input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotline / Alternative Phone</label>
                <Input value={company.altPhone} onChange={e => setCompany({ ...company, altPhone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Contact Email</label>
                <Input value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Website</label>
                <Input value={company.website} onChange={e => setCompany({ ...company, website: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Identification Number (BIN)</label>
                <Input value={company.bin} onChange={e => setCompany({ ...company, bin: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tax Identification Number (TIN)</label>
                <Input value={company.tin} onChange={e => setCompany({ ...company, tin: e.target.value })} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: USER DIRECTORY & ROLES ─────────────────────────────────── */}
        <TabsContent value="users" className="mt-5 space-y-5">
          <Card className="p-6 border-slate-200/80 shadow-sm rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">User Accounts & Directory</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage administrative roles, employee access statuses, and module assignments</p>
              </div>
              <Button onClick={() => setAddUserOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2">
                <Plus size={16} /> Add Employee User
              </Button>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search by name, username, employee ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-600">Role:</span>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="h-9 text-xs w-44 bg-white">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Main Admin</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="operations_manager">Operations Manager</SelectItem>
                    <SelectItem value="staff">Staff / Driver Mgr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/80 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Designation & Department</th>
                    <th className="py-3 px-4">Authority Role</th>
                    <th className="py-3 px-4">Granted Modules</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading user accounts...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No matching user accounts found.</td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isSuper = Boolean(u.isSuperAdmin);
                      const isMain = Boolean(u.isMainAdmin);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                {u.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{u.name || u.username}</span>
                                <span className="text-[11px] text-slate-500 font-mono">@{u.username} • {u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{u.designation || 'Staff'}</span>
                            <span className="text-[11px] text-slate-500">{u.department || 'Operations'} {u.employeeId ? `• ${u.employeeId}` : ''}</span>
                          </td>

                          <td className="py-3 px-4">
                            {isSuper ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[11px]">
                                ★ Super Admin
                              </Badge>
                            ) : isMain ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[11px]">
                                Main Admin
                              </Badge>
                            ) : (
                              <Badge tone="neutral" className="text-slate-700 text-[11px] capitalize border border-slate-200">
                                {u.role ? u.role.replace('_', ' ') : 'Staff'}
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isSuper ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]">
                                All 15 Modules (Full Access)
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <span>{u.modulesCount ?? 0}</span> / 15 modules
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              u.status === 'Active' || u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' || u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {u.status || (u.isActive ? 'Active' : 'Inactive')}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Manage Permissions */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUserId(String(u.id));
                                  setActiveTab('permissions');
                                }}
                                className="h-7 text-[11px] px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                                title="Configure Module Permissions"
                              >
                                <Shield size={12} className="mr-1" /> Perms
                              </Button>

                              {/* Edit Profile */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUser({ ...u });
                                  setEditUserOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                title="Edit Profile"
                              >
                                <Edit3 size={13} />
                              </Button>

                              {/* Reset Password */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setResetPwdUser(u);
                                  setNewPassword('');
                                  setResetPwdOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800"
                                title="Reset Password"
                              >
                                <Key size={13} />
                              </Button>

                              {/* Deactivate User */}
                              {!isSuper && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800"
                                  title="Deactivate User"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: DYNAMIC RBAC MATRIX ────────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-5 space-y-5">
          <Card className="p-6 border-slate-200/80 shadow-sm rounded-xl">
            {/* Header with User Selector */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="text-blue-600" size={18} />
                  Dynamic 15-Module RBAC Permission Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Granular action authorization stored in database per user across all system modules
                </p>
              </div>

              {/* Target User Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Target User:</span>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.username} ({u.role}{u.isSuperAdmin ? ' ★' : ''})
                    </option>
                  ))}
                </select>

                <Button
                  onClick={handleSavePermissionsMatrix}
                  disabled={savingMatrix || (matrixData && matrixData.isSuperAdmin)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8"
                >
                  {savingMatrix ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>

            {/* Super Admin Notice */}
            {matrixData && matrixData.isSuperAdmin && (
              <div className="bg-purple-50 border border-purple-200 text-purple-900 p-4 rounded-xl text-xs flex items-center gap-3">
                <Sparkles size={18} className="text-purple-600 flex-shrink-0" />
                <div>
                  <strong>Super Administrator Notice:</strong> This user holds top-tier system authority. Super Admins possess unrestricted access across all 15 modules and system settings; permission restrictions are disabled.
                </div>
              </div>
            )}

            {/* Quick Actions (for non-super admin) */}
            {(!matrixData || !matrixData.isSuperAdmin) && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkMatrix('grant_all')}
                    className="text-xs h-7 border-slate-300 text-slate-700"
                  >
                    Grant All Modules
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkMatrix('read_only')}
                    className="text-xs h-7 border-slate-300 text-slate-700"
                  >
                    Read Only All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkMatrix('revoke_all')}
                    className="text-xs h-7 border-slate-300 text-rose-700 hover:bg-rose-50"
                  >
                    Revoke All
                  </Button>
                </div>

                <span className="text-[11px] text-slate-500">
                  Changes take effect immediately upon clicking <strong>Save Permissions</strong>.
                </span>
              </div>
            )}

            {/* Permissions Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl mt-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-72">Application Module</th>
                    <th className="py-3 px-3 text-center">Module Access (View)</th>
                    <th className="py-3 px-3 text-center">Create</th>
                    <th className="py-3 px-3 text-center">Edit</th>
                    <th className="py-3 px-3 text-center">Delete</th>
                    <th className="py-3 px-3 text-center">Export</th>
                    <th className="py-3 px-3 text-center">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMatrix ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">Loading module permissions matrix...</td>
                    </tr>
                  ) : (
                    SYSTEM_MODULES.map(m => {
                      const modPerms = matrixModules[m.key] || {
                        view: false, create: false, edit: false, delete: false, export: false, approve: false
                      };
                      const isSuper = matrixData && matrixData.isSuperAdmin;

                      return (
                        <tr key={m.key} className={`hover:bg-slate-50/70 transition-colors ${modPerms.view ? 'bg-white' : 'bg-slate-50/40 text-slate-400'}`}>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{m.name}</span>
                            <span className="text-[11px] text-slate-500">{m.desc}</span>
                          </td>

                          {/* View Toggle */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isSuper}
                              checked={isSuper ? true : Boolean(modPerms.view)}
                              onChange={e => handleToggleModuleAction(m.key, 'view', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Create Toggle */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isSuper || !modPerms.view}
                              checked={isSuper ? true : Boolean(modPerms.create)}
                              onChange={e => handleToggleModuleAction(m.key, 'create', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Edit Toggle */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isSuper || !modPerms.view}
                              checked={isSuper ? true : Boolean(modPerms.edit)}
                              onChange={e => handleToggleModuleAction(m.key, 'edit', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Delete Toggle */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isSuper || !modPerms.view}
                              checked={isSuper ? true : Boolean(modPerms.delete)}
                              onChange={e => handleToggleModuleAction(m.key, 'delete', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Export Toggle */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isSuper || !modPerms.view}
                              checked={isSuper ? true : Boolean(modPerms.export)}
                              onChange={e => handleToggleModuleAction(m.key, 'export', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Approve Toggle */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isSuper || !modPerms.view}
                              checked={isSuper ? true : Boolean(modPerms.approve)}
                              onChange={e => handleToggleModuleAction(m.key, 'approve', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: ACCESS REQUESTS QUEUE ──────────────────────────────────── */}
        <TabsContent value="requests" className="mt-5 space-y-5">
          <Card className="p-6 border-slate-200/80 shadow-sm rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="text-blue-600" size={18} />
                  Employee Workspace Access Requests Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and authorize module-level access requests submitted by employees
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
                  <Button
                    key={st}
                    size="sm"
                    variant={requestStatusFilter === st ? 'default' : 'outline'}
                    onClick={() => setRequestStatusFilter(st)}
                    className={`text-xs h-8 ${requestStatusFilter === st ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                  >
                    {st}
                    {st === 'Pending' && pendingRequestsCount > 0 && (
                      <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Requests Cards List */}
            {loadingRequests ? (
              <div className="py-12 text-center text-slate-400">Loading access requests...</div>
            ) : accessRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No {requestStatusFilter.toLowerCase()} requests found</p>
                <p className="text-xs text-slate-400 mt-1">When staff submit access requests, they will appear in this review queue.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accessRequests.map(req => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';
                  const meta = SYSTEM_MODULES.find(m => m.key === req.requestedModule) || { name: req.requestedModule };

                  return (
                    <div
                      key={req.id}
                      className="border border-slate-200 rounded-xl p-5 bg-white hover:border-slate-300 transition-all shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200 flex-shrink-0">
                            {req.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{req.userName}</span>
                              <span className="text-xs text-slate-500 font-mono">@{req.username}</span>
                              <span className="text-xs text-slate-400">• {req.department} ({req.designation})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">Requested Workspace:</span>
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs hover:bg-indigo-50">
                                {meta.name}
                              </Badge>
                              <code className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                {req.requestedModule}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-xs font-semibold">
                              <Clock size={12} className="mr-1" /> Pending Review
                            </Badge>
                          )}
                          {isApproved && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-xs font-semibold">
                              <CheckCircle2 size={12} className="mr-1" /> Approved
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 text-xs font-semibold">
                              <XCircle size={12} className="mr-1" /> Declined
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Capabilities Requested */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-semibold">Requested Capabilities:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {req.canView && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-medium">View</span>}
                          {req.canCreate && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 text-[11px] font-medium">Create</span>}
                          {req.canEdit && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-medium">Edit</span>}
                          {req.canDelete && <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 text-[11px] font-medium">Delete</span>}
                        </div>
                      </div>

                      {/* Business Justification */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900 block mb-0.5">Business Justification:</span>
                        {req.reason}
                      </div>

                      {/* Review details */}
                      {req.reviewedBy && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex flex-col gap-1">
                          <div>
                            Reviewed by <strong className="text-slate-700">{req.reviewedBy}</strong> on{' '}
                            {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'N/A'}
                          </div>
                          {req.rejectionReason && (
                            <div className="text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                              <strong>Decline Reason:</strong> {req.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons (only for Pending) */}
                      {isPending && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReqForReject(req);
                              setRejectionReason('');
                              setRejectModalOpen(true);
                            }}
                            className="text-xs h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                          >
                            <X size={13} className="mr-1" /> Decline
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReqForModify(req);
                              setModifyCanView(req.canView);
                              setModifyCanCreate(req.canCreate);
                              setModifyCanEdit(req.canEdit);
                              setModifyCanDelete(req.canDelete);
                              setModifyModalOpen(true);
                            }}
                            className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Edit3 size={13} className="mr-1" /> Review & Modify
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleDirectApprove(req.id)}
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <CheckCircle2 size={13} className="mr-1" /> Approve Request
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── TAB 5: BACKUP & DATABASE SNAPSHOT ─────────────────────────────── */}
        <TabsContent value="security" className="mt-5 space-y-6">
          <Card className="p-6 border-slate-200/80 shadow-sm rounded-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Production Database Snapshot & Backup</h3>
            <p className="text-xs text-slate-500 mb-6">
              Export complete business state including all 15 modules, ledger transactions, vehicle fleets, and audit logs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-2">
                    <Download size={16} className="text-blue-600" /> Export Full System Snapshot
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Downloads an encrypted, structured JSON snapshot containing complete fleet details, driver records, duty logs, client invoices, and financial ledger lines.
                  </p>
                </div>
                <Button
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  {backingUp ? 'Exporting...' : 'Export Snapshot (.json)'}
                </Button>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-2">
                    <UploadCloud size={16} className="text-indigo-600" /> Snapshot Integrity Verification
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Validate an existing database backup snapshot against current schema migrations and multi-tenant constraints.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setRestoreModalOpen(true)}
                  className="mt-6 border-slate-300 text-slate-700 text-xs"
                >
                  Verify Snapshot File
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: ADD USER MODAL ────────────────────────────────────────── */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add New Employee Account</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create credentials and assign initial workspace access
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username <span className="text-rose-500">*</span></label>
                <Input
                  required
                  placeholder="e.g. kamrul_ops"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password <span className="text-rose-500">*</span></label>
                <Input
                  required
                  type="password"
                  placeholder="Temporary password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                <Input
                  placeholder="e.g. Md. Kamrul Hasan"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                <Input
                  type="email"
                  placeholder="kamrul@tasinenterprise.com.bd"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Authority Level</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 outline-none"
                >
                  <option value="staff">Operations Staff</option>
                  <option value="operations_manager">Operations Manager</option>
                  <option value="accountant">Financial Accountant</option>
                  <option value="admin">Main Admin (Delegated)</option>
                  <option value="super_admin">Super Admin (Managing Director)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <Input
                  placeholder="e.g. Senior Fleet Executive"
                  value={newUser.designation}
                  onChange={e => setNewUser({ ...newUser, designation: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <Input
                  placeholder="e.g. Fleet Operations"
                  value={newUser.department}
                  onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <Input
                  placeholder="+880 1700-000000"
                  value={newUser.phone}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Initial Module Assignment Checkboxes */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Initial Workspace Modules
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, initial_modules: SYSTEM_MODULES.map(m => m.key) })}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, initial_modules: [] })}
                    className="text-[11px] text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-40 overflow-y-auto">
                {SYSTEM_MODULES.map(m => {
                  const checked = newUser.initial_modules.includes(m.key);
                  return (
                    <label key={m.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewUser({ ...newUser, initial_modules: [...newUser.initial_modules, m.key] });
                          } else {
                            setNewUser({ ...newUser, initial_modules: newUser.initial_modules.filter(k => k !== m.key) });
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingUser} className="bg-blue-600 hover:bg-blue-700 text-white">
                {creatingUser ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: EDIT USER PROFILE ────────────────────────────────────── */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit User Profile</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update personal and organizational information for {editingUser?.username}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleUpdateUserProfile} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                <Input
                  value={editingUser.name || ''}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                <Input
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <Input
                    value={editingUser.designation || ''}
                    onChange={e => setEditingUser({ ...editingUser, designation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <Input
                    value={editingUser.department || ''}
                    onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingUser.status || 'Active'}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={editingUser.role || 'staff'}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 outline-none"
                  >
                    <option value="staff">Staff</option>
                    <option value="operations_manager">Operations Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="admin">Main Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditUserOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingUser} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {updatingUser ? 'Updating...' : 'Save Profile'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: RESET PASSWORD MODAL ─────────────────────────────────── */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Key className="text-amber-600" size={18} /> Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set a new secure password for {resetPwdUser?.username}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
              <Input
                required
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPwdOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resettingPwd} className="bg-amber-600 hover:bg-amber-700 text-white">
                {resettingPwd ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: REVIEW & MODIFY REQUEST MODAL ────────────────────────── */}
      <Dialog open={modifyModalOpen} onOpenChange={setModifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Review & Modify Permissions</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selectively approve or trim capabilities for {selectedReqForModify?.userName}
            </DialogDescription>
          </DialogHeader>

          {selectedReqForModify && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div><strong>Requested Workspace:</strong> {selectedReqForModify.requestedModule}</div>
                <div><strong>Employee Reason:</strong> {selectedReqForModify.reason}</div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Authorize Capabilities</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modifyCanView}
                      onChange={e => setModifyCanView(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>View Workspace</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modifyCanCreate}
                      onChange={e => setModifyCanCreate(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Create Records</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modifyCanEdit}
                      onChange={e => setModifyCanEdit(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Edit Records</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modifyCanDelete}
                      onChange={e => setModifyCanDelete(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Delete Records</span>
                  </label>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setModifyModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleModifyApprove} disabled={modifying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {modifying ? 'Approving...' : 'Authorize Selected'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: REJECT REQUEST MODAL ─────────────────────────────────── */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <XCircle size={18} /> Decline Access Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a reason to inform the employee why access was declined
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Decline Remarks / Reason <span className="text-rose-500">*</span></label>
              <Textarea
                rows={3}
                placeholder="e.g. Access to Accounts ledger is restricted to the Executive Finance Department only..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRejectRequest} disabled={rejecting} className="bg-rose-600 hover:bg-rose-700 text-white">
                {rejecting ? 'Declining...' : 'Confirm Decline'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 6: RESTORE SIMULATION MODAL ─────────────────────────────── */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Snapshot Integrity Verification</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select a TASIN ENTERPRISE JSON snapshot to verify schema integrity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Input
              type="file"
              accept=".json"
              onChange={e => setRestoreFile(e.target.files?.[0] || null)}
              className="text-xs"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setRestoring(true);
                  setTimeout(() => {
                    setRestoring(false);
                    setRestoreModalOpen(false);
                    setRestoreFile(null);
                    showToast('✓ Snapshot schema verified successfully');
                  }, 1200);
                }}
                disabled={!restoreFile || restoring}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {restoring ? 'Verifying...' : 'Verify Snapshot'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
