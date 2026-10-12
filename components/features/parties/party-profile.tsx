"use client";
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {statement,type Agreement} from '@/lib/demo';
import {usePeriod} from '@/lib/period';
import {useRentflowStore} from '@/lib/store-context';
import {customerBillState,payableBillState,type BillState} from '@/lib/bill-state';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {BillStateChip} from '@/components/shared/bill-state-chip';
import {BillStateLegend} from '@/components/shared/bill-state-legend';
import {DownloadButtons} from '@/components/shared/download-buttons';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';
import {DocumentList} from '@/components/features/documents/document-list';
import type {DownloadTable} from '@/lib/downloads';
import {partyTabs,type Kind,type Portal,type Statement,type Page,type Obligation,type PaymentRow,type Deduction,type ActivityItem,type NoticeRow,type StatementRow} from './party-profile-types';
import {KIND_LABEL,COLUMNS,SUMMARY,fmtMonth,num} from './party-profile-types';

/** F6: a staff-viewed profile page for one owner, driver or customer (backend M10). No login and no share link; what is printed or exported is that party's own side only. */
export function PartyProfile({kind}:{kind:Kind}){
 const {id}=useParams<{id:string}>();
 return <div className="party-profile">
  <Link href={BACK[kind]} className="text-button"><ArrowLeft size={15}/> All {KIND_LABEL[kind].toLowerCase()}s</Link>
  {apiMode?<LiveProfile kind={kind} id={Number(id)}/>:<DemoProfile kind={kind} name={decodeURIComponent(id)}/>}
 </div>;
}
const BACK:Record<Kind,string>={owner:'/owners',driver:'/drivers',customer:'/customers'};

function useLoad<T>(path:string|null){
 const [data,setData]=useState<T|null>(null);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{if(!path)return;try{setData(await apiRequest(path));setError('')}catch(e){setError((e as Error).message)}},[path]);
 useEffect(()=>{setData(null);void load()},[load]);
 return {data,error,load};
}

