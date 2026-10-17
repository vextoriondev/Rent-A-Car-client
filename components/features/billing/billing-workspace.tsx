"use client";
import {useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,CircleAlert,FilePlus2,Landmark,Plus,Split} from 'lucide-react';
import {apiRequest,livePost} from '@/lib/api';
import {useRentflowStore} from '@/lib/store-context';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {Money} from '@/components/shared/money';
import {SectionHeading} from '@/components/shared/section-heading';
import {printPdf,type DownloadTable} from '@/lib/downloads';
import {ChargeDialog} from './charge-dialog';
import {RangeStatement} from './range-statement';
import {InvoiceDialog} from './invoice-dialog';
import {SplitPaymentDialog} from './split-payment-dialog';
import {invoiceLabel,invoiceTone,type Charge,type Invoice,type Ledger} from './types';
import {Can} from '@/lib/roles';
import type {BillState} from '@/lib/bill-state';
import {t,tn,fmtNumber} from '@/lib/copy';
import {HelpTip} from '@/components/shared/help-tip';
import {fmtDay} from '@/lib/format';
import {accountLabel,sourceLabel} from '@/lib/copy/labels';


const sideLabel:Record<string,string>={get customer(){return t('billing.side.customer')},get owner(){return t('billing.side.owner')},get driver(){return t('billing.side.driver')}};
const kindLabel:Record<string,string>={get charge(){return t('billing.kind.charge')},get credit(){return t('billing.kind.credit')},get adjustment(){return t('billing.kind.adjustment')},get reimbursement(){return t('billing.kind.reimbursement')},get opening_balance(){return t('common.openingBalance')},get overtime(){return t('billing.kind.overtime')},get absence_deduction(){return t('billing.billingWorkspace.absenceDeduction')},get fine(){return t('billing.kind.fine')}};

