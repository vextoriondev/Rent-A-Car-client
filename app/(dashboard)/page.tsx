"use client";
import {useRouter} from 'next/navigation';
import {ArrowUpRight,ArrowDownLeft,WalletCards,Banknote,ChartNoAxesCombined,Clock3,AlertCircle,Layers3,ReceiptText,FileSignature,Plus,ChevronRight} from 'lucide-react';
import {totals} from '@/lib/demo';
import {apiMode} from '@/lib/api';
import {monthLabel} from '@/lib/clock';
import {usePeriod} from '@/lib/period';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {fmtDate} from '@/lib/format';
import {AccountsLedger} from '@/components/features/accounts/accounts-ledger';
import {Card} from '@/components/ui/card';
import {Money} from '@/components/shared/money';
import {Can} from '@/lib/roles';
import {t,tn} from '@/lib/copy';

export default function OverviewPage(){
 const router=useRouter();
 const rf=useRentflowStore();
 const {store}=rf;
 const period=usePeriod();
 const financial=totals(store);
 const metrics=[
  {label: t('app.customerOutstanding'),value:financial.customer,icon:ArrowDownLeft,detail: t('app.billedRentLessReceipts'),color:'blue'},
  {label: t('app.ownersPayable'),value:financial.owner,icon:ArrowUpRight,detail: t('app.netOfPermittedOffsets'),color:'gold'},
  {label: t('app.driversPayable'),value:financial.driver,icon:WalletCards,detail: t('app.earnedLessPayouts'),color:'purple'},
  {label: t('app.cashMovement'),value:financial.cash,icon:Banknote,detail: t('app.recordedInflowsLessOutflows'),color:'gray'},
 ];
 return <>
  <div className="metric-grid">{metrics.map(m=><Card key={m.label} className="metric"><div className="metric-top"><span>{m.label}</span><span className={'metric-icon '+m.color}><m.icon size={19}/></span></div><strong className="nums"><Money value={m.value}/></strong><small>{m.detail}</small></Card>)}</div>
  <div className="overview-layout">
   <div className="overview-main">
    <Card><SectionHeading title={t('app.monthlyAccountOverview')} subtitle={t('app.eachRowConnectsCustomer')} action={<button className="text-button" onClick={()=>router.push('/settlements')}>{t('app.viewSettlements')} <ChevronRight size={16}/></button>}/><AccountsLedger agreements={store.agreements} store={store} onSelect={rf.setSelected}/></Card>
    <Card><SectionHeading title={t('app.recentActivity')} subtitle={t('app.entriesLinkBackTo')} action={<button className="text-button" onClick={()=>router.push('/cashbook')}>{t('common.cashbook')} <ChevronRight size={16}/></button>}/>
     <div className="activity-list">{store.entries.slice(0,5).map(e=>{const a=store.agreements.find(a=>a.id===e.agreementId);return <button className="activity" key={e.id} onClick={()=>rf.setSelected(e.id)}><span className={'activity-icon '+(e.type==='Customer payment'?'incoming':'outgoing')}>{e.type==='Customer payment'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><span className="activity-title"><strong>{e.description}</strong><small>{a?.vehicle} · {fmtDate(e.date)} · {e.id}</small></span><b className="nums"><Money value={e.amount}/></b><ChevronRight size={15}/></button>})}</div>
    </Card>
   </div>
   <div className="overview-aside">
    <Card className="attention-card"><SectionHeading title={t('app.needsAttention')} subtitle={t('app.resolveTheseBeforeMonth')}/>
     <div className="attention-list">
      <button onClick={()=>router.push('/expenses')}><span className="attention-symbol amber"><Clock3 size={18}/></span><span><strong>{tn('dashboard.pendingExpenses',store.entries.filter(e=>e.status==='Pending approval').length)}</strong><small>{t('app.reviewResponsibilityAndProof')}</small></span><ChevronRight size={16}/></button>
      <button onClick={()=>router.push('/notifications')}><span className="attention-symbol red"><AlertCircle size={18}/></span><span><strong>{tn('dashboard.failedMessages',store.notices.filter(n=>n.status==='Failed').length)}</strong><small>{t('app.checkRecipientAndRetry')}</small></span><ChevronRight size={16}/></button>
      <button onClick={()=>router.push('/settlements')}><span className="attention-symbol teal"><Layers3 size={18}/></span><span><strong>{tn('dashboard.openMonths',store.agreements.length-store.closed.length)}</strong><small>{apiMode?monthLabel(store.backend?.shownMonth??period.lastMonth):t('app.closeMonthSample')}</small></span><ChevronRight size={16}/></button>
     </div>
    </Card>
    <Card className="quick-card"><SectionHeading title={t('app.quickActions')}/>
     <div className="quick-actions">
      <Can action="entry.record"><button onClick={()=>rf.openEntry('Expense')}><ReceiptText size={18}/> {t('common.recordExpense')} <Plus size={16}/></button></Can>
      <Can action="payment.post"><button onClick={()=>rf.openEntry('Customer payment')}><ArrowDownLeft size={18}/> {t('common.receivePayment')} <Plus size={16}/></button></Can>
      <Can action="agreement.write"><button onClick={()=>{rf.setAgreementOpen(true)}}><FileSignature size={18}/> {t('common.newAgreement')} <Plus size={16}/></button></Can>
     </div>
    </Card>
    <Card className="insight-card"><div className="insight-label"><ChartNoAxesCombined size={17}/> {t('app.accrualSnapshot')}</div><strong className="nums"><Money value={financial.margin} signed/></strong><p>{t('app.estimatedMarginBeforeTax')}</p></Card>
   </div>
  </div>
 </>;
}
