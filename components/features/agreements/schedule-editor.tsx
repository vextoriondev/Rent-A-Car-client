"use client";
import {useState} from 'react';
import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {describeValue,WEEKDAYS,type ScheduleValue} from '@/lib/schedule';

const DAYS=['last',...Array.from({length:31},(_,i)=>String(i+1))];

/** Picks one side's payment day: monthly on a day or the last day, weekly on a weekday, or chosen dates. `allowDefault` adds "Month end" as the unset choice. */
export function ScheduleEditor({label,value,onChange,allowDefault=true}:{label:string;value:ScheduleValue;onChange:(v:ScheduleValue)=>void;allowDefault?:boolean}){
 const [pending,setPending]=useState('');
 const set=(p:Partial<ScheduleValue>)=>onChange({...value,...p});
 const addDate=()=>{if(pending&&!value.dates.includes(pending)){set({dates:[...value.dates,pending].sort()});setPending('')}};
 return <fieldset className="schedule-editor">
  <legend>{label}</legend>
  <div className="form-grid">
   <label>When
    <Select value={value.kind} onValueChange={v=>set({kind:v as ScheduleValue['kind']})}>
     <SelectTrigger aria-label={`${label}: when`}><SelectValue/></SelectTrigger>
     <SelectContent>
      {allowDefault&&<SelectItem value="default">Month end (default)</SelectItem>}
      <SelectItem value="monthly">Monthly on a day</SelectItem>
      <SelectItem value="weekly">Weekly on a weekday</SelectItem>
      <SelectItem value="dates">On chosen dates</SelectItem>
     </SelectContent>
    </Select>
   </label>
   {value.kind==='monthly'&&<label>Day of the month
    <Select value={value.day} onValueChange={v=>set({day:v})}><SelectTrigger aria-label={`${label}: day of the month`}><SelectValue/></SelectTrigger><SelectContent>{DAYS.map(d=><SelectItem key={d} value={d}>{d==='last'?'Last day':d}</SelectItem>)}</SelectContent></Select>
   </label>}
   {value.kind==='weekly'&&<label>Weekday
    <Select value={value.weekday} onValueChange={v=>set({weekday:v})}><SelectTrigger aria-label={`${label}: weekday`}><SelectValue/></SelectTrigger><SelectContent>{WEEKDAYS.map((d,i)=><SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select>
   </label>}
  </div>
  {value.kind==='dates'&&<div className="schedule-dates">
   <div className="schedule-add"><Input type="date" aria-label={`${label}: add a date`} value={pending} onChange={e=>setPending(e.target.value)}/><Button type="button" size="sm" variant="outline" onClick={addDate} disabled={!pending}>Add date</Button></div>
   <div className="schedule-chips">{value.dates.length===0&&<small className="hint">Add at least one date.</small>}{value.dates.map(d=><span key={d} className="schedule-chip">{d}<button type="button" aria-label={`Remove ${d}`} onClick={()=>set({dates:value.dates.filter(x=>x!==d)})}><X size={12}/></button></span>)}</div>
  </div>}
  <small className="hint">{describeValue(value)}. The money falls due on these days; the last stretch closes on the end date.</small>
 </fieldset>;
}
