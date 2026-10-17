import {AlertCircle} from 'lucide-react';
import {t} from '@/lib/copy';

export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}){
 return <div className="form-error" role="alert">
  <AlertCircle size={16}/>
  <span>{message}</span>
  {onRetry&&<button className="text-button" onClick={onRetry}>{t('common.retry')}</button>}
 </div>;
}
