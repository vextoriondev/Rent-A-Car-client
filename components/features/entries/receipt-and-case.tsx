"use client";
import {useEffect,useMemo,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {ACCEPT,fileProblem} from '@/components/features/documents/document-list';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {t} from '@/lib/copy';

type Case={id:number;vehicle_id:number;issue:string;status:string};
type Vehicle={id:number;registration:string};
const NONE='none';

/** API mode, expenses only: attach a receipt file (previewed here, uploaded right after the entry is saved) and link the cost to an open maintenance case of the same car. */
export function ReceiptAndCase({agreementId,file,onFile,caseId,onCase}:{agreementId:string;file:File|null;onFile:(f:File|null)=>void;caseId:string;onCase:(v:string)=>void}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const agreement=rf.store.agreements.find(a=>a.id===agreementId);
 const [cases,setCases]=useState<Case[]>([]);
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [problem,setProblem]=useState('');
 useEffect(()=>{
  if(!orgId)return;
  Promise.all([apiRequest(`/orgs/${orgId}/maintenance-cases?limit=200`),apiRequest(`/orgs/${orgId}/vehicles?limit=200`)])
   .then(([c,v])=>{setCases(c.items);setVehicles(v.items)}).catch(()=>{});
 },[orgId]);
 const vehicleId=vehicles.find(v=>v.registration===agreement?.registration)?.id;
 const options=useMemo(()=>cases.filter(c=>c.vehicle_id===vehicleId&&['approved','in_progress'].includes(c.status)),[cases,vehicleId]);
 const preview=useMemo(()=>file&&file.type.startsWith('image/')?URL.createObjectURL(file):'',[file]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);

 return <>
  <label>{t('entry.receiptFile')}
   <Input key={file?.name||'none'} type="file" accept={ACCEPT} onChange={e=>{const f=e.target.files?.[0]||null;const p=f?fileProblem(f):'';setProblem(p);onFile(p?null:f)}}/>
   <small className="hint">{t('entries.receiptAndCase.pdfPngJpegOr')}</small>
  </label>
  {problem&&<p role="alert" className="form-error">{problem}</p>}
  {file&&<div className="receipt-pick">{preview&&/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt={t('entry.previewAlt',{name: file.name})}/>}<span>{file.name}</span><button type="button" className="remove-receipt" onClick={()=>onFile(null)}>{t('entries.receiptAndCase.remove')}</button></div>}
  {options.length>0&&<label>{t('entry.repairJob')}
   <Select value={caseId||NONE} onValueChange={v=>onCase(v===NONE?'':v)}><SelectTrigger aria-label={t('entries.receiptAndCase.maintenanceCase')}><SelectValue/></SelectTrigger>
    <SelectContent><SelectItem value={NONE}>{t('entries.receiptAndCase.notLinked')}</SelectItem>{options.map(c=><SelectItem key={c.id} value={String(c.id)}>#{c.id} · {c.issue}</SelectItem>)}</SelectContent></Select>
  </label>}
 </>;
}
