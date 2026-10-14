import {driverLabel,type Agreement} from '@/lib/demo';
import {fmtDate} from '@/lib/format';

const dayCount=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/86400000)+1;

/** Minimal customer/owner/driver relation strip, plus the agreed duration. No editing or version history yet (later phase, needs backend AgreementVersion). */
export function AgreementContext({agreement}:{agreement:Agreement}){
 const {start,end}=agreement;
 const duration=end?`${fmtDate(start)} to ${fmtDate(end)} · ${dayCount(start,end)} days`:`From ${fmtDate(start)} · no end date`;
 return <div className="detail-relations"><div><span>Customer</span><b>{agreement.customer}</b></div><div><span>Owner</span><b>{agreement.owner}</b></div><div><span>Driver</span><b>{driverLabel(agreement)}</b></div><div><span>Agreement period</span><b>{duration}</b></div></div>;
}
