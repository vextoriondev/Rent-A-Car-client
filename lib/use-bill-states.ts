"use client";
import {useEffect,useMemo,useState} from 'react';
import {apiMode,apiRequest} from '@/lib/api';
import type {BillState} from '@/lib/bill-state';
import {useRentflowStore} from '@/lib/store-context';

export type ServerBillStates=Record<string,Partial<Record<'customer'|'owner'|'driver',BillState>>>;

/** API mode: the server's `bill_state` per agreement and side, read from `GET /periods/{id}/statement` for the period each agreement shows. Empty in demo mode; callers fall back to `lib/bill-state` until it loads. */
export function useBillStates(){
 const backend=useRentflowStore().store.backend;
 const [states,setStates]=useState<ServerBillStates>({});
 const key=backend?`${backend.orgId}:${JSON.stringify(backend.periodIds)}`:'';
 useEffect(()=>{
  if(!apiMode||!backend)return;
  let stale=false;
  Promise.all(Object.entries(backend.periodIds).map(async([agreement,periodId])=>{
   try{const s=await apiRequest(`/orgs/${backend.orgId}/periods/${periodId}/statement`);return[agreement,{customer:s.customer?.bill_state,owner:s.owner?.bill_state,driver:s.driver?.bill_state}] as const}
   catch{return null}
  })).then(list=>{if(!stale)setStates(Object.fromEntries(list.filter(Boolean) as [string,ServerBillStates[string]][]))});
  return()=>{stale=true};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 return useMemo(()=>states,[states]);
}
