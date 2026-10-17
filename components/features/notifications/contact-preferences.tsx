"use client";
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useRentflowStore} from '@/lib/store-context';
import {apiRequest} from '@/lib/api';
import {Card} from '@/components/ui/card';
import {SectionHeading} from '@/components/shared/section-heading';
import {EmptyState} from '@/components/shared/empty-state';
import {t} from '@/lib/copy';
import {partyLabel} from '@/lib/copy/labels';

/** SMS and email only (decision D2); WhatsApp was dropped. */
export type Channel='sms'|'email';
export type Preferred=Channel|'none';
export interface Pref{id:number|string;name:string;kind:string;consent:Record<Channel,boolean>;preferred:Preferred}
export const CHANNELS:{key:Channel;label:string}[]=[{key:'sms',label: t('notifications.contactPreferences.sms')},{key:'email',label: t('common.email')}];

/** A channel can only be preferred while consent for it is on; switching consent off clears the preference. Mirrors the backend rule. */
export function applyConsent(p:Pref,channel:Channel,on:boolean):Pref{
 return {...p,consent:{...p.consent,[channel]:on},preferred:!on&&p.preferred===channel?'none':p.preferred};
}
export function applyPreferred(p:Pref,channel:Preferred):Pref{
 return channel!=='none'&&!p.consent[channel]?p:{...p,preferred:channel};
}

interface ApiParty{id:number;kind:string;name:string;preferred_channel?:Preferred|'whatsapp';consent?:{sms:boolean;whatsapp?:boolean;email:boolean}}
const fromApi=(p:ApiParty):Pref|null=>p.consent?{id:p.id,name:p.name,kind:p.kind,consent:{sms:p.consent.sms,email:p.consent.email},preferred:p.preferred_channel==='whatsapp'?'none':p.preferred_channel??'none'}:null;

/** Who may be messaged, and on which channel. Backend consent (admin/accountant) in API mode; local sample in demo mode. */
export function ContactPreferences(){
 const rf=useRentflowStore();
 const orgId=rf.store.backend?.orgId;
 const demoParties=useMemo<Pref[]>(()=>{
  const seen=new Map<string,Pref>();
  for(const a of rf.store.agreements)for(const [kind,name] of [['owner',a.owner],['customer',a.customer],['driver',a.driver]] as const)if(name&&!seen.has(kind+name))seen.set(kind+name,{id:kind+name,name,kind,consent:{sms:true,email:false},preferred:'sms'});
  return [...seen.values()];
 },[rf.store.agreements]);
 const [parties,setParties]=useState<Pref[]|null>(orgId?null:demoParties);
 const [restricted,setRestricted]=useState(false);
 const [busy,setBusy]=useState<string|null>(null);
 useEffect(()=>{if(!orgId)setParties(prev=>prev?prev:demoParties)},[orgId,demoParties]);
 useEffect(()=>{
  if(!orgId)return;
  let alive=true;
  apiRequest(`/orgs/${orgId}/parties?limit=200`).then((page:{items:ApiParty[]})=>{
   if(!alive)return;
   const rows=page.items;
   const mapped=rows.map(fromApi).filter((x):x is Pref=>!!x);
   setRestricted(rows.length>0&&mapped.length===0);setParties(mapped);
  }).catch(e=>{if(alive){setParties([]);rf.setToast(e.message)}});
  return()=>{alive=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[orgId]);
 const save=useCallback(async(p:Pref,next:Pref,body:Record<string,unknown>)=>{
  const key=`${p.id}`;
  if(!orgId){setParties(list=>list?.map(x=>x.id===p.id?next:x)??null);return}
  setBusy(key);
  try{
   const row=await apiRequest(`/orgs/${orgId}/parties/${p.id}/consent`,{method:'PUT',body:JSON.stringify({...body,source:'Dashboard'})});
   const updated=fromApi(row);if(updated)setParties(list=>list?.map(x=>x.id===p.id?updated:x)??null);
  }catch(e){rf.setToast(e instanceof Error?e.message:t('notifications.contactPreferences.couldNotSaveThe'))}
  finally{setBusy(null)}
 },[orgId,rf]);
 const toggle=(p:Pref,channel:Channel)=>{const on=!p.consent[channel];const next=applyConsent(p,channel,on);void save(p,next,{[channel]:on,...(next.preferred!==p.preferred?{preferred_channel:next.preferred}:{})})};
 const prefer=(p:Pref,channel:Preferred)=>{const next=applyPreferred(p,channel);if(next!==p)void save(p,next,{preferred_channel:channel})};
 return <Card>
  <SectionHeading title={t('notifications.contactPreferences.contactPreferences')} subtitle={t('notifications.contactPreferences.peopleAreOnlyMessaged')}/>
  {parties===null&&<p className="settings-copy">{t('notifications.contactPreferences.loadingContactPreferences')}</p>}
  {restricted&&<p className="note">{t('notifications.contactPreferences.contactPreferencesAreVisible')}</p>}
  {parties&&parties.length===0&&!restricted&&<EmptyState title={t('notifications.contactPreferences.noPartiesYet')}/>}
  {parties&&parties.length>0&&<div className="pref-list">{parties.map(p=><div className="pref-row" key={p.id}>
   <div className="pref-who"><strong>{p.name}</strong><small>{partyLabel(p.kind)}</small></div>
   <div className="pref-channels" role="group" aria-label={t('notif.ariaConsent',{name: p.name})}>{CHANNELS.map(c=><button type="button" key={c.key} disabled={busy===`${p.id}`} aria-pressed={p.consent[c.key]} className={'pref-chip '+(p.consent[c.key]?'chosen':'')} onClick={()=>toggle(p,c.key)}>{c.label}</button>)}</div>
   <label className="pref-preferred">{t('common.preferred')}
    <select value={p.preferred} disabled={busy===`${p.id}`} aria-label={t('notif.ariaChannel',{name: p.name})} onChange={e=>prefer(p,e.target.value as Preferred)}>
     <option value="none">{t('notifications.contactPreferences.none')}</option>{CHANNELS.map(c=><option key={c.key} value={c.key} disabled={!p.consent[c.key]}>{c.label}</option>)}
    </select>
   </label>
  </div>)}</div>}
 </Card>;
}
