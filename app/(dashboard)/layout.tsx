"use client";
import {Suspense,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {CarFront,ChevronRight,Menu,X,Search,Bell,Plus,CalendarDays,Info,Eye,CheckCircle2,RotateCcw,RefreshCcw,UsersRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {navItems,actorPreviewHref,pageTitle} from '@/lib/nav';
import {apiMode,livePost} from '@/lib/api';
import {money,statement,type EntryType} from '@/lib/demo';
import {RentflowStoreProvider,useRentflowStore} from '@/lib/store-context';
import {Badge,fmtDate} from '@/components/legacy/shared';
import {ErrorState} from '@/components/shared/error-state';
import {LoadingState} from '@/components/shared/loading-state';

export default function DashboardLayout({children}:{children:React.ReactNode}){
 return <Suspense fallback={<div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>}><RentflowStoreProvider><DashboardShell>{children}</DashboardShell></RentflowStoreProvider></Suspense>;
}

function DashboardShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const router=useRouter();
 const [mobileMenu,setMobileMenu]=useState(false);
 const rf=useRentflowStore();
 const {store,ready,apiError,toast,setToast}=rf;
 const title=pageTitle(pathname);
 const current=store.agreements.find(a=>a.id===rf.selected);
 const currentEntry=store.entries.find(e=>e.id===rf.selected);
 const currentNotice=store.notices.find(n=>n.id===rf.selected);

 if(!ready)return <div className="app-shell"><div className="main-shell"><main className="content"><LoadingState/></main></div></div>;

 return <div className="app-shell">
  <aside className={'sidebar '+(mobileMenu?'mobile-open':'')}>
   <div className="brand"><div className="brand-mark"><CarFront size={23}/></div><div><strong>RentFlow</strong><span>OPERATIONS</span></div><button aria-label="Close menu" className="mobile-close" onClick={()=>setMobileMenu(false)}><X size={20}/></button></div>
   <div className="workspace"><div className="workspace-icon">R</div><div><strong>RentFlow HQ</strong><small>Dhaka · Main branch</small></div><ChevronRight size={16}/></div>
   <nav aria-label="Main navigation">{navItems.map(({group,label,href,icon:Icon})=><div key={label}>{group&&<div className="nav-group">{group}</div>}<Link href={href} className={'nav-link '+(pathname===href?'active':'')} aria-current={pathname===href?'page':undefined} onClick={()=>setMobileMenu(false)}><Icon size={18}/><span>{label}</span>{label==='Notifications'&&store.notices.some(n=>!n.read)&&<i className="nav-dot"/>}</Link></div>)}</nav>
   <div className="sidebar-foot"><Link href={actorPreviewHref} onClick={()=>setMobileMenu(false)}><UsersRound size={17}/> Actor portal preview <ChevronRight size={15}/></Link><div className="demo-sidebar">{apiMode?'API WORKSPACE':'DEMO WORKSPACE'}<br/><span>{apiMode?'Django backend · September 2026':'Sample data · saved in this browser'}</span></div></div>
  </aside>
  <div className="main-shell">
   <header className="topbar">
    <button className="menu-button" onClick={()=>setMobileMenu(true)} aria-label="Open menu"><Menu size={22}/></button>
    <div className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>{title}</strong></div>
    <div className="top-actions">
     <div className="global-search"><Search size={17}/><Input aria-label="Search agreements, people or vehicles" placeholder="Search agreement, car, person..." defaultValue="" onChange={()=>{}}/><kbd>⌕</kbd></div>
     <button className="icon-button" aria-label="View notifications" onClick={()=>router.push('/notifications')}><Bell size={19}/>{store.notices.some(n=>!n.read)&&<i/>}</button>
     <span className="top-divider"/>
     <button className="profile" onClick={()=>router.push('/settings')} aria-label="Open settings"><span>SH</span><div><strong>{apiMode?store.backend?.userName||'Accountant':'Sakib Haider'}</strong><small>{apiMode?'Django session':'Administrator'}</small></div></button>
    </div>
   </header>
   <main className="content">
    <div className="page-intro">
     <div><div className="eyebrow">RENTFLOW / {title.toUpperCase()}</div><h1>{title==='Overview'?`Good morning, ${apiMode?store.backend?.userName||'there':'Sakib'}`:title}</h1><p>{title==='Overview'?'Here is where your rental accounts stand this month.':title==='Settlements'?'Review every balance before closing the month.':title==='Actor portal'?'See the limited view each party receives.':title==='Reports'?'Explore account totals and export the current scope.':title==='Settings'?'Policies and demo workspace controls.':'September 2026 · Main branch'}</p></div>
     <div className="intro-actions"><div className="period-chip"><CalendarDays size={16}/> September 2026</div>{title!=='Actor portal'&&<Button onClick={()=>rf.openEntry()} className="primary-action"><Plus size={17}/> Record entry</Button>}</div>
    </div>
    <div className="demo-banner"><Info size={17}/><span>{apiMode?<><strong>API mode.</strong> Entries use Django and PostgreSQL. Notifications and the actor preview still need production delivery and identity wiring.</>:<><strong>Interactive demo.</strong> Sample agreements and entries; changes stay in this browser. No live payments, messages, or accounting posts occur.</>}</span></div>
    {apiError&&<ErrorState message={`Backend connection: ${apiError}. Sign in at the Django admin, then reload this page.`} onRetry={()=>location.reload()}/>}
    {children}
   </main>
  </div>

  <Sheet open={!!rf.selected} onOpenChange={o=>!o&&rf.setSelected(null)}><SheetContent className="detail-sheet"><SheetHeader><SheetTitle>{current?current.vehicle:currentEntry?currentEntry.id:currentNotice?'Message detail':'Detail'}</SheetTitle><SheetDescription>{current?current.id+' · '+current.registration:currentEntry?currentEntry.type+' · '+fmtDate(currentEntry.date):currentNotice?.recipient}</SheetDescription></SheetHeader>
   {current&&<div className="sheet-scroll"><div className="detail-relations"><div><span>Customer</span><b>{current.customer}</b></div><div><span>Owner</span><b>{current.owner}</b></div><div><span>Driver</span><b>{current.driver}</b></div></div>
    <Tabs defaultValue="customer"><TabsList className="detail-tabs"><TabsTrigger value="customer">Customer</TabsTrigger><TabsTrigger value="owner">Owner</TabsTrigger><TabsTrigger value="driver">Driver</TabsTrigger><TabsTrigger value="operator">Operator</TabsTrigger><TabsTrigger value="terms">Terms</TabsTrigger></TabsList>
     {(['customer','owner','driver','operator'] as const).map(tab=>{const s=statement(current,store.entries);const lines=tab==='customer'?[['Monthly rent',current.rent],['Receipts',-s.received],['Outstanding',s.customerDue]]:tab==='owner'?[['Gross owner rent',s.ownerGross],['Authorized offsets',-s.offsets],['Net payable',s.ownerNet],['Already paid',-s.ownerPaid],['Due to owner',s.ownerDue]]:tab==='driver'?[['Salary earned',s.driverEarned],['Advances',-s.advance],['Already paid',-s.driverPaid],['Due to driver',s.driverDue]]:[['Earned rent',current.rent],['Owner obligation',-current.ownerRent],['Driver obligation',-current.salary],['Operator costs',-s.operatorCosts],['Accrual margin',s.margin],['Actual cash movement',s.cash]];return <TabsContent value={tab} key={tab}><div className="statement-lines">{lines.map(([label,value],i)=><div className={i===lines.length-1?'statement-total':''} key={label}><span>{label}</span><b className="nums">{Number(value)<0?'−':''}{money(Number(value))}</b></div>)}</div>{tab==='operator'&&<p className="note">Accrual margin uses earned rent. Cash movement uses only recorded receipts and payments.</p>}{tab==='owner'&&<p className="note">Only operator funded owner costs with an authorized offset reduce this payable.</p>}</TabsContent>})}
     <TabsContent value="terms"><div className="terms"><div><span>Started</span><b>{fmtDate(current.start)}</b></div><div><span>Fuel responsibility</span><b>{current.rules.fuel}</b></div><div><span>Repair responsibility</span><b>{current.rules.repair}</b></div><div><span>Owner offsets</span><b>{current.rules.offset?'Permitted for owner costs':'Separate reimbursement'}</b></div></div></TabsContent>
    </Tabs>
    <h3 className="detail-subheading">Source entries</h3><div className="source-list">{store.entries.filter(e=>e.agreementId===current.id).map(e=><button key={e.id} onClick={()=>rf.setSelected(e.id)}><span><b>{e.description}</b><small>{e.id} · {fmtDate(e.date)} · {e.status}</small></span><b>{money(e.amount)}</b><ChevronRight size={15}/></button>)}</div>
    <div className="sheet-footer"><Button variant="outline" onClick={()=>{rf.setSelected(null);rf.openEntry('Customer payment',current.id)}}>Receive payment</Button><Button onClick={()=>{rf.setSelected(null);rf.openEntry('Expense',current.id)}}>Record expense</Button></div>
   </div>}
   {currentEntry&&<div className="sheet-scroll"><div className="entry-amount">{money(currentEntry.amount)} <Badge tone={currentEntry.status==='Posted'?'good':currentEntry.status==='Reversed'?'bad':'warn'}>{currentEntry.status}</Badge></div>
    <div className="terms">{[['Agreement',currentEntry.agreementId],['Service date',fmtDate(currentEntry.date)],['Category',currentEntry.category],['Paid by',currentEntry.paidBy],['Responsible',currentEntry.responsible],['Reference',currentEntry.reference],['Receipt',currentEntry.receipt||'None attached'],['Owner offset',currentEntry.offset?'Authorized':'No']].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
    <p className="entry-description">{currentEntry.description}</p>
    <p className="note">{currentEntry.status==='Pending approval'?'Pending entries do not change balances.':'This source contributes to the relevant account statement.'}</p>
    <div className="sheet-footer">{currentEntry.status==='Pending approval'&&<Button onClick={()=>rf.approve(currentEntry.id)}><CheckCircle2 size={16}/> Approve</Button>}{currentEntry.status==='Posted'&&<Button variant="outline" onClick={()=>{if(apiMode||confirm('Reverse this posted demo entry?'))rf.reverse(currentEntry.id)}}><RotateCcw size={16}/> Reverse entry</Button>}<Button variant="outline" onClick={()=>rf.setSelected(currentEntry.agreementId)}>View agreement</Button></div>
   </div>}
   {currentNotice&&<div className="sheet-scroll"><div className="terms"><div><span>Recipient</span><b>{currentNotice.recipient}</b></div><div><span>Status</span><Badge tone={currentNotice.status==='Failed'?'bad':currentNotice.status==='Delivered'?'good':'warn'}>{currentNotice.status}</Badge></div><div><span>Date</span><b>{fmtDate(currentNotice.date)}</b></div><div><span>Source</span><b>{currentNotice.detail}</b></div></div>
    <p className="note">Delivery states are simulated for this demo; no message has been sent.</p>
    {currentNotice.status==='Failed'&&<Button onClick={()=>{if(apiMode&&store.backend){const org=store.backend.orgId;void livePost(org,`/notifications/${currentNotice.id.replace('NT-','')}/retry`,{}).then(rf.refreshLive).then(()=>{setToast('Retry queued in the backend.');rf.setSelected(null)}).catch(e=>setToast(e.message));return}rf.setSelected(null);setToast('Retry queued in this demo.')}}><RefreshCcw size={16}/> Retry delivery</Button>}
   </div>}
  </SheetContent></Sheet>

  <Dialog open={rf.entryOpen} onOpenChange={rf.setEntryOpen}><DialogContent className="entry-dialog"><DialogHeader><DialogTitle>Record financial entry</DialogTitle><DialogDescription>Review who paid, who owes and the effect on balances.</DialogDescription></DialogHeader>
   <div className="entry-form"><div className="form-grid">
    <label>Entry type<Select value={rf.entryType} onValueChange={v=>{rf.setEntryType(v as EntryType);rf.setEntryError('');rf.setEntryCategory(v==='Expense'?'Repair':'Rent');rf.setEntryPayer(v==='Customer payment'?rf.chosen?.customer||'Customer':'Operator')}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(['Expense','Customer payment','Owner payout','Driver payout','Salary advance'] as EntryType[]).map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></label>
    <label>Agreement<Select value={rf.entryAgreement} onValueChange={rf.setEntryAgreement}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{store.agreements.map(a=><SelectItem key={a.id} value={a.id}>{a.id} · {a.vehicle}</SelectItem>)}</SelectContent></Select></label>
    <label>Amount (BDT)<Input type="number" inputMode="numeric" min="1" step="1" value={rf.entryAmount} onChange={e=>rf.setEntryAmount(e.target.value)} placeholder="e.g. 8,000"/></label>
    <label>Event date<Input type="date" value={rf.entryDate} onChange={e=>rf.setEntryDate(e.target.value)}/></label>
    <label>Category<Select value={rf.entryCategory} onValueChange={rf.setEntryCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Repair','Fuel','Toll / parking','Maintenance','Cleaning','Rent','Owner rent','Salary','Advance','Other'].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></label>
    <label>Reference<Input value={rf.entryRef} onChange={e=>rf.setEntryRef(e.target.value)} placeholder="Receipt / bank reference"/></label>
    {rf.entryType==='Expense'&&<><label>Paid by<Select value={rf.entryPayer} onValueChange={rf.setEntryPayer}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Operator','Owner','Customer','Driver'].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></label><label>Ultimately responsible<Select value={rf.entryLiable} onValueChange={rf.setEntryLiable}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Operator','Owner','Customer','Driver'].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></label></>}
   </div>
   <label>Description<Input value={rf.entryDesc} onChange={e=>rf.setEntryDesc(e.target.value)} placeholder="What happened?"/></label>
   {rf.entryType==='Expense'&&<><label className="check-label"><input type="checkbox" checked={rf.entryOffset} onChange={e=>rf.setEntryOffset(e.target.checked)} disabled={rf.entryLiable!=='Owner'||rf.entryPayer!=='Operator'||!rf.chosen?.rules.offset}/> Deduct an operator funded owner cost from owner rent (if authorized)</label><label>Receipt or proof <Input type="file" accept="image/*,.pdf" onChange={e=>rf.setEntryReceipt(e.target.files?.[0]?.name||'')}/></label>{rf.entryReceipt&&<button className="remove-receipt" onClick={()=>rf.setEntryReceipt('')}>Remove {rf.entryReceipt} ×</button>}</>}
   <div className="consequence"><strong><Eye size={16}/> Balance preview</strong><p>{!rf.chosen||!rf.amount?'Enter an amount to preview this entry.':rf.entryType==='Expense'?`${rf.entryPayer} pays ${money(rf.amount)}; ${rf.entryLiable} is responsible. ${rf.entryLiable==='Owner'&&rf.entryPayer==='Operator'&&rf.entryOffset&&rf.chosen.rules.offset?`Owner payable decreases by ${money(rf.amount)} after approval.`:'No automatic owner offset.'}`:rf.entryType==='Customer payment'?`Customer outstanding decreases by ${money(rf.amount)} when posted.`:rf.entryType==='Owner payout'?`Owner payable decreases by ${money(rf.amount)} when posted.`:rf.entryType==='Salary advance'?`Driver outstanding decreases by ${money(rf.amount)} as an advance.`:`Driver outstanding decreases by ${money(rf.amount)} when posted.`}{rf.entryType==='Expense'&&rf.amount>=5000?' Expense requires approval before balances change.':''}</p></div>
   {rf.entryError&&<p role="alert" className="form-error">{rf.entryError}</p>}
   </div>
   <DialogFooter><Button variant="outline" onClick={()=>rf.setEntryOpen(false)}>Cancel</Button><Button onClick={rf.submitEntry} disabled={rf.apiBusy}>{rf.apiBusy?'Saving...':'Save entry'}</Button></DialogFooter>
  </DialogContent></Dialog>

  <Dialog open={rf.agreementOpen} onOpenChange={rf.setAgreementOpen}><DialogContent className="agreement-dialog"><DialogHeader><DialogTitle>New rental agreement</DialogTitle><DialogDescription>Set the relationship and the monthly terms before activation.</DialogDescription></DialogHeader>
   <div className="wizard-progress">{['Parties','Vehicle & driver','Monthly terms','Rules & review'].map((x,i)=><button key={x} className={rf.wizardStep===i?'current':rf.wizardStep>i?'done':''} onClick={()=>rf.setWizardStep(i)}><span>{rf.wizardStep>i?'✓':i+1}</span>{x}</button>)}</div>
   <div className="wizard-body">
    {rf.wizardStep===0&&<div className="form-grid"><label>Customer / billing party<Input value={rf.newAgreement.customer} onChange={e=>rf.setNewAgreement({...rf.newAgreement,customer:e.target.value})} placeholder="Organization or person"/></label><label>Car owner<Input value={rf.newAgreement.owner} onChange={e=>rf.setNewAgreement({...rf.newAgreement,owner:e.target.value})} placeholder="Owner's full name"/></label></div>}
    {rf.wizardStep===1&&<div className="form-grid"><label>Vehicle name<Input value={rf.newAgreement.vehicle} onChange={e=>rf.setNewAgreement({...rf.newAgreement,vehicle:e.target.value})} placeholder="e.g. Toyota Axio"/></label><label>Registration<Input value={rf.newAgreement.registration} onChange={e=>rf.setNewAgreement({...rf.newAgreement,registration:e.target.value})} placeholder="DHA-METRO-..."/></label><label>Assigned driver<Input value={rf.newAgreement.driver} onChange={e=>rf.setNewAgreement({...rf.newAgreement,driver:e.target.value})} placeholder="Driver name"/></label><label>Effective from<Input type="date" value={rf.newAgreement.start} onChange={e=>rf.setNewAgreement({...rf.newAgreement,start:e.target.value})}/></label></div>}
    {rf.wizardStep===2&&<div className="form-grid"><label>Customer rent / month (BDT)<Input type="number" min="1" value={rf.newAgreement.rent} onChange={e=>rf.setNewAgreement({...rf.newAgreement,rent:e.target.value})}/></label><label>Owner rent / month (BDT)<Input type="number" min="1" value={rf.newAgreement.ownerRent} onChange={e=>rf.setNewAgreement({...rf.newAgreement,ownerRent:e.target.value})}/></label><label>Driver salary / month (BDT)<Input type="number" min="1" value={rf.newAgreement.salary} onChange={e=>rf.setNewAgreement({...rf.newAgreement,salary:e.target.value})}/></label></div>}
    {rf.wizardStep===3&&<><div className="form-grid"><label>Fuel responsibility<Select value={rf.newAgreement.fuel} onValueChange={v=>rf.setNewAgreement({...rf.newAgreement,fuel:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Owner','Operator','Customer'].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></label><label>Repair responsibility<Select value={rf.newAgreement.repair} onValueChange={v=>rf.setNewAgreement({...rf.newAgreement,repair:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Owner','Operator','Customer'].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></label></div><label className="check-label"><input type="checkbox" checked={rf.newAgreement.offset} onChange={e=>rf.setNewAgreement({...rf.newAgreement,offset:e.target.checked})}/> Permit owner cost offsets from owner rent</label><div className="consequence"><strong>Sample monthly statement</strong><p>Customer rent {money(Number(rf.newAgreement.rent)||0)} · owner gross {money(Number(rf.newAgreement.ownerRent)||0)} · driver salary {money(Number(rf.newAgreement.salary)||0)}. Expenses and payments will be recorded separately.</p></div></>}
    {rf.wizardError&&<p role="alert" className="form-error">{rf.wizardError}</p>}
   </div>
   <DialogFooter><Button variant="outline" onClick={()=>rf.wizardStep?rf.setWizardStep(rf.wizardStep-1):rf.setAgreementOpen(false)}>{rf.wizardStep?'Back':'Cancel'}</Button><Button onClick={()=>rf.wizardStep<3?rf.setWizardStep(rf.wizardStep+1):rf.createAgreement()}>{rf.apiBusy?'Saving...':rf.wizardStep<3?'Continue':'Activate agreement'}</Button></DialogFooter>
  </DialogContent></Dialog>

  <Dialog open={!!rf.confirmClose} onOpenChange={o=>!o&&rf.setConfirmClose(null)}><DialogContent><DialogHeader><DialogTitle>Close September settlement?</DialogTitle><DialogDescription>{rf.confirmClose} · This marks the sample month as closed in your browser. Review all four statements and source entries first.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>rf.setConfirmClose(null)}>Keep open</Button><Button onClick={()=>rf.confirmClose&&rf.closeSettlement(rf.confirmClose)}>Confirm close</Button></DialogFooter></DialogContent></Dialog>

  {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
 </div>;
}

