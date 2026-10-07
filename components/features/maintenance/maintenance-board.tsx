"use client";
import {useCallback,useEffect,useState} from 'react';
import {Plus} from 'lucide-react';
import {apiMode,apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';
import {DocumentList} from '@/components/features/documents/document-list';

type Status='requested'|'approved'|'in_progress'|'done'|'cancelled';
type Case={id:number;vehicle_id:number;issue:string;vendor:string;quote:string|null;downtime_from:string|null;downtime_to:string|null;status:Status;approved_at:string|null};
type Vehicle={id:number;registration:string;model_name:string};
const label:Record<Status,string>={requested:'Requested',approved:'Approved',in_progress:'In progress',done:'Done',cancelled:'Cancelled'};
const tone:Record<Status,'neutral'|'warn'|'blue'|'good'|'bad'>={requested:'warn',approved:'blue',in_progress:'blue',done:'good',cancelled:'neutral'};
const next:Record<Status,{to:Status;text:string}[]>={requested:[{to:'cancelled',text:'Cancel request'}],approved:[{to:'in_progress',text:'Start work'},{to:'cancelled',text:'Cancel'}],in_progress:[{to:'done',text:'Mark done'},{to:'cancelled',text:'Cancel'}],done:[],cancelled:[]};

/** Maintenance requests: raise, approve (finance), move through work, attach files, and see the downtime. The server enforces who may do each step and shows its own message. */
export function MaintenanceBoard(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [cases,setCases]=useState<Case[]|null>(null);
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [open,setOpen]=useState(false);
 const [detail,setDetail]=useState<Case|null>(null);

 const load=useCallback(async()=>{
  if(!orgId)return;
  try{const [c,v]=await Promise.all([apiRequest(`/orgs/${orgId}/maintenance-cases?limit=200`),apiRequest(`/orgs/${orgId}/vehicles?limit=200`)]);setCases(c.items);setVehicles(v.items);setError('')}
  catch(e){setError((e as Error).message)}
 },[orgId]);
 useEffect(()=>{if(apiMode)void load()},[load]);
 const plate=(id:number)=>vehicles.find(v=>v.id===id)?.registration||`Vehicle #${id}`;

 if(!apiMode)return <Card><SectionHeading title="Maintenance requests"/><EmptyState title="API mode only" description="Maintenance requests, approvals and files need the Django backend."/></Card>;
 return <Card>
  <SectionHeading title="Maintenance requests" subtitle="Problem, workshop, quote and days off the road. Finance approves before work starts." action={<Button onClick={()=>setOpen(true)}><Plus size={16}/> Request maintenance</Button>}/>
  {message&&<p role="status" className="note">{message}</p>}
  {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
  {cases&&cases.length===0&&<EmptyState title="No maintenance requests yet"/>}
  {cases&&cases.length>0&&<div className="billing-table maint-table" role="table" aria-label="Maintenance cases">
   <div role="row" className="head"><span>Vehicle</span><span>Problem</span><span>Workshop</span><span>Quote</span><span>Off the road</span><span>Status</span></div>
   {cases.map(c=><div role="row" key={c.id} className="clickable" tabIndex={0} onClick={()=>setDetail(c)} onKeyDown={e=>{if(e.key==='Enter')setDetail(c)}}><span><b>{plate(c.vehicle_id)}</b></span><span>{c.issue}</span><span>{c.vendor||'-'}</span><b className="nums">{c.quote?<Money value={Number(c.quote)}/>:'-'}</b><span>{c.downtime_from?`${c.downtime_from} to ${c.downtime_to||'open'}`:'-'}</span><span><Badge tone={tone[c.status]}>{label[c.status]}</Badge></span></div>)}
  </div>}
  <RequestDialog open={open} vehicles={vehicles} onClose={()=>setOpen(false)} onDone={m=>{setOpen(false);setMessage(m);void load()}}/>
  <CaseDialog item={detail} plate={detail?plate(detail.vehicle_id):''} onClose={()=>setDetail(null)} onChanged={m=>{setMessage(m);void load()}}/>
 </Card>;
}

function RequestDialog({open,vehicles,onClose,onDone}:{open:boolean;vehicles:Vehicle[];onClose:()=>void;onDone:(m:string)=>void}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [f,setF]=useState({vehicle:'',issue:'',vendor:'',quote:'',from:'',to:''});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setF({vehicle:'',issue:'',vendor:'',quote:'',from:'',to:''});setError('')}},[open]);
 const set=(k:keyof typeof f)=>(v:string)=>setF(x=>({...x,[k]:v}));
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   await livePost(orgId,'/maintenance-cases',{vehicle_id:Number(f.vehicle),issue:f.issue.trim(),vendor:f.vendor.trim(),quote:f.quote.trim()?String(Number(f.quote)):null,downtime_from:f.from||null,downtime_to:f.to||null});
   onDone('Maintenance request sent for approval.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Request maintenance</DialogTitle><DialogDescription>Describe the problem. Finance approves it before the work starts; costs are linked later from the expense form.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Vehicle<Select value={f.vehicle} onValueChange={set('vehicle')}><SelectTrigger aria-label="Vehicle"><SelectValue placeholder="Choose a vehicle"/></SelectTrigger><SelectContent>{vehicles.map(v=><SelectItem key={v.id} value={String(v.id)}>{v.registration} · {v.model_name}</SelectItem>)}</SelectContent></Select></label>
    <label>Problem<Input value={f.issue} onChange={e=>set('issue')(e.target.value)} placeholder="What is wrong?"/></label>
    <label>Workshop (optional)<Input value={f.vendor} onChange={e=>set('vendor')(e.target.value)}/></label>
    <label>Quote (৳, optional)<Input inputMode="decimal" value={f.quote} onChange={e=>set('quote')(e.target.value)}/></label>
    <label>Off the road from (optional)<Input type="date" value={f.from} onChange={e=>set('from')(e.target.value)}/></label>
    <label>Back on the road (optional)<Input type="date" value={f.to} onChange={e=>set('to')(e.target.value)}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!f.vehicle||!f.issue.trim()} onClick={()=>void submit()}>Send request</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