function LiveProfile({kind,id}:{kind:Kind;id:number}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const base=orgId?`/orgs/${orgId}/parties/${id}/portal`:null;
 const {data,error,load}=useLoad<Portal>(base);
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!data||!base||!orgId)return <p className="note">Loading the profile...</p>;
 if(data.party.kind!==kind)return <ErrorState message={`This page is for a ${data.party.kind}. Open it from the ${data.party.kind}s list.`}/>;
 const tabs=partyTabs(kind);
 return <>
  <Header data={data} orgId={orgId} id={id}/>
  <Card>
   <Tabs defaultValue="overview">
    <TabsList className="detail-tabs">{tabs.map(([v,l])=><TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList>
    <TabsContent value="overview"><Overview data={data}/></TabsContent>
    <TabsContent value="statement"><StatementTab base={base} data={data}/></TabsContent>
    <TabsContent value="money"><MoneyTab base={base}/></TabsContent>
    {kind==='owner'&&<TabsContent value="deductions"><DeductionsTab base={base} orgId={orgId}/></TabsContent>}
    <TabsContent value="activity"><ActivityTab base={base}/></TabsContent>
    <TabsContent value="documents"><DocumentList targetType="party" targetId={id} title="Files"/></TabsContent>
    <TabsContent value="notices"><NoticesTab base={base}/></TabsContent>
   </Tabs>
  </Card>
 </>;
}

function Header({data,orgId,id}:{data:Portal;orgId:number;id:number}){
 const p=data.party;
 return <Card>
  <SectionHeading title={p.name} subtitle={`${KIND_LABEL[p.kind]} profile · staff view`} action={<Badge tone="blue">{KIND_LABEL[p.kind]}</Badge>}/>
  <div className="terms">
   <div><span>Phone</span><b>{p.phone||'Not recorded'}</b></div>
   <div><span>Email</span><b>{p.email||'Not recorded'}</b></div>
   {p.contacts.map(c=><div key={c.id}><span>{c.role.charAt(0).toUpperCase()+c.role.slice(1)} contact</span><b>{c.name}{c.phone?` · ${c.phone}`:''}</b></div>)}
  </div>
  <IdNumbers orgId={orgId} id={id}/>
 </Card>;
}

/** NID and licence numbers: full for an administrator (who can also edit them), last four characters for accountants, nothing for anyone else. Never part of a download. */
function IdNumbers({orgId,id}:{orgId:number;id:number}){
 const rf=useRentflowStore();
 const role=rf.store.backend?.role;
 const allowed=role==='admin'||role==='accountant';
 const {data,load}=useLoad<{nid_number:string;driving_licence_number:string;masked:boolean}>(allowed?`/orgs/${orgId}/parties/${id}/ids`:null);
 const [editing,setEditing]=useState(false);
 if(!allowed||!data)return null;
 return <div className="terms" aria-label="Identity numbers">
  <div><span>NID number</span><b>{data.nid_number||'Not recorded'}</b></div>
  <div><span>Driving licence</span><b>{data.driving_licence_number||'Not recorded'}</b></div>
  <div><span>Protected</span><b>{data.masked?'Last four characters only. Administrators see the full numbers.':'Visible to administrators only. Not included in downloads.'}</b></div>
  {role==='admin'&&<div><Button size="sm" variant="outline" onClick={()=>setEditing(true)}>Edit identity numbers</Button></div>}
  <EditIds open={editing} orgId={orgId} id={id} current={data} onClose={()=>setEditing(false)} onSaved={async()=>{setEditing(false);await load()}}/>
 </div>;
}

function EditIds({open,orgId,id,current,onClose,onSaved}:{open:boolean;orgId:number;id:number;current:{nid_number:string;driving_licence_number:string};onClose:()=>void;onSaved:()=>Promise<void>}){
 const [nid,setNid]=useState('');
 const [lic,setLic]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setNid(current.nid_number);setLic(current.driving_licence_number);setError('')}},[open,current]);
 const save=async()=>{
  setBusy(true);setError('');
  try{await apiRequest(`/orgs/${orgId}/parties/${id}/ids`,{method:'PUT',body:JSON.stringify({nid_number:nid,driving_licence_number:lic})});await onSaved()}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Identity numbers</DialogTitle><DialogDescription>Only administrators can see or change these. Every change is logged, and the numbers never appear in lists, reports or downloads.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>NID number<Input value={nid} onChange={e=>setNid(e.target.value)} maxLength={40}/></label>
    <label>Driving licence number<Input value={lic} onChange={e=>setLic(e.target.value)} maxLength={40}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy} onClick={()=>void save()}>Save</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

