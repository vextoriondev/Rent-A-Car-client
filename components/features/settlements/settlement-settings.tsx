"use client";
import {useEffect,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {SectionHeading} from '@/components/shared/section-heading';

type Cfg={cutoff_day:number;approval_role:'admin'|'accountant';negative_owner_blocks_close:boolean};

/** API mode: who may approve a settlement and whether a negative owner balance blocks closing. Only admins can change it; the server enforces that. */
export function SettlementSettings(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const [cfg,setCfg]=useState<Cfg|null>(null);
 const [note,setNote]=useState('');
 useEffect(()=>{if(!orgId)return;apiRequest(`/orgs/${orgId}/settlement-settings`).then(setCfg).catch(e=>setNote((e as Error).message))},[orgId]);
 if(!orgId)return null;
 const save=async()=>{
  if(!cfg)return;setNote('');
  try{setCfg(await apiRequest(`/orgs/${orgId}/settlement-settings`,{method:'PUT',body:JSON.stringify({approval_role:cfg.approval_role,negative_owner_blocks_close:cfg.negative_owner_blocks_close})}));setNote('Settlement rules saved.')}
  catch(e){setNote((e as Error).message)}
 };
 return <Card>
  <SectionHeading title="Settlement rules" subtitle="Applies to every month-end close."/>
  {!cfg&&!note&&<p className="settings-copy">Loading...</p>}
  {cfg&&<div className="entry-form">
   <label>Who can approve a settlement
    <Select value={cfg.approval_role} onValueChange={v=>setCfg({...cfg,approval_role:v as Cfg['approval_role']})}><SelectTrigger aria-label="Approval role"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="admin">Admin only</SelectItem><SelectItem value="accountant">Admin or accountant</SelectItem></SelectContent></Select>
   </label>
   <label className="check-label"><Checkbox checked={cfg.negative_owner_blocks_close} onCheckedChange={c=>setCfg({...cfg,negative_owner_blocks_close:c===true})} aria-label="Negative owner balance blocks closing"/> A negative owner balance (owner owes the operator) blocks closing</label>
   <p className="settings-copy">Cut-off is the calendar month end.</p>
   <div><Button onClick={()=>void save()}>Save rules</Button></div>
  </div>}
  {note&&<p role="status" className="note">{note}</p>}
 </Card>;
}
