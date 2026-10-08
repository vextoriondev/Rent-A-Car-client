"use client";
import {useCallback,useEffect,useState} from 'react';
import {apiMode,apiRequest} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';

export type ExpenseCategory={id:number;code:string;name:string;active:boolean};

/** API mode: the organisation's expense categories from the server (inactive ones included; filter on `active` for new entries). Empty in demo mode. */
export function useExpenseCategories(){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [categories,setCategories]=useState<ExpenseCategory[]|null>(null);
 const [error,setError]=useState('');
 const reload=useCallback(async()=>{
  if(!apiMode||!orgId)return;
  try{setCategories(await apiRequest(`/orgs/${orgId}/expense-categories`));setError('')}
  catch(e){setCategories([]);setError((e as Error).message)}
 },[orgId]);
 useEffect(()=>{void reload()},[reload]);
 return {categories,error,reload,orgId};
}
