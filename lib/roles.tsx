"use client";
import {apiMode} from './api';
import {useRentflowStore} from './store-context';

export type Role =
  | 'super_admin'
  | 'admin'
  | 'accountant'
  | 'operations_manager'
  | 'staff'
  | 'operations'
  | 'viewer'
  | 'mechanic';

const FINANCE: Role[] = ['super_admin', 'admin', 'accountant'];
const OPS: Role[] = ['super_admin', 'admin', 'accountant', 'operations_manager', 'operations'];
const ALL_STAFF: Role[] = ['super_admin', 'admin', 'accountant', 'operations_manager', 'operations', 'staff'];

export const actions = {
  /** Record an expense, draft, submit */
  'entry.record': OPS,
  /** Customer payments, owner and driver payouts, advances, charges, invoices */
  'payment.post': FINANCE,
  /** Agreement and contracts */
  'agreement.write': OPS,
  /** Vehicle and driver assignment */
  'driver.assign': ['super_admin', 'admin', 'operations_manager', 'operations'],
  /** Financial statements, ledger, balances */
  'finance': FINANCE,
  /** Administration settings & users */
  'admin': ['super_admin', 'admin'],
  /** Database backup and restore */
  'backup.manage': ['super_admin'],
  /** Maintenance and garage operations */
  'maintenance.request': ['super_admin', 'admin', 'accountant', 'operations_manager', 'operations', 'mechanic'],
  'maintenance.manage': OPS,
  /** Document uploads and storage */
  'document.upload': ['super_admin', 'admin', 'accountant', 'operations_manager', 'operations', 'mechanic'],
  'document.delete': ['super_admin', 'admin', 'operations_manager', 'operations'],
  /** Duty operations & trip sheet dispatch */
  'duty.dispatch': ['super_admin', 'admin', 'operations_manager', 'operations'],
  /** Attendance register */
  'attendance.manage': ['super_admin', 'admin', 'operations_manager', 'operations'],
  /** Custom report builder */
  'reports.custom': FINANCE,
} satisfies Record<string, Role[]>;

export type Action = keyof typeof actions;

export const roleCan = (role: string | undefined, action: Action) => {
  if (!apiMode) return true;
  if (!role) return false;
  const normalized = role.toLowerCase().replace('-', '_').replace(' ', '_');
  if (normalized === 'super_admin' || normalized === 'admin') return true;
  return (actions[action] as readonly string[]).includes(normalized);
};

/** The signed-in member's role in the active organisation */
export function useRole(): string | undefined {
  return useRentflowStore().store.backend?.role || 'admin';
}

export function useCan(action: Action): boolean {
  return roleCan(useRole(), action);
}

/** Renders its children only when the role may do `action`. */
export function Can({action, children}: {action: Action; children: React.ReactNode}) {
  return useCan(action) ? <>{children}</> : null;
}
