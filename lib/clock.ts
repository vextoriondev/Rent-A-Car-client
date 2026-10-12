import {apiMode} from './api';
import {today as sampleToday} from './demo';

/** One place for "what day is it". The demo's sample data lives in September 2026, so the demo keeps that sample date; every real (API) screen uses the actual date. */
export const todayIso=()=>{
 if(!apiMode)return sampleToday;
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const at=(s:string)=>new Date(s+'T12:00:00');

/** First and last day of the month that today falls in. */
export function currentMonthRange(){
 const d=at(todayIso());
 return {from:iso(new Date(d.getFullYear(),d.getMonth(),1,12)),to:iso(new Date(d.getFullYear(),d.getMonth()+1,0,12))};
}
/** First day of the month after today (the default start of a revision). */
export const firstOfNextMonth=()=>{const d=at(todayIso());return iso(new Date(d.getFullYear(),d.getMonth()+1,1,12))};
/** "September 2026" for any date or month start. */
export const monthLabel=(isoDate:string)=>at(isoDate.slice(0,10)).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
/** A greeting that follows the hour (the demo is always "morning" so screenshots stay stable). */
export function greeting(){
 if(!apiMode)return 'Good morning';
 const h=new Date().getHours();
 return h<12?'Good morning':h<17?'Good afternoon':'Good evening';
}
/** Two letters for the avatar from a user name. */
export const initials=(name?:string)=>{const parts=(name||'').trim().split(/[\s._-]+/).filter(Boolean);return ((parts[0]?.[0]||'?')+(parts[1]?.[0]||'')).toUpperCase()};
