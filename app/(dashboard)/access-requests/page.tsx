"use client";
import React, { useState, useEffect } from 'react';
import {
  KeyRound, Shield, CheckCircle2, Clock, XCircle, AlertCircle,
  Search, Filter, RefreshCw, UserCheck, UserX, FileText,
  Calendar, Layers, Sparkles, ChevronRight, Check, X,
  ArrowUpRight, Info, ShieldCheck, ExternalLink
} from 'lucide-react';
import {
  fetchAccessRequests,
  fetchAccessRequestsSummary,
  fetchAccessRequestReviewDetails,
  approveAccessRequest,
  rejectAccessRequest,
  fetchUserPermissions
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { AccessRequestModal, SYSTEM_MODULES } from '@/components/shared/access-request-modal';

interface AccessRequestItem {
  id: number;
  user_id: number;
  username: string;
  user_name: string;
  user_email: string;
  designation?: string;
  department?: string;
  employee_id?: string;
  role?: string;
  module: string;
  module_name?: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

interface SummaryData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Current logged in user info
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);

  // New Request Modal (for employee or test)
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  // Detailed Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<AccessRequestItem | null>(null);
  const [reviewDetails, setReviewDetails] = useState<any>(null);
  const [loadingReviewDetails, setLoadingReviewDetails] = useState(false);

  // Interactive capability overrides in review modal
  const [modView, setModView] = useState(true);
  const [modCreate, setModCreate] = useState(false);
  const [modEdit, setModEdit] = useState(false);
  const [modDelete, setModDelete] = useState(false);
  const [modExport, setModExport] = useState(false);
  const [modApprove, setModApprove] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Quick Decline Modal
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<AccessRequestItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineLoading, setDeclineLoading] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchUserPermissions(1).then((res: any) => {
      if (res) {
        setCurrentUserRole(res.role || '');
        setIsSuperAdmin(Boolean(res.is_super_admin));
        setIsMainAdmin(Boolean(res.is_main_admin));
      }
    }).catch(() => {});
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, sum] = await Promise.all([
        fetchAccessRequests(1),
        fetchAccessRequestsSummary(1)
      ]);
      if (Array.isArray(reqList)) {
        setRequests(reqList);
      }
      if (sum && typeof sum.total === 'number') {
        setSummary(sum);
      } else if (Array.isArray(reqList)) {
        setSummary({
          total: reqList.length,
          pending: reqList.filter((r: any) => r.status === 'Pending').length,
          approved: reqList.filter((r: any) => r.status === 'Approved').length,
          rejected: reqList.filter((r: any) => r.status === 'Rejected').length,
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error loading access requests queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open detailed review modal
  const openReviewModal = async (req: AccessRequestItem) => {
    setActiveRequest(req);
    setModView(Boolean(req.can_view));
    setModCreate(Boolean(req.can_create));
    setModEdit(Boolean(req.can_edit));
    setModDelete(Boolean(req.can_delete));
    setModExport(Boolean(req.can_export));
    setModApprove(Boolean(req.can_approve));
    setAdminNotes('');
    setReviewDetails(null);
    setReviewModalOpen(true);

    setLoadingReviewDetails(true);
    try {
      const details = await fetchAccessRequestReviewDetails(1, req.id);
      setReviewDetails(details);
    } catch (err) {
      console.error('Failed to load review details', err);
    } finally {
      setLoadingReviewDetails(false);
    }
  };

  // Handle Approve (Direct or Modified)
  const handleApprove = async (isModified: boolean = false) => {
    if (!activeRequest) return;
    setActionLoading(true);
    try {
      const payload: any = {
        can_view: modView,
        can_create: modCreate,
        can_edit: modEdit,
        can_delete: modDelete,
        can_export: modExport,
        can_approve: modApprove,
        notes: adminNotes.trim(),
      };
      await approveAccessRequest(1, activeRequest.id, payload);
      showToast(`✓ Access granted for ${activeRequest.user_name || activeRequest.username} to ${activeRequest.module}`);
      setReviewModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Approve
  const handleQuickApprove = async (req: AccessRequestItem) => {
    try {
      await approveAccessRequest(1, req.id, {
        can_view: req.can_view,
        can_create: req.can_create,
        can_edit: req.can_edit,
        can_delete: req.can_delete,
        can_export: req.can_export,
        can_approve: req.can_approve,
      });
      showToast(`✓ Access request #${req.id} approved directly`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve request', 'error');
    }
  };

  // Open Decline Modal
  const openDeclineModal = (req: AccessRequestItem) => {
    setDeclineTarget(req);
    setDeclineReason('');
    setDeclineModalOpen(true);
  };

  // Confirm Decline
  const handleConfirmDecline = async () => {
    if (!declineTarget) return;
    if (!declineReason.trim()) {
      showToast('Please specify a rejection reason for the employee.', 'error');
      return;
    }
    setDeclineLoading(true);
    try {
      await rejectAccessRequest(1, declineTarget.id, declineReason.trim());
      showToast(`✓ Access request #${declineTarget.id} declined`);
      setDeclineModalOpen(false);
      setDeclineTarget(null);
      if (reviewModalOpen && activeRequest?.id === declineTarget.id) {
        setReviewModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to decline request', 'error');
    } finally {
      setDeclineLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    const matchesModule = moduleFilter === 'ALL' || req.module === moduleFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (req.user_name && req.user_name.toLowerCase().includes(q)) ||
      (req.username && req.username.toLowerCase().includes(q)) ||
      (req.user_email && req.user_email.toLowerCase().includes(q)) ||
      (req.designation && req.designation.toLowerCase().includes(q)) ||
      (req.department && req.department.toLowerCase().includes(q)) ||
      (req.module && req.module.toLowerCase().includes(q)) ||
      (req.reason && req.reason.toLowerCase().includes(q))
    );
    return matchesStatus && matchesModule && matchesSearch;
  });

  const getModuleName = (key: string) => {
    const m = SYSTEM_MODULES.find(x => x.key === key);
    return m ? m.name : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-rose-600 text-white shadow-rose-600/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <ShieldCheck size={15} />
            Enterprise Access Governance
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <KeyRound className="text-blue-600" size={26} />
            Super Admin Access Request Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized queue for multi-Super Admin review, granular capability authorization, and employee workspace access
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>

          <Button
            size="sm"
            onClick={() => setNewRequestOpen(true)}
            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            <KeyRound size={13} className="mr-1.5" />
            Submit New Request
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Requests */}
        <Card className="p-4 border-slate-200/80 shadow-sm bg-white rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Lifetime system requests</p>
        </Card>

        {/* Pending Requests */}
        <Card
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 border-amber-200/80 shadow-sm bg-gradient-to-br from-amber-50/60 to-white rounded-xl cursor-pointer transition-all hover:border-amber-400 ${
            statusFilter === 'Pending' ? 'ring-2 ring-amber-500/30 border-amber-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{summary.pending}</div>
          <p className="text-[11px] text-amber-700/80 mt-0.5">Requires Super Admin action</p>
        </Card>

        {/* Approved Requests */}
        <Card
          onClick={() => setStatusFilter('Approved')}
          className={`p-4 border-emerald-200/80 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white rounded-xl cursor-pointer transition-all hover:border-emerald-400 ${
            statusFilter === 'Approved' ? 'ring-2 ring-emerald-500/30 border-emerald-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved Access</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{summary.approved}</div>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">Permissions active in DB</p>
        </Card>

        {/* Rejected Requests */}
        <Card
          onClick={() => setStatusFilter('Rejected')}
          className={`p-4 border-rose-200/80 shadow-sm bg-gradient-to-br from-rose-50/60 to-white rounded-xl cursor-pointer transition-all hover:border-rose-400 ${
            statusFilter === 'Rejected' ? 'ring-2 ring-rose-500/30 border-rose-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Declined / Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">{summary.rejected}</div>
          <p className="text-[11px] text-rose-700/80 mt-0.5">Declined with feedback</p>
        </Card>
      </div>

      {/* Main Inbox Container */}
      <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st}
                {st === 'Pending' && summary.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400 text-slate-900 font-extrabold">
                    {summary.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Module Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search employee, username, reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200"
              />
            </div>

            <select
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="w-full sm:w-48 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 h-9"
            >
              <option value="ALL">All 15 Modules</option>
              {SYSTEM_MODULES.map(m => (
                <option key={m.key} value={m.key}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/80 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-24">Req ID</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Designation & Dept</th>
                <th className="py-3 px-4">Target Module</th>
                <th className="py-3 px-4">Requested Actions</th>
                <th className="py-3 px-4">Business Justification</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Loading access requests queue...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <KeyRound size={28} className="mx-auto mb-2 text-slate-300" />
                    No access requests found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Req ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          #{req.id}
                        </span>
                      </td>

                      {/* Employee Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {(req.user_name || req.username || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {req.user_name || req.username}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono block truncate">
                              @{req.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Designation & Dept */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block truncate">
                          {req.designation || 'Staff Member'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {req.department || 'Operations'} {req.employee_id ? `• ${req.employee_id}` : ''}
                        </span>
                      </td>

                      {/* Target Module */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="blue" className="font-bold text-[11px]">
                            {getModuleName(req.module)}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{req.module}</span>
                      </td>

                      {/* Requested Actions */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {req.can_view && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              View
                            </span>
                          )}
                          {req.can_create && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Create
                            </span>
                          )}
                          {req.can_edit && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Edit
                            </span>
                          )}
                          {req.can_delete && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Delete
                            </span>
                          )}
                          {req.can_export && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Export
                            </span>
                          )}
                          {req.can_approve && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Approve
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Business Justification */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 text-xs italic" title={req.reason}>
                          &ldquo;{req.reason}&rdquo;
                        </p>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        <div>{req.created_at ? req.created_at.slice(0, 10) : 'Recent'}</div>
                        <div className="text-[10px] text-slate-400">
                          {req.created_at ? req.created_at.slice(11, 16) : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle size={12} className="text-rose-600" />
                            Declined
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openReviewModal(req)}
                                className="h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                              >
                                Review & Decide
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickApprove(req)}
                                className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                title="Quick Approve as Requested"
                              >
                                <Check size={12} />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDeclineModal(req)}
                                className="h-7 text-[11px] px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                                title="Decline Request"
                              >
                                <X size={12} />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewModal(req)}
                              className="h-7 text-[11px] px-2.5 text-slate-700 border-slate-300 hover:bg-slate-50"
                            >
                              View Audit
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

      {/* ─── MODAL 1: DETAILED REVIEW & APPROVAL MODAL ───────────────────────── */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="text-blue-600" size={20} />
                  Access Request Review #{activeRequest?.id}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Evaluate employee requirements and authorize granular permissions in production DB
                </DialogDescription>
              </div>

              {activeRequest && (
                <Badge tone={activeRequest.status === 'Approved' ? 'good' : activeRequest.status === 'Rejected' ? 'bad' : 'warn'} className="font-bold">
                  {activeRequest.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {activeRequest && (
            <div className="space-y-4 pt-2">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {(activeRequest.user_name || activeRequest.username || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {activeRequest.user_name || activeRequest.username}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        @{activeRequest.username} • {activeRequest.user_email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-800 block">
                      {activeRequest.designation || 'Staff'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {activeRequest.department || 'Operations'} {activeRequest.employee_id ? `(${activeRequest.employee_id})` : ''}
                    </span>
                  </div>
                </div>

                {/* Currently Granted Modules */}
                {reviewDetails && Array.isArray(reviewDetails.current_granted_modules) && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Currently Granted Modules ({reviewDetails.current_granted_modules.length})</span>
                      <span className="text-[10px] text-slate-400">Direct from DB</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {reviewDetails.current_granted_modules.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No workspace modules currently assigned.</span>
                      ) : (
                        reviewDetails.current_granted_modules.map((m: string) => (
                          <span
                            key={m}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              m === activeRequest.module
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-200/70 text-slate-700'
                            }`}
                          >
                            {getModuleName(m)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Target Module & Business Justification */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-blue-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      Requested Module: {getModuleName(activeRequest.module)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-blue-700">
                    key: {activeRequest.module}
                  </span>
                </div>

                <div className="mt-2 bg-white p-3 rounded-lg border border-blue-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Employee Business Justification
                  </span>
                  <p className="text-xs text-slate-800 italic leading-relaxed">
                    &ldquo;{activeRequest.reason}&rdquo;
                  </p>
                </div>
              </div>

              {/* Interactive Granular Permissions Configuration */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      Super Admin Action Authorization Matrix
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Toggle specific capabilities before approving this request. Persisted directly to UserModulePermission.
                    </p>
                  </div>

                  {activeRequest.status === 'Pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setModView(true);
                        setModCreate(true);
                        setModEdit(true);
                        setModDelete(false);
                        setModExport(true);
                        setModApprove(false);
                      }}
                      className="text-[11px] h-7 text-blue-600 hover:bg-blue-50"
                    >
                      Standard Staff Preset
                    </Button>
                  )}
                </div>

                {/* Granular Checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* View */}
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      disabled={activeRequest.status !== 'Pending'}
                      checked={modView}
                      onChange={e => setModView(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">View Module</span>
                      <span className="text-[10px] text-slate-500">Read & navigation</span>
                    </div>
                  </label>

                  {/* Create */}
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      disabled={activeRequest.status !== 'Pending' || !modView}
                      checked={modCreate}
                      onChange={e => setModCreate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Create Records</span>
                      <span className="text-[10px] text-slate-500">Add new items</span>
                    </div>
                  </label>

                  {/* Edit */}
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      disabled={activeRequest.status !== 'Pending' || !modView}
                      checked={modEdit}
                      onChange={e => setModEdit(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Edit / Update</span>
                      <span className="text-[10px] text-slate-500">Modify existing</span>
                    </div>
                  </label>

                  {/* Delete */}
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      disabled={activeRequest.status !== 'Pending' || !modView}
                      checked={modDelete}
                      onChange={e => setModDelete(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Delete Records</span>
                      <span className="text-[10px] text-slate-500">High privilege</span>
                    </div>
                  </label>

                  {/* Export */}
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      disabled={activeRequest.status !== 'Pending' || !modView}
                      checked={modExport}
                      onChange={e => setModExport(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Export Reports</span>
                      <span className="text-[10px] text-slate-500">PDF / Excel files</span>
                    </div>
                  </label>

                  {/* Approve */}
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      disabled={activeRequest.status !== 'Pending' || !modView}
                      checked={modApprove}
                      onChange={e => setModApprove(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Approve Actions</span>
                      <span className="text-[10px] text-slate-500">Vouchers & trips</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Audit / Review Notes */}
              {activeRequest.status === 'Pending' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Super Admin Review Remarks / Decision Note (Optional)
                  </label>
                  <Textarea
                    placeholder="e.g. Approved with view and edit capabilities for Q4 duty dispatch operations."
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="text-xs h-18 resize-none"
                  />
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">Review Outcome:</span>
                    <span className="text-slate-500">{activeRequest.reviewed_at ? activeRequest.reviewed_at.slice(0, 19).replace('T', ' ') : 'Recorded'}</span>
                  </div>
                  <div>Reviewed By: <strong>{activeRequest.reviewed_by || 'Super Admin'}</strong></div>
                  {activeRequest.rejection_reason && (
                    <div className="mt-1.5 text-rose-700">
                      Decline Reason: <em>{activeRequest.rejection_reason}</em>
                    </div>
                  )}
                </div>
              )}

              {/* Past Request History for this employee */}
              {reviewDetails && Array.isArray(reviewDetails.past_requests) && reviewDetails.past_requests.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Previous Access Requests by {activeRequest.username} ({reviewDetails.past_requests.length})
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                    {reviewDetails.past_requests.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-none">
                        <span className="font-medium text-slate-700">
                          #{p.id} • {getModuleName(p.module)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{p.created_at ? p.created_at.slice(0, 10) : ''}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                            p.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : p.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              className="text-xs h-9 border-slate-300"
            >
              Close
            </Button>

            {activeRequest && activeRequest.status === 'Pending' && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openDeclineModal(activeRequest)}
                  disabled={actionLoading}
                  className="text-xs h-9 text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  <XCircle size={13} className="mr-1.5" />
                  Decline Request
                </Button>

                <Button
                  type="button"
                  onClick={() => handleApprove(true)}
                  disabled={actionLoading || !modView}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 size={13} className="mr-1.5" />
                  {actionLoading ? 'Saving...' : 'Authorize & Grant Access'}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: DECLINE REQUEST MODAL ──────────────────────────────────── */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
              <XCircle size={18} />
              Decline Access Request #{declineTarget?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide formal feedback explaining why this request cannot be authorized at this time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs text-rose-900">
              Declining access for <strong>{declineTarget?.user_name || declineTarget?.username}</strong> to module <strong>{getModuleName(declineTarget?.module || '')}</strong>.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <Textarea
                required
                placeholder="e.g. This module is restricted to Finance department executives. Please coordinate with your department lead."
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                className="text-xs h-24"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineModalOpen(false)}
              className="text-xs h-8 border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDecline}
              disabled={declineLoading || !declineReason.trim()}
              className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {declineLoading ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: EMPLOYEE NEW REQUEST MODAL ─────────────────────────────── */}
      <AccessRequestModal
        isOpen={newRequestOpen}
        onClose={() => setNewRequestOpen(false)}
        onSubmitted={() => {
          showToast('✓ Access request submitted successfully');
          loadData();
        }}
      />
    </div>
  );
}
