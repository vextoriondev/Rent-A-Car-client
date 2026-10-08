import {CheckCircle2,CircleAlert,HandCoins} from 'lucide-react';
import {billStateLabel,type BillState} from '@/lib/bill-state';

const icon={outstanding:CircleAlert,paid:CheckCircle2,owed_to_us:HandCoins} as const;

/** Red outstanding, green paid, amber owed to us. Always label plus icon, never colour alone. */
export function BillStateChip({state}:{state:BillState}){
 const Icon=icon[state];
 return <span className={`bill-chip bill-${state}`} data-state={state}><Icon size={12} aria-hidden="true"/>{billStateLabel[state]}</span>;
}
