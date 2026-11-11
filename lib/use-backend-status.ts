"use client";
import { useState, useEffect } from 'react';
import { fetchConnectionStatus } from './api';

export interface BackendStatus {
  connected: boolean;
  system?: string;
  organization_id?: number;
  organization_name?: string;
  company_profile?: {
    name: string;
    phone: string;
    email: string;
    address: string;
    currency: string;
    timezone: string;
  };
  total_modules?: number;
}

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetchConnectionStatus();
        if (mounted) {
          setStatus(res);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setStatus({ connected: false });
          setError(err?.message || 'Backend offline');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    check();
    const interval = setInterval(check, 30000); // 30s heartbeat
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { status, isConnected: !!status?.connected, loading, error };
}

