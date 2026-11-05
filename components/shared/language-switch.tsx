"use client";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {apiMode,apiRequest} from '@/lib/api';
import {LANGUAGES,getLanguage,switchLanguage,t,type Lang} from '@/lib/copy';

/** Picks the language of every screen, bill and download. Saves it for this browser and, when signed in, for the person; then reloads the page. */
export function LanguageSwitch(){
 const current=getLanguage();
 const change=async(next:string)=>{
  if(next===current)return;
  if(apiMode)try{await apiRequest('/me/preferences',{method:'PATCH',body:JSON.stringify({language:next==='bn'?'bn':'en'})})}catch{/* the choice still works in this browser */}
  switchLanguage(next as Lang);
 };
 return <Select value={current} onValueChange={v=>void change(v)}>
  <SelectTrigger aria-label={t('lang.label')} className="language-switch"><SelectValue/></SelectTrigger>
  <SelectContent>{LANGUAGES.map(l=><SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
 </Select>;
}
