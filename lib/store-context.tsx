"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {loadDemo,saveDemo,seed,statement,today,type Store,type Agreement,type Entry,type EntryType} from './demo';
import {apiMode,liveSnapshot,livePost} from './api';
import {useSelected} from './use-list-filters';

type NewAgreementDraft={customer:string;vehicle:string;registration:string;owner:string;driver:string;rent:string;ownerRent:string;salary:string;start:string;fuel:string;repair:string;offset:boolean};

interface RentflowContextValue{
 store:Store;ready:boolean;apiError:string;apiBusy:boolean;toast:string;setToast:(v:string)=>void;
 selected:string|null;setSelected:(id:string|null)=>void;
 entryOpen:boolean;setEntryOpen:(v:boolean)=>void;
 agreementOpen:boolean;setAgreementOpen:(v:boolean)=>void;
 confirmClose:string|null;setConfirmClose:(v:string|null)=>void;
 mobileMenu:boolean;setMobileMenu:(v:boolean)=>void;
 entryType:EntryType;setEntryType:(v:EntryType)=>void;
 entryAgreement:string;setEntryAgreement:(v:string)=>void;
 entryAmount:string;setEntryAmount:(v:string)=>void;
 entryCategory:string;setEntryCategory:(v:string)=>void;
 entryPayer:string;setEntryPayer:(v:string)=>void;
 entryLiable:string;setEntryLiable:(v:string)=>void;
 entryDate:string;setEntryDate:(v:string)=>void;
 entryRef:string;setEntryRef:(v:string)=>void;
 entryDesc:string;setEntryDesc:(v:string)=>void;
 entryOffset:boolean;setEntryOffset:(v:boolean)=>void;
 entryReceipt:string;setEntryReceipt:(v:string)=>void;
 entryError:string;setEntryError:(v:string)=>void;
 chosen:Agreement|undefined;amount:number;repeated:boolean;
 newAgreement:NewAgreementDraft;setNewAgreement:(v:NewAgreementDraft)=>void;
 wizardStep:number;setWizardStep:(v:number)=>void;wizardError:string;setWizardError:(v:string)=>void;
 refreshLive:()=>Promise<Store>;
 openEntry:(type?:EntryType,id?:string)=>void;
 submitEntry:()=>void;
 approve:(id:string)=>void;
 reverse:(id:string)=>void;
 closeSettlement:(id:string)=>void;
 createAgreement:()=>void;
}

const RentflowContext=createContext<RentflowContextValue|null>(null);

export function useRentflowStore(){
 const ctx=useContext(RentflowContext);
 if(!ctx)throw new Error('useRentflowStore must be used inside <RentflowStoreProvider>');
 return ctx;
}

