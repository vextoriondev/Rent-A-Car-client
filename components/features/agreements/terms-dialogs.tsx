"use client";
import {useEffect,useState} from 'react';
import {apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {ErrorState} from '@/components/shared/error-state';
import type {PartyOption,Version} from './terms-types';
import {firstOfNextMonth} from '@/lib/clock';
import {BASES,basisUnit,buildSchedule,defaultSchedule,fromApiSpec,sameSchedule,type ScheduleValue} from '@/lib/schedule';
import {ScheduleEditor} from './schedule-editor';

const NEXT_MONTH=firstOfNextMonth();
const roles=['operator','owner','customer'];
const responsible=['owner','operator','customer','driver'];
const title=(v:string)=>v.charAt(0).toUpperCase()+v.slice(1);
const providers=[...roles.map(v=>({value:v,label:title(v)})),{value:'none',label:'No driver (vehicle only)'}];

function Pick({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){
 return <label>{label}<Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></label>;
}
const plain=(list:string[])=>list.map(v=>({value:v,label:title(v)}));

/** New terms from a date (POST /agreements/{id}/revise). Only the fields that changed are sent. A mid-month date applies from the next period; the server refuses dates in an issued period. */
export function ReviseTermsDialog({open,agreementPk,current,onClose,onDone}:{open:boolean;agreementPk:number;current:Version;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [f,setF]=useState({customer_rent:'',owner_rent:'',driver_salary:'',fuel_responsible:'',repair_responsible:'',driver_provider:'',driver_paid_by:'',clauses:'',overtime_rate:'',overtime_unit:'',customer_rent_basis:'per_month',owner_rent_basis:'per_month',driver_salary_basis:'per_month',effective_from:NEXT_MONTH,reason:''});
 const [sched,setSched]=useState<Record<'customer'|'owner'|'driver',ScheduleValue>>({customer:{...defaultSchedule},owner:{...defaultSchedule},driver:{...defaultSchedule}});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setF({customer_rent:String(Number(current.customer_rent)),owner_rent:String(Number(current.owner_rent)),driver_salary:String(Number(current.driver_salary)),fuel_responsible:current.fuel_responsible,repair_responsible:current.repair_responsible,driver_provider:current.driver_provider,driver_paid_by:current.driver_paid_by,clauses:current.clauses,overtime_rate:current.overtime_rate?String(Number(current.overtime_rate)):'',overtime_unit:current.overtime_unit||'',customer_rent_basis:current.customer_rent_basis||'per_month',owner_rent_basis:current.owner_rent_basis||'per_month',driver_salary_basis:current.driver_salary_basis||'per_month',effective_from:NEXT_MONTH,reason:''});setSched({customer:fromApiSpec(current.payment_schedule?.customer),owner:fromApiSpec(current.payment_schedule?.owner),driver:fromApiSpec(current.payment_schedule?.driver)});setError('')}},[open,current]);
 const set=(k:keyof typeof f)=>(v:string)=>setF(x=>({...x,[k]:v}));
 const noDriver=f.driver_provider==='none';
 const operatorPays=f.driver_paid_by==='operator'&&!noDriver;
 const day=Number(f.effective_from.slice(8,10));

 const submit=async()=>{
  if(!orgId)return;
  const changes:Record<string,unknown>={};
  (['customer_rent','owner_rent'] as const).forEach(k=>{if(Number(f[k])!==Number(current[k]))changes[k]=String(Number(f[k]))});
  const salary=operatorPays?Number(f.driver_salary):0;
  const rate=f.overtime_rate.trim()?Number(f.overtime_rate):null;
  if(rate!==null&&rate!==Number(current.overtime_rate??0))changes.overtime_rate=String(rate);
  if(f.overtime_unit.trim()!==(current.overtime_unit||'')&&f.overtime_unit.trim())changes.overtime_unit=f.overtime_unit.trim();
  if(salary!==Number(current.driver_salary))changes.driver_salary=String(salary);
  (['fuel_responsible','repair_responsible','driver_provider','driver_paid_by','clauses'] as const).forEach(k=>{if(f[k]!==current[k])changes[k]=f[k]});
  if(noDriver&&Number(current.driver_salary)!==0)changes.driver_salary='0';
  (['customer_rent_basis','owner_rent_basis','driver_salary_basis'] as const).forEach(k=>{if(f[k]!==(current[k]||'per_month'))changes[k]=f[k]});
  const sides=['customer','owner','driver'] as const;
  if(sides.some(s=>!sameSchedule(sched[s],fromApiSpec(current.payment_schedule?.[s]))))(changes as Record<string,unknown>).payment_schedule=buildSchedule(sched);
  if(Object.keys(changes).length===0){setError('Change at least one term before saving.');return}
  setBusy(true);setError('');
  try{
   const v=await livePost(orgId,`/agreements/${agreementPk}/revise`,{effective_from:f.effective_from,reason:f.reason.trim(),changes});
   await onDone(`Terms version ${v.number} saved, effective ${v.effective_from}.`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Revise terms</DialogTitle><DialogDescription>The old terms stay in the history. Months already issued are never changed.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Effective from<Input type="date" value={f.effective_from} onChange={e=>set('effective_from')(e.target.value)}/></label>
    {day>1&&<p className="note">A mid-month date splits that month: each part is billed at its own terms, and the months already issued are never changed.</p>}
    <div className="amount-with-basis"><label>Customer rent (৳ {basisUnit(f.customer_rent_basis)})<Input inputMode="numeric" value={f.customer_rent} onChange={e=>set('customer_rent')(e.target.value)}/></label><Pick label="Customer rent counts" value={f.customer_rent_basis} onChange={set('customer_rent_basis')} options={BASES.map(([value,label])=>({value,label}))}/></div>
    <div className="amount-with-basis"><label>Owner rent (৳ {basisUnit(f.owner_rent_basis)})<Input inputMode="numeric" value={f.owner_rent} onChange={e=>set('owner_rent')(e.target.value)}/></label><Pick label="Owner rent counts" value={f.owner_rent_basis} onChange={set('owner_rent_basis')} options={BASES.map(([value,label])=>({value,label}))}/></div>
    <Pick label="Who supplies the driver" value={f.driver_provider} onChange={set('driver_provider')} options={providers}/>
    {noDriver
     ?<p className="note">Vehicle only: no driver and no salary on this agreement from this date. A driver can still work for you under a separate driver agreement (Drivers page).</p>
     :<>
      <Pick label="Who pays the driver" value={f.driver_paid_by} onChange={set('driver_paid_by')} options={plain(roles)}/>
      {operatorPays
       ?<div className="amount-with-basis"><label>Driver salary (৳ {basisUnit(f.driver_salary_basis)})<Input inputMode="numeric" value={f.driver_salary} onChange={e=>set('driver_salary')(e.target.value)}/></label><Pick label="Driver salary counts" value={f.driver_salary_basis} onChange={set('driver_salary_basis')} options={BASES.map(([value,label])=>({value,label}))}/></div>
       :<p className="note">The {f.driver_paid_by} pays the driver, so salary is 0 and no salary is payable on the statement.</p>}
     </>}
    <label>Overtime rate (optional, ৳ per unit)<Input inputMode="decimal" value={f.overtime_rate} onChange={e=>set('overtime_rate')(e.target.value)} placeholder="Suggested when you add an overtime charge"/></label>
    <label>Overtime unit (optional)<Input value={f.overtime_unit} onChange={e=>set('overtime_unit')(e.target.value)} placeholder="hour, day, km"/></label>
    <ScheduleEditor label="Customer pays us" value={sched.customer} onChange={x=>setSched(s=>({...s,customer:x}))}/>
    <ScheduleEditor label="We pay the owner" value={sched.owner} onChange={x=>setSched(s=>({...s,owner:x}))}/>
    {!noDriver&&operatorPays&&<ScheduleEditor label="We pay the driver" value={sched.driver} onChange={x=>setSched(s=>({...s,driver:x}))}/>}
    <Pick label="Fuel responsibility" value={f.fuel_responsible} onChange={set('fuel_responsible')} options={plain(responsible)}/>
    <Pick label="Repair responsibility" value={f.repair_responsible} onChange={set('repair_responsible')} options={plain(responsible)}/>
    <label>Clauses<Textarea rows={3} value={f.clauses} onChange={e=>set('clauses')(e.target.value)}/></label>
    <label>Reason (required)<Input value={f.reason} onChange={e=>set('reason')(e.target.value)} placeholder="Why are the terms changing?"/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!f.reason.trim()||!f.effective_from} onClick={()=>void submit()}>Save new terms</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

function useParties(open:boolean,kind:string){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [list,setList]=useState<PartyOption[]|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{if(open&&orgId){setList(null);setError('');apiRequest(`/orgs/${orgId}/parties?kind=${kind}&limit=200`).then(r=>setList(r.items)).catch(e=>setError((e as Error).message))}},[open,orgId,kind]);
 return {list,error};
}

/** Replaces the driver from a date (POST /agreements/{id}/assign-driver). Warnings such as a driver already on another car are shown, not hidden. */
export function AssignDriverDialog({open,agreementPk,currentDriverId,onClose,onDone}:{open:boolean;agreementPk:number;currentDriverId:number;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const {list,error:loadError}=useParties(open,'driver');
 const [driver,setDriver]=useState('');
 const [from,setFrom]=useState(NEXT_MONTH);
 const [salary,setSalary]=useState('');
 const [error,setError]=useState('');
 const [warnings,setWarnings]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setDriver('');setFrom(NEXT_MONTH);setSalary('');setError('');setWarnings([])}},[open]);
 const options=(list||[]).filter(p=>p.id!==currentDriverId).map(p=>({value:String(p.id),label:p.name}));
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   const r=await livePost(orgId,`/agreements/${agreementPk}/assign-driver`,{driver_id:Number(driver),effective_from:from,...(salary.trim()?{salary_override:String(Number(salary))}:{})});
   const w:string[]=r.warnings||[];
   if(w.length){setWarnings(w);await onDone(`Driver assigned from ${r.effective_from}. Warnings: ${w.join(' ')}`)}else await onDone(`Driver assigned from ${r.effective_from}.`);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Assign driver</DialogTitle><DialogDescription>The new driver takes over from the first of a month; the previous driver&apos;s history stays.</DialogDescription></DialogHeader>
   <div className="entry-form">
    {!list&&!loadError&&<p className="note">Loading drivers...</p>}
    {list&&options.length===0&&<p className="note">There is no other driver yet. Drivers are created with new agreements.</p>}
    {options.length>0&&<Pick label="New driver" value={driver} onChange={setDriver} options={options}/>}
    <label>Effective from<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label>Salary override (optional, ৳)<Input inputMode="numeric" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="Leave empty to use the agreement salary"/></label>
    {warnings.length>0&&<ul className="exception warning">{warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    {(loadError||error)&&<ErrorState message={loadError||error}/>}
    <div className="sheet-footer"><Button disabled={busy||!driver||!from} onClick={()=>void submit()}>Assign driver</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

/** Moves the vehicle to another owner from a date (POST /vehicles/{id}/transfer-ownership). Owner history is kept. */
export function TransferOwnerDialog({open,vehicleId,currentOwnerId,onClose,onDone}:{open:boolean;vehicleId:number;currentOwnerId:number;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const {list,error:loadError}=useParties(open,'owner');
 const [owner,setOwner]=useState('');
 const [from,setFrom]=useState(NEXT_MONTH);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setOwner('');setFrom(NEXT_MONTH);setError('')}},[open]);
 const options=(list||[]).filter(p=>p.id!==currentOwnerId).map(p=>({value:String(p.id),label:p.name}));
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{const r=await livePost(orgId,`/vehicles/${vehicleId}/transfer-ownership`,{owner_id:Number(owner),effective_from:from});await onDone(`Ownership transferred from ${r.effective_from}.`)}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Transfer ownership</DialogTitle><DialogDescription>Owner rent for months from this date goes to the new owner. Earlier months stay with the old owner.</DialogDescription></DialogHeader>
   <div className="entry-form">
    {!list&&!loadError&&<p className="note">Loading owners...</p>}
    {list&&options.length===0&&<p className="note">There is no other owner yet. Owners are created with new agreements.</p>}
    {options.length>0&&<Pick label="New owner" value={owner} onChange={setOwner} options={options}/>}
    <label>Effective from<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    {(loadError||error)&&<ErrorState message={loadError||error}/>}
    <div className="sheet-footer"><Button disabled={busy||!owner||!from} onClick={()=>void submit()}>Transfer ownership</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}

/** Extends, shortens or removes the end date (PATCH /agreements/{id}/dates). The server refuses a change that would reprice a month already issued. */
export function EndDateDialog({open,agreementPk,startDate,endDate,onClose,onDone}:{open:boolean;agreementPk:number;startDate:string;endDate:string|null;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [end,setEnd]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setEnd(endDate||'');setError('')}},[open,endDate]);
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{const r=await apiRequest(`/orgs/${orgId}/agreements/${agreementPk}/dates`,{method:'PATCH',body:JSON.stringify({end_date:end||null})});await onDone(r.end_date?`The agreement now ends on ${r.end_date}.`:'The agreement is now open-ended.')}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>Change the end date</DialogTitle><DialogDescription>Extend, shorten or remove the end date. Months already issued are never repriced; the server refuses a change that would.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Ends (leave empty for open-ended)<Input type="date" min={startDate} value={end} onChange={e=>setEnd(e.target.value)}/></label>
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||(!!end&&end<startDate)} onClick={()=>void submit()}>Save end date</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
