"use client";
import {CheckCircle2,ChevronRight,RefreshCcw,RotateCcw} from 'lucide-react';
import {apiMode} from '@/lib/api';
import type {Agreement,Entry,Notice,Store} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {fmtDate} from '@/lib/format';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {DocumentList} from '@/components/features/documents/document-list';
import {monthLabel} from '@/lib/clock';
import {AgreementTerms} from '@/components/features/agreements/agreement-terms';
import {AgreementContext} from '@/components/features/agreements/agreement-context';
import {SettlementStatement} from '@/components/features/settlements/settlement-statement';
import {ExpenseResponsibilityMatrix} from '@/components/features/agreements/expense-responsibility-matrix';
import {AllocationPanel} from '@/components/shared/allocation-panel';
import {AuditTimeline} from '@/components/shared/audit-timeline';
import {DeliveryStatus} from '@/components/shared/delivery-status';
import {Money} from '@/components/shared/money';
import {Can} from '@/lib/roles';
import {t} from '@/lib/copy';
import {categoryLabel,entryStatusLabel,entryTypeLabel,partyLabel} from '@/lib/copy/labels';

export type DrawerSubject={kind:'agreement';record:Agreement}|{kind:'entry';record:Entry}|{kind:'notice';record:Notice};

/** Finds what a `?selected=<id>` refers to. A future `[id]` detail route can reuse this and swap only the wrapper. */
export function resolveSubject(store:Store,id:string|null):DrawerSubject|null{
 if(!id)return null;
 const agreement=store.agreements.find(a=>a.id===id);if(agreement)return{kind:'agreement',record:agreement};
 const entry=store.entries.find(e=>e.id===id)??store.rangeEntries?.find(e=>e.id===id);if(entry)return{kind:'entry',record:entry};
 const notice=store.notices.find(n=>n.id===id);if(notice)return{kind:'notice',record:notice};
 return null;
}

const statusTone=(s:Entry['status'])=>s==='Posted'?'good':s==='Reversed'?'bad':'warn';

/** Detail drawer for the URL-selected agreement, entry or notice. Mounted once in the dashboard layout. */
export function SourceDrawer(){
 const rf=useRentflowStore();
 const {store,selected}=rf;
 const subject=resolveSubject(store,selected);
 const title=!subject?t('drawer.detail'):subject.kind==='agreement'?subject.record.vehicle:subject.kind==='entry'?subject.record.id:t('shared.sourceDrawer.messageDetail');
 const description=!subject?undefined:subject.kind==='agreement'?subject.record.id+' · '+subject.record.registration:subject.kind==='entry'?entryTypeLabel(subject.record.type)+' · '+fmtDate(subject.record.date):subject.record.recipient;
 return <Sheet open={!!subject} onOpenChange={o=>!o&&rf.setSelected(null)}>
  <SheetContent className="detail-sheet">
   <SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>
   {subject?.kind==='agreement'&&<AgreementBody agreement={subject.record}/>}
   {subject?.kind==='entry'&&<EntryBody entry={subject.record}/>}
   {subject?.kind==='notice'&&<NoticeBody notice={subject.record}/>}
  </SheetContent>
 </Sheet>;
}

function AgreementBody({agreement}:{agreement:Agreement}){
 const rf=useRentflowStore();
 const {store}=rf;
 return <div className="sheet-scroll">
  <AgreementContext agreement={agreement}/>
  <AgreementTerms agreementId={agreement.id}/>
  <SettlementStatement agreement={agreement} entries={store.entries}/>
  <ExpenseResponsibilityMatrix agreement={agreement}/>
  <h3 className="detail-subheading">{t('shared.sourceDrawer.sourceEntries')}</h3>
  <div className="source-list">{store.entries.filter(e=>e.agreementId===agreement.id).map(e=><button type="button" key={e.id} onClick={()=>rf.setSelected(e.id)}><span><b>{e.description}</b><small>{e.id} · {fmtDate(e.date)} · {entryStatusLabel(e.status)}</small></span><b><Money value={e.amount}/></b><ChevronRight size={15}/></button>)}</div>
  <AuditTimeline/>
  <div className="sheet-footer"><Can action="payment.post"><Button variant="outline" onClick={()=>{rf.setSelected(null);rf.openEntry('Customer payment',agreement.id)}}>{t('common.receivePayment')}</Button></Can><Can action="entry.record"><Button onClick={()=>{rf.setSelected(null);rf.openEntry('Expense',agreement.id)}}>{t('common.recordExpense')}</Button></Can></div>
 </div>;
}