function Overview({data}:{data:Portal}){
 const kind=data.party.kind;const s=data.summary;
 return <div className="terms-section">
  <div className="mini-metrics">{SUMMARY[kind].map(([f,l])=><Card key={f}><span>{l}</span><strong><Money value={num(s[f] as string)} state={f==='due'?s.bill_state:undefined} signed={f==='due'}/></strong></Card>)}</div>
  <p className="note"><BillStateChip state={s.bill_state}/> {kind==='customer'?'What this customer still owes you.':'What you still owe this '+kind+' (amber means they owe you).'}</p>
  <BillStateLegend/>
  {kind==='driver'&&data.split&&<><h4 className="detail-subheading">Balance by arrangement</h4>
   <div className="billing-table terms-table" role="table" aria-label="Driver balance split">
    <div role="row" className="head"><span>Arrangement</span><span>Due</span></div>
    <div role="row"><span>Vehicle agreements</span><b className="nums"><Money value={num(data.split.vehicle_agreements.due)} signed/></b></div>
    <div role="row"><span>Driver agreements</span><b className="nums"><Money value={num(data.split.standalone.due)} signed/></b></div>
    <div role="row"><span><b>Total</b></span><b className="nums"><Money value={num(data.split.total_due)} signed state={data.summary.bill_state}/></b></div>
   </div></>}
  {data.agreements.length>0&&<><h4 className="detail-subheading">{kind==='owner'?'Agreements on this owner’s vehicles':kind==='driver'?'Assignments':'Agreements'}</h4>
   <div className="billing-table terms-table" role="table" aria-label="Agreements">
    <div role="row" className="head"><span>Agreement</span><span>Vehicle</span><span>From</span><span>To</span>{kind!=='owner'||true?<span>{kind==='customer'?'Rent / month':kind==='owner'?'Owner rent / month':'Salary / month'}</span>:null}</div>
    {data.agreements.map(a=><div role="row" key={a.ref+(a.effective_from||'')}><span><b>{a.ref}</b></span><span>{a.vehicle}</span><span>{a.effective_from||a.start_date||'-'}</span><span>{a.effective_to||a.end_date||'Current'}</span><b className="nums"><Money value={num((a.customer_rent||a.owner_rent||a.salary||'0') as string)}/></b></div>)}
   </div></>}
  {kind==='driver'&&data.driver_agreements&&data.driver_agreements.length>0&&<><h4 className="detail-subheading">Driver agreements</h4>
   <div className="billing-table terms-table" role="table" aria-label="Driver agreements">
    <div role="row" className="head"><span>Agreement</span><span>Vehicle</span><span>From</span><span>To</span><span>Salary / month</span></div>
    {data.driver_agreements.map(a=><div role="row" key={a.ref}><span><b>{a.ref}</b> <Badge tone={a.status==='active'?'good':'neutral'}>{a.status==='active'?'Active':'Ended'}</Badge></span><span>{a.vehicle||'-'}</span><span>{a.start_date}</span><span>{a.end_date||'Open'}</span><b className="nums"><Money value={num(a.salary)}/></b></div>)}
   </div></>}
  {kind==='owner'&&data.vehicles.length>0&&<p className="note">Vehicles: {data.vehicles.map(v=>v.registration).join(', ')}</p>}
 </div>;
}

function StatementTab({base,data}:{base:string;data:Portal}){
 const {range}=usePeriod();
 const kind=data.party.kind;
 const q=`?from=${range.from}&to=${range.to}`;
 const {data:st,error,load}=useLoad<Statement>(`${base}/statement${q}`);
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!st)return <p className="note">Loading the statement...</p>;
 const cols=COLUMNS[kind];
 const table:DownloadTable={title:`${KIND_LABEL[kind]} statement: ${data.party.name}`,scope:`${KIND_LABEL[kind]}: ${data.party.name}; ${range.from} to ${range.to}`,columns:['Month','Agreement','Vehicle',...cols.map(c=>c[1]+' BDT'),'Bill'],
  rows:st.rows.map(r=>[r.month.slice(0,7),r.ref,r.vehicle,...cols.map(c=>num(r[c[0]] as string)),r.bill_state]),totals:['Total','','',...cols.map(c=>num(st.totals[c[0]] as string)),st.totals.bill_state]};
 return <div className="terms-section">
  <div className="billing-toolbar"><p className="note">Months that touch {range.from} to {range.to} (change the period at the top of the page). Only this {kind}&apos;s own side is shown.</p>
   <DownloadButtons table={table} stem={`${kind}-${data.party.id}-statement-${range.from}_${range.to}`} serverPath={`${base}/statement/export${q}`}/></div>
  {st.rows.length===0?<EmptyState title="No months in this period"/>:<div className="billing-table terms-table" role="table" aria-label="Statement">
   <div role="row" className="head"><span>Month</span><span>Agreement</span>{cols.map(c=><span key={c[0]}>{c[1]}</span>)}<span>Bill</span></div>
   {st.rows.map((r:StatementRow)=><div role="row" key={r.period_id}><span><b>{fmtMonth(r.month)}</b></span><span>{r.ref} · {r.vehicle}</span>{cols.map(c=><b className="nums" key={c[0]}><Money value={num(r[c[0]] as string)} signed state={c[0]==='due'?r.bill_state:undefined}/></b>)}<span><BillStateChip state={r.bill_state}/></span></div>)}
   <div role="row" className="head"><span>Total</span><span/>{cols.map(c=><b className="nums" key={c[0]}><Money value={num(st.totals[c[0]] as string)} signed state={c[0]==='due'?st.totals.bill_state:undefined}/></b>)}<span><BillStateChip state={st.totals.bill_state}/></span></div>
  </div>}
 </div>;
}

