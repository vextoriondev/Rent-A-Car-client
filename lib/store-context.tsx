"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {loadDemo,saveDemo,seed,statement,type Store,type Agreement,type Entry,type EntryType} from './demo';
import {apiMode,apiRequest,apiUpload,liveSnapshot,livePost,logout,ApiError} from './api';
import {useSelected} from './use-list-filters';
import {expenseCategoryCodes,type AgreementFormValues,type EntryFormValues} from './forms';

interface RentflowContextValue{
 store:Store;ready:boolean;apiError:string;apiBusy:boolean;toast:string;setToast:(v:string)=>void;
 selected:string|null;setSelected:(id:string|null)=>void;
 entryOpen:boolean;setEntryOpen:(v:boolean)=>void;
 agreementOpen:boolean;setAgreementOpen:(v:boolean)=>void;
 confirmClose:string|null;setConfirmClose:(v:string|null)=>void;
 mobileMenu:boolean;setMobileMenu:(v:boolean)=>void;
 entryInit:{type:EntryType;agreementId:string};
 refreshLive:()=>Promise<Store>;
 openEntry:(type?:EntryType,id?:string)=>void;
 /** Resolves to an error message to show in the dialog, or null when the entry was saved (dialog closed). */
 submitEntry:(values:EntryFormValues,opts?:{draft?:boolean;file?:File|null;maintenanceCaseId?:number})=>Promise<string|null>;
 /** API mode: send a saved draft for posting, or discard it. */
 submitDraft:(id:string)=>void;
 discardDraft:(id:string)=>void;
 approve:(id:string)=>void;
 reverse:(id:string)=>void;
 closeSettlement:(id:string)=>void;
 createAgreement:(values:AgreementFormValues)=>Promise<string|null>;
 markNoticeRead:(id:string)=>void;
 markAllNoticesRead:()=>void;
 retryNotice:(id:string)=>void;
 resetDemo:()=>void;
 signOut:()=>void;
}

const RentflowContext=createContext<RentflowContextValue|null>(null);

export function useRentflowStore(){
 const ctx=useContext(RentflowContext);
 if(!ctx)throw new Error('useRentflowStore must be used inside <RentflowStoreProvider>');
 return ctx;
}

