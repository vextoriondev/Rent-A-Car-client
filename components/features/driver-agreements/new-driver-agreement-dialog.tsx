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
import type {Option} from './types';

const NEW='new';
const NONE='none';

/** Creates a standalone driver agreement (POST /driver-agreements). The driver is picked from existing drivers or typed in as a new one. */
export function NewDriverAgreementDialog({open,onClose,onDone}:{open:boolean;onClose:()=>void;onDone:(message:string,id:number)=>Promise<void>}){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [drivers,setDrivers]=useState<Option[]|null>(null);
 const [vehicles,setVehicles]=useState<{id:number;registration:string;model_name:string}[]>([]);
 const [driver,setDriver]=useState(NEW);
 const [name,setName]=useState('');
 const [vehicle,setVehicle]=useState(NONE);
 const [start,setStart]=useState('');
 const [end,setEnd]=useState('');
 const [salary,setSalary]=useState('');
 const [terms,setTerms]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!open||!orgId)return;
  setDriver(NEW);setName('');setVehicle(NONE);setStart(new Date().toISOString().slice(0,10));setEnd('');setSalary('');setTerms('');setError('');setDrivers(null);
  apiRequest(`/orgs/${orgId}/parties?kind=driver&limit=200`).then(r=>{setDrivers(r.items);if(r.items.length)setDriver(String(r.items[0].id))}).catch(e=>setError((e as Error).message));
  apiRequest(`/orgs/${orgId}/vehicles?limit=200`).then(r=>setVehicles(r.items)).catch(()=>undefined);
 },[open,orgId]);

 const creatingDriver=driver===NEW;
 const valid=Number(salary)>0&&!!start&&(!creatingDriver||name.trim().length>0)&&(!end||end>=start);
 const submit=async()=>{
  if(!orgId)return;
  setBusy(true);setError('');
  try{
   let driverId=Number(driver);
   if(creatingDriver){const p=await livePost(orgId,'/parties',{kind:'driver',name:name.trim()});driverId=p.id}
   const a=await livePost(orgId,'/driver-agreements',{driver_id:driverId,start_date:start,end_date:end||null,salary:String(Number(salary)),terms:terms.trim(),vehicle_id:vehicle===NONE?null:Number(vehicle)});
   const w:string[]=a.warnings||[];
   await onDone(`Driver agreement ${a.ref} created.`+(w.length?' Warnings: '+w.join(' '):''),a.id);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };

 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="entry-dialog">
   <DialogHeader><DialogTitle>New driver agreement</DialogTitle><DialogDescription>A simple salary and staff arrangement with a driver, outside any vehicle agreement. You issue each month&apos;s salary from the agreement.</DialogDescription></DialogHeader>
   <div className="entry-form">
    <label>Driver
     <Select value={driver} onValueChange={setDriver}><SelectTrigger aria-label="Driver"><SelectValue/></SelectTrigger><SelectContent>{(drivers||[]).map(d=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}<SelectItem value={NEW}>A new driver...</SelectItem></SelectContent></Select>
    </label>
    {creatingDriver&&<label>New driver&apos;s name<Input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/></label>}
    <label>Usual vehicle (optional)
     <Select value={vehicle} onValueChange={setVehicle}><SelectTrigger aria-label="Usual vehicle"><SelectValue/></SelectTrigger><SelectContent><SelectItem value={NONE}>No particular vehicle</SelectItem>{vehicles.map(v=><SelectItem key={v.id} value={String(v.id)}>{v.registration} · {v.model_name}</SelectItem>)}</SelectContent></Select>
    </label>
    <label>Starts<Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label>Ends (optional)<Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <label>Salary / month (৳)<Input inputMode="numeric" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="0"/></label>
    <label>Staff terms (optional)<Textarea rows={3} value={terms} onChange={e=>setTerms(e.target.value)} placeholder="Duties, days off, allowances"/></label>
    {end&&end<start&&<p className="form-error" role="alert">The end date is before the start date.</p>}
    {error&&<ErrorState message={error}/>}
    <div className="sheet-footer"><Button disabled={busy||!valid} onClick={()=>void submit()}>Create driver agreement</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
   </div>
  </DialogContent>
 </Dialog>;
}
