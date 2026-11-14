"use client";
import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessRestrictedProps {
  moduleName: string;
  moduleKey: string;
  roleTitle: string;
  onRequestAccess: () => void;
}

export function AccessRestricted({
  moduleName,
  moduleKey,
  roleTitle,
  onRequestAccess,
}: AccessRestrictedProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden text-center">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 p-8 text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/30 mx-auto flex items-center justify-center text-rose-300 shadow-inner mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Workspace Access Restricted
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            You do not currently possess permission to view the <strong className="text-white">{moduleName}</strong> workspace.
          </p>
        </div>

        {/* Details & Actions */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Target Module:</span>
              <span className="font-bold text-slate-900">{moduleName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">System Identifier:</span>
              <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700">{moduleKey}</code>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Your Role:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{roleTitle}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Module-level security is enforced by TASIN Enterprise Dynamic RBAC. You can submit an access request to the Super Administrator for review and instant workspace provisioning.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              type="button"
              onClick={onRequestAccess}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              <KeyRound size={16} />
              Request Workspace Access
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-700">
              <Link href="/" className="flex items-center justify-center gap-2">
                <ArrowLeft size={16} />
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
