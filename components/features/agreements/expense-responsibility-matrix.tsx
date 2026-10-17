"use client";
import {useCallback,useEffect,useState} from 'react';
import type {Agreement} from '@/lib/demo';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ErrorState} from '@/components/shared/error-state';
import {t} from '@/lib/copy';
import {fmtDay} from '@/lib/format';
import {categoryName,partyLabel} from '@/lib/copy/labels';

type Category={code:string;name:string;active:boolean};
type Rule={category:string;responsible:string;first_payer:string;deductible_from:string;approval_threshold:string|null;proof_required:boolean};
type Version={id:number;number:number;effective_from:string;rules:Rule[]};
const PARTIES=['operator','owner','customer','driver'];
const label=(x:string)=>partyLabel(x);

/** Demo mode: read-only fuel/repair rows. API mode: the editable per-category matrix of the agreement's latest terms version. */
export function ExpenseResponsibilityMatrix({agreement}:{agreement:Agreement}){
 if(!apiMode)return <ReadOnlyMatrix agreement={agreement}/>;
 return <EditableMatrix agreement={agreement}/>;
}

function ReadOnlyMatrix({agreement}:{agreement:Agreement}){
 const rows:[string,string][]=[[t('matrix.fuel'),partyLabel(agreement.rules.fuel)],[t('matrix.repair'),partyLabel(agreement.rules.repair)]];
 return <div>
  <h3 className="detail-subheading">{t('agreements.expenseResponsibilityMatrix.expenseResponsibility')}</h3>
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
 if(!version)return <div><h3 className="detail-subheading">{t('agreements.expenseResponsibilityMatrix.expenseResponsibility')}</h3><p className="note">{t('agreements.expenseResponsibilityMatrix.loadingRules')}</p></div>;

 const rowFor=(code:string):Rule=>rows[code]||{category:code,responsible:'owner',first_payer:'operator',deductible_from:'none',approval_threshold:null,proof_required:false};
 const patch=(code:string,change:Partial<Rule>)=>setRows(r=>({...r,[code]:{...rowFor(code),...change}}));
 const hasRule=(code:string)=>version.rules.some(r=>r.category===code);

 const save=async(code:string)=>{
  const r=rowFor(code);setBusy(code);setRowNote(null);
  try{
   await apiRequest(`/orgs/${orgId}/agreement-versions/${version.id}/rules/${code}`,{method:'PUT',body:JSON.stringify({responsible:r.responsible,first_payer:r.first_payer,deductible_from:r.deductible_from,approval_threshold:r.approval_threshold||null,proof_required:r.proof_required})});
   setRowNote({code,text: t('agreements.expenseResponsibilityMatrix.ruleSaved'),bad:false});await load();
  }catch(e){const m=(e as Error).message;if(/already recorded/i.test(m))setFrozen(m);setRowNote({code,text:m,bad:true})}finally{setBusy('')}
 };
 const clear=async(code:string)=>{
  setBusy(code);setRowNote(null);
  try{await apiRequest(`/orgs/${orgId}/agreement-versions/${version.id}/rules/${code}`,{method:'DELETE'});setRowNote({code,text: t('agreements.expenseResponsibilityMatrix.ruleRemovedTheCategory'),bad:false});await load()}
  catch(e){const m=(e as Error).message;if(/already recorded/i.test(m))setFrozen(m);setRowNote({code,text:m,bad:true})}finally{setBusy('')}
 };

 const partySelect=(code:string,field:'responsible'|'first_payer',name:string)=><Select value={rowFor(code)[field]} onValueChange={v=>patch(code,{[field]:v})}><SelectTrigger aria-label={t('matrix.ariaFor',{name,code})}><SelectValue/></SelectTrigger><SelectContent>{PARTIES.map(p=><SelectItem value={p} key={p}>{label(p)}</SelectItem>)}</SelectContent></Select>;

 return <div>
  <h3 className="detail-subheading">{t('matrix.title',{number: version.number, date: fmtDay(version.effective_from)})}</h3>
  <p className="note">{t('matrix.intro')}</p>
  {frozen&&<p role="alert" className="note"><b>{t('agreements.expenseResponsibilityMatrix.aCategoryIsLocked')}</b> {t('matrix.locked',{number: version.number})}</p>}
  <div className="rule-wrap"><div className="rule-matrix" role="table" aria-label={t('agreements.expenseResponsibilityMatrix.expenseRulesByCategory')}>
   <div role="row" className="rule-row rule-head"><span role="columnheader">{t('common.category')}</span><span role="columnheader">{t('agreements.expenseResponsibilityMatrix.responsible')}</span><span role="columnheader">{t('agreements.expenseResponsibilityMatrix.paysFirst')}</span><span role="columnheader">{t('agreements.expenseResponsibilityMatrix.deductFromOwner')}</span><span role="columnheader">{t('agreements.expenseResponsibilityMatrix.receipt')}</span><span role="columnheader">{t('agreements.expenseResponsibilityMatrix.rule')}</span></div>
   {categories.map(c=>{const r=rowFor(c.code);const owned=hasRule(c.code);return <div role="row" className="rule-row" key={c.code}>
    <span role="cell"><b>{categoryName(c.code,c.name)}</b>{!owned&&<small> {t('agreements.expenseResponsibilityMatrix.noRule')}</small>}</span>
    <span role="cell" data-label={t('matrix.colResponsible')}>{partySelect(c.code,'responsible',t('matrix.colResponsible'))}</span>
    <span role="cell" data-label={t('matrix.colFirst')}>{partySelect(c.code,'first_payer',t('matrix.colFirst'))}</span>
    <span role="cell" data-label={t('matrix.dataDeduct')}><Select value={r.deductible_from} onValueChange={v=>patch(c.code,{deductible_from:v})}><SelectTrigger aria-label={t('matrix.ariaDeduct',{code: c.code})}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{t('matrix.no')}</SelectItem><SelectItem value="owner_payable">{t('agreements.expenseResponsibilityMatrix.yesFromOwnerPayable')}</SelectItem></SelectContent></Select></span>
    <span role="cell" data-label={t('matrix.dataReceipt')}><label className="check-label"><Checkbox checked={r.proof_required} onCheckedChange={v=>patch(c.code,{proof_required:v===true})} aria-label={t('matrix.ariaReceipt',{code: c.code})}/> {t('agreements.expenseResponsibilityMatrix.required')}</label></span>
    <span role="cell" className="rule-actions"><Button size="sm" disabled={busy===c.code} onClick={()=>void save(c.code)}>{owned?t('matrix.update'):t('agreements.expenseResponsibilityMatrix.setRule')}</Button>{owned&&<Button size="sm" variant="outline" disabled={busy===c.code} onClick={()=>void clear(c.code)}>{t('agreements.expenseResponsibilityMatrix.removeRule')}</Button>}{rowNote?.code===c.code&&<small role="status" style={{flexBasis:'100%',fontSize:12,color:rowNote.bad?'#b42318':'#067647'}}>{rowNote.text}</small>}</span>
   </div>})}
  </div></div>
 </div>;
}
