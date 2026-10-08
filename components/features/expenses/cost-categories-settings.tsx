"use client";
import {useState} from 'react';
import Link from 'next/link';
import {apiRequest} from '@/lib/api';
import {useExpenseCategories} from '@/lib/use-expense-categories';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {SectionHeading} from '@/components/shared/section-heading';

/** API mode: create, rename and deactivate expense categories. Deactivated ones stay in history, filters and reports but are refused on new entries. The code never changes. Admin only; the server enforces it. */
export function CostCategoriesSettings(){
 const {categories,error,reload,orgId}=useExpenseCategories();
 const [name,setName]=useState('');
 const [editing,setEditing]=useState<{id:number;name:string}|null>(null);
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 if(!orgId)return null;
 const run=async(fn:()=>Promise<unknown>,done:string)=>{
  setBusy(true);setNote('');
  try{await fn();await reload();setNote(done);return true}catch(e){setNote((e as Error).message);return false}finally{setBusy(false)}
 };
 const patch=(id:number,body:object)=>apiRequest(`/orgs/${orgId}/expense-categories/${id}`,{method:'PATCH',body:JSON.stringify(body)});
 const add=async()=>{
  const n=name.trim();if(!n){setNote('Enter a name for the category.');return}
  const code=n.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  if(!code){setNote('Use letters or numbers in the name.');return}
  if(await run(()=>apiRequest(`/orgs/${orgId}/expense-categories`,{method:'POST',body:JSON.stringify({code,name:n})}),`Added "${n}".`))setName('');
 };
 const rename=async()=>{
  if(!editing)return;
  if(await run(()=>patch(editing.id,{name:editing.name}),'Category renamed.'))setEditing(null);
 };
 return <Card>
  <SectionHeading title="Cost categories" subtitle="Deactivated categories stay in history and reports but cannot be chosen on new entries."/>
  {!categories&&!error&&<p className="settings-copy">Loading...</p>}
  {error&&<p role="alert" className="note">{error}</p>}
  {categories&&<ul className="category-list">
   {categories.map(c=><li key={c.id} className="category-row">
    {editing?.id===c.id
     ?<><Input aria-label={`New name for ${c.name}`} value={editing.name} onChange={e=>setEditing({id:c.id,name:e.target.value})}/><Button size="sm" disabled={busy} onClick={()=>void rename()}>Save</Button><Button size="sm" variant="outline" onClick={()=>setEditing(null)}>Cancel</Button></>
     :<><span className="category-name"><Link href={`/expenses/categories/${c.code}`}>{c.name}</Link> <small className="hint">{c.code}</small></span>
      <Badge tone={c.active?'good':'neutral'}>{c.active?'Active':'Inactive'}</Badge>
      <Button size="sm" variant="outline" aria-label={`Rename ${c.name}`} onClick={()=>setEditing({id:c.id,name:c.name})}>Rename</Button>
      <Button size="sm" variant="outline" disabled={busy} aria-label={`${c.active?'Deactivate':'Reactivate'} ${c.name}`} onClick={()=>void run(()=>patch(c.id,{active:!c.active}),c.active?`"${c.name}" deactivated.`:`"${c.name}" is active again.`)}>{c.active?'Deactivate':'Reactivate'}</Button></>}
   </li>)}
  </ul>}
  <div className="category-add">
   <Input aria-label="New category name" value={name} placeholder="New category, e.g. Insurance" onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void add()}}/>
   <Button disabled={busy} onClick={()=>void add()}>Add category</Button>
  </div>
  {note&&<p role="status" className="note">{note}</p>}
 </Card>;
}
