import {BillStateChip} from '@/components/shared/bill-state-chip';
import {t} from '@/lib/copy';

const hint={get outstanding(){return t('billState.hint.outstanding')},get paid(){return t('billState.hint.paid')},get owed_to_us(){return t('billState.hint.owedToUs')}};

/** Small key for the bill colours: red outstanding, green paid, amber owed to us. */
export function BillStateLegend(){
 return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-xs text-muted-foreground" aria-label={t('shared.billStateLegend.billColourKey')}>
  {(['outstanding','paid','owed_to_us'] as const).map(s=><span key={s} className="inline-flex items-center gap-2"><BillStateChip state={s}/>{hint[s]}</span>)}
 </div>;
}
