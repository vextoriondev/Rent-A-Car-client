import type {ComponentType} from 'react';
import {LayoutDashboard,FileSignature,CarFront,UsersRound,Building2,UserRound,ReceiptText,WalletCards,HandCoins,Banknote,Layers3,BookOpen,ChartNoAxesCombined,Bell,FileText,Settings2,Wrench,ScrollText,CalendarDays,Search,CircleDollarSign} from 'lucide-react';

import type {Role} from './roles';
import {t} from '@/lib/copy';

export interface NavItem{group:string;label:string;href:string;icon:ComponentType<{size?:number;className?:string}>;/** Roles that see this item in API mode; everyone but a mechanic when omitted (F11) */roles?:Role[]}

/** Navigation items for TASIN ENTERPRISE Rent-A-Car Management System */
export const groupLabel=(g:string)=>g==='WORKSPACE'?'Dashboard':g==='MANAGE'?'Management':g==='OPERATIONS'?'Operations':g==='FINANCE'?'Finance':g==='SYSTEM'?'System':g;
export const navItems:NavItem[]=[
 {group:'WORKSPACE',label:'Dashboard',href:'/',icon:LayoutDashboard},
 {group:'MANAGE',label:'Owners',href:'/owners',icon:Building2},
 {group:'',label:'Vehicles',href:'/vehicles',icon:CarFront,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',label:'Drivers',href:'/drivers',icon:UserRound},
 {group:'',label:'Clients & Companies',href:'/customers',icon:UsersRound},
 {group:'OPERATIONS',label:'Daily Duty',href:'/duties',icon:CalendarDays},
 {group:'',label:'Maintenance',href:'/maintenance',icon:Wrench,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',label:'Agreements',href:'/agreements',icon:FileSignature},
 {group:'',label:'Documents',href:'/documents',icon:FileText,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'FINANCE',label:'Expenses',href:'/expenses',icon:ReceiptText},
 {group:'',label:'Billing & Invoices',href:'/billing',icon:WalletCards},
 {group:'',label:'Owner Payables',href:'/owner-payables',icon:HandCoins},
 {group:'',label:'Payroll',href:'/payroll',icon:Banknote},
 {group:'',label:'Due & Collection',href:'/due-collection',icon:CircleDollarSign},
 {group:'',label:'Accounts',href:'/accounts',icon:BookOpen},
 {group:'',label:'Settlements',href:'/settlements',icon:Layers3},
 {group:'',label:'Vehicle Search',href:'/vehicle-search',icon:Search},
 {group:'',label:'Reports',href:'/reports',icon:ChartNoAxesCombined},
 {group:'SYSTEM',label:'Notifications',href:'/notifications',icon:Bell},
 {group:'',label:'Audit Log',href:'/audit',icon:ScrollText,roles:['admin','accountant']},
 {group:'',label:'Settings',href:'/settings',icon:Settings2,roles:['admin','accountant','operations','viewer','mechanic']},
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
