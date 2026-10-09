import type {ComponentType} from 'react';
import {LayoutDashboard,FileSignature,CarFront,UsersRound,Building2,UserRound,ReceiptText,WalletCards,HandCoins,Banknote,Layers3,BookOpen,ChartNoAxesCombined,Bell,FileText,Settings2,Wrench,ScrollText} from 'lucide-react';

import type {Role} from './roles';

export interface NavItem{group:string;label:string;href:string;icon:ComponentType<{size?:number;className?:string}>;/** Roles that see this item in API mode; everyone but a mechanic when omitted (F11) */roles?:Role[]}

/** The 16 required management-portal nav items (wireframe prompt line 31). F8 added Maintenance and Audit log. */
export const navItems:NavItem[]=[
 {group:'WORKSPACE',label:'Overview',href:'/',icon:LayoutDashboard},
 {group:'MANAGE',label:'Agreements',href:'/agreements',icon:FileSignature},
 {group:'',label:'Vehicles',href:'/vehicles',icon:CarFront,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',label:'Maintenance',href:'/maintenance',icon:Wrench,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',label:'Customers',href:'/customers',icon:UsersRound},
 {group:'',label:'Owners',href:'/owners',icon:Building2},
 {group:'',label:'Drivers',href:'/drivers',icon:UserRound},
 {group:'FINANCE',label:'Expenses',href:'/expenses',icon:ReceiptText},
 {group:'',label:'Billing',href:'/billing',icon:WalletCards},
 {group:'',label:'Owner payables',href:'/owner-payables',icon:HandCoins},
 {group:'',label:'Payroll',href:'/payroll',icon:Banknote},
 {group:'',label:'Settlements',href:'/settlements',icon:Layers3},
 {group:'',label:'Cashbook',href:'/cashbook',icon:BookOpen},
 {group:'',label:'Reports',href:'/reports',icon:ChartNoAxesCombined},
 {group:'SYSTEM',label:'Notifications',href:'/notifications',icon:Bell},
 {group:'',label:'Documents',href:'/documents',icon:FileText,roles:['admin','accountant','operations','viewer','mechanic']},
 {group:'',label:'Audit log',href:'/audit',icon:ScrollText,roles:['admin','accountant']},
 {group:'',label:'Settings',href:'/settings',icon:Settings2,roles:['admin','accountant','operations','viewer','mechanic']},
];

/** Non-nav preview route, reached only from the sidebar-foot link, not one of the 16 nav items. */
export const actorPreviewHref='/actor-preview';

export function pageTitle(pathname:string):string{
 if(pathname===actorPreviewHref)return 'Actor portal';
 if(pathname==='/expenses/daily'||pathname.startsWith('/expenses/categories/'))return 'Expenses';
 const item=navItems.find(n=>n.href===pathname);
 return item?.label||'Overview';
}

const ALL_BUT_MECHANIC:Role[]=['admin','accountant','operations','viewer'];
/** The nav item a route belongs to (sub-routes such as /expenses/daily belong to /expenses). */
export function navItemFor(pathname:string){return navItems.find(n=>n.href===pathname)||navItems.find(n=>n.href!=='/'&&pathname.startsWith(n.href+'/'))}
export const rolesFor=(item:NavItem|undefined)=>item?.roles??ALL_BUT_MECHANIC;
/** In API mode: may this role open this route? The actor preview is not a nav item and stays open to everyone but a mechanic. */
export const routeAllowed=(pathname:string,role:string|undefined)=>!role||(rolesFor(navItemFor(pathname)) as readonly string[]).includes(role);
