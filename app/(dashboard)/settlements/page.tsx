"use client";
import {useCallback,useEffect,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {apiMode,apiRequest} from '@/lib/api';
import {monthLabel} from '@/lib/clock';
import {usePeriod} from '@/lib/period';
import {statement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ApprovalBanner} from '@/components/shared/approval-banner';
import {EmptyState} from '@/components/shared/empty-state';
import {Money} from '@/components/shared/money';
import {SettlementWorkflow,stateLabel,stateTone,type SettlementRow} from '@/components/features/settlements/settlement-workflow';
import {Can} from '@/lib/roles';
import {t,localizeDigits} from '@/lib/copy';

export default function SettlementsPage(){
 const rf=useRentflowStore();
 const {store}=rf;
 const {agreements}=useRelatedAgreements();
 const [workflowFor,setWorkflowFor]=useState<string|null>(null);
 const [rows,setRows]=useState<Record<number,SettlementRow>>({});
 const orgId=store.backend?.orgId;
 const period=usePeriod();
 const shown=store.backend?.shownMonth??period.lastMonth;   // the month the account screens show
 const loadRows=useCallback(async()=>{
  if(!apiMode||!orgId)return;
  try{const list=await apiRequest(`/orgs/${orgId}/settlements?month=${shown}&limit=200`);setRows(Object.fromEntries(list.items.map((x:SettlementRow)=>[x.agreement_id,x])))}catch{/* the cards still work from the snapshot */}
 },[orgId,shown]);
 useEffect(()=>{void loadRows()},[loadRows,store.closed.length]);
 return <>
  <div className="settlement-banner"><div><span className="eyebrow">{t('settle.banner',{month: apiMode?monthLabel(shown):t('app.closeMonthSample')})}</span><h2>{t('settlements.monthEndSettlement')}</h2><p>{t('settlements.reviewCustomerOwnerDriver')}</p></div><div className="settlement-count"><strong>{localizeDigits(store.closed.length+'/'+store.agreements.length)}</strong><span>{t('ledger.closed')}</span></div></div>
  <div className="settlement-grid">{agreements.map(a=>{
   const s=statement(a,store.entries);
   const pending=store.entries.some(e=>e.agreementId===a.id&&e.status==='Pending approval');
   const closed=store.closed.includes(a.id);
   const row=apiMode?rows[Number(a.id.replace('AGR-',''))]:undefined;
   return <Card key={a.id} className="settlement-card">
    <div className="settlement-top"><div><small>{a.id} · {a.registration}</small><h3>{a.customer}</h3></div><Badge tone={row?stateTone(row.state):closed?'good':pending?'warn':'blue'}>{row?stateLabel[row.state]:closed?t('settle.closedWord'):pending?t('settlements.needsReview'):t('settlements.readyToReview')}</Badge></div>
    <div className="settlement-figures"><div><span>{t('common.customerDue')}</span><b><Money value={s.customerDue}/></b></div><div><span>{t('common.ownerDue')}</span><b><Money value={s.ownerDue}/></b></div><div><span>{t('common.driverDue')}</span><b><Money value={s.driverDue}/></b></div></div>
    {pending&&<ApprovalBanner>{t('settlements.expenseApprovalRequiredBefore')}</ApprovalBanner>}
    <div className="settlement-actions"><button type="button" className="text-button" onClick={()=>rf.setSelected(a.id)}>{t('settlements.viewFourStatements')} <ChevronRight size={15}/></button>{apiMode?<Can action="finance"><span className="settlement-buttons"><Button size="sm" onClick={()=>setWorkflowFor(a.id)}>{closed?t('settlements.reviewOrReopen'):t('settlements.reviewSettlement')}</Button><Button variant="outline" size="sm" disabled={closed||pending} onClick={()=>rf.setConfirmClose(a.id)} title={t('settlements.runsPrepareApprovalAnd')}>{t('settlements.oneClickClose')}</Button></span></Can>:<Button variant="outline" size="sm" disabled={closed||pending} onClick={()=>rf.setConfirmClose(a.id)}>{closed?t('settle.closedWord'):t('settle.closeWord')}</Button>}</div>
   </Card>;
  })}</div>
  {agreements.length===0&&<EmptyState title={t('settlements.noSettlementsMatchYour')}/>}
  {apiMode&&<SettlementWorkflow agreementId={workflowFor} onClose={()=>setWorkflowFor(null)} onChanged={()=>void loadRows()}/>}
 </>;
}
