"use client";
import {useSyncExternalStore} from 'react';

/** F10: the branch an unrestricted user (admin, or a member without a branch) is looking at; null = every branch.
 * Kept in localStorage because the sidebar links drop the query string. `apiRequest` adds `branch_id` to every org GET while one is chosen;
 * the server ignores it for branch-limited users, who are always confined to their own branch. */
const KEY='rentflow.branch';
let current:number|null|undefined;
const listeners=new Set<()=>void>();

export function getBranch():number|null{
 if(current===undefined){
  current=null;
  try{const v=typeof window!=='undefined'?window.localStorage.getItem(KEY):null;if(v&&/^\d+$/.test(v))current=Number(v)}catch{}
 }
 return current;
}

export function setBranch(id:number|null){
 current=id;
 try{if(id===null)window.localStorage.removeItem(KEY);else window.localStorage.setItem(KEY,String(id))}catch{}
 listeners.forEach(l=>l());
}

const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l)}};
export function useBranch(){return useSyncExternalStore(subscribe,getBranch,()=>null)}

/** Adds `branch_id` to an org-scoped read unless the path already names one. */
export function withBranch(path:string){
 const id=getBranch();
 if(!id||!/^\/orgs\/\d+\//.test(path)||/[?&]branch_id=/.test(path))return path;
 return path+(path.includes('?')?'&':'?')+'branch_id='+id;
}
