"use client";

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard component error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-lg p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle size={24} />
        </div>
        
        <div>
          <h2 className="text-lg font-bold text-slate-900">Unable to load this workspace</h2>
          <p className="text-xs text-slate-500 mt-1">
            {error?.message || 'An unexpected error occurred while loading this page.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <RefreshCw size={13} className="mr-1.5" /> Try Again
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Home size={13} className="mr-1.5" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

