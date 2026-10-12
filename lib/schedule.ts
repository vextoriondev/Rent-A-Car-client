/** M12 payment schedule and rent basis, shared by the wizard, the Revise dialog and the agreement drawer. */
export type Basis='per_day'|'per_month'|'fixed_total';
export const BASES:[Basis,string][]=[['per_month','Per month'],['per_day','Per day'],['fixed_total','Fixed total']];
export const basisLabel=(b?:string)=>BASES.find(x=>x[0]===b)?.[1]??'Per month';
/** What the amount field means, so the label never says "per month" for a daily rate or a total. */
export const basisUnit=(b?:string)=>b==='per_day'?'per day':b==='fixed_total'?'in total':'per month';

export type ScheduleKind='default'|'monthly'|'weekly'|'dates';
/** One side's schedule as the forms edit it. `default` = monthly on the last day (what month-end billing always did). */
export interface ScheduleValue{kind:ScheduleKind;day:string;weekday:string;dates:string[]}
export const defaultSchedule:ScheduleValue={kind:'default',day:'last',weekday:'4',dates:[]};

export type ApiSpec={kind:'monthly';day:number|'last'}|{kind:'weekly';weekday:number}|{kind:'dates';dates:string[]};
export type ApiSchedule=Partial<Record<'customer'|'owner'|'driver',ApiSpec>>;

export const WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export function toApiSpec(v:ScheduleValue):ApiSpec|null{
 if(v.kind==='default')return null;
 if(v.kind==='monthly')return {kind:'monthly',day:v.day==='last'?'last':Number(v.day)};
 if(v.kind==='weekly')return {kind:'weekly',weekday:Number(v.weekday)};
 return {kind:'dates',dates:[...new Set(v.dates)].sort()};
}
export function fromApiSpec(spec?:ApiSpec|null):ScheduleValue{
 if(!spec)return {...defaultSchedule,dates:[]};
 if(spec.kind==='monthly')return {kind:'monthly',day:String(spec.day),weekday:'4',dates:[]};
 if(spec.kind==='weekly')return {kind:'weekly',day:'last',weekday:String(spec.weekday),dates:[]};
 return {kind:'dates',day:'last',weekday:'4',dates:[...spec.dates]};
}
/** The three sides' choices as the API wants them (a side left on the default is simply omitted). */
export function buildSchedule(sides:Partial<Record<'customer'|'owner'|'driver',ScheduleValue>>):ApiSchedule{
 const out:ApiSchedule={};
 for(const [k,v] of Object.entries(sides) as ['customer'|'owner'|'driver',ScheduleValue][]){const s=v?toApiSpec(v):null;if(s)out[k]=s}
 return out;
}
const ordinal=(n:number)=>n+(n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'} as Record<number,string>)[n%10]||'th');
export function describeSpec(spec?:ApiSpec|null):string{
 if(!spec)return 'Monthly on the last day';
 if(spec.kind==='monthly')return spec.day==='last'?'Monthly on the last day':`Monthly on the ${ordinal(spec.day)}`;
 if(spec.kind==='weekly')return `Weekly on ${WEEKDAYS[spec.weekday]}s`;
 return `On ${spec.dates.length} chosen date${spec.dates.length===1?'':'s'}`;
}
export const describeValue=(v:ScheduleValue)=>describeSpec(toApiSpec(v));
export const sameSchedule=(a:ScheduleValue,b:ScheduleValue)=>JSON.stringify(toApiSpec(a))===JSON.stringify(toApiSpec(b));
