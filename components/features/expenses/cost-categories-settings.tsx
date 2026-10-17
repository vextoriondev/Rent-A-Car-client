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
import {t} from '@/lib/copy';
import {categoryName} from '@/lib/copy/labels';

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
  const n=name.trim();if(!n){setNote(t('expenses.costCategoriesSettings.enterANameFor'));return}
  const code=n.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  if(!code){setNote(t('expenses.costCategoriesSettings.useLettersOrNumbers'));return}
  if(await run(()=>apiRequest(`/orgs/${orgId}/expense-categories`,{method:'POST',body:JSON.stringify({code,name:n})}),t('cats.added',{name: n})))setName('');
 };
 const rename=async()=>{
  if(!editing)return;
  if(await run(()=>patch(editing.id,{name:editing.name}),t('cats.renamed')))setEditing(null);
 };
 return <Card>
  <SectionHeading title={t('common.costCategories')} subtitle={t('expenses.costCategoriesSettings.deactivatedCategoriesStayIn')}/>
  {!categories&&!error&&<p className="settings-copy">{t('cats.loading')}</p>}
  {error&&<p role="alert" className="note">{error}</p>}
  {categories&&<ul className="category-list">
   {categories.map(c=><li key={c.id} className="category-row">
    {editing?.id===c.id
     ?<><Input aria-label={t('cats.ariaNewName',{name: categoryName(c.code,c.name)})} value={editing.name} onChange={e=>setEditing({id:c.id,name:e.target.value})}/><Button size="sm" disabled={busy} onClick={()=>void rename()}>{t('common.save')}</Button><Button size="sm" variant="outline" onClick={()=>setEditing(null)}>{t('common.cancel')}</Button></>
     :<><span className="category-name"><Link href={`/expenses/categories/${c.code}`}>{categoryName(c.code,c.name)}</Link></span>
      <Badge tone={c.active?'good':'neutral'}>{c.active?t('cats.active'):t('cats.inactive')}</Badge>
      <Button size="sm" variant="outline" aria-label={t('cats.ariaRename',{name: categoryName(c.code,c.name)})} onClick={()=>setEditing({id:c.id,name:c.name})}>{t('expenses.costCategoriesSettings.rename')}</Button>
      <Button size="sm" variant="outline" disabled={busy} aria-label={t(c.active?'cats.ariaToggleOff':'cats.ariaToggleOn',{name: categoryName(c.code,c.name)})} onClick={()=>void run(()=>patch(c.id,{active:!c.active}),c.active?t('cats.off',{name: categoryName(c.code,c.name)}):t('cats.on',{name: categoryName(c.code,c.name)}))}>{c.active?t('cats.toggleOff'):t('cats.toggleOn')}</Button></>}
   </li>)}
  </ul>}
  <div className="category-add">
   <Input aria-label={t('expenses.costCategoriesSettings.newCategoryName')} value={name} placeholder={t('expenses.costCategoriesSettings.newCategoryEG')} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void add()}}/>
   <Button disabled={busy} onClick={()=>void add()}>{t('expenses.costCategoriesSettings.addCategory')}</Button>
  </div>
  {note&&<p role="status" className="note">{note}</p>}
 </Card>;
}