export function RentflowStoreProvider({children}:{children:ReactNode}){
 const router=useRouter();
 const [store,setStore]=useState<Store>(apiMode?{agreements:[],entries:[],notices:[],closed:[]}:seed);
 const [ready,setReady]=useState(false);
 const [apiError,setApiError]=useState('');
 const [apiBusy,setApiBusy]=useState(false);
 const [entryKey,setEntryKey]=useState('');
 const [selected,setSelected]=useSelected();
 const [entryOpen,setEntryOpen]=useState(false);
 const [agreementOpen,setAgreementOpen]=useState(false);
 const [confirmClose,setConfirmClose]=useState<string|null>(null);
 const [mobileMenu,setMobileMenu]=useState(false);
 const [toast,setToast]=useState('');
 const [entryInit,setEntryInit]=useState<{type:EntryType;agreementId:string}>({type:'Expense',agreementId:''});

 useEffect(()=>{
  if(apiMode){liveSnapshot().then(setStore).catch(e=>{
   if(e instanceof ApiError&&e.status===401){router.replace('/login');return}
   setApiError(e.message)
  }).finally(()=>setReady(true))}
  else{setStore(loadDemo());setReady(true)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{if(ready&&!apiMode)saveDemo(store)},[store,ready]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(id)},[toast]);

 const refreshLive=async()=>{const next=await liveSnapshot();setStore(next);setApiError('');return next};

 const openEntry=(type:EntryType='Expense',id?:string)=>{setEntryInit({type,agreementId:id||store.agreements[0]?.id||''});setEntryKey(crypto.randomUUID());setEntryOpen(true)};

 const submitEntry=async(v:EntryFormValues,opts?:{draft?:boolean;file?:File|null;maintenanceCaseId?:number}):Promise<string|null>=>{
  const chosen=store.agreements.find(a=>a.id===v.agreementId);
  const amount=Math.round(Number(v.amount));
  const entryType=v.type;
  const repeated=store.entries.some(e=>e.status!=='Reversed'&&v.reference.trim()&&e.reference.toLowerCase()===v.reference.trim().toLowerCase());
  if(!chosen)return 'Choose an agreement.';
  // In API mode the server decides closed periods (late entry), duplicates (with a reason) and balances.
  if(!apiMode&&store.closed.includes(chosen.id))return 'This agreement is closed for September. Reopen policy is not enabled in this demo.';
  if(!apiMode&&repeated)return 'This reference is already recorded. Check the existing entry before submitting.';
  if(!apiMode&&entryType==='Customer payment'&&amount>statement(chosen,store.entries).customerDue)return 'Payment exceeds the open rent balance in this demo.';
  if(!apiMode&&entryType==='Owner payout'&&amount>statement(chosen,store.entries).ownerDue)return 'Payout exceeds the current owner balance.';
  if(!apiMode&&(entryType==='Driver payout'||entryType==='Salary advance')&&amount>statement(chosen,store.entries).driverDue)return 'Amount exceeds the current driver balance.';
  if(apiMode){
   const backend=store.backend;
   if(!backend)return 'The backend is not connected. Sign in and reload.';
   const periodId=backend.periodIds[chosen.id];const ob=backend.obligationIds[chosen.id];
   if(!periodId||!ob)return 'Issue the September period before recording an entry.';
   setApiBusy(true);
   let uploadNote='';
   try{
    if(entryType==='Expense'){
     const category=expenseCategoryCodes[v.category];
     if(!category)throw new Error('Choose a supported expense category.');
     const saved=await livePost(backend.orgId,'/expenses',{period_id:periodId,category,amount:String(amount),event_date:v.date,paid_by:v.payer.toLowerCase(),responsible:v.liable.toLowerCase(),offset_owner:v.offset&&chosen.rules.offset&&v.payer==='Operator'&&v.liable==='Owner',reference:v.reference,description:v.description,draft:!!opts?.draft||!!opts?.file,receipt_reference:v.receiptRef.trim(),override_reason:v.overrideReason.trim(),allow_duplicate_reason:v.duplicateReason.trim(),late_entry:v.lateEntry,...(opts?.maintenanceCaseId?{maintenance_case_id:opts.maintenanceCaseId}:{})},entryKey);
     if(opts?.file){
      // A file counts as proof only once it is attached, so the entry is held as a draft, the file is uploaded, and then it is submitted.
      try{const form=new FormData();form.append('target_type','expense');form.append('target_id',String(saved.id));form.append('file',opts.file);await apiUpload(`/orgs/${backend.orgId}/documents`,form)}
      catch(e){uploadNote=` The entry is kept as a draft because the receipt file was not uploaded: ${(e as Error).message} Add it from the entry, then submit.`}
      if(!opts.draft&&!uploadNote){try{await livePost(backend.orgId,`/expenses/${saved.id}/submit`,{})}catch(e){uploadNote=` The receipt is attached but the entry stayed a draft: ${(e as Error).message}`}}
     }
    }else{
     const kinds:{[key:string]:string}={'Customer payment':'customer_payment','Owner payout':'owner_payout','Driver payout':'driver_payout','Salary advance':'salary_advance'};
     const kind=kinds[entryType];
     const obligationId=entryType==='Customer payment'?ob.customer:entryType==='Owner payout'?ob.owner:ob.driver;
     await livePost(backend.orgId,'/payments',{kind,amount:String(amount),reference:v.reference,method:'bank',event_date:v.date,allocations:[{obligation_id:obligationId,amount:String(amount)}]},entryKey);
    }
    const next=await refreshLive();
    setEntryOpen(false);
    setSelected(next.entries.find(x=>x.reference===v.reference)?.id||null);
    setToast((opts?.draft?'Draft saved. Submit it from the entry when it is ready; balances are unchanged until then.':'Entry saved to the Django backend. Message delivery remains queued.')+uploadNote);
    return null;
   }catch(e){return (e as Error).message}
   finally{setApiBusy(false)}
  }
  const item:Entry={id:'ENT-'+(2401+store.entries.length),agreementId:chosen.id,type:entryType,amount,date:v.date,category:v.category,paidBy:entryType==='Customer payment'?chosen.customer:v.payer,responsible:entryType==='Expense'?v.liable:'Operator',reference:v.reference.trim(),description:v.description.trim()||v.category+' · '+chosen.vehicle,status:entryType==='Expense'&&amount>=5000?'Pending approval':'Posted',offset:entryType==='Expense'&&v.liable==='Owner'&&v.payer==='Operator'&&v.offset&&chosen.rules.offset,receipt:v.receipt||undefined};
  setStore(s=>({...s,entries:[item,...s.entries],notices:[{id:'NT-'+Date.now(),title:item.status==='Posted'?'Entry recorded':'Expense awaiting approval',detail:item.id+' · '+chosen.vehicle,date:v.date,status:'Queued',read:false,recipient:entryType==='Customer payment'?'Customer billing contact':entryType==='Expense'?v.liable:'Affected party'},...s.notices]}));
  setEntryOpen(false);setSelected(item.id);
  setToast(item.status==='Posted'?`${item.id} posted in this demo. Message queued.`:`${item.id} saved for approval. Balances unchanged.`);
  return null;
 };

 const approve=(id:string)=>{
  if(apiMode){const backend=store.backend;const expenseId=backend?.expenseIds[id];if(!backend||!expenseId)return;void livePost(backend.orgId,`/expenses/${expenseId}/approve`,{}).then(refreshLive).then(()=>{setSelected(null);setToast(id+' approved.')}).catch(e=>setToast(e.message));return}
  setStore(s=>({...s,entries:s.entries.map(e=>e.id===id?{...e,status:'Posted'}:e)}));setToast(id+' approved and reflected in balances.');setSelected(null);
 };

 const submitDraft=(id:string)=>{
  const backend=store.backend;const expenseId=backend?.expenseIds[id];if(!apiMode||!backend||!expenseId)return;
  void livePost(backend.orgId,`/expenses/${expenseId}/submit`,{}).then(refreshLive).then(()=>{setSelected(null);setToast(id+' submitted.')}).catch(e=>setToast(e.message));
 };

 const discardDraft=(id:string)=>{
  const backend=store.backend;const expenseId=backend?.expenseIds[id];if(!apiMode||!backend||!expenseId)return;
  if(!window.confirm('Discard this draft? Drafts have not touched any balance.'))return;
  void apiRequest(`/orgs/${backend.orgId}/expenses/${expenseId}`,{method:'DELETE'}).then(refreshLive).then(()=>{setSelected(null);setToast(id+' discarded.')}).catch(e=>setToast(e.message));
 };

 const reverse=(id:string)=>{
  if(apiMode){const backend=store.backend;const expenseId=backend?.expenseIds[id];if(!backend||!expenseId)return;const reason=window.prompt('Correction reason: why is this posted entry being reversed? (the original stays in the history)');if(!reason?.trim())return;void livePost(backend.orgId,`/expenses/${expenseId}/reverse`,{reason:reason.trim()}).then(refreshLive).then(()=>{setSelected(null);setToast(id+' reversed.')}).catch(e=>setToast(e.message));return}
  setStore(s=>({...s,entries:s.entries.map(e=>e.id===id?{...e,status:'Reversed'}:e)}));setToast(id+' reversed in this demo.');setSelected(null);
 };

 const closeSettlement=(id:string)=>{
  if(apiMode){const backend=store.backend;const periodId=backend?.periodIds[id];if(!backend||!periodId)return;void livePost(backend.orgId,`/periods/${periodId}/close`,{}).then(refreshLive).then(()=>{setConfirmClose(null);setToast(id+' closed in the backend.')}).catch(e=>{setConfirmClose(null);setToast(e.message)});return}
  setStore(s=>({...s,closed:[...new Set([...s.closed,id])]}));setConfirmClose(null);setToast(id+' closed for September. This demo records the state locally.');
 };

 const createAgreement=async(n:AgreementFormValues):Promise<string|null>=>{
  if(store.agreements.some(a=>a.registration.toLowerCase()===n.registration.toLowerCase()&&a.status==='Active'))return 'This registration already has an active agreement.';
  if(apiMode){
   if(n.start>'2026-09-30')return 'This prototype displays September 2026. Choose an effective date in or before September.';
   const backend=store.backend;
   if(!backend)return 'Backend session is unavailable.';
   setApiBusy(true);
   try{
    const a=await livePost(backend.orgId,'/agreements/quick',{customer:n.customer,owner:n.owner,driver:n.driver,vehicle:n.vehicle,registration:n.registration,start:n.start,rent:n.rent,owner_rent:n.ownerRent,salary:n.driverPaidBy==='Operator'?n.salary:'0',fuel:n.fuel,repair:n.repair,offset:n.offset,driver_provider:n.driverProvider.toLowerCase(),driver_paid_by:n.driverPaidBy.toLowerCase(),clauses:n.clauses.trim()});
    await livePost(backend.orgId,`/agreements/${a.id}/periods?month=2026-09-01`,{});
    await refreshLive();
    setAgreementOpen(false);setSelected(`AGR-${a.id}`);
    const warnings:string[]=a.warnings||[];
    setToast('Agreement and September obligations created in the backend.'+(warnings.length?' Warnings: '+warnings.join(' '):''));
    return null;
   }catch(e){return (e as Error).message}
   finally{setApiBusy(false)}
  }
  const a:Agreement={id:'AGR-'+(1042+store.agreements.length),vehicle:n.vehicle,registration:n.registration,owner:n.owner,customer:n.customer,driver:n.driver,rent:Number(n.rent),ownerRent:Number(n.ownerRent),salary:n.driverPaidBy==='Operator'?Number(n.salary):0,start:n.start,status:'Active',rules:{fuel:n.fuel,repair:n.repair,offset:n.offset}};
  setStore(s=>({...s,agreements:[...s.agreements,a]}));
  setAgreementOpen(false);setSelected(a.id);
  setToast(a.id+' added to this demo.');
  return null;
 };

 const markNoticeRead=(id:string)=>{setStore(s=>({...s,notices:s.notices.map(x=>x.id===id?{...x,read:true}:x)}))};

 const markAllNoticesRead=()=>{setStore(s=>({...s,notices:s.notices.map(x=>x.read?x:{...x,read:true})}))};

 const retryNotice=(id:string)=>{
  if(apiMode&&store.backend){const org=store.backend.orgId;void livePost(org,`/notifications/${id.replace('NT-','')}/retry`,{}).then(refreshLive).then(()=>{setToast('Retry queued in the backend.');setSelected(null)}).catch(e=>setToast(e.message));return}
  setSelected(null);setToast('Retry queued in this demo.');
 };

 const resetDemo=()=>{setStore(structuredClone(seed));setToast('Demo workspace restored.')};

 const signOut=()=>{if(apiMode)void logout().finally(()=>router.replace('/login'))};

 const value:RentflowContextValue={
  store,ready,apiError,apiBusy,toast,setToast,
  selected,setSelected,
  entryOpen,setEntryOpen,agreementOpen,setAgreementOpen,confirmClose,setConfirmClose,mobileMenu,setMobileMenu,
  entryInit,
  refreshLive,openEntry,submitEntry,submitDraft,discardDraft,approve,reverse,closeSettlement,createAgreement,
  markNoticeRead,markAllNoticesRead,retryNotice,resetDemo,signOut,
 };

 return <RentflowContext.Provider value={value}>{children}</RentflowContext.Provider>;
}
