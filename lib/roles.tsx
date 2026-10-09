"use client";
import {apiMode} from './api';
import {useRentflowStore} from './store-context';

/** F11: what each staff role is offered in the UI. This mirrors `ROLE_ACTIONS` in the backend's policies.py so people are not shown buttons that will only answer 403;
 * the server stays the enforcer and its message is still shown if a request gets through. Demo mode has no roles, so everything is allowed there. */
export type Role='admin'|'accountant'|'operations'|'viewer'|'mechanic';
const FINANCE:Role[]=['admin','accountant'];
const OPS:Role[]=['admin','accountant','operations'];

export const actions={
 /** record an expense, draft, submit or discard it */
 'entry.record':OPS,
 /** customer payments, owner and driver payouts, advances, charges, invoices, split payments */
 'payment.post':FINANCE,
 'agreement.write':OPS,
 'driver.assign':OPS,
 /** approve or reverse entries, revise terms and rules, carry forward, close and settle, retry messages */
 'finance':FINANCE,
 'admin':['admin'],
 'maintenance.request':['admin','accountant','operations','mechanic'],
 'maintenance.manage':OPS,
 'document.upload':['admin','accountant','operations','mechanic'],
 'document.delete':OPS,
} satisfies Record<string,Role[]>;
export type Action=keyof typeof actions;

export const roleCan=(role:string|undefined,action:Action)=>!apiMode||(!!role&&(actions[action] as readonly string[]).includes(role));

/** The signed-in member's role in the active organisation (undefined until the first load, and in demo mode). */
export function useRole(){return useRentflowStore().store.backend?.role}
export function useCan(action:Action){return roleCan(useRole(),action)}

/** Renders its children only when the role may do `action`. */
export function Can({action,children}:{action:Action;children:React.ReactNode}){return useCan(action)?<>{children}</>:null}
