import {AlertCircle} from 'lucide-react';

export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}){
 return <div className="form-error" role="alert">
  <AlertCircle size={16}/>
  <span>{message}</span>
  {onRetry&&<button className="text-button" onClick={onRetry}>Retry</button>}
 </div>;
}