function allocationTarget(entry:Entry){
 const m=monthLabel(entry.date).split(' ')[0];   // the month of the entry, not a fixed one
 switch(entry.type){
  case 'Customer payment':return t('drawer.rentOf',{month: m});
  case 'Owner payout':return t('drawer.ownerOf',{month: m});
  case 'Driver payout':return t('drawer.salaryOf',{month: m});
  case 'Salary advance':return t('shared.sourceDrawer.driverSalaryAdvance');
  default:return null;
 }
}

function EntryBody({entry}:{entry:Entry}){
 const rf=useRentflowStore();
 const target=allocationTarget(entry);
 return <div className="sheet-scroll">
  <div className="entry-amount"><Money value={entry.amount}/> <Badge tone={statusTone(entry.status)}>{entryStatusLabel(entry.status)}</Badge></div>
  <div className="terms">{[[t('drawer.fAgreement'),entry.agreementId],[t('drawer.fServiceDate'),fmtDate(entry.date)],[t('drawer.fCategory'),categoryLabel(entry.category)],[t('drawer.fPaidBy'),partyLabel(entry.paidBy)],[t('drawer.fResponsible'),partyLabel(entry.responsible)],[t('drawer.fReference'),entry.reference],[t('drawer.fRecordedBy'),entry.recordedBy||t('common.notRecorded')],[t('drawer.fReceipt'),entry.receipt||t('shared.sourceDrawer.noneAttached')],[t('drawer.fOwnerOffset'),entry.offset?t('drawer.offsetYes'):t('drawer.offsetNo')]].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
  <p className="entry-description">{entry.description}</p>
  <p className="note">{entry.status==='Draft'?t('shared.sourceDrawer.aDraftCanStill'):entry.status==='Pending approval'?t('shared.sourceDrawer.pendingEntriesDoNot'):t('shared.sourceDrawer.thisSourceContributesTo')}</p>
  {apiMode&&rf.store.backend?.expenseIds[entry.id]&&<DocumentList targetType="expense" targetId={rf.store.backend.expenseIds[entry.id]} title={t('shared.sourceDrawer.receiptsAndFiles')}/>}
  {target&&entry.status==='Posted'&&<AllocationPanel lines={[{label: t('shared.sourceDrawer.appliedTo', {target}),amount:entry.amount}]}/>}
  <div className="sheet-footer">
   {entry.status==='Draft'&&<Can action="entry.record"><Button onClick={()=>rf.submitDraft(entry.id)}><CheckCircle2 size={16}/> {t('shared.sourceDrawer.submitForPosting')}</Button></Can>}
   {entry.status==='Draft'&&<Can action="entry.record"><Button variant="outline" onClick={()=>rf.discardDraft(entry.id)}>{t('shared.sourceDrawer.discardDraft')}</Button></Can>}
   {entry.status==='Pending approval'&&<Can action="finance"><Button onClick={()=>rf.approve(entry.id)}><CheckCircle2 size={16}/> {t('common.approve')}</Button></Can>}
   {entry.status==='Posted'&&<Can action="finance"><Button variant="outline" onClick={()=>{if(apiMode||confirm(t('drawer.confirmReverse')))rf.reverse(entry.id)}}><RotateCcw size={16}/> {t('shared.sourceDrawer.correctByReversing')}</Button></Can>}
   <Button variant="outline" onClick={()=>rf.setSelected(entry.agreementId)}>{t('shared.sourceDrawer.viewAgreement')}</Button>
  </div>
 </div>;
}

function NoticeBody({notice}:{notice:Notice}){
 const rf=useRentflowStore();
 return <div className="sheet-scroll">
  <div className="terms"><div><span>{t('shared.sourceDrawer.recipient')}</span><b>{notice.recipient}</b></div><div><span>{t('common.status')}</span><DeliveryStatus status={notice.status}/></div><div><span>{t('common.date')}</span><b>{fmtDate(notice.date)}</b></div><div><span>{t('common.source')}</span><b>{notice.detail}</b></div></div>
  <p className="note">{t('drawer.simulated')}</p>
  {notice.status==='Failed'&&<Can action="finance"><Button onClick={()=>rf.retryNotice(notice.id)}><RefreshCcw size={16}/> {t('shared.sourceDrawer.retryDelivery')}</Button></Can>}
 </div>;
}
