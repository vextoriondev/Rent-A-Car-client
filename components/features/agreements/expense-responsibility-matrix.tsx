"use client";
import {useCallback,useEffect,useState} from 'react';
import type {Agreement} from '@/lib/demo';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ErrorState} from '@/components/shared/error-state';

type Category={code:string;name:string;active:boolean};
type Rule={category:string;responsible:string;first_payer:string;deductible_from:string;approval_threshold:string|null;proof_required:boolean};
type Version={id:number;number:number;effective_from:string;rules:Rule[]};
const PARTIES=['operator','owner','customer','driver'];
const label=(x:string)=>x.charAt(0).toUpperCase()+x.slice(1);

/** Demo mode: read-only fuel/repair rows. API mode: the editable per-category matrix of the agreement's latest terms version. */
export function ExpenseResponsibilityMatrix({agreement}:{agreement:Agreement}){
 if(!apiMode)return <ReadOnlyMatrix agreement={agreement}/>;
 return <EditableMatrix agreement={agreement}/>;
}

function ReadOnlyMatrix({agreement}:{agreement:Agreement}){
 const rows:[string,string][]=[['Fuel',agreement.rules.fuel],['Repair',agreement.rules.repair]];
 return <div>
  <h3 className="detail-subheading">Expense responsibility</h3>
  <div className="terms">{rows.map(([category,responsible])=><div key={category}><span>{category}</span><b>{responsible}</b></div>)}</div>
 </div>;
}

function EditableMatrix({agreement}:{agreement:Agreement}){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const agreementId=agreement.id.replace('AGR-','');
 const [categories,setCategories]=useState<Category[]>([]);
 const [version,setVersion]=useState<Version|null>(null);
 const [rows,setRows]=useState<Record<string,Rule>>({});
 const [error,setError]=useState('');
 const [rowNote,setRowNote]=useState<{code:string;text:string;bad:boolean}|null>(null);
 const [frozen,setFrozen]=useState('');
 const [busy,setBusy]=useState('');

 const load=useCallback(async()=>{
  if(!orgId)return;
  try{
   const [cats,detail]=await Promise.all([apiRequest(`/orgs/${orgId}/expense-categories`),apiRequest(`/orgs/${orgId}/agreements/${agreementId}`)]);
   const latest:Version=[...detail.versions].sort((a:Version,b:Version)=>b.number-a.number)[0];
   setCategories(cats.filter((c:Category)=>c.active));setVersion(latest);
   setRows(Object.fromEntries(latest.rules.map(r=>[r.category,r])));setError('');
  }catch(e){setError((e as Error).message)}
 },[orgId,agreementId]);
 useEffect(()=>{void load()},[load]);

 if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
 if(!version)return <div><h3 className="detail-subheading">Expense responsibility</h3><p className="note">Loading rules...</p></div>;

 const rowFor=(code:string):Rule=>rows[code]||{category:code,responsible:'owner',first_payer:'operator',deductible_from:'none',approval_threshold:null,proof_required:false};
 const patch=(code:string,change:Partial<Rule>)=>setRows(r=>({...r,[code]:{...rowFor(code),...change}}));
 const hasRule=(code:string)=>version.rules.some(r=>r.category===code);

 const save=async(code:string)=>{
  const r=rowFor(code);setBusy(code);setRowNote(null);
  try{
   await apiRequest(`/orgs/${orgId}/agreement-versions/${version.id}/rules/${code}`,{method:'PUT',body:JSON.stringify({responsible:r.responsible,first_payer:r.first_payer,deductible_from:r.deductible_from,approval_threshold:r.approval_threshold||null,proof_required:r.proof_required})});
   setRowNote({code,text:'Rule saved.',bad:false});await load();
  }catch(e){const m=(e as Error).message;if(/already recorded/i.test(m))setFrozen(m);setRowNote({code,text:m,bad:true})}finally{setBusy('')}
 };
 const clear=async(code:string)=>{
  setBusy(code);setRowNote(null);
  try{await apiRequest(`/orgs/${orgId}/agreement-versions/${version.id}/rules/${code}`,{method:'DELETE'});setRowNote({code,text:'Rule removed; the category has no fixed responsibility.',bad:false});await load()}
  catch(e){const m=(e as Error).message;if(/already recorded/i.test(m))setFrozen(m);setRowNote({code,text:m,bad:true})}finally{setBusy('')}
 };

 const partySelect=(code:string,field:'responsible'|'first_payer',name:string)=><Select value={rowFor(code)[field]} onValueChange={v=>patch(code,{[field]:v})}><SelectTrigger aria-label={`${name} for ${code}`}><SelectValue/></SelectTrigger><SelectContent>{PARTIES.map(p=><SelectItem value={p} key={p}>{label(p)}</SelectItem>)}</SelectContent></Select>;

 return <div>
  <h3 className="detail-subheading">Expense responsibility (terms version {version.number}, from {version.effective_from})</h3>
  <p className="note">Who is responsible, who pays first, whether the cost is deducted from the owner, and whether a receipt is required, per category. An entry that differs from its rule needs an override reason and approval. Rules are frozen once a month has been issued under this version; revise the terms to change them.</p>
  {frozen&&<p role="alert" className="note"><b>A category is locked.</b> Costs of that category were already recorded under terms version {version.number}, so its rule can no longer change (it would rewrite history). Other categories stay editable. To change a locked one, use <b>Revise terms</b> above with a later effective date; the new version keeps the current rules until you edit them.</p>}
  <div className="rule-wrap"><div className="rule-matrix" role="table" aria-label="Expense rules by category">
   <div role="row" className="rule-row rule-head"><span role="columnheader">Category</span><span role="columnheader">Responsible</span><span role="columnheader">Pays first</span><span role="columnheader">Deduct from owner</span><span role="columnheader">Receipt</span><span role="columnheader">Rule</span></div>
   {categories.map(c=>{const r=rowFor(c.code);const owned=hasRule(c.code);return <div role="row" className="rule-row" key={c.code}>
    <span role="cell"><b>{c.name}</b>{!owned&&<small> no rule</small>}</span>
    <span role="cell" data-label="Responsible">{partySelect(c.code,'responsible','Responsible')}</span>
    <span role="cell" data-label="Pays first">{partySelect(c.code,'first_payer','Pays first')}</span>
    <span role="cell" data-label="Deduct from owner"><Select value={r.deductible_from} onValueChange={v=>patch(c.code,{deductible_from:v})}><SelectTrigger aria-label={`Deduct from owner for ${c.code}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No</SelectItem><SelectItem value="owner_payable">Yes, from owner payable</SelectItem></SelectContent></Select></span>
    <span role="cell" data-label="Receipt"><label className="check-label"><Checkbox checked={r.proof_required} onCheckedChange={v=>patch(c.code,{proof_required:v===true})} aria-label={`Receipt required for ${c.code}`}/> Required</label></span>
    <span role="cell" className="rule-actions"><Button size="sm" disabled={busy===c.code} onClick={()=>void save(c.code)}>{owned?'Update':'Set rule'}</Button>{owned&&<Button size="sm" variant="outline" disabled={busy===c.code} onClick={()=>void clear(c.code)}>Remove rule</Button>}{rowNote?.code===c.code&&<small role="status" style={{flexBasis:'100%',fontSize:12,color:rowNote.bad?'#b42318':'#067647'}}>{rowNote.text}</small>}</span>
   </div>})}
  </div></div>
 </div>;
}
