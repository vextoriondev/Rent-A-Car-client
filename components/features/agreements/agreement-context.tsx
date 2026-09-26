import type {Agreement} from '@/lib/demo';

/** Minimal customer/owner/driver relation strip. No editing or version history yet (later phase, needs backend AgreementVersion). */
export function AgreementContext({agreement}:{agreement:Agreement}){
 return <div className="detail-relations"><div><span>Customer</span><b>{agreement.customer}</b></div><div><span>Owner</span><b>{agreement.owner}</b></div><div><span>Driver</span><b>{agreement.driver}</b></div></div>;
}
