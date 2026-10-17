"use client";
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {monthList,rangeFor,rangeProblem,shiftRange,usePeriod,type Preset} from '@/lib/period';
import {useRentflowStore} from '@/lib/store-context';
import {t,dateLocale,localizeDigits} from '@/lib/copy';

const presets:{value:Exclude<Preset,'custom'>;label:string}[]=[{value:'day',label: t('common.day')},{value:'week',label: t('shared.periodPicker.week')},{value:'month',label: t('common.month')},{value:'year',label: t('shared.periodPicker.year')}];

/** Global period picker shown in every page heading; the choice lives in the URL as ?from=&to=. */
export function PeriodPicker(){
 const {range,setRange,preset,label}=usePeriod();
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState(range);
 useEffect(()=>setDraft(range),[range]);
 const {store}=useRentflowStore();
 const [year,setYear]=useState(Number(range.from.slice(0,4)));
 useEffect(()=>setYear(Number(range.from.slice(0,4))),[range]);
 // One shortcut per month, from the earliest agreement (or the chosen range, if earlier) to the current month (or the chosen range, if later).
 const months=useMemo(()=>{
  const now=new Date(),current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const earliest=[range.from,...store.agreements.map(a=>a.start).filter(Boolean)].sort()[0];
  return monthList(earliest,[range.to,current].sort().at(-1)!);
 },[range,store.agreements]);
 const years=[Number(months.at(-1)!.slice(0,4)),Number(months[0].slice(0,4))];
 const inYear=months.filter(m=>m.startsWith(String(year)));
 const problem=rangeProblem(draft);
 const unchanged=draft.from===range.from&&draft.to===range.to;
 return <div className="period-picker">
  <button type="button" className="icon-button" aria-label={t('shared.periodPicker.previousPeriod')} onClick={()=>setRange(shiftRange(range,-1))}><ChevronLeft size={16}/></button>
  <Popover open={open} onOpenChange={setOpen}>
   <PopoverTrigger asChild><button type="button" className="period-chip" aria-label={t('period.ariaChange',{label})}><CalendarDays size={16}/> {label}</button></PopoverTrigger>
   <PopoverContent align="end" className="period-popover">
    <div className="period-presets" role="group" aria-label={t('shared.periodPicker.periodLength')}>{presets.map(p=><Button key={p.value} size="sm" variant={preset===p.value?'default':'outline'} aria-pressed={preset===p.value} onClick={()=>{setRange(rangeFor(p.value,range.from));setOpen(false)}}>{p.label}</Button>)}
     <Button size="sm" variant={preset==='custom'?'default':'outline'} aria-pressed={preset==='custom'} onClick={()=>undefined}>{t('shared.periodPicker.custom')}</Button></div>
    <div className="period-months" role="group" aria-label={t('shared.periodPicker.pickAMonth')}>
     <div className="period-year"><button type="button" className="icon-button" aria-label={t('shared.periodPicker.previousYear')} disabled={year<=years[0]} onClick={()=>setYear(year-1)}><ChevronLeft size={14}/></button><strong>{localizeDigits(year)}</strong><button type="button" className="icon-button" aria-label={t('shared.periodPicker.nextYear')} disabled={year>=years[1]} onClick={()=>setYear(year+1)}><ChevronRight size={14}/></button></div>
     <div className="period-month-grid">{inYear.map(m=>{const r=rangeFor('month',m),on=range.from===r.from&&range.to===r.to;return <Button key={m} size="sm" variant={on?'default':'outline'} aria-pressed={on} onClick={()=>{setRange(r);setOpen(false)}}>{new Date(m+'T12:00:00').toLocaleDateString(dateLocale(),{month:'short'})}</Button>})}</div>
    </div>
    <div className="period-custom">
     <label>{t('common.from')}<Input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
     <label>To<Input type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
    </div>
    {problem&&<p className="note" role="alert">{problem}</p>}
    <Button size="sm" disabled={!!problem||unchanged} onClick={()=>{setRange(draft);setOpen(false)}}>{t('shared.periodPicker.applyRange')}</Button>
   </PopoverContent>
  </Popover>
  <button type="button" className="icon-button" aria-label={t('shared.periodPicker.nextPeriod')} onClick={()=>setRange(shiftRange(range,1))}><ChevronRight size={16}/></button>
 </div>;
}
