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

const NEXT_MONTH='2026-10-01';
const roles=['operator','owner','customer'];
const providers=[...roles.map(v=>({value:v,label:title(v)})),{value:'none',label:'No driver (vehicle only)'}];
const responsible=['owner','operator','customer','driver'];
const title=(v:string)=>v.charAt(0).toUpperCase()+v.slice(1);

function Pick({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){
 return <label>{label}<Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></label>;
}
const plain=(list:string[])=>list.map(v=>({value:v,label:title(v)}));

/** New terms from a date (POST /agreements/{id}/revise). Only the fields that changed are sent. A mid-month date applies from the next period; the server refuses dates in an issued period. */
export function ReviseTermsDialog({open,agreementPk,current,onClose,onDone}:{open:boolean;agreementPk:number;current:Version;onClose:()=>void;onDone:(m:string)=>Promise<void>}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [f,setF]=useState({customer_rent:'',owner_rent:'',driver_salary:'',fuel_responsible:'',repair_responsible:'',driver_provider:'',driver_paid_by:'',clauses:'',overtime_rate:'',overtime_unit:'',effective_from:NEXT_MONTH,reason:''});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open){setF({customer_rent:String(Number(current.customer_rent)),owner_rent:String(Number(current.owner_rent)),driver_salary:String(Number(current.driver_salary)),fuel_responsible:current.fuel_responsible,repair_responsible:current.repair_responsible,driver_provider:current.driver_provider,driver_paid_by:current.driver_paid_by,clauses:current.clauses,overtime_rate:current.overtime_rate?String(Number(current.overtime_rate)):'',overtime_unit:current.overtime_unit||'',effective_from:NEXT_MONTH,reason:''});setError('')}},[open,current]);
 const set=(k:keyof typeof f)=>(v:string)=>setF(x=>({...x,[k]:v}));
 const noDriver=f.driver_provider==='none';
 const operatorPays=f.driver_paid_by==='operator'&&!noDriver;
 const day=Number(f.effective_from.slice(8,10));

 const submit=async()=>{
  if(!orgId)return;
  const changes:Record<string,string>={};
  (['customer_rent','owner_rent'] as const).forEach(k=>{if(Number(f[k])!==Number(current[k]))changes[k]=String(Number(f[k]))});
  const salary=operatorPays?Number(f.driver_salary):0;
  const rate=f.overtime_rate.trim()?Number(f.overtime_rate):null;
  if(rate!==null&&rate!==Number(current.overtime_rate??0))changes.overtime_rate=String(rate);
  if(f.overtime_unit.trim()!==(current.overtime_unit||'')&&f.overtime_unit.trim())changes.overtime_unit=f.overtime_unit.trim();
  if(salary!==Number(current.driver_salary))changes.driver_salary=String(salary);
  (['fuel_responsible','repair_responsible','driver_provider','driver_paid_by','clauses'] as const).forEach(k=>{if(f[k]!==current[k])changes[k]=f[k]});
  if(noDriver&&Number(current.driver_salary)!==0)changes.driver_salary='0';
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
    {day>1&&<p className="note">Terms change at a month boundary: a mid-month date applies from the next period.</p>}
    <label>Customer rent / month (৳)<Input inputMode="numeric" value={f.customer_rent} onChange={e=>set('customer_rent')(e.target.value)}/></label>
    <label>Owner rent / month (৳)<Input inputMode="numeric" value={f.owner_rent} onChange={e=>set('owner_rent')(e.target.value)}/></label>
    <Pick label="Who supplies the driver" value={f.driver_provider} onChange={set('driver_provider')} options={providers}/>
    {noDriver
     ?<p className="note">Vehicle only: no driver and no salary on this agreement from this date. A driver can still work for you under a separate driver agreement (Drivers page).</p>
     :<>
      <Pick label="Who pays the driver" value={f.driver_paid_by} onChange={set('driver_paid_by')} options={plain(roles)}/>
      {operatorPays
       ?<label>Driver salary / month (৳)<Input inputMode="numeric" value={f.driver_salary} onChange={e=>set('driver_salary')(e.target.value)}/></label>
       :<p className="note">The {f.driver_paid_by} pays the driver, so salary is 0 and no salary is payable on the statement.</p>}
     </>}
    <label>Overtime rate (optional, ৳ per unit)<Input inputMode="decimal" value={f.overtime_rate} onChange={e=>set('overtime_rate')(e.target.value)} placeholder="Suggested when you add an overtime charge"/></label>
    <label>Overtime unit (optional)<Input value={f.overtime_unit} onChange={e=>set('overtime_unit')(e.target.value)} placeholder="hour, day, km"/></label>
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
