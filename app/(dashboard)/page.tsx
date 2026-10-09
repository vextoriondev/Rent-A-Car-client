"use client";
import {useRouter} from 'next/navigation';
import {ArrowUpRight,ArrowDownLeft,WalletCards,Banknote,ChartNoAxesCombined,Clock3,AlertCircle,Layers3,ReceiptText,FileSignature,Plus,ChevronRight} from 'lucide-react';
import {totals} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {SectionHeading} from '@/components/shared/section-heading';
import {fmtDate} from '@/lib/format';
import {AccountsLedger} from '@/components/features/accounts/accounts-ledger';
import {Card} from '@/components/ui/card';
import {Money} from '@/components/shared/money';
import {Can} from '@/lib/roles';

export default function OverviewPage(){
 const router=useRouter();
 const rf=useRentflowStore();
 const {store}=rf;
 const financial=totals(store);
 const metrics=[
  {label:'Customer outstanding',value:financial.customer,icon:ArrowDownLeft,detail:'Billed rent less receipts',color:'blue'},
  {label:'Owners payable',value:financial.owner,icon:ArrowUpRight,detail:'Net of permitted offsets',color:'gold'},
  {label:'Drivers payable',value:financial.driver,icon:WalletCards,detail:'Earned less payouts',color:'purple'},
  {label:'Cash movement',value:financial.cash,icon:Banknote,detail:'Recorded inflows less outflows',color:'gray'},
 ];
 return <>
  <div className="metric-grid">{metrics.map(m=><Card key={m.label} className="metric"><div className="metric-top"><span>{m.label}</span><span className={'metric-icon '+m.color}><m.icon size={19}/></span></div><strong className="nums"><Money value={m.value}/></strong><small>{m.detail}</small></Card>)}</div>
  <div className="overview-layout">
   <div className="overview-main">
    <Card><SectionHeading title="Monthly account overview" subtitle="Each row connects customer, owner and driver balances." action={<button className="text-button" onClick={()=>router.push('/settlements')}>View settlements <ChevronRight size={16}/></button>}/><AccountsLedger agreements={store.agreements} store={store} onSelect={rf.setSelected}/></Card>
    <Card><SectionHeading title="Recent activity" subtitle="Entries link back to their source account." action={<button className="text-button" onClick={()=>router.push('/cashbook')}>Cashbook <ChevronRight size={16}/></button>}/>
     <div className="activity-list">{store.entries.slice(0,5).map(e=>{const a=store.agreements.find(a=>a.id===e.agreementId);return <button className="activity" key={e.id} onClick={()=>rf.setSelected(e.id)}><span className={'activity-icon '+(e.type==='Customer payment'?'incoming':'outgoing')}>{e.type==='Customer payment'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><span className="activity-title"><strong>{e.description}</strong><small>{a?.vehicle} · {fmtDate(e.date)} · {e.id}</small></span><b className="nums"><Money value={e.amount}/></b><ChevronRight size={15}/></button>})}</div>
    </Card>
   </div>
   <div className="overview-aside">
    <Card className="attention-card"><SectionHeading title="Needs attention" subtitle="Resolve these before month close."/>
     <div className="attention-list">
      <button onClick={()=>router.push('/expenses')}><span className="attention-symbol amber"><Clock3 size={18}/></span><span><strong>{store.entries.filter(e=>e.status==='Pending approval').length} pending expense</strong><small>Review responsibility and proof</small></span><ChevronRight size={16}/></button>
      <button onClick={()=>router.push('/notifications')}><span className="attention-symbol red"><AlertCircle size={18}/></span><span><strong>{store.notices.filter(n=>n.status==='Failed').length} failed message</strong><small>Check recipient and retry</small></span><ChevronRight size={16}/></button>
      <button onClick={()=>router.push('/settlements')}><span className="attention-symbol teal"><Layers3 size={18}/></span><span><strong>{store.agreements.length-store.closed.length} open settlements</strong><small>September 2026</small></span><ChevronRight size={16}/></button>
     </div>
    </Card>
    <Card className="quick-card"><SectionHeading title="Quick actions"/>
     <div className="quick-actions">
      <Can action="entry.record"><button onClick={()=>rf.openEntry('Expense')}><ReceiptText size={18}/> Record expense <Plus size={16}/></button></Can>
      <Can action="payment.post"><button onClick={()=>rf.openEntry('Customer payment')}><ArrowDownLeft size={18}/> Receive payment <Plus size={16}/></button></Can>
      <Can action="agreement.write"><button onClick={()=>{rf.setAgreementOpen(true)}}><FileSignature size={18}/> New agreement <Plus size={16}/></button></Can>
     </div>
    </Card>
    <Card className="insight-card"><div className="insight-label"><ChartNoAxesCombined size={17}/> ACCRUAL SNAPSHOT</div><strong className="nums"><Money value={financial.margin} signed/></strong><p>Estimated margin before tax and other unrecorded costs. Cash movement is shown separately.</p></Card>
   </div>
  </div>
 </>;
}
