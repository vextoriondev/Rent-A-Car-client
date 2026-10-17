"use client";
import {useState} from 'react';
import {Can} from '@/lib/roles';
import {apiRequest} from '@/lib/api';
import {LANGUAGES,t} from '@/lib/copy';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

/** The language of every message sent to this person (M17). Staff can change it; it never changes a figure. */
export function PartyLanguage({orgId,id,language}:{orgId:number;id:number;language?:string}){
 const [value,setValue]=useState(language==='bn'?'bn':'en');
 const [note,setNote]=useState('');
 const change=async(next:string)=>{
  setValue(next);
  try{await apiRequest(`/orgs/${orgId}/parties/${id}`,{method:'PATCH',body:JSON.stringify({language:next})});setNote(t('pp.languageSaved'))}
  catch(e){setNote((e as Error).message)}
 };
 return <div><span>{t('pp.messageLanguage')}</span>
  <Can action="entry.record"><Select value={value} onValueChange={v=>void change(v)}><SelectTrigger aria-label={t('pp.messageLanguage')}><SelectValue/></SelectTrigger><SelectContent>{LANGUAGES.map(l=><SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent></Select></Can>
  {note&&<small className="hint">{note}</small>}
 </div>;
}