/** API mode: charges, credits, adjustments, the period ledger, carry-forward, invoices and split payments for one agreement's month. */
export function BillingWorkspace(){
 const rf=useRentflowStore();
 const backend=rf.store.backend;
 const options=useMemo(()=>rf.store.agreements.filter(a=>backend?.periodIds[a.id]),[rf.store.agreements,backend]);
 const [agreementId,setAgreementId]=useState('');
 const current=options.find(a=>a.id===agreementId)||options[0];
 const periodId=current?backend?.periodIds[current.id]:undefined;
 const closed=!!current&&rf.store.closed.includes(current.id);
 const [ledger,setLedger]=useState<Ledger|null>(null);
 const [charges,setCharges]=useState<Charge[]>([]);
 const [invoices,setInvoices]=useState<Invoice[]>([]);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [dialog,setDialog]=useState<''|'charge'|'invoice'|'split'>('');
 const [showLines,setShowLines]=useState(false);

 const load=useCallback(async()=>{
  if(!backend||!periodId)return;
  try{
   const base=`/orgs/${backend.orgId}`;
   const [l,c,i]=await Promise.all([apiRequest(`${base}/periods/${periodId}/ledger`),apiRequest(`${base}/charges?period_id=${periodId}&limit=200`),apiRequest(`${base}/invoices?period_id=${periodId}&limit=200`)]);
   setLedger(l);setCharges(c.items);setInvoices(i.items);setError('');
  }catch(e){setError((e as Error).message)}
 },[backend,periodId]);
 useEffect(()=>{setLedger(null);setMessage('');if(periodId)void load()},[periodId,load]);

 const changed=async(done:string)=>{await rf.refreshLive();await load();setMessage(done)};

 const carryForward=async()=>{
  if(!backend||!periodId)return;
  setBusy(true);setMessage('');
  try{
   const posted:Charge[]=await livePost(backend.orgId,`/periods/${periodId}/carry-forward`,{});
   await changed(posted.length?tn('billing.moved',posted.length/2):t('billing.billingWorkspace.nothingToCarryForward'));
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 const voidInvoice=async(inv:Invoice)=>{
  if(!backend)return;
  const reason=window.prompt(t('billing.voidPrompt',{number: inv.number}));
  if(!reason?.trim())return;
  setBusy(true);setMessage('');
  try{await livePost(backend.orgId,`/invoices/${inv.id}/void`,{reason:reason.trim()});await changed(t('billing.voided',{number: inv.number}))}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 const invoicePdf=(inv:Invoice)=>{
  const table:DownloadTable={title: t('billing.billingWorkspace.invoice', {number: inv.number}),scope:t('billing.scope',{customer: current?.customer, car: current?.vehicle+' '+current?.registration, issued: fmtDay(inv.issue_date), due: fmtDay(inv.due_date), status: invoiceLabel[inv.status]}),columns:[t('billing.col.description'),t('billing.col.amount')],rows:[...inv.lines.map(l=>[l.description,Number(l.amount)]),[t('billing.row.paidSoFar'),Number(inv.paid)],[t('billing.row.outstanding'),Number(inv.outstanding)]],totals:[t('billing.row.total'),Number(inv.amount)]};
  printPdf(table,`rentflow-${inv.number}`);
 };

 if(!current||!backend)return <Card><SectionHeading title={t('common.chargesInvoicesAndLedger')} subtitle={t('billing.billingWorkspace.issueTheMonthFor')}/><EmptyState title={t('billing.billingWorkspace.noIssuedPeriodYet')}/></Card>;

 const stmt=ledger?.statement;
 const num=(v?:string)=>Number(v||0);
 const stateOf=(side:{bill_state?:BillState}|undefined)=>side?.bill_state;
 return <>
  <Card>
   <SectionHeading title={t('common.chargesInvoicesAndLedger')} subtitle={t('billing.billingWorkspace.extraChargesCreditsAnd')}/>
   <div className="billing-toolbar">
    <label>{t('common.agreement2')}
     <Select value={current.id} onValueChange={setAgreementId}>
      <SelectTrigger aria-label={t('common.agreement')}><SelectValue/></SelectTrigger>
      <SelectContent>{options.map(a=><SelectItem key={a.id} value={a.id}>{a.id} · {a.vehicle} · {a.customer}</SelectItem>)}</SelectContent>
     </Select>
    </label>
    <div className="settlement-buttons">
     <Can action="finance">
     <Button disabled={closed} onClick={()=>setDialog('charge')}><Plus size={16}/> {t('billing.billingWorkspace.addChargeOrCredit')}</Button>
     <Button variant="outline" disabled={closed} onClick={()=>setDialog('split')}><Split size={16}/> {t('billing.billingWorkspace.splitAPayment')}</Button>
     <Button variant="outline" onClick={()=>setDialog('invoice')}><FilePlus2 size={16}/> {t('billing.billingWorkspace.invoice2')}</Button>
     <Button variant="outline" disabled={busy||closed} onClick={()=>void carryForward()}><Landmark size={16}/> {t('billing.billingWorkspace.bringBalanceForward')}</Button>
     </Can>
    </div>
   </div>
   {closed&&<p className="note">{t('billing.closedNote')}</p>}
   {message&&<p role="status" className="note">{message}</p>}
   {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
   {!error&&!stmt&&<p className="note">{t('billing.billingWorkspace.loadingTheLedger')}</p>}
   {stmt&&<>
    <div className="billing-ledger">
     <div><h3 className="detail-subheading">{t('common.customer')}</h3>
      <p><span>{t('billing.billingWorkspace.billed')}</span><b><Money value={num(stmt.customer.billed)}/></b></p>
      <p><span>{t('common.received')}</span><b><Money value={num(stmt.customer.received)}/></b></p>
      <p><span>{t('billing.billingWorkspace.carriedForward')}</span><b><Money value={num(stmt.customer.carried_forward)}/></b></p>
      <p className="total"><span>{t('common.due')}</span><b><Money value={num(stmt.customer.due)} signed state={stateOf(stmt.customer)}/></b></p></div>
     <div><h3 className="detail-subheading">{t('common.owner')}</h3>
      <p><span>{t('billing.billingWorkspace.grossRent')}</span><b><Money value={num(stmt.owner.gross)}/></b></p>
      <p><span>{t('common.offsets')}</span><b><Money value={num(stmt.owner.offsets)}/></b></p>
      <p><span>{t('common.paid')}</span><b><Money value={num(stmt.owner.paid)}/></b></p>
      <p className="total"><span>{t('common.due')}</span><b><Money value={num(stmt.owner.due)} signed state={stateOf(stmt.owner)}/></b></p></div>
     {current.noDriver
      ?<div><h3 className="detail-subheading">{t('common.driver')}</h3><p className="note">{t('billing.billingWorkspace.noDriverOnThis')}</p></div>
      :<div><h3 className="detail-subheading">{t('common.driver')}</h3>
      <p><span>{t('common.salaryEarned')}</span><b><Money value={num(stmt.driver.earned)}/></b></p>
      <p><span>{t('common.advance')}</span><b><Money value={num(stmt.driver.advance)}/></b></p>
      <p><span>{t('billing.billingWorkspace.salaryPaidExclAdvance')}</span><b><Money value={num(stmt.driver.paid)-num(stmt.driver.advance)}/></b></p>
      <p className="total"><span>{t('common.due')}</span><b><Money value={num(stmt.driver.due)} signed state={stateOf(stmt.driver)}/></b></p></div>}
    </div>
    <p className={'reconcile '+(ledger.reconciles?'ok':'bad')} role="status">{ledger.reconciles?<><CheckCircle2 size={14}/> {t('billing.billingWorkspace.theLedgerAgreesWith')}</>:<><CircleAlert size={14}/> {t('billing.noMatch')}</>}</p>
    <HelpTip tip="tip.accountRecord"/><button type="button" className="text-button" aria-expanded={showLines} onClick={()=>setShowLines(v=>!v)}>{showLines?t('billing.hideLines',{count: ledger.lines.length}):t('billing.showLines',{count: ledger.lines.length})}</button>
    {showLines&&<div className="billing-lines" role="table" aria-label={t('billing.billingWorkspace.ledgerLines')}>
     <div role="row" className="head"><span>{t('billing.billingWorkspace.entry')}</span><span>{t('common.source')}</span><span>{t('billing.billingWorkspace.account')}</span><span>{t('billing.billingWorkspace.debit')}</span><span>{t('billing.billingWorkspace.credit')}</span></div>
     {ledger.lines.map((l,i)=><div role="row" key={i}><span>#{l.entry_id}</span><span>{sourceLabel(l.source_type)} {l.source_id}</span><span>{accountLabel(l.account)}</span><b className="nums"><Money value={num(l.debit)}/></b><b className="nums"><Money value={num(l.credit)}/></b></div>)}
    </div>}
   </>}
  </Card>

  <RangeStatement agreementPk={Number(current.id.replace('AGR-',''))} agreementLabel={current.id} hasDriver={!current.noDriver}/>

  <Card>
   <SectionHeading title={t('billing.billingWorkspace.invoices')} subtitle={t('billing.billingWorkspace.statusIsWorkedOut')}/>
   {invoices.length===0?<EmptyState title={t('billing.billingWorkspace.noInvoicesForThis')} description={t('billing.billingWorkspace.useInvoiceToPreview')}/>:<div className="billing-table" role="table" aria-label={t('billing.billingWorkspace.invoices')}>
    <div role="row" className="head"><span>{t('billing.billingWorkspace.number')}</span><span>{t('billing.billingWorkspace.dueDate')}</span><span>{t('common.amount')}</span><span>{t('common.paid')}</span><span>{t('common.outstanding')}</span><span>{t('common.status')}</span><span/></div>
    {invoices.map(inv=><div role="row" key={inv.id}><span><b>{inv.number}</b></span><span>{fmtDay(inv.due_date)}</span><b className="nums"><Money value={num(inv.amount)}/></b><b className="nums"><Money value={num(inv.paid)}/></b><b className="nums"><Money value={num(inv.outstanding)} state={inv.bill_state}/></b>
     <span><Badge tone={invoiceTone[inv.status]}>{invoiceLabel[inv.status]}</Badge></span>
     <span className="row-actions"><Button size="sm" variant="outline" onClick={()=>invoicePdf(inv)} aria-label={t('billing.ariaPdf',{number: inv.number})}>{t('billing.billingWorkspace.pdf')}</Button>{inv.status!=='void'&&num(inv.paid)===0&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void voidInvoice(inv)} aria-label={t('billing.ariaVoid',{number: inv.number})}>{t('billing.billingWorkspace.void')}</Button>}</span></div>)}
   </div>}
  </Card>

  <Card>
   <SectionHeading title={t('billing.billingWorkspace.chargesCreditsAndAdjustments')} subtitle={t('billing.billingWorkspace.eachOneIsA')}/>
   {charges.length===0?<EmptyState title={t('billing.billingWorkspace.noExtraChargesThis')}/>:<div className="billing-table charges" role="table" aria-label={t('billing.billingWorkspace.charges')}>
    <div role="row" className="head"><span>{t('billing.billingWorkspace.kind')}</span><span>{t('billing.billingWorkspace.for')}</span><span>{t('common.effect')}</span><span>{t('common.amount')}</span><span>{t('billing.billingWorkspace.note')}</span></div>
    {charges.map(c=><div role="row" key={c.id}><span>{kindLabel[c.kind]||c.kind}</span><span>{sideLabel[c.side]}</span><span>{c.direction==='increase'?t('billing.billingWorkspace.increasesBalance'):t('billing.billingWorkspace.reducesBalance')}</span><b className="nums"><Money value={Number(c.amount)}/></b><span>{c.description||c.reference||'-'}{c.quantity&&c.unit_rate?t('billing.chargeQty',{quantity: Number(c.quantity), rate: fmtNumber(Number(c.unit_rate))}):''}</span></div>)}
   </div>}
  </Card>

  <ChargeDialog open={dialog==='charge'} periodId={periodId!} hasDriver={!current.noDriver} onClose={()=>setDialog('')} onDone={m=>{setDialog('');void changed(m)}}/>
  <InvoiceDialog open={dialog==='invoice'} periodId={periodId!} onClose={()=>setDialog('')} onDone={m=>{setDialog('');void changed(m)}}/>
  <SplitPaymentDialog open={dialog==='split'} periodId={periodId!} onClose={()=>setDialog('')} onDone={m=>{setDialog('');void changed(m)}}/>
 </>;
}
