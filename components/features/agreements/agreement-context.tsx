import {driverLabel,type Agreement} from '@/lib/demo';
import {fmtDate} from '@/lib/format';
import {t} from '@/lib/copy';

const dayCount=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/86400000)+1;

/** Minimal customer/owner/driver relation strip, plus the agreed duration. No editing or version history yet (later phase, needs backend AgreementVersion). */
export function AgreementContext({agreement}:{agreement:Agreement}){
 const {start,end}=agreement;
 const duration=end?t('terms.duration',{from: fmtDate(start), to: fmtDate(end), days: dayCount(start,end)}):t('terms.durationOpen',{from: fmtDate(start)});
 return <div className="detail-relations"><div><span>{t('common.customer')}</span><b>{agreement.customer}</b></div><div><span>{t('common.owner')}</span><b>{agreement.owner}</b></div><div><span>{t('common.driver')}</span><b>{driverLabel(agreement)}</b></div><div><span>{t('agreements.agreementContext.agreementPeriod')}</span><b>{duration}</b></div></div>;
}
