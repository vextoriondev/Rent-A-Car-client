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
import {AgreementTerms} from '@/components/features/agreements/agreement-terms';
import {AgreementContext} from '@/components/features/agreements/agreement-context';
import {SettlementStatement} from '@/components/features/settlements/settlement-statement';
import {ExpenseResponsibilityMatrix} from '@/components/features/agreements/expense-responsibility-matrix';
import {AllocationPanel} from '@/components/shared/allocation-panel';
import {AuditTimeline} from '@/components/shared/audit-timeline';
import {DeliveryStatus} from '@/components/shared/delivery-status';
import {Money} from '@/components/shared/money';

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
 const title=!subject?'Detail':subject.kind==='agreement'?subject.record.vehicle:subject.kind==='entry'?subject.record.id:'Message detail';
 const description=!subject?undefined:subject.kind==='agreement'?subject.record.id+' · '+subject.record.registration:subject.kind==='entry'?subject.record.type+' · '+fmtDate(subject.record.date):subject.record.recipient;
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
  <h3 className="detail-subheading">Source entries</h3>
  <div className="source-list">{store.entries.filter(e=>e.agreementId===agreement.id).map(e=><button type="button" key={e.id} onClick={()=>rf.setSelected(e.id)}><span><b>{e.description}</b><small>{e.id} · {fmtDate(e.date)} · {e.status}</small></span><b><Money value={e.amount}/></b><ChevronRight size={15}/></button>)}</div>
  <AuditTimeline/>
  <div className="sheet-footer"><Button variant="outline" onClick={()=>{rf.setSelected(null);rf.openEntry('Customer payment',agreement.id)}}>Receive payment</Button><Button onClick={()=>{rf.setSelected(null);rf.openEntry('Expense',agreement.id)}}>Record expense</Button></div>
 </div>;
}

function allocationTarget(entry:Entry){
 switch(entry.type){
  case 'Customer payment':return 'September customer rent';
  case 'Owner payout':return 'September owner payable';
  case 'Driver payout':return 'September driver salary';
  case 'Salary advance':return 'Driver salary (advance)';
  default:return null;
 }
}

function EntryBody({entry}:{entry:Entry}){
 const rf=useRentflowStore();
 const target=allocationTarget(entry);
 return <div className="sheet-scroll">
  <div className="entry-amount"><Money value={entry.amount}/> <Badge tone={statusTone(entry.status)}>{entry.status}</Badge></div>
  <div className="terms">{[['Agreement',entry.agreementId],['Service date',fmtDate(entry.date)],['Category',entry.category],['Paid by',entry.paidBy],['Responsible',entry.responsible],['Reference',entry.reference],['Receipt',entry.receipt||'None attached'],['Owner offset',entry.offset?'Authorized':'No']].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
  <p className="entry-description">{entry.description}</p>
  <p className="note">{entry.status==='Draft'?'A draft can still be edited or discarded and does not change any balance. Submit it to post it or send it for approval.':entry.status==='Pending approval'?'Pending entries do not change balances.':'This source contributes to the relevant account statement.'}</p>
  {apiMode&&rf.store.backend?.expenseIds[entry.id]&&<DocumentList targetType="expense" targetId={rf.store.backend.expenseIds[entry.id]} title="Receipts and files"/>}
  {target&&entry.status==='Posted'&&<AllocationPanel lines={[{label:`Applied to ${target}`,amount:entry.amount}]}/>}
  <div className="sheet-footer">
   {entry.status==='Draft'&&<Button onClick={()=>rf.submitDraft(entry.id)}><CheckCircle2 size={16}/> Submit for posting</Button>}
   {entry.status==='Draft'&&<Button variant="outline" onClick={()=>rf.discardDraft(entry.id)}>Discard draft</Button>}
   {entry.status==='Pending approval'&&<Button onClick={()=>rf.approve(entry.id)}><CheckCircle2 size={16}/> Approve</Button>}
   {entry.status==='Posted'&&<Button variant="outline" onClick={()=>{if(apiMode||confirm('Reverse this posted demo entry?'))rf.reverse(entry.id)}}><RotateCcw size={16}/> Correct by reversing</Button>}
   <Button variant="outline" onClick={()=>rf.setSelected(entry.agreementId)}>View agreement</Button>
  </div>
 </div>;
}

function NoticeBody({notice}:{notice:Notice}){
 const rf=useRentflowStore();
 return <div className="sheet-scroll">
  <div className="terms"><div><span>Recipient</span><b>{notice.recipient}</b></div><div><span>Status</span><DeliveryStatus status={notice.status}/></div><div><span>Date</span><b>{fmtDate(notice.date)}</b></div><div><span>Source</span><b>{notice.detail}</b></div></div>
  <p className="note">Delivery states are simulated for this demo; no message has been sent.</p>
  {notice.status==='Failed'&&<Button onClick={()=>rf.retryNotice(notice.id)}><RefreshCcw size={16}/> Retry delivery</Button>}
 </div>;
}