function CaseDialog({item,plate,onClose,onChanged}:{item:Case|null;plate:string;onClose:()=>void;onChanged:(m:string)=>void}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [current,setCurrent]=useState<Case|null>(item);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{setCurrent(item);setError('')},[item]);
 if(!item||!current)return null;
 const act=async(run:()=>Promise<Case>,done:string)=>{
  setBusy(true);setError('');
  try{const c=await run();setCurrent(c);onChanged(done)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 const approve=()=>act(()=>livePost(orgId!,`/maintenance-cases/${current.id}/approve`,{}),`Request #${current.id} approved.`);
 const move=(to:Status)=>act(()=>apiRequest(`/orgs/${orgId}/maintenance-cases/${current.id}`,{method:'PATCH',body:JSON.stringify({status:to})}),`Request #${current.id} is now ${label[to].toLowerCase()}.`);
 return <Dialog open onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Maintenance #{current.id} · {plate}</DialogTitle><DialogDescription>{current.issue}</DialogDescription></DialogHeader>
   <div className="entry-form">
    <div className="settlement-status"><Badge tone={tone[current.status]}>{label[current.status]}</Badge>{current.approved_at&&<small>Approved {current.approved_at.slice(0,10)}</small>}</div>
    <div className="terms"><div><span>Workshop</span><b>{current.vendor||'-'}</b></div><div><span>Quote</span><b>{current.quote?<Money value={Number(current.quote)}/>:'-'}</b></div><div><span>Off the road</span><b>{current.downtime_from?`${current.downtime_from} to ${current.downtime_to||'open'}`:'-'}</b></div></div>
    {error&&<ErrorState message={error}/>}
    <div className="settlement-buttons">
     {current.status==='requested'&&<Button disabled={busy} onClick={()=>void approve()}>Approve</Button>}
     {next[current.status].map(n=><Button key={n.to} variant="outline" disabled={busy} onClick={()=>void move(n.to)}>{n.text}</Button>)}
    </div>
    <DocumentList targetType="maintenance_case" targetId={current.id} title="Quotes, photos and invoices"/>
   </div>
  </DialogContent>
 </Dialog>;
}
