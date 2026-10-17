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
import {Can} from '@/lib/roles';
import {t} from '@/lib/copy';

type Status='requested'|'approved'|'in_progress'|'done'|'cancelled';
type Case={id:number;vehicle_id:number;issue:string;vendor:string;quote:string|null;downtime_from:string|null;downtime_to:string|null;status:Status;approved_at:string|null};
type Vehicle={id:number;registration:string;model_name:string};
const label:Record<Status,string>={get requested(){return t('maint.requested')},get approved(){return t('maint.approved')},get in_progress(){return t('maintenance.maintenanceBoard.inProgress')},get done(){return t('maint.done')},get cancelled(){return t('maint.cancelled')}};
const tone:Record<Status,'neutral'|'warn'|'blue'|'good'|'bad'>={requested:'warn',approved:'blue',in_progress:'blue',done:'good',cancelled:'neutral'};
const next:Record<Status,{to:Status;text:string}[]>={requested:[{to:'cancelled',text: t('maintenance.maintenanceBoard.cancelRequest')}],approved:[{to:'in_progress',text: t('maintenance.maintenanceBoard.startWork')},{to:'cancelled',text: t('common.cancel')}],in_progress:[{to:'done',text: t('maintenance.maintenanceBoard.markDone')},{to:'cancelled',text: t('common.cancel')}],done:[],cancelled:[]};

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
 const plate=(id:number)=>vehicles.find(v=>v.id===id)?.registration||t('maint.carFallback',{id});

 if(!apiMode)return <Card><SectionHeading title={t('maintenance.maintenanceBoard.maintenanceRequests')}/><EmptyState title={t('common.apiModeOnly')} description={t('maintenance.maintenanceBoard.maintenanceRequestsApprovalsAnd')}/></Card>;
 return <Card>
  <SectionHeading title={t('maintenance.maintenanceBoard.maintenanceRequests')} subtitle={t('maintenance.maintenanceBoard.problemWorkshopQuoteAnd')} action={<Can action="maintenance.request"><Button onClick={()=>setOpen(true)}><Plus size={16}/> {t('maintenance.maintenanceBoard.requestMaintenance')}</Button></Can>}/>
  {message&&<p role="status" className="note">{message}</p>}
  {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
  {cases&&cases.length===0&&<EmptyState title={t('maintenance.maintenanceBoard.noMaintenanceRequestsYet')}/>}
  {cases&&cases.length>0&&<div className="billing-table maint-table" role="table" aria-label={t('maintenance.maintenanceBoard.maintenanceCases')}>
   <div role="row" className="head"><span>{t('common.vehicle')}</span><span>{t('maintenance.maintenanceBoard.problem')}</span><span>{t('maintenance.maintenanceBoard.workshop')}</span><span>{t('maintenance.maintenanceBoard.quote')}</span><span>{t('maintenance.maintenanceBoard.offTheRoad')}</span><span>{t('common.status')}</span></div>
   {cases.map(c=><div role="row" key={c.id} className="clickable" tabIndex={0} onClick={()=>setDetail(c)} onKeyDown={e=>{if(e.key==='Enter')setDetail(c)}}><span><b>{plate(c.vehicle_id)}</b></span><span>{c.issue}</span><span>{c.vendor||'-'}</span><b className="nums">{c.quote?<Money value={Number(c.quote)}/>:'-'}</b><span>{c.downtime_from?t('maint.range',{from: c.downtime_from, to: c.downtime_to||t('maint.open')}):'-'}</span><span><Badge tone={tone[c.status]}>{label[c.status]}</Badge></span></div>)}
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
   onDone(t('maint.sent'));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>{t('maintenance.maintenanceBoard.requestMaintenance')}</DialogTitle><DialogDescription>{t('maint.intro')}</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>{t('common.vehicle')}<Select value={f.vehicle} onValueChange={set('vehicle')}><SelectTrigger aria-label={t('common.vehicle')}><SelectValue placeholder={t('maintenance.maintenanceBoard.chooseAVehicle')}/></SelectTrigger><SelectContent>{vehicles.map(v=><SelectItem key={v.id} value={String(v.id)}>{v.registration} · {v.model_name}</SelectItem>)}</SelectContent></Select></label>
    <label>{t('maintenance.maintenanceBoard.problem')}<Input value={f.issue} onChange={e=>set('issue')(e.target.value)} placeholder={t('maintenance.maintenanceBoard.whatIsWrong')}/></label>
    <label>{t('maintenance.maintenanceBoard.workshopOptional')}<Input value={f.vendor} onChange={e=>set('vendor')(e.target.value)}/></label>
    <label>{t('maintenance.maintenanceBoard.quoteOptional')}<Input inputMode="decimal" value={f.quote} onChange={e=>set('quote')(e.target.value)}/></label>
    <label>{t('maintenance.maintenanceBoard.offTheRoadFrom')}<Input type="date" value={f.from} onChange={e=>set('from')(e.target.value)}/></label>
    <label>{t('maintenance.maintenanceBoard.backOnTheRoad')}<Input type="date" value={f.to} onChange={e=>set('to')(e.target.value)}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!f.vehicle||!f.issue.trim()} onClick={()=>void submit()}>{t('maintenance.maintenanceBoard.sendRequest')}</Button><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button></div>
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
 const approve=()=>act(()=>livePost(orgId!,`/maintenance-cases/${current.id}/approve`,{}),t('maint.approvedToast',{id: current.id}));
 const move=(to:Status)=>act(()=>apiRequest(`/orgs/${orgId}/maintenance-cases/${current.id}`,{method:'PATCH',body:JSON.stringify({status:to})}),t('maint.movedToast',{id: current.id, status: label[to].toLowerCase()}));
 return <Dialog open onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>{t('maint.title',{id: current.id, plate})}</DialogTitle><DialogDescription>{current.issue}</DialogDescription></DialogHeader>
   <div className="entry-form">
    <div className="settlement-status"><Badge tone={tone[current.status]}>{label[current.status]}</Badge>{current.approved_at&&<small>{t('maint.approvedOn',{date: current.approved_at.slice(0,10)})}</small>}</div>
    <div className="terms"><div><span>{t('maintenance.maintenanceBoard.workshop')}</span><b>{current.vendor||'-'}</b></div><div><span>{t('maintenance.maintenanceBoard.quote')}</span><b>{current.quote?<Money value={Number(current.quote)}/>:'-'}</b></div><div><span>{t('maintenance.maintenanceBoard.offTheRoad')}</span><b>{current.downtime_from?t('maint.range',{from: current.downtime_from, to: current.downtime_to||t('maint.open')}):'-'}</b></div></div>
    {error&&<ErrorState message={error}/>}
    <div className="settlement-buttons">
     {current.status==='requested'&&<Button disabled={busy} onClick={()=>void approve()}>{t('common.approve')}</Button>}
     {next[current.status].map(n=><Button key={n.to} variant="outline" disabled={busy} onClick={()=>void move(n.to)}>{n.text}</Button>)}
    </div>
    <DocumentList targetType="maintenance_case" targetId={current.id} title={t('maintenance.maintenanceBoard.quotesPhotosAndInvoices')}/>
   </div>
  </DialogContent>
 </Dialog>;
}