function MoneyTab({base}:{base:string}){
 const ob=useLoad<Page<Obligation>>(`${base}/obligations?limit=200`);
 const pay=useLoad<Page<PaymentRow>>(`${base}/payments?limit=200`);
 if(ob.error||pay.error)return <ErrorState message={ob.error||pay.error} onRetry={()=>{void ob.load();void pay.load()}}/>;
 if(!ob.data||!pay.data)return <p className="note">Loading...</p>;
 return <div className="terms-section">
  <h4 className="detail-subheading">What was billed or earned</h4>
  {ob.data.items.length===0?<EmptyState title="Nothing yet"/>:<div className="billing-table terms-table" role="table" aria-label="Obligations">
   <div role="row" className="head"><span>Month</span><span>Item</span><span>Amount</span><span>Paid</span><span>Still open</span></div>
   {ob.data.items.map(o=><div role="row" key={o.id}><span><b>{fmtMonth(o.month)}</b> <small>{o.ref}</small></span><span>{o.description}</span><b className="nums"><Money value={num(o.amount)} signed/></b><b className="nums"><Money value={num(o.allocated)}/></b><b className="nums"><Money value={num(o.open_amount)}/></b></div>)}
  </div>}
  <h4 className="detail-subheading">Payments</h4>
  {pay.data.items.length===0?<EmptyState title="No payments yet"/>:<div className="billing-table terms-table" role="table" aria-label="Payments">
   <div role="row" className="head"><span>Date</span><span>Type</span><span>Reference</span><span>Amount</span><span>Applied to</span></div>
   {pay.data.items.map(p=><div role="row" key={p.id}><span>{p.event_date}</span><span>{p.label}</span><span>{p.reference}</span><b className="nums"><Money value={num(p.amount)}/></b><span>{p.allocations.map(a=>fmtMonth(a.month)).join(', ')}</span></div>)}
  </div>}
  {(ob.data.next!==null||pay.data.next!==null)&&<p className="note">Showing the latest 200 rows. Use the statement export for everything.</p>}
 </div>;
}

function DeductionsTab({base,orgId}:{base:string;orgId:number}){
 const {data,error,load}=useLoad<Page<Deduction>>(`${base}/deductions?limit=200`);
 const open=async(docId:number)=>{try{const r=await apiRequest(`/orgs/${orgId}/documents/${docId}/url`);window.open('/backend'+r.url,'_blank','noopener')}catch{/* the server message is not useful here */}};
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!data)return <p className="note">Loading...</p>;
 return <div className="terms-section">
  <p className="note">Costs the operator paid that were taken out of this owner&apos;s rent, with the reason and the receipt files you are allowed to open.</p>
  {data.items.length===0?<EmptyState title="No deductions"/>:<div className="billing-table terms-table" role="table" aria-label="Deductions">
   <div role="row" className="head"><span>Date</span><span>Cost</span><span>Reason</span><span>Amount</span><span>State</span><span>Proof</span></div>
   {data.items.map(d=><div role="row" key={d.expense_id}><span>{d.event_date}</span><span><b>{d.category.replace(/_/g,' ')}</b> <small>{d.ref} · {d.vehicle}</small></span><span>{d.reason}{d.receipt_reference?` (receipt ${d.receipt_reference})`:''}</span><b className="nums"><Money value={num(d.amount)}/></b><span>{d.state}</span>
    <span>{d.proof.length===0?'None':d.proof.map(f=><button type="button" className="text-button" key={f.id} onClick={()=>void open(f.id)}>{f.name}</button>)}</span></div>)}
  </div>}
 </div>;
}

