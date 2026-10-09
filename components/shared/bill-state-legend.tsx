import {BillStateChip} from '@/components/shared/bill-state-chip';

const hint={outstanding:'a bill we still have to pay out',paid:'nothing left to settle',owed_to_us:'money someone owes us'} as const;

/** Small key for the bill colours: red outstanding, green paid, amber owed to us. */
export function BillStateLegend(){
 return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-xs text-muted-foreground" aria-label="Bill colour key">
  {(Object.keys(hint) as (keyof typeof hint)[]).map(s=><span key={s} className="inline-flex items-center gap-2"><BillStateChip state={s}/>{hint[s]}</span>)}
 </div>;
}
