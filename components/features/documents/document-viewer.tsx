"use client";
import {useEffect,useState} from 'react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';
import {Card} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {EmptyState} from '@/components/shared/empty-state';
import {SectionHeading} from '@/components/shared/section-heading';
import {DocumentList} from '@/components/features/documents/document-list';

type Vehicle={id:number;registration:string;model_name:string};

/** API mode: pick a vehicle or an expense and see, open, add and remove its files. Demo mode keeps the note. */
export function DocumentViewer(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [kind,setKind]=useQueryParam('kind','vehicle');
 const [target,setTarget]=useQueryParam('target','');
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 useEffect(()=>{if(apiMode&&orgId)apiRequest(`/orgs/${orgId}/vehicles?limit=200`).then(r=>setVehicles(r.items)).catch(()=>{})},[orgId]);
 if(!apiMode)return <Card><SectionHeading title="Documents" subtitle="Receipts, agreements and statements linked to their source records."/><EmptyState title="API mode only" description="File upload needs the Django backend with private storage. This demo does not keep files."/></Card>;
 const expenses=Object.entries(rf.store.backend?.expenseIds||{});
 const options=kind==='vehicle'?vehicles.map(v=>({value:String(v.id),label:`${v.registration} · ${v.model_name}`})):expenses.map(([label,id])=>({value:String(id),label}));
 return <Card>
  <SectionHeading title="Documents" subtitle="Receipts and files kept privately and opened through short-lived links. Choose a record to see its files."/>
  <div className="billing-toolbar">
   <label>Files for
    <Select value={kind} onValueChange={v=>{setKind(v);setTarget('')}}><SelectTrigger aria-label="Files for"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="vehicle">A vehicle</SelectItem><SelectItem value="expense">An expense</SelectItem></SelectContent></Select>
   </label>
   <label>Record
    <Select value={target} onValueChange={setTarget}><SelectTrigger aria-label="Record"><SelectValue placeholder="Choose a record"/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
   </label>
  </div>
  {target?<DocumentList key={kind+target} targetType={kind} targetId={Number(target)} title="Files"/>:<EmptyState title="Choose a record to see its files"/>}
 </Card>;
}
