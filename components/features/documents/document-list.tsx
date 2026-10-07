"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {FileText,Paperclip,Trash2} from 'lucide-react';
import {apiRequest,apiUpload} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {ErrorState} from '@/components/shared/error-state';

export type DocumentRow={id:number;name:string;content_type:string;size:number;created_at:string};
export const ACCEPT='application/pdf,image/png,image/jpeg,image/webp';
export const MAX_BYTES=10*1024*1024;
const ALLOWED=ACCEPT.split(',');
/** Client-side check that mirrors the server rules, so the message appears before anything is sent. */
export const fileProblem=(f:File)=>!ALLOWED.includes(f.type)?'Only PDF, PNG, JPEG or WebP files are allowed.':f.size>MAX_BYTES?'Files may be at most 10 MB.':'';
const kb=(n:number)=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';

/** Files attached to one record (expense, vehicle, maintenance case...). Open uses a short-lived signed link; the server decides who may see or remove a file. */
export function DocumentList({targetType,targetId,title='Documents'}:{targetType:string;targetId:number;title?:string}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [docs,setDocs]=useState<DocumentRow[]|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const input=useRef<HTMLInputElement>(null);

 const load=useCallback(async()=>{
  if(!orgId)return;
  try{setDocs(await apiRequest(`/orgs/${orgId}/documents?target_type=${targetType}&target_id=${targetId}`));setError('')}
  catch(e){setError((e as Error).message)}
 },[orgId,targetType,targetId]);
 useEffect(()=>{setDocs(null);setMessage('');void load()},[load]);

 const upload=async(file?:File)=>{
  if(!file||!orgId)return;
  const problem=fileProblem(file);if(problem){setMessage(problem);return}
  setBusy(true);setMessage('');
  try{const form=new FormData();form.append('target_type',targetType);form.append('target_id',String(targetId));form.append('file',file);await apiUpload(`/orgs/${orgId}/documents`,form);await load();setMessage(`${file.name} uploaded.`)}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false);if(input.current)input.current.value=''}
 };
 const open=async(d:DocumentRow)=>{
  if(!orgId)return;
  try{const r=await apiRequest(`/orgs/${orgId}/documents/${d.id}/url`);window.open('/backend'+r.url,'_blank','noopener')}
  catch(e){setMessage((e as Error).message)}
 };
 const remove=async(d:DocumentRow)=>{
  if(!orgId||!window.confirm(`Remove ${d.name}? This is recorded in the audit log.`))return;
  try{await apiRequest(`/orgs/${orgId}/documents/${d.id}`,{method:'DELETE'});await load();setMessage(`${d.name} removed.`)}
  catch(e){setMessage((e as Error).message)}
 };

 return <div className="doc-list">
  <div className="settlement-status"><h3 className="detail-subheading">{title}</h3>
   <Button size="sm" variant="outline" disabled={busy} onClick={()=>input.current?.click()}><Paperclip size={14}/> Add file</Button>
   <input ref={input} type="file" hidden accept={ACCEPT} aria-label={`Upload to ${title}`} onChange={e=>void upload(e.target.files?.[0])}/>
  </div>
  {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
  {message&&<p role="status" className="note">{message}</p>}
  {docs&&docs.length===0&&<p className="note">No files yet. PDF, PNG, JPEG or WebP, up to 10 MB.</p>}
  {docs&&docs.map(d=><div key={d.id} className="doc-row"><FileText size={16}/><span><b>{d.name}</b><small>{kb(d.size)} · {d.created_at.slice(0,10)}</small></span>
   <Button size="sm" variant="outline" onClick={()=>void open(d)} aria-label={`Open ${d.name}`}>Open</Button>
   <Button size="sm" variant="outline" onClick={()=>void remove(d)} aria-label={`Remove ${d.name}`}><Trash2 size={14}/></Button></div>)}
 </div>;
}
