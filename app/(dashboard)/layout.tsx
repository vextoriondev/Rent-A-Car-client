"use client";
import {Fragment,Suspense,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {CarFront,ChevronRight,Menu,X,Search,Bell,Plus,Info,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuSeparator,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {groupLabel,navItems,pageTitle,routeAllowed} from '@/lib/nav';
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
import {t,dateLocale} from '@/lib/copy';

import {roleLabel} from '@/lib/copy/labels';
import {LanguageSwitch} from '@/components/shared/language-switch';

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
   <div className="brand"><div className="brand-mark"><CarFront size={23}/></div><div><strong>{t('common.rentflow')}</strong><span>{t('app.operations')}</span></div><button aria-label={t('app.closeMenu')} className="mobile-close" onClick={()=>setMobileMenu(false)}><X size={20}/></button></div>
   {apiMode?<BranchSwitcher/>:<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="workspace" aria-label={t('app.switchWorkspace')}><div className="workspace-icon">R</div><div><strong>{t('app.rentflowHq')}</strong><small>{t('app.dhakaMainBranch')}</small></div><ChevronRight size={16}/></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>{t('app.workspaces')}</DropdownMenuLabel><DropdownMenuRadioGroup value="hq"><DropdownMenuRadioItem value="hq">{t('app.rentflowHqDhaka')}</DropdownMenuRadioItem></DropdownMenuRadioGroup><DropdownMenuSeparator/><DropdownMenuItem disabled>{t('app.addWorkspaceNotAvailable')}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
   <nav aria-label={t('app.mainNavigation')}>{navVisible.map(({heading,label,href,icon:Icon})=><div key={href}>{heading&&<div className="nav-group">{groupLabel(heading)}</div>}<Link href={href} className={'nav-link '+(pathname===href?'active':'')} aria-current={pathname===href?'page':undefined} onClick={()=>setMobileMenu(false)}><Icon size={18}/><span>{label}</span>{href==='/notifications'&&store.notices.some(n=>!n.read)&&<i className="nav-dot"/>}</Link></div>)}</nav>
   <div className="sidebar-foot"><div className="demo-sidebar">{apiMode?t('app.workspaceLive'):t('app.workspaceSample')}<br/><span>{apiMode?t('app.liveData'):t('app.sampleDataNote')}</span></div></div>
  </aside>
  <div className="main-shell">
   <header className="topbar">
    <button className="menu-button" onClick={()=>setMobileMenu(true)} aria-label={t('app.openMenu')}><Menu size={22}/></button>
    <div className="breadcrumb">{t('app.workspace')} <ChevronRight size={14}/> <strong>{title}</strong></div>
    <div className="top-actions"><LanguageSwitch/>
     <div className="global-search"><Search size={17}/><Input aria-label={t('app.searchAgreementsPeopleOr')} placeholder={t('app.searchAgreementCarPerson')} value={searchDraft} onChange={e=>changeSearch(e.target.value)}/><kbd>⌕</kbd></div>
     <button className="icon-button" aria-label={t('app.viewNotifications')} onClick={()=>router.push('/notifications')}><Bell size={19}/>{store.notices.some(n=>!n.read)&&<i/>}</button>
     <span className="top-divider"/>
     <button className="profile" onClick={()=>router.push('/settings')} aria-label={t('app.openSettings')}><span>{apiMode?initials(store.backend?.userName):'SH'}</span><div><strong>{apiMode?store.backend?.userName||t('app.signedIn'):'Sakib Haider'}</strong><small>{apiMode?roleLabel(store.backend?.role):'Administrator'}</small></div></button>
    </div>
   </header>
   <main className="content">
    <div className="page-intro">
     <div><div className="eyebrow">{t('app.eyebrow', {title: title.toUpperCase()})}</div><h1>{pathname==='/'?t('app.greeting', {greeting: greeting(), name: apiMode?store.backend?.userName||t('app.greetingNameFallback'):'Sakib'}):title}</h1><p>{pathname==='/'?t('app.hereIsWhereYour'):pathname==='/settlements'?t('app.reviewEveryBalanceBefore'):pathname==='/reports'?t('app.exploreAccountTotalsAnd'):pathname==='/settings'?t('app.policiesAndDemoWorkspace'):`${period.label}${apiMode?'':' · Main branch'}`}</p></div>
     <div className="intro-actions"><PeriodPicker/>{<Can action="entry.record"><Button onClick={()=>rf.openEntry()} className="primary-action"><Plus size={17}/> {t('app.recordEntry')}</Button></Can>}</div>
    </div>
    {period.multiMonth&&<p className="note period-note" role="note">{t('app.periodNote', {from: period.range.from, to: period.range.to, month: new Date((store.backend?.shownMonth??period.lastMonth)+'T12:00:00').toLocaleDateString(dateLocale(),{month:'long',year:'numeric'})})}</p>}
    <div className="demo-banner"><Info size={17}/><span>{apiMode?<><strong>{t('app.apiMode')}</strong> {t('app.entriesUseDjangoAnd')}</>:<><strong>{t('app.interactiveDemo')}</strong> Sample agreements and entries; changes stay in this browser. No live payments, messages, or accounting posts occur.</>}</span></div>
    {apiError&&<ErrorState message={t('app.loadError', {error: apiError})} onRetry={()=>location.reload()}/>}
    <Fragment key={branch??'all'}>{allowed&&!apiError?children:null}</Fragment>
   </main>
  </div>

  <SourceDrawer/>

  <RecordEntryDialog/>

  <NewAgreementDialog/>

  <Dialog open={!!rf.confirmClose} onOpenChange={o=>!o&&rf.setConfirmClose(null)}><DialogContent><DialogHeader><DialogTitle>{t('app.closeMonthTitle', {month: apiMode?monthLabel(store.backend?.shownMonth??period.lastMonth):t('app.closeMonthSample')})}</DialogTitle><DialogDescription>{rf.confirmClose} · {apiMode?t('app.thisPreparesApprovesAnd'):t('app.thisMarksTheSample')}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>rf.setConfirmClose(null)}>{t('app.keepOpen')}</Button><Button onClick={()=>rf.confirmClose&&rf.closeSettlement(rf.confirmClose)}>{t('app.confirmClose')}</Button></DialogFooter></DialogContent></Dialog>

  {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label={t('app.dismiss')}><X size={16}/></button></div>}
 </div>;
}

