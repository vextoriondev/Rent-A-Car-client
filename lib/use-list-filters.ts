"use client";
import {useCallback} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import type {OnChangeFn,SortingState} from '@tanstack/react-table';

/** Reads/writes one query-string key on the current route, via router.replace (no history entry per keystroke, back/forward still works across navigations). */
export function useQueryParam(key:string,fallback=''){
 const router=useRouter();
 const pathname=usePathname();
 const searchParams=useSearchParams();
 const value=searchParams.get(key)??fallback;
 const setValue=useCallback((next:string)=>{
  const params=new URLSearchParams(searchParams.toString());
  if(!next||next===fallback)params.delete(key);else params.set(key,next);
  const qs=params.toString();
  router.replace(qs?`${pathname}?${qs}`:pathname,{scroll:false});
 },[key,fallback,pathname,router,searchParams]);
 return [value,setValue] as const;
}

/** The cross-cutting "open detail drawer" id, shared by every list route and the dashboard layout's drawer. */
export function useSelected(){
 const [value,setValue]=useQueryParam('selected','');
 return [value||null,(id:string|null)=>setValue(id||'')] as const;
}

/** Sort state backed by `?sort=<columnId>` (prefix `-` for descending). `fallback` is the default and is never written to the URL. */
export function useSortParam(fallback:string){
 const [raw,setRaw]=useQueryParam('sort',fallback);
 const sorting:SortingState=[{id:raw.replace(/^-/,''),desc:raw.startsWith('-')}];
 const onSortingChange:OnChangeFn<SortingState>=updater=>{
  const next=typeof updater==='function'?updater(sorting):updater;
  const first=next[0];
  setRaw(first?(first.desc?'-':'')+first.id:fallback);
 };
 return [sorting,onSortingChange] as const;
}
