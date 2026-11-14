"use client";
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert, Lock, CheckCircle2, Clock, XCircle,
  Sparkles, KeyRound, ArrowRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { submitAccessRequest, fetchAccessRequests } from '@/lib/api';

export const SYSTEM_MODULES = [
  { key: 'dashboard', name: 'Dashboard', desc: 'Fleet overview, KPIs, and revenue charts' },
  { key: 'owners', name: 'Owners Management', desc: 'Owner profiles, contracts, and monthly payables' },
  { key: 'vehicles', name: 'Vehicles Management', desc: 'Fleet directory, registration, mobil counter, papers' },
  { key: 'drivers', name: 'Drivers & Attendance', desc: 'Driver directory, licenses, daily attendance register' },
  { key: 'clients', name: 'Clients & Companies', desc: 'Client profiles, trade licenses, corporate contracts' },
  { key: 'duties', name: 'Duties & Trips', desc: 'Daily duty assignments, slips, and dispatch sheets' },
  { key: 'expenses', name: 'Daily Expenses', desc: 'Fuel, mobil, maintenance vouchers, cost ledger' },
  { key: 'maintenance', name: 'Maintenance & Garage', desc: 'Workshop partners, repair jobs, spare parts' },
  { key: 'agreements', name: 'Agreements & Documents', desc: 'Vehicle & client agreements, renewals, private files' },
  { key: 'accounts', name: 'Accounts & Transactions', desc: 'Cash & bank accounts, ledger transfers, reconciliation' },
  { key: 'due_collection', name: 'Due & Collection', desc: 'Receivables, aging, follow-up logs, payouts' },
  { key: 'vehicle_search', name: 'Vehicle Search & Statements', desc: 'Global registration search, duty timeline, logs' },
  { key: 'reports', name: 'Reports & Analytics', desc: 'Vehicle P&L, ledger statements, custom report builder' },
  { key: 'notifications', name: 'Notifications & Reminders', desc: 'Document expiry alerts and scheduled reminders' },
  { key: 'settings', name: 'Settings & User Management', desc: 'RBAC matrix, user accounts, database backup' },
];

interface AccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModule?: string;
  allowedModules?: string[];
  onSubmitted?: () => void;
}

export function AccessRequestModal({
  isOpen,
  onClose,
  initialModule = '',
  allowedModules = [],
  onSubmitted
}: AccessRequestModalProps) {
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [selectedModule, setSelectedModule] = useState(initialModule || 'accounts');
  const [canView, setCanView] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (initialModule) {
      setSelectedModule(initialModule);
    }
  }, [initialModule]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data: any = await fetchAccessRequests(1, 'All', true);
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Please specify a valid business justification for this access request.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res: any = await submitAccessRequest(1, {
        module: selectedModule,
        can_view: canView,
        can_create: canCreate,
        can_edit: canEdit,
        can_delete: canDelete,
        reason: reason.trim(),
      });
      setSuccessMsg(res.message || 'Access request submitted successfully for Administrator approval.');
      setReason('');
      loadHistory();
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getModuleMeta = (key: string) => SYSTEM_MODULES.find(m => m.key === key) || { name: key, desc: '' };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl border border-slate-200 rounded-xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 pb-5 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <KeyRound size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Workspace Access Request
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                Request access to authorized modules with administrative approval
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => setActiveTab('request')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'request'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Request Access
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('history'); loadHistory(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              My Request History
              {history.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-400 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Request Access Form */}
        {activeTab === 'request' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Target Module Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Workspace / Module
              </label>
              <select
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                {SYSTEM_MODULES.map(m => {
                  const hasAccess = allowedModules.includes(m.key);
                  return (
                    <option key={m.key} value={m.key}>
                      {m.name} {hasAccess ? '✓ (Currently Granted)' : '🔒 (Access Required)'}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                {getModuleMeta(selectedModule).desc}
              </p>
            </div>

            {/* Granular Action Checkboxes */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Requested Capabilities
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canView}
                    onChange={e => setCanView(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>View Workspace</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canCreate}
                    onChange={e => setCanCreate(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Create / Add</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canEdit}
                    onChange={e => setCanEdit(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Edit / Update</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDelete}
                    onChange={e => setCanDelete(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Delete / Remove</span>
                </label>
              </div>
            </div>

            {/* Business Justification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Business Reason / Purpose <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why you require access to this module (e.g. Assigned to manage monthly vehicle maintenance records or handle due collections)..."
                className="text-sm bg-slate-50 focus:bg-white resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The administrator will review this reason before approving your request.
              </p>
            </div>

            {/* Information Notice */}
            <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-3 text-amber-800 text-xs flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> Submitting an access request puts your request in a <code>Pending</code> queue. Your workspace access will be updated immediately upon Administrator approval.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Tab 2: Request History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Submitted Requests ({history.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="h-7 text-xs text-slate-500 hover:text-slate-800"
              >
                <RefreshCw size={12} className={`mr-1 ${loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No access requests submitted yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  When you request access to modules, track their approval status here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(req => {
                  const meta = getModuleMeta(req.requestedModule);
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';
                  const isPending = req.status === 'Pending';

                  return (
                    <div
                      key={req.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:bg-white transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {meta.name}
                            </span>
                            <code className="text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono">
                              {req.requestedModule}
                            </code>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Submitted on {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPending && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-xs">
                              <Clock size={12} className="mr-1" /> Pending Review
                            </Badge>
                          )}
                          {isApproved && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-xs">
                              <CheckCircle2 size={12} className="mr-1" /> Approved
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 text-xs">
                              <XCircle size={12} className="mr-1" /> Declined
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Capabilities requested */}
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {req.canView && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">View</span>}
                        {req.canCreate && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">Create</span>}
                        {req.canEdit && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">Edit</span>}
                        {req.canDelete && <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">Delete</span>}
                      </div>

                      {/* Reason */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900 block mb-0.5">Reason:</span>
                        {req.reason}
                      </div>

                      {/* Review details */}
                      {req.reviewedBy && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex flex-col gap-1">
                          <div>
                            Reviewed by <span className="font-semibold text-slate-700">{req.reviewedBy}</span> on{' '}
                            {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'N/A'}
                          </div>
                          {req.rejectionReason && (
                            <div className="text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                              <strong>Remarks:</strong> {req.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
