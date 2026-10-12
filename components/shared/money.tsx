import {money} from '@/lib/demo';
import type {BillState} from '@/lib/bill-state';

/** Formats a BDT amount via lib/demo's money(), and centralizes the negative-value sign that every call site used to hand-roll separately.
 * With `state` the amount takes the bill colour (red outstanding, green paid, amber owed to us); a label or chip always sits beside it, so colour is never the only signal. */
export function Money({value,signed=false,className,state}:{value:number;signed?:boolean;className?:string;state?:BillState|null}){
 const negative=signed&&value<0;
 const cls=[className,state?`bill-money bill-money-${state}`:''].filter(Boolean).join(' ')||undefined;
 return <span className={cls} data-bill-state={state||undefined}>{negative?'−':''}{money(value)}</span>;
}
