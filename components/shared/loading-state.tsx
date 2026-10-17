import {t} from '@/lib/copy';
/** Page-shell skeleton, shown while the store's initial snapshot (demo localStorage read or Django /snapshot fetch) is in flight. */
export function LoadingState({rows=4}:{rows?:number}){
 return <div className="loading-skeleton" role="status" aria-live="polite">
  <div className="skeleton-block" style={{width:'min(420px,90vw)'}}>
   {Array.from({length:rows}).map((_,i)=><div key={i} className="skeleton-line" style={{width:i===0?'60%':'100%'}}/>)}
  </div>
  <span className="sr-only">{t('shared.loadingState.loadingRentflow')}</span>
 </div>;
}
