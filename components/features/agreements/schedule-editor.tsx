"use client";
import {useState} from 'react';
import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {describeValue,weekdays,type ScheduleValue} from '@/lib/schedule';
import {t} from '@/lib/copy';

const DAYS=['last',...Array.from({length:31},(_,i)=>String(i+1))];

/** Picks one side's payment day: monthly on a day or the last day, weekly on a weekday, or chosen dates. `allowDefault` adds "Month end" as the unset choice. */
export function ScheduleEditor({label,value,onChange,allowDefault=true}:{label:string;value:ScheduleValue;onChange:(v:ScheduleValue)=>void;allowDefault?:boolean}){
 const [pending,setPending]=useState('');
 const set=(p:Partial<ScheduleValue>)=>onChange({...value,...p});
 const addDate=()=>{if(pending&&!value.dates.includes(pending)){set({dates:[...value.dates,pending].sort()});setPending('')}};
 return <fieldset className="schedule-editor">
  <legend>{label}</legend>
  <div className="form-grid">
   <label>{t('common.when')}
    <Select value={value.kind} onValueChange={v=>set({kind:v as ScheduleValue['kind']})}>
     <SelectTrigger aria-label={t('schedule.ariaWhen',{label})}><SelectValue/></SelectTrigger>
     <SelectContent>
      {allowDefault&&<SelectItem value="default">{t('agreements.scheduleEditor.monthEndDefault')}</SelectItem>}
      <SelectItem value="monthly">{t('agreements.scheduleEditor.monthlyOnADay')}</SelectItem>
      <SelectItem value="weekly">{t('agreements.scheduleEditor.weeklyOnAWeekday')}</SelectItem>
      <SelectItem value="dates">{t('agreements.scheduleEditor.onChosenDates')}</SelectItem>
     </SelectContent>
    </Select>
   </label>
   {value.kind==='monthly'&&<label>{t('common.dayOfMonth')}
    <Select value={value.day} onValueChange={v=>set({day:v})}><SelectTrigger aria-label={t('schedule.ariaDay',{label})}><SelectValue/></SelectTrigger><SelectContent>{DAYS.map(d=><SelectItem key={d} value={d}>{d==='last'?t('agreements.scheduleEditor.lastDay'):d}</SelectItem>)}</SelectContent></Select>
   </label>}
   {value.kind==='weekly'&&<label>{t('common.weekday')}
    <Select value={value.weekday} onValueChange={v=>set({weekday:v})}><SelectTrigger aria-label={t('schedule.ariaWeekday',{label})}><SelectValue/></SelectTrigger><SelectContent>{weekdays().map((d,i)=><SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select>
   </label>}
  </div>
  {value.kind==='dates'&&<div className="schedule-dates">
   <div className="schedule-add"><Input type="date" aria-label={t('schedule.ariaAdd',{label})} value={pending} onChange={e=>setPending(e.target.value)}/><Button type="button" size="sm" variant="outline" onClick={addDate} disabled={!pending}>{t('agreements.scheduleEditor.addDate')}</Button></div>
   <div className="schedule-chips">{value.dates.length===0&&<small className="hint">{t('agreements.scheduleEditor.addAtLeastOne')}</small>}{value.dates.map(d=><span key={d} className="schedule-chip">{d}<button type="button" aria-label={t('schedule.ariaRemove',{date: d})} onClick={()=>set({dates:value.dates.filter(x=>x!==d)})}><X size={12}/></button></span>)}</div>
  </div>}
  <small className="hint">{t('schedule.hint',{summary: describeValue(value)})}</small>
 </fieldset>;
}
