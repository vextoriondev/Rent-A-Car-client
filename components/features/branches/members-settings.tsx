"use client";
import {useCallback,useEffect,useState} from 'react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {SectionHeading} from '@/components/shared/section-heading';
import {useBranches} from './branch-switcher';

type Member={id:number;user_id:number;username:string;role:string;branch:{id:number;name:string}|null};
const ROLES=['admin','accountant','operations','viewer','mechanic'];
const NONE='none';

/** API mode, admin only: who can sign in, with which role and branch, and a place to add branches. The server enforces admin-only, the last-admin rule and the role list. */
export function MembersSettings(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const branches=useBranches();
 const [members,setMembers]=useState<Member[]|null>(null);
 const [error,setError]=useState('');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState('');
 const [extra,setExtra]=useState<{id:number;name:string}[]>([]);
 const load=useCallback(async()=>{
  if(!apiMode||!orgId)return;
  try{setMembers(await apiRequest(`/orgs/${orgId}/members`));setError('')}
  catch(e){setMembers([]);setError((e as Error).message)}
 },[orgId]);
 useEffect(()=>{void load()},[load]);
 if(!orgId)return null;
 const all=[...branches,...extra.filter(x=>!branches.some(b=>b.id===x.id))];
 const patch=async(m:Member,body:object,done:string)=>{
  setBusy(true);setNote('');
  try{await apiRequest(`/orgs/${orgId}/members/${m.id}`,{method:'PATCH',body:JSON.stringify(body)});await load();setNote(done)}
  catch(e){setNote((e as Error).message)}finally{setBusy(false)}
 };
 const addBranch=async()=>{
  const n=name.trim();if(!n){setNote('Enter a name for the branch.');return}
  setBusy(true);setNote('');
  try{const b=await apiRequest(`/orgs/${orgId}/branches`,{method:'POST',body:JSON.stringify({name:n})});setExtra(x=>[...x,b]);setName('');setNote(`Added branch "${n}". Reload to see it in the switcher.`)}
  catch(e){setNote((e as Error).message)}finally{setBusy(false)}
 };
 return <Card>
  <SectionHeading title="Users and branches" subtitle="A user with a branch sees only that branch. Admins always see every branch."/>
  {!members&&!error&&<p className="settings-copy">Loading...</p>}
  {error&&<p role="alert" className="note">{error}</p>}
  {members&&members.length>0&&<ul className="category-list">
   {members.map(m=><li key={m.id} className="category-row">
    <span className="category-name"><b>{m.username}</b></span>
    <Select value={m.role} disabled={busy} onValueChange={v=>void patch(m,{role:v},`${m.username} is now ${v}.`)}>
     <SelectTrigger aria-label={`Role of ${m.username}`}><SelectValue/></SelectTrigger>
     <SelectContent>{ROLES.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={m.branch?String(m.branch.id):NONE} disabled={busy} onValueChange={v=>void patch(m,v===NONE?{clear_branch:true}:{branch_id:Number(v)},v===NONE?`${m.username} now sees every branch.`:`${m.username} is limited to that branch.`)}>
     <SelectTrigger aria-label={`Branch of ${m.username}`}><SelectValue/></SelectTrigger>
     <SelectContent><SelectItem value={NONE}>All branches</SelectItem>{all.map(b=><SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
    </Select>
   </li>)}
  </ul>}
  <div className="category-add">
   <Input aria-label="New branch name" value={name} placeholder="New branch, e.g. Sylhet" onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void addBranch()}}/>
   <Button disabled={busy} onClick={()=>void addBranch()}>Add branch</Button>
  </div>
  {note&&<p role="status" className="note">{note}</p>}
 </Card>;
}
