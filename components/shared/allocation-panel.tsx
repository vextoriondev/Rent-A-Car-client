import {Money} from '@/components/shared/money';
import {t} from '@/lib/copy';

export interface AllocationLine{label:string;amount:number}

/** Read-only view of where a payment was applied. Multi-invoice splitting is later-phase work (needs backend allocations UI). */
export function AllocationPanel({lines}:{lines:AllocationLine[]}){
 return <div>
  <h3 className="detail-subheading">{t('shared.allocationPanel.allocation')}</h3>
  <div className="statement-lines">{lines.map(l=><div key={l.label}><span>{l.label}</span><b className="nums"><Money value={l.amount}/></b></div>)}</div>
 </div>;
}
