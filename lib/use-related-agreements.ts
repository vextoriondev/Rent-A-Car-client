"use client";
import {useMemo} from 'react';
import {useRentflowStore} from '@/lib/store-context';
import {useQueryParam} from '@/lib/use-list-filters';

export const ALL_OWNERS='All owners';

/** Agreements visible under the current `?q=` search and `?owner=` filter (the same matching the old single-page app used), sorted by customer. */
export function useRelatedAgreements(){
 const {store}=useRentflowStore();
 const [q]=useQueryParam('q');
 const [owner]=useQueryParam('owner',ALL_OWNERS);
 const owners=useMemo(()=>[...new Set(store.agreements.map(a=>a.owner))],[store.agreements]);
 const agreements=useMemo(()=>{
  const needle=q.toLowerCase();
  return store.agreements
   .filter(a=>(owner===ALL_OWNERS||a.owner===owner)&&[a.customer,a.vehicle,a.registration,a.owner,a.driver,a.id].join(' ').toLowerCase().includes(needle))
   .sort((a,b)=>a.customer.localeCompare(b.customer));
 },[store.agreements,q,owner]);
 return {agreements,owners};
}
