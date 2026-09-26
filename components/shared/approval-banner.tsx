import {AlertCircle} from 'lucide-react';

/** Inline notice for work that is blocked pending approval. */
export function ApprovalBanner({children}:{children:React.ReactNode}){
 return <p className="inline-alert" role="status"><AlertCircle size={15}/> {children}</p>;
}
