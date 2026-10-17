"use client";
import {useCallback,useMemo} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {apiMode} from './api';
import {currentMonthRange} from './clock';
import {t,dateLocale} from '@/lib/copy';

/** Global period (F2): day / week / month / year / custom, kept in the URL as ?from=&to= (inclusive ISO dates). ?month=YYYY-MM-01 from old links still works. */
export type Preset='day'|'week'|'month'|'year'|'custom';
export interface Range{from:string;to:string}

/** The month shown when the URL names no period: this month for real data, the sample month (September 2026) in the demo. */
export const defaultRange=():Range=>apiMode?currentMonthRange():{from:'2026-09-01',to:'2026-09-30'};
const MAX_DAYS=5*366;

const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=(s:string)=>new Date(s+'T12:00:00');
const valid=(s:string|null):s is string=>!!s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(parse(s).getTime());
const addDays=(s:string,n:number)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
const monthStart=(s:string)=>s.slice(0,8)+'01';
const monthEnd=(s:string)=>{const d=parse(monthStart(s));d.setMonth(d.getMonth()+1);d.setDate(0);return iso(d)};
const addMonths=(s:string,n:number)=>{const d=parse(monthStart(s));d.setMonth(d.getMonth()+n);return iso(d)};
const mondayOf=(s:string)=>{const d=parse(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)};

/** Which preset a range is exactly, so the picker can highlight it and step by the right unit. */
export function presetOf(r:Range):Preset{
 if(r.from===r.to)return 'day';
 if(r.from===mondayOf(r.from)&&r.to===addDays(r.from,6))return 'week';
 if(r.from===monthStart(r.from)&&r.to===monthEnd(r.from))return 'month';
 if(r.from.slice(5)==='01-01'&&r.to===r.from.slice(0,4)+'-12-31')return 'year';
 return 'custom';
}

/** The range a preset covers around a date. */
export function rangeFor(preset:Exclude<Preset,'custom'>,around:string):Range{
 if(preset==='day')return{from:around,to:around};
 if(preset==='week'){const from=mondayOf(around);return{from,to:addDays(from,6)}}
 if(preset==='month')return{from:monthStart(around),to:monthEnd(around)};
 return{from:around.slice(0,4)+'-01-01',to:around.slice(0,4)+'-12-31'};
}

/** Previous (-1) or next (+1) range of the same size. */
export function shiftRange(r:Range,dir:1|-1):Range{
 const p=presetOf(r);
 if(p==='day')return{from:addDays(r.from,dir),to:addDays(r.from,dir)};
 if(p==='week')return{from:addDays(r.from,7*dir),to:addDays(r.to,7*dir)};
 if(p==='month'){const from=addMonths(r.from,dir);return{from,to:monthEnd(from)}}
 if(p==='year'){const y=Number(r.from.slice(0,4))+dir;return{from:`${y}-01-01`,to:`${y}-12-31`}}
 const span=Math.round((parse(r.to).getTime()-parse(r.from).getTime())/86400000)+1;
 return{from:addDays(r.from,span*dir),to:addDays(r.to,span*dir)};
}

/** Why a range cannot be used, or '' when it is fine. */
export function rangeProblem(r:Range){
 if(!valid(r.from)||!valid(r.to))return t('period.enterBothDates');
 if(r.from>r.to)return t('period.theStartDateIs');
 if((parse(r.to).getTime()-parse(r.from).getTime())/86400000>MAX_DAYS)return t('period.aPeriodCanSpan');
 return '';
}

const fmt=(s:string,o:Intl.DateTimeFormatOptions)=>parse(s).toLocaleDateString(dateLocale(),o);
export function rangeLabel(r:Range){
 const p=presetOf(r);
 if(p==='day')return fmt(r.from,{day:'numeric',month:'short',year:'numeric'});
 if(p==='month')return fmt(r.from,{month:'long',year:'numeric'});
 if(p==='year')return r.from.slice(0,4);
 return t('period.range',{from: fmt(r.from,{day:'numeric',month:'short',year:'numeric'}), to: fmt(r.to,{day:'numeric',month:'short',year:'numeric'})});
}
/** First-of-month for every month from `earliest` to `latest` (any dates), newest first. Feeds the picker's month shortcuts. */
export function monthList(earliest:string,latest:string){const out:string[]=[];for(let m=monthStart(latest);m>=monthStart(earliest);m=addMonths(m,-1))out.push(m);return out}
/** Used in file names: a single month stays `2026-09`; anything else spells out both dates. */
export const rangeStem=(r:Range)=>presetOf(r)==='month'?r.from.slice(0,7):`${r.from}_${r.to}`;
/** First-of-month for every month a range touches (the rent periods it overlaps). */
export function monthsOf(r:Range){const out:string[]=[];for(let m=monthStart(r.from);m<=r.to;m=addMonths(m,1))out.push(m);return out}
export const inRange=(date:string,r:Range)=>date>=r.from&&date<=r.to;

/** Reads the period from the URL (invalid input falls back to the default) and writes it back with router.replace. */
export function usePeriod(){
 const router=useRouter();const pathname=usePathname();const sp=useSearchParams();
 const from=sp.get('from'),to=sp.get('to'),month=sp.get('month');
 const range=useMemo<Range>(()=>{
  if(valid(from)&&valid(to)&&!rangeProblem({from,to}))return{from,to};
  if(valid(month))return rangeFor('month',month);
  return defaultRange();
 },[from,to,month]);
 const setRange=useCallback((next:Range)=>{
  if(rangeProblem(next))return;
  const params=new URLSearchParams(sp.toString());params.delete('month');
  const standard=defaultRange();
  if(next.from===standard.from&&next.to===standard.to){params.delete('from');params.delete('to')}else{params.set('from',next.from);params.set('to',next.to)}
  const qs=params.toString();router.replace(qs?`${pathname}?${qs}`:pathname,{scroll:false});
 },[sp,router,pathname]);
 const months=useMemo(()=>monthsOf(range),[range]);
 return{range,setRange,preset:presetOf(range),label:rangeLabel(range),stem:rangeStem(range),months,lastMonth:months[months.length-1],multiMonth:months.length>1};
}