export function RentflowStoreProvider({children}:{children:ReactNode}){
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
 const [entryType,setEntryType]=useState<EntryType>('Expense');
 const [entryAgreement,setEntryAgreement]=useState('AGR-1042');
 const [entryAmount,setEntryAmount]=useState('');
 const [entryCategory,setEntryCategory]=useState('Repair');
 const [entryPayer,setEntryPayer]=useState('Operator');
 const [entryLiable,setEntryLiable]=useState('Owner');
 const [entryDate,setEntryDate]=useState(today);
 const [entryRef,setEntryRef]=useState('');
 const [entryDesc,setEntryDesc]=useState('');
 const [entryOffset,setEntryOffset]=useState(true);
 const [entryReceipt,setEntryReceipt]=useState('');
 const [entryError,setEntryError]=useState('');
 const [newAgreement,setNewAgreement]=useState<NewAgreementDraft>({customer:'',vehicle:'',registration:'',owner:'',driver:'',rent:'',ownerRent:'',salary:'',start:today,fuel:'Owner',repair:'Owner',offset:true});
 const [wizardStep,setWizardStep]=useState(0);
 const [wizardError,setWizardError]=useState('');

 useEffect(()=>{
  if(apiMode){liveSnapshot().then(setStore).catch(e=>setApiError(e.message)).finally(()=>setReady(true))}
  else{setStore(loadDemo());setReady(true)}
 },[]);
 useEffect(()=>{if(ready&&!apiMode)saveDemo(store)},[store,ready]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(id)},[toast]);

 const refreshLive=async()=>{const next=await liveSnapshot();setStore(next);setApiError('');return next};

 const chosen=store.agreements.find(a=>a.id===entryAgreement);
 const amount=Math.round(Number(entryAmount));
 const repeated=store.entries.some(e=>e.status!=='Reversed'&&entryRef.trim()&&e.reference.toLowerCase()===entryRef.trim().toLowerCase());

 const openEntry=(type:EntryType='Expense',id?:string)=>{setEntryType(type);setEntryAgreement(id||store.agreements[0]?.id||'');setEntryAmount('');setEntryRef('');setEntryDesc('');setEntryDate(today);setEntryCategory(type==='Expense'?'Repair':type==='Salary advance'?'Advance':'Rent');setEntryPayer(type==='Customer payment'?store.agreements.find(a=>a.id===(id||store.agreements[0]?.id))?.customer||'Customer':'Operator');setEntryLiable(type==='Expense'?'Owner':'Operator');setEntryOffset(true);setEntryReceipt('');setEntryError('');setEntryKey(crypto.randomUUID());setEntryOpen(true)};

 const submitEntry=()=>{
  if(!chosen){setEntryError('Choose an agreement.');return}
  if(store.closed.includes(chosen.id)){setEntryError('This agreement is closed for September. Reopen policy is not enabled in this demo.');return}
  if(!Number.isSafeInteger(Number(entryAmount))||amount<=0){setEntryError('Enter a whole BDT amount greater than zero.');return}
  if(!entryRef.trim()){setEntryError('Add a transaction or document reference.');return}
  if(repeated){setEntryError('This reference is already recorded. Check the existing entry before submitting.');return}
  if(entryType==='Customer payment'&&amount>statement(chosen,store.entries).customerDue){setEntryError('Payment exceeds the open rent balance in this demo.');return}
  if(entryType==='Owner payout'&&amount>statement(chosen,store.entries).ownerDue){setEntryError('Payout exceeds the current owner balance.');return}
  if((entryType==='Driver payout'||entryType==='Salary advance')&&amount>statement(chosen,store.entries).driverDue){setEntryError('Amount exceeds the current driver balance.');return}
  if(apiMode){
   const backend=store.backend;
   if(!backend){setEntryError('The backend is not connected. Sign in and reload.');return}
   const periodId=backend.periodIds[chosen.id];const ob=backend.obligationIds[chosen.id];
   if(!periodId||!ob){setEntryError('Issue the September period before recording an entry.');return}
   setApiBusy(true);
   void (async()=>{
    try{
     let response;
     if(entryType==='Expense'){
      const categories:{[key:string]:string}={Repair:'repair',Fuel:'fuel','Toll / parking':'toll',Maintenance:'maintenance',Cleaning:'cleaning',Other:'other'};
      const category=categories[entryCategory];
      if(!category)throw new Error('Choose a supported expense category.');
      response=await livePost(backend.orgId,'/expenses',{period_id:periodId,category,amount:String(amount),event_date:entryDate,paid_by:entryPayer.toLowerCase(),responsible:entryLiable.toLowerCase(),offset_owner:entryOffset&&chosen.rules.offset&&entryPayer==='Operator'&&entryLiable==='Owner',reference:entryRef,description:entryDesc},entryKey);
     }else{
      const kinds:{[key:string]:string}={'Customer payment':'customer_payment','Owner payout':'owner_payout','Driver payout':'driver_payout','Salary advance':'salary_advance'};
      const kind=kinds[entryType];
      const obligationId=entryType==='Customer payment'?ob.customer:entryType==='Owner payout'?ob.owner:ob.driver;
      response=await livePost(backend.orgId,'/payments',{kind,amount:String(amount),reference:entryRef,method:'bank',event_date:entryDate,allocations:[{obligation_id:obligationId,amount:String(amount)}]},entryKey);
     }
     const next=await refreshLive();
     setEntryOpen(false);
     setSelected(next.entries.find(x=>x.reference===entryRef)?.id||null);
     setToast('Entry saved to the Django backend. Message delivery remains queued.');
    }catch(e){setEntryError((e as Error).message)}
    finally{setApiBusy(false)}
   })();
   return;
  }
  const item:Entry={id:'ENT-'+(2401+store.entries.length),agreementId:chosen.id,type:entryType,amount,date:entryDate,category:entryCategory,paidBy:entryType==='Customer payment'?chosen.customer:entryPayer,responsible:entryType==='Expense'?entryLiable:'Operator',reference:entryRef.trim(),description:entryDesc.trim()||entryCategory+' · '+chosen.vehicle,status:entryType==='Expense'&&amount>=5000?'Pending approval':'Posted',offset:entryType==='Expense'&&entryLiable==='Owner'&&entryPayer==='Operator'&&entryOffset&&chosen.rules.offset,receipt:entryReceipt||undefined};
  setStore(s=>({...s,entries:[item,...s.entries],notices:[{id:'NT-'+Date.now(),title:item.status==='Posted'?'Entry recorded':'Expense awaiting approval',detail:item.id+' · '+chosen.vehicle,date:entryDate,status:'Queued',read:false,recipient:entryType==='Customer payment'?'Customer billing contact':entryType==='Expense'?entryLiable:'Affected party'},...s.notices]}));
  setEntryOpen(false);setSelected(item.id);
  setToast(item.status==='Posted'?`${item.id} posted in this demo. Message queued.`:`${item.id} saved for approval. Balances unchanged.`);
 };

 const approve=(id:string)=>{
  if(apiMode){const backend=store.backend;const expenseId=backend?.expenseIds[id];if(!backend||!expenseId)return;void livePost(backend.orgId,`/expenses/${expenseId}/approve`,{}).then(refreshLive).then(()=>{setSelected(null);setToast(id+' approved.')}).catch(e=>setToast(e.message));return}
  setStore(s=>({...s,entries:s.entries.map(e=>e.id===id?{...e,status:'Posted'}:e)}));setToast(id+' approved and reflected in balances.');setSelected(null);
 };

 const reverse=(id:string)=>{
  if(apiMode){const backend=store.backend;const expenseId=backend?.expenseIds[id];if(!backend||!expenseId)return;const reason=window.prompt('Why is this posted entry being reversed?');if(!reason?.trim())return;void livePost(backend.orgId,`/expenses/${expenseId}/reverse`,{reason:reason.trim()}).then(refreshLive).then(()=>{setSelected(null);setToast(id+' reversed.')}).catch(e=>setToast(e.message));return}
  setStore(s=>({...s,entries:s.entries.map(e=>e.id===id?{...e,status:'Reversed'}:e)}));setToast(id+' reversed in this demo.');setSelected(null);
 };

 const closeSettlement=(id:string)=>{
  if(apiMode){const backend=store.backend;const periodId=backend?.periodIds[id];if(!backend||!periodId)return;void livePost(backend.orgId,`/periods/${periodId}/close`,{}).then(refreshLive).then(()=>{setConfirmClose(null);setToast(id+' closed in the backend.')}).catch(e=>{setConfirmClose(null);setToast(e.message)});return}
  setStore(s=>({...s,closed:[...new Set([...s.closed,id])]}));setConfirmClose(null);setToast(id+' closed for September. This demo records the state locally.');
 };

 const createAgreement=()=>{
  const n=newAgreement;
  if(!n.customer.trim()||!n.vehicle.trim()||!n.registration.trim()||!n.owner.trim()||!n.driver.trim()||![n.rent,n.ownerRent,n.salary].every(x=>Number.isSafeInteger(Number(x))&&Number(x)>0)){setWizardError('Complete all parties, vehicle details and positive whole BDT amounts.');return}
  if(store.agreements.some(a=>a.registration.toLowerCase()===n.registration.toLowerCase()&&a.status==='Active')){setWizardError('This registration already has an active agreement.');return}
  if(apiMode){
   if(n.start>'2026-09-30'){setWizardError('This prototype displays September 2026. Choose an effective date in or before September.');return}
   const backend=store.backend;
   if(!backend){setWizardError('Backend session is unavailable.');return}
   setApiBusy(true);
   void (async()=>{
    try{
     const a=await livePost(backend.orgId,'/agreements/quick',{customer:n.customer,owner:n.owner,driver:n.driver,vehicle:n.vehicle,registration:n.registration,start:n.start,rent:n.rent,owner_rent:n.ownerRent,salary:n.salary,fuel:n.fuel,repair:n.repair,offset:n.offset});
     await livePost(backend.orgId,`/agreements/${a.id}/periods?month=2026-09-01`,{});
     await refreshLive();
     setAgreementOpen(false);setWizardStep(0);setSelected(`AGR-${a.id}`);
     setToast('Agreement and September obligations created in the backend.');
    }catch(e){setWizardError((e as Error).message)}
    finally{setApiBusy(false)}
   })();
   return;
  }
  const a:Agreement={id:'AGR-'+(1042+store.agreements.length),vehicle:n.vehicle,registration:n.registration,owner:n.owner,customer:n.customer,driver:n.driver,rent:Number(n.rent),ownerRent:Number(n.ownerRent),salary:Number(n.salary),start:n.start,status:'Active',rules:{fuel:n.fuel,repair:n.repair,offset:n.offset}};
  setStore(s=>({...s,agreements:[...s.agreements,a]}));
  setAgreementOpen(false);setWizardStep(0);setWizardError('');setSelected(a.id);
  setToast(a.id+' added to this demo.');
 };

 const value:RentflowContextValue={
  store,ready,apiError,apiBusy,toast,setToast,
  selected,setSelected,
  entryOpen,setEntryOpen,agreementOpen,setAgreementOpen,confirmClose,setConfirmClose,mobileMenu,setMobileMenu,
  entryType,setEntryType,entryAgreement,setEntryAgreement,entryAmount,setEntryAmount,entryCategory,setEntryCategory,
  entryPayer,setEntryPayer,entryLiable,setEntryLiable,entryDate,setEntryDate,entryRef,setEntryRef,entryDesc,setEntryDesc,
  entryOffset,setEntryOffset,entryReceipt,setEntryReceipt,entryError,setEntryError,
  chosen,amount,repeated,
  newAgreement,setNewAgreement,wizardStep,setWizardStep,wizardError,setWizardError,
  refreshLive,openEntry,submitEntry,approve,reverse,closeSettlement,createAgreement,
 };

 return <RentflowContext.Provider value={value}>{children}</RentflowContext.Provider>;
}
