import type {ComponentType} from 'react';
import {LayoutDashboard,FileSignature,CarFront,UsersRound,Building2,UserRound,ReceiptText,WalletCards,HandCoins,Banknote,Layers3,BookOpen,ChartNoAxesCombined,Bell,FileText,Settings2,Wrench,ScrollText} from 'lucide-react';

export interface NavItem{group:string;label:string;href:string;icon:ComponentType<{size?:number;className?:string}>}

/** The 16 required management-portal nav items (wireframe prompt line 31). F8 added Maintenance and Audit log. */
export const navItems:NavItem[]=[
 {group:'WORKSPACE',label:'Overview',href:'/',icon:LayoutDashboard},
 {group:'MANAGE',label:'Agreements',href:'/agreements',icon:FileSignature},
 {group:'',label:'Vehicles',href:'/vehicles',icon:CarFront},
 {group:'',label:'Maintenance',href:'/maintenance',icon:Wrench},
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
 {group:'',label:'Documents',href:'/documents',icon:FileText},
 {group:'',label:'Audit log',href:'/audit',icon:ScrollText},
 {group:'',label:'Settings',href:'/settings',icon:Settings2},
];

/** Non-nav preview route, reached only from the sidebar-foot link, not one of the 16 nav items. */
export const actorPreviewHref='/actor-preview';

export function pageTitle(pathname:string):string{
 if(pathname===actorPreviewHref)return 'Actor portal';
 const item=navItems.find(n=>n.href===pathname);
 return item?.label||'Overview';
}
