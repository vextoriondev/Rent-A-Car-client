"use client";
import {useEffect,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {apiMode,apiRequest,branchLocked} from '@/lib/api';
import {setBranch,useBranch} from '@/lib/branch';
import {useRentflowStore} from '@/lib/store-context';
import {DropdownMenu,DropdownMenuContent,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

export type BranchRow={id:number;name:string};

/** API mode: the branches of the organisation (a branch-limited member is only sent their own by the server). */
export function useBranches(){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [branches,setBranches]=useState<BranchRow[]>([]);
 useEffect(()=>{
  if(!apiMode||!orgId)return;
  let stale=false;
  apiRequest(`/orgs/${orgId}/branches`).then(rows=>{if(!stale)setBranches(rows)}).catch(()=>{if(!stale)setBranches([])});
  return()=>{stale=true};
 },[orgId]);
 return branches;
}

/** Sidebar workspace button. Admins and members without a branch pick "All branches" or one branch (every screen then reloads for it);
 * a branch-limited member sees their own branch name and no menu, because the server confines them anyway. */
export function BranchSwitcher(){
 const {store}=useRentflowStore();
 const chosen=useBranch();
 const branches=useBranches();
 const role=store.backend?.role,own=store.backend?.branch;
 const locked=branchLocked(role,own);
 // A remembered branch that no longer exists must not hide every record.
 useEffect(()=>{if(chosen&&branches.length&&!branches.some(b=>b.id===chosen))setBranch(null)},[chosen,branches]);
 if(!apiMode)return null;
 const label=locked?own!.name:chosen?branches.find(b=>b.id===chosen)?.name??'Branch':'All branches';
 const body=<><div className="workspace-icon">R</div><div><strong>RentFlow HQ</strong><small>{label}</small></div>{!locked&&<ChevronRight size={16}/>}</>;
 if(locked)return <div className="workspace" aria-label={`Branch ${own!.name}`}>{body}</div>;
 return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="workspace" aria-label="Switch branch">{body}</button></DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>Branch</DropdownMenuLabel>
   <DropdownMenuRadioGroup value={chosen?String(chosen):'all'} onValueChange={v=>setBranch(v==='all'?null:Number(v))}>
    <DropdownMenuRadioItem value="all">All branches</DropdownMenuRadioItem>
    {branches.map(b=><DropdownMenuRadioItem key={b.id} value={String(b.id)}>{b.name}</DropdownMenuRadioItem>)}
   </DropdownMenuRadioGroup>
  </DropdownMenuContent></DropdownMenu>;
}
