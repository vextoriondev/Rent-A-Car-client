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
  moduleKey?: string;
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

export const ROUTE_MODULE_MAP: Record<string, { key: string; name: string }> = {
  '/': { key: 'dashboard', name: 'Dashboard' },
  '/dashboard': { key: 'dashboard', name: 'Dashboard' },
  '/owners': { key: 'owners', name: 'Owners Management' },
  '/vehicles': { key: 'vehicles', name: 'Vehicles Management' },
  '/drivers': { key: 'drivers', name: 'Drivers & Attendance' },
  '/customers': { key: 'clients', name: 'Clients & Companies' },
  '/duties': { key: 'duties', name: 'Duties & Trips' },
  '/expenses': { key: 'expenses', name: 'Daily Expenses' },
  '/maintenance': { key: 'maintenance', name: 'Maintenance & Garage' },
  '/agreements': { key: 'agreements', name: 'Agreements & Documents' },
  '/documents': { key: 'agreements', name: 'Agreements & Documents' },
  '/billing': { key: 'clients', name: 'Billing & Invoices' },
  '/owner-payables': { key: 'owners', name: 'Owner Payables' },
  '/payroll': { key: 'drivers', name: 'Driver Payroll' },
  '/due-collection': { key: 'due_collection', name: 'Due & Collection' },
  '/accounts': { key: 'accounts', name: 'Accounts & Transactions' },
  '/settlements': { key: 'accounts', name: 'Settlements' },
  '/vehicle-search': { key: 'vehicle_search', name: 'Vehicle Search & Statements' },
  '/reports': { key: 'reports', name: 'Reports & Analytics' },
  '/notifications': { key: 'notifications', name: 'Notifications & Reminders' },
  '/audit': { key: 'settings', name: 'Audit Log' },
  '/settings': { key: 'settings', name: 'Settings & User Management' },
};

export const navItems: NavItem[] = [
  {group: 'WORKSPACE', label: 'Dashboard', href: '/', icon: LayoutDashboard, moduleKey: 'dashboard'},
  {group: 'MANAGE', label: 'Owners', href: '/owners', icon: Building2, roles: OPS_ROLES, moduleKey: 'owners'},
  {group: '', label: 'Vehicles', href: '/vehicles', icon: CarFront, roles: ALL_ROLES, moduleKey: 'vehicles'},
  {group: '', label: 'Drivers', href: '/drivers', icon: UserRound, roles: OPS_ROLES, moduleKey: 'drivers'},
  {group: '', label: 'Clients & Companies', href: '/customers', icon: UsersRound, roles: OPS_ROLES, moduleKey: 'clients'},
  {group: 'OPERATIONS', label: 'Daily Duty', href: '/duties', icon: CalendarDays, roles: ALL_ROLES, moduleKey: 'duties'},
  {group: '', label: 'Maintenance', href: '/maintenance', icon: Wrench, roles: OPS_ROLES, moduleKey: 'maintenance'},
  {group: '', label: 'Agreements', href: '/agreements', icon: FileSignature, roles: OPS_ROLES, moduleKey: 'agreements'},
  {group: '', label: 'Documents', href: '/documents', icon: FileText, roles: ALL_ROLES, moduleKey: 'agreements'},
  {group: 'FINANCE', label: 'Expenses', href: '/expenses', icon: ReceiptText, roles: FINANCE_ROLES, moduleKey: 'expenses'},
  {group: '', label: 'Billing & Invoices', href: '/billing', icon: WalletCards, roles: FINANCE_ROLES, moduleKey: 'clients'},
  {group: '', label: 'Owner Payables', href: '/owner-payables', icon: HandCoins, roles: FINANCE_ROLES, moduleKey: 'owners'},
  {group: '', label: 'Payroll', href: '/payroll', icon: Banknote, roles: FINANCE_ROLES, moduleKey: 'drivers'},
  {group: '', label: 'Due & Collection', href: '/due-collection', icon: CircleDollarSign, roles: FINANCE_ROLES, moduleKey: 'due_collection'},
  {group: '', label: 'Accounts', href: '/accounts', icon: BookOpen, roles: FINANCE_ROLES, moduleKey: 'accounts'},
  {group: '', label: 'Settlements', href: '/settlements', icon: Layers3, roles: FINANCE_ROLES, moduleKey: 'accounts'},
  {group: '', label: 'Vehicle Search', href: '/vehicle-search', icon: Search, roles: ALL_ROLES, moduleKey: 'vehicle_search'},
  {group: '', label: 'Reports', href: '/reports', icon: ChartNoAxesCombined, roles: FINANCE_ROLES, moduleKey: 'reports'},
  {group: 'SYSTEM', label: 'Notifications', href: '/notifications', icon: Bell, roles: ALL_ROLES, moduleKey: 'notifications'},
  {group: '', label: 'Audit Log', href: '/audit', icon: ScrollText, roles: ['super_admin', 'admin', 'accountant'], moduleKey: 'settings'},
  {group: '', label: 'Settings', href: '/settings', icon: Settings2, roles: ['super_admin', 'admin'], moduleKey: 'settings'},
];

export function getModuleForRoute(pathname: string): { key: string; name: string } {
  const base = '/' + (pathname.split('/').filter(Boolean)[0] || '');
  return ROUTE_MODULE_MAP[base] || { key: 'dashboard', name: 'Dashboard' };
}

export function isRouteAllowedDynamically(
  pathname: string,
  isSuperAdmin: boolean,
  allowedModules: string[],
  role?: string
): boolean {
  if (isSuperAdmin) return true;
  const mod = getModuleForRoute(pathname);
  if (allowedModules && allowedModules.length > 0) {
    return allowedModules.includes(mod.key);
  }
  return routeAllowed(pathname, role);
}

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
