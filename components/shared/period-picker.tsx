"use client";
import {useEffect,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {rangeFor,rangeProblem,shiftRange,usePeriod,type Preset} from '@/lib/period';

const presets:{value:Exclude<Preset,'custom'>;label:string}[]=[{value:'day',label:'Day'},{value:'week',label:'Week'},{value:'month',label:'Month'},{value:'year',label:'Year'}];

/** Global period picker shown in every page heading; the choice lives in the URL as ?from=&to=. */
export function PeriodPicker(){
 const {range,setRange,preset,label}=usePeriod();
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState(range);
 useEffect(()=>setDraft(range),[range]);
 const problem=rangeProblem(draft);
 const unchanged=draft.from===range.from&&draft.to===range.to;
 return <div className="period-picker">
  <button type="button" className="icon-button" aria-label="Previous period" onClick={()=>setRange(shiftRange(range,-1))}><ChevronLeft size={16}/></button>
  <Popover open={open} onOpenChange={setOpen}>
   <PopoverTrigger asChild><button type="button" className="period-chip" aria-label={`Change period, now ${label}`}><CalendarDays size={16}/> {label}</button></PopoverTrigger>
   <PopoverContent align="end" className="period-popover">
    <div className="period-presets" role="group" aria-label="Period length">{presets.map(p=><Button key={p.value} size="sm" variant={preset===p.value?'default':'outline'} aria-pressed={preset===p.value} onClick={()=>{setRange(rangeFor(p.value,range.from));setOpen(false)}}>{p.label}</Button>)}
     <Button size="sm" variant={preset==='custom'?'default':'outline'} aria-pressed={preset==='custom'} onClick={()=>undefined}>Custom</Button></div>
    <div className="period-custom">
     <label>From<Input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
     <label>To<Input type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
    </div>
    {problem&&<p className="note" role="alert">{problem}</p>}
    <Button size="sm" disabled={!!problem||unchanged} onClick={()=>{setRange(draft);setOpen(false)}}>Apply range</Button>
   </PopoverContent>
  </Popover>
  <button type="button" className="icon-button" aria-label="Next period" onClick={()=>setRange(shiftRange(range,1))}><ChevronRight size={16}/></button>
 </div>;
}
