"use client";
import {Fragment,Suspense,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {CarFront,ChevronRight,Menu,X,Search,Bell,Plus,Info,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuSeparator,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {navItems,pageTitle,routeAllowed} from '@/lib/nav';
import {greeting,initials,monthLabel} from '@/lib/clock';
import {apiMode} from '@/lib/api';
import {RentflowStoreProvider,useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {ErrorState} from '@/components/shared/error-state';
import {SourceDrawer} from '@/components/shared/source-drawer';
import {RecordEntryDialog} from '@/components/features/entries/record-entry-dialog';
import {NewAgreementDialog} from '@/components/features/agreements/new-agreement-dialog';
import {LoadingState} from '@/components/shared/loading-state';
import {PeriodPicker} from '@/components/shared/period-picker';
import {usePeriod} from '@/lib/period';
import {useBranch} from '@/lib/branch';
import {BranchSwitcher} from '@/components/features/branches/branch-switcher';
import {Can} from '@/lib/roles';

const ROLE_LABEL:Record<string,string>={admin:'Administrator',accountant:'Accountant',operations:'Operations',viewer:'Viewer',mechanic:'Mechanic'};
const roleLabel=(r?:string)=>ROLE_LABEL[r||'']||'Staff';

export default function DashboardLayout({children}:{children:React.ReactNode}){
 return <Suspense fallback={<div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>}><RentflowStoreProvider><DashboardShell>{children}</DashboardShell></RentflowStoreProvider></Suspense>;
}

function DashboardShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const router=useRouter();
 const [mobileMenu,setMobileMenu]=useState(false);
 const rf=useRentflowStore();
 const {store,ready,apiError,toast,setToast}=rf;
 const [q,setQ]=useQueryParam('q');
 const [searchDraft,setSearchDraft]=useState(q);
 const setQRef=useRef(setQ);
 setQRef.current=setQ;
 const searchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{if(!searchTimer.current)setSearchDraft(q)},[q]);
 useEffect(()=>()=>{if(searchTimer.current)clearTimeout(searchTimer.current)},[]);
 const changeSearch=(v:string)=>{setSearchDraft(v);if(searchTimer.current)clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>{searchTimer.current=null;setQRef.current(v)},250)};
 const title=pageTitle(pathname);
 const period=usePeriod();
 const branch=useBranch();
 const role=apiMode?store.backend?.role:undefined;
 const allowed=routeAllowed(pathname,role);
 let section='';
 const navVisible=navItems.map(n=>{if(n.group)section=n.group;return{...n,section}}).filter(n=>routeAllowed(n.href,role)).map((n,i,all)=>({...n,heading:i===0||all[i-1].section!==n.section?n.section:''}));
 useEffect(()=>{if(ready&&role&&!allowed)router.replace(navItems.find(n=>routeAllowed(n.href,role))?.href||'/')},[ready,role,allowed,router]);

 if(!ready)return <div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>;

 return <div className="app-shell">
  <aside className={'sidebar '+(mobileMenu?'mobile-open':'')}>
   <div className="brand"><div className="brand-mark"><CarFront size={23}/></div><div><strong>RentFlow</strong><span>OPERATIONS</span></div><button aria-label="Close menu" className="mobile-close" onClick={()=>setMobileMenu(false)}><X size={20}/></button></div>
   {apiMode?<BranchSwitcher/>:<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="workspace" aria-label="Switch workspace"><div className="workspace-icon">R</div><div><strong>RentFlow HQ</strong><small>Dhaka · Main branch</small></div><ChevronRight size={16}/></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>Workspaces</DropdownMenuLabel><DropdownMenuRadioGroup value="hq"><DropdownMenuRadioItem value="hq">RentFlow HQ · Dhaka</DropdownMenuRadioItem></DropdownMenuRadioGroup><DropdownMenuSeparator/><DropdownMenuItem disabled>Add workspace (not available yet)</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
   <nav aria-label="Main navigation">{navVisible.map(({heading,label,href,icon:Icon})=><div key={label}>{heading&&<div className="nav-group">{heading}</div>}<Link href={href} className={'nav-link '+(pathname===href?'active':'')} aria-current={pathname===href?'page':undefined} onClick={()=>setMobileMenu(false)}><Icon size={18}/><span>{label}</span>{label==='Notifications'&&store.notices.some(n=>!n.read)&&<i className="nav-dot"/>}</Link></div>)}</nav>
   <div className="sidebar-foot"><div className="demo-sidebar">{apiMode?'API WORKSPACE':'DEMO WORKSPACE'}<br/><span>{apiMode?'Live data':'Sample data · saved in this browser'}</span></div></div>
  </aside>
  <div className="main-shell">
   <header className="topbar">
    <button className="menu-button" onClick={()=>setMobileMenu(true)} aria-label="Open menu"><Menu size={22}/></button>
    <div className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>{title}</strong></div>
    <div className="top-actions">
     <div className="global-search"><Search size={17}/><Input aria-label="Search agreements, people or vehicles" placeholder="Search agreement, car, person..." value={searchDraft} onChange={e=>changeSearch(e.target.value)}/><kbd>⌕</kbd></div>
     <button className="icon-button" aria-label="View notifications" onClick={()=>router.push('/notifications')}><Bell size={19}/>{store.notices.some(n=>!n.read)&&<i/>}</button>
     <span className="top-divider"/>
     <button className="profile" onClick={()=>router.push('/settings')} aria-label="Open settings"><span>{apiMode?initials(store.backend?.userName):'SH'}</span><div><strong>{apiMode?store.backend?.userName||'Signed in':'Sakib Haider'}</strong><small>{apiMode?roleLabel(store.backend?.role):'Administrator'}</small></div></button>
    </div>
   </header>
   <main className="content">
    <div className="page-intro">
     <div><div className="eyebrow">RENTFLOW / {title.toUpperCase()}</div><h1>{title==='Overview'?`${greeting()}, ${apiMode?store.backend?.userName||'there':'Sakib'}`:title}</h1><p>{title==='Overview'?'Here is where your rental accounts stand this month.':title==='Settlements'?'Review every balance before closing the month.':title==='Actor portal'?'See the limited view each party receives.':title==='Reports'?'Explore account totals and export the current scope.':title==='Settings'?'Policies and demo workspace controls.':`${period.label}${apiMode?'':' · Main branch'}`}</p></div>
     <div className="intro-actions"><PeriodPicker/>{title!=='Actor portal'&&<Can action="entry.record"><Button onClick={()=>rf.openEntry()} className="primary-action"><Plus size={17}/> Record entry</Button></Can>}</div>
    </div>
    {period.multiMonth&&<p className="note period-note" role="note">Reports, the agreement statement and the entry lists (expenses, cashbook) use exactly {period.range.from} to {period.range.to}. The account tables and settlements show whole rent months, here {new Date((store.backend?.shownMonth??period.lastMonth)+'T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}, the latest month in the range with a rent period.</p>}
    <div className="demo-banner"><Info size={17}/><span>{apiMode?<><strong>API mode.</strong> Entries use Django and PostgreSQL. Message sending is not connected yet.</>:<><strong>Interactive demo.</strong> Sample agreements and entries; changes stay in this browser. No live payments, messages, or accounting posts occur.</>}</span></div>
    {apiError&&<ErrorState message={`Could not load your workspace: ${apiError}`} onRetry={()=>location.reload()}/>}
    <Fragment key={branch??'all'}>{allowed&&!apiError?children:null}</Fragment>
   </main>
  </div>

  <SourceDrawer/>

  <RecordEntryDialog/>

  <NewAgreementDialog/>

  <Dialog open={!!rf.confirmClose} onOpenChange={o=>!o&&rf.setConfirmClose(null)}><DialogContent><DialogHeader><DialogTitle>Close {apiMode?monthLabel(store.backend?.shownMonth??period.lastMonth):'September 2026'} settlement?</DialogTitle><DialogDescription>{rf.confirmClose} · {apiMode?'This prepares, approves and closes the month on the server; no new entries are accepted afterwards. Review all four statements and source entries first.':'This marks the sample month as closed in your browser. Review all four statements and source entries first.'}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>rf.setConfirmClose(null)}>Keep open</Button><Button onClick={()=>rf.confirmClose&&rf.closeSettlement(rf.confirmClose)}>Confirm close</Button></DialogFooter></DialogContent></Dialog>

  {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
 </div>;
}

