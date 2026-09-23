import {money} from '@/lib/demo';

/** Formats a BDT amount via lib/demo's money(), and centralizes the negative-value sign that every call site used to hand-roll separately. */
export function Money({value,signed=false,className}:{value:number;signed?:boolean;className?:string}){
 const negative=signed&&value<0;
 return <span className={className}>{negative?'−':''}{money(value)}</span>;
}
