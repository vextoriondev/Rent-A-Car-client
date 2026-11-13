import type {ComponentType} from 'react';
import {
  LayoutDashboard, FileSignature, CarFront, UsersRound, Building2, UserRound,
  ReceiptText, WalletCards, HandCoins, Banknote, Layers3, BookOpen,
  ChartNoAxesCombined, Bell, FileText, Settings2, Wrench, ScrollText,
  CalendarDays, Search, CircleDollarSign
} from 'lucide-react';

import type {Role} from './roles';
import {t} from '@/lib/copy';

export interface NavItem {
  group: string;
  label: string;
  href: string;
  icon: ComponentType<{size?: number; className?: string}>;
  roles?: Role[];
}

export const groupLabel = (g: string) =>
  g === 'WORKSPACE' ? 'Dashboard' :
  g === 'MANAGE' ? 'Management' :
  g === 'OPERATIONS' ? 'Operations' :
  g === 'FINANCE' ? 'Finance' :
  g === 'SYSTEM' ? 'System' : g;

const ALL_ROLES: Role[] = ['super_admin', 'admin', 'accountant', 'operations_manager', 'operations', 'staff', 'viewer', 'mechanic'];
const FINANCE_ROLES: Role[] = ['super_admin', 'admin', 'accountant'];
const OPS_ROLES: Role[] = ['super_admin', 'admin', 'accountant', 'operations_manager', 'operations'];

export const navItems: NavItem[] = [
  {group: 'WORKSPACE', label: 'Dashboard', href: '/', icon: LayoutDashboard},
  {group: 'MANAGE', label: 'Owners', href: '/owners', icon: Building2, roles: OPS_ROLES},
  {group: '', label: 'Vehicles', href: '/vehicles', icon: CarFront, roles: ALL_ROLES},
  {group: '', label: 'Drivers', href: '/drivers', icon: UserRound, roles: OPS_ROLES},
  {group: '', label: 'Clients & Companies', href: '/customers', icon: UsersRound, roles: OPS_ROLES},
  {group: 'OPERATIONS', label: 'Daily Duty', href: '/duties', icon: CalendarDays, roles: ALL_ROLES},
  {group: '', label: 'Maintenance', href: '/maintenance', icon: Wrench, roles: OPS_ROLES},
  {group: '', label: 'Agreements', href: '/agreements', icon: FileSignature, roles: OPS_ROLES},
  {group: '', label: 'Documents', href: '/documents', icon: FileText, roles: ALL_ROLES},
  {group: 'FINANCE', label: 'Expenses', href: '/expenses', icon: ReceiptText, roles: FINANCE_ROLES},
  {group: '', label: 'Billing & Invoices', href: '/billing', icon: WalletCards, roles: FINANCE_ROLES},
  {group: '', label: 'Owner Payables', href: '/owner-payables', icon: HandCoins, roles: FINANCE_ROLES},
  {group: '', label: 'Payroll', href: '/payroll', icon: Banknote, roles: FINANCE_ROLES},
  {group: '', label: 'Due & Collection', href: '/due-collection', icon: CircleDollarSign, roles: FINANCE_ROLES},
  {group: '', label: 'Accounts', href: '/accounts', icon: BookOpen, roles: FINANCE_ROLES},
  {group: '', label: 'Settlements', href: '/settlements', icon: Layers3, roles: FINANCE_ROLES},
  {group: '', label: 'Vehicle Search', href: '/vehicle-search', icon: Search, roles: ALL_ROLES},
  {group: '', label: 'Reports', href: '/reports', icon: ChartNoAxesCombined, roles: FINANCE_ROLES},
  {group: 'SYSTEM', label: 'Notifications', href: '/notifications', icon: Bell, roles: ALL_ROLES},
  {group: '', label: 'Audit Log', href: '/audit', icon: ScrollText, roles: ['super_admin', 'admin', 'accountant']},
  {group: '', label: 'Settings', href: '/settings', icon: Settings2, roles: ['super_admin', 'admin']},
];

export function pageTitle(pathname: string): string {
  if (pathname === '/expenses/daily' || pathname.startsWith('/expenses/categories/')) return t('nav.expenses');
  return navItemFor(pathname)?.label || t('nav.overview');
}

export function navItemFor(pathname: string) {
  return navItems.find(n => n.href === pathname) || navItems.find(n => n.href !== '/' && pathname.startsWith(n.href + '/'));
}

export const rolesFor = (item: NavItem | undefined): Role[] => item?.roles ?? ALL_ROLES;

export const routeAllowed = (pathname: string, role: string | undefined): boolean => {
  if (!role) return true;
  const normalized = role.toLowerCase().replace('-', '_').replace(' ', '_');
  if (normalized === 'super_admin' || normalized === 'admin') return true;
  const item = navItemFor(pathname);
  if (!item) return true;
  const allowed = rolesFor(item);
  return (allowed as readonly string[]).includes(normalized);
};
