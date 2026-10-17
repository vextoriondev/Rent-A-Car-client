import type {ComponentType} from 'react';
import {LayoutDashboard,FileSignature,CarFront,UsersRound,Building2,UserRound,ReceiptText,WalletCards,HandCoins,Banknote,Layers3,BookOpen,ChartNoAxesCombined,Bell,FileText,Settings2,Wrench,ScrollText} from 'lucide-react';

import type {Role} from './roles';
import {t} from '@/lib/copy';

export interface NavItem{group:string;label:string;href:string;icon:ComponentType<{size?:number;className?:string}>;/** Roles that see this item in API mode; everyone but a mechanic when omitted (F11) */roles?:Role[]}

/** The 16 required management-portal nav items (wireframe prompt line 31). F8 added Maintenance and Audit log. */
export const groupLabel=(g:string)=>g==='WORKSPACE'?t('nav.group.workspace'):g==='MANAGE'?t('nav.group.manage'):g==='FINANCE'?t('nav.group.finance'):g==='SYSTEM'?t('nav.group.system'):g;
export const navItems:NavItem[]=[
 {group:'WORKSPACE',get label(){return t('nav.overview')},href:'/',icon:LayoutDashboard},
 {group:'MANAGE',get label(){return t('common.agreements')},href:'/agreements',icon:FileSignature},
 {group:'',get label(){return t('nav.vehicles')},href:'/vehicles',icon:CarFront,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',get label(){return t('nav.maintenance')},href:'/maintenance',icon:Wrench,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',get label(){return t('nav.customers')},href:'/customers',icon:UsersRound},
 {group:'',get label(){return t('nav.owners')},href:'/owners',icon:Building2},
 {group:'',get label(){return t('nav.drivers')},href:'/drivers',icon:UserRound},
 {group:'FINANCE',get label(){return t('nav.expenses')},href:'/expenses',icon:ReceiptText},
 {group:'',get label(){return t('nav.billing')},href:'/billing',icon:WalletCards},
 {group:'',get label(){return t('common.ownerPayables')},href:'/owner-payables',icon:HandCoins},
 {group:'',get label(){return t('nav.payroll')},href:'/payroll',icon:Banknote},
 {group:'',get label(){return t('nav.settlements')},href:'/settlements',icon:Layers3},
 {group:'',get label(){return t('common.cashbook')},href:'/cashbook',icon:BookOpen},
 {group:'',get label(){return t('nav.reports')},href:'/reports',icon:ChartNoAxesCombined},
 {group:'SYSTEM',get label(){return t('nav.notifications')},href:'/notifications',icon:Bell},
 {group:'',get label(){return t('common.documents')},href:'/documents',icon:FileText,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',get label(){return t('common.auditLog')},href:'/audit',icon:ScrollText,roles:['admin','accountant']},
 {group:'',get label(){return t('nav.settings')},href:'/settings',icon:Settings2,roles:['admin','accountant','operations','viewer','mechanic']},
];

export function pageTitle(pathname:string):string{
 if(pathname==='/expenses/daily'||pathname.startsWith('/expenses/categories/'))return t('nav.expenses');
 return navItemFor(pathname)?.label||t('nav.overview');   // sub-routes such as /owners/12 carry their list's title
}

const ALL_BUT_MECHANIC:Role[]=['admin','accountant','operations','viewer'];
/** The nav item a route belongs to (sub-routes such as /expenses/daily belong to /expenses). */
export function navItemFor(pathname:string){return navItems.find(n=>n.href===pathname)||navItems.find(n=>n.href!=='/'&&pathname.startsWith(n.href+'/'))}
export const rolesFor=(item:NavItem|undefined)=>item?.roles??ALL_BUT_MECHANIC;
/** In API mode: may this role open this route? Sub-routes (such as a party profile) follow their list's roles. */
export const routeAllowed=(pathname:string,role:string|undefined)=>!role||(rolesFor(navItemFor(pathname)) as readonly string[]).includes(role);