function ActivityTab({base}:{base:string}){
 const {data,error,load}=useLoad<Page<ActivityItem>>(`${base}/activity?limit=100`);
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!data)return <p className="note">Loading...</p>;
 return data.items.length===0?<EmptyState title="No activity yet"/>:<div className="billing-table terms-table" role="table" aria-label="Activity">
  <div role="row" className="head"><span>Date</span><span>What happened</span><span>Amount</span><span>Reference</span></div>
  {data.items.map((a,i)=><div role="row" key={i}><span>{a.date}</span><span>{a.text}</span><b className="nums"><Money value={num(a.amount)}/></b><span>{a.ref||'-'}</span></div>)}
 </div>;
}

function NoticesTab({base}:{base:string}){
 const {data,error,load}=useLoad<Page<NoticeRow>>(`${base}/notices?limit=100`);
 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!data)return <p className="note">Loading...</p>;
 return <div className="terms-section"><p className="note">Messages recorded for this party. Sending is not connected yet, so queued messages have not left the system.</p>
  {data.items.length===0?<EmptyState title="No messages recorded"/>:<div className="billing-table terms-table" role="table" aria-label="Notices">
   <div role="row" className="head"><span>When</span><span>Message</span><span>State</span></div>
   {data.items.map(n=><div role="row" key={n.id}><span>{n.created_at.slice(0,10)}</span><span><b>{n.title}</b> <small>{n.text}</small></span><span><Badge tone={n.state==='sent'||n.state==='delivered'?'good':n.state==='failed'?'bad':'blue'}>{n.state}</Badge></span></div>)}
  </div>}</div>;
}

/** Demo mode: the same page from the sample data, limited to the profile, the figures and the agreements. */
function DemoProfile({kind,name}:{kind:Kind;name:string}){
 const {store}=useRentflowStore();
 const pick=(a:Agreement)=>kind==='owner'?a.owner:kind==='driver'?a.driver:a.customer;
 const mine=store.agreements.filter(a=>pick(a)===name);
 if(mine.length===0)return <EmptyState title={`No ${kind} named ${name}`}/>;
 const rows=mine.map(a=>({a,s:statement(a,store.entries)}));
 const due=rows.reduce((t,r)=>t+(kind==='owner'?r.s.ownerDue:kind==='driver'?r.s.driverDue:r.s.customerDue),0);
 const state:BillState=kind==='customer'?customerBillState(due):payableBillState(due);
 return <>
  <Card><SectionHeading title={name} subtitle={`${KIND_LABEL[kind]} profile · demo data`} action={<Badge tone="blue">{KIND_LABEL[kind]}</Badge>}/>
   <p className="note">API mode only: contacts, payments, deductions, activity, files and downloads need the Django backend. This demo shows the figures from the sample agreements.</p>
   <div className="mini-metrics"><Card><span>Due</span><strong><Money value={due} signed state={state}/></strong></Card></div><BillStateLegend/>
   <div className="billing-table terms-table" role="table" aria-label="Agreements">
    <div role="row" className="head"><span>Agreement</span><span>Vehicle</span><span>Due</span></div>
    {rows.map(({a,s})=>{const d=kind==='owner'?s.ownerDue:kind==='driver'?s.driverDue:s.customerDue;return <div role="row" key={a.id}><span><b>{a.id}</b></span><span>{a.vehicle}</span><b className="nums"><Money value={d} signed state={kind==='customer'?customerBillState(d):payableBillState(d)}/></b></div>})}
   </div>
  </Card>
 </>;
}
