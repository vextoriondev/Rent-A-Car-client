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
import {InvoiceDialog} from './invoice-dialog';
import {SplitPaymentDialog} from './split-payment-dialog';
import {invoiceLabel,invoiceTone,type Charge,type Invoice,type Ledger} from './types';

const sideLabel:Record<string,string>={customer:'Customer',owner:'Owner',driver:'Driver'};
const kindLabel:Record<string,string>={charge:'Charge',credit:'Credit',adjustment:'Adjustment',reimbursement:'Reimbursement',opening_balance:'Opening balance'};

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
   await changed(posted.length?`Brought forward ${posted.length/2} balance${posted.length>2?'s':''} from the previous month as opening balances.`:'Nothing to carry forward: the previous month has no balance left, or it was already carried.');
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 const voidInvoice=async(inv:Invoice)=>{
  if(!backend)return;
  const reason=window.prompt(`Void ${inv.number}? Give the reason (kept in the audit log).`);
  if(!reason?.trim())return;
  setBusy(true);setMessage('');
  try{await livePost(backend.orgId,`/invoices/${inv.id}/void`,{reason:reason.trim()});await changed(`${inv.number} voided.`)}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 };

 const invoicePdf=(inv:Invoice)=>{
  const t:DownloadTable={title:`Invoice ${inv.number}`,scope:`Customer: ${current?.customer}; Vehicle: ${current?.vehicle} ${current?.registration}; Issued ${inv.issue_date}; due ${inv.due_date}; status ${invoiceLabel[inv.status]}`,columns:['Description','Amount BDT'],rows:[...inv.lines.map(l=>[l.description,Number(l.amount)]),['Paid so far',Number(inv.paid)],['Outstanding',Number(inv.outstanding)]],totals:['Invoice total',Number(inv.amount)]};
  printPdf(t,`rentflow-${inv.number}`);
 };

 if(!current||!backend)return <Card><SectionHeading title="Charges, invoices and ledger" subtitle="Issue the September period for an agreement to use these tools."/><EmptyState title="No issued period yet"/></Card>;

 const stmt=ledger?.statement;
 const num=(v?:string)=>Number(v||0);
 return <>
  <Card>
   <SectionHeading title="Charges, invoices and ledger" subtitle="Extra charges, credits and adjustments, the period ledger, invoices and split payments, for one agreement at a time."/>
   <div className="billing-toolbar">
    <label>Agreement
     <Select value={current.id} onValueChange={setAgreementId}>
      <SelectTrigger aria-label="Agreement"><SelectValue/></SelectTrigger>
      <SelectContent>{options.map(a=><SelectItem key={a.id} value={a.id}>{a.id} · {a.vehicle} · {a.customer}</SelectItem>)}</SelectContent>
     </Select>
    </label>
    <div className="settlement-buttons">
     <Button disabled={closed} onClick={()=>setDialog('charge')}><Plus size={16}/> Add charge or credit</Button>
     <Button variant="outline" disabled={closed} onClick={()=>setDialog('split')}><Split size={16}/> Split a payment</Button>
     <Button variant="outline" onClick={()=>setDialog('invoice')}><FilePlus2 size={16}/> Invoice</Button>
     <Button variant="outline" disabled={busy||closed} onClick={()=>void carryForward()}><Landmark size={16}/> Bring balance forward</Button>
    </div>
   </div>
   {closed&&<p className="note">This month is closed. New charges and payments are refused; bring the balance forward into the next month instead.</p>}
   {message&&<p role="status" className="note">{message}</p>}
   {error&&<ErrorState message={error} onRetry={()=>void load()}/>}
   {!error&&!stmt&&<p className="note">Loading the ledger...</p>}
   {stmt&&<>
    <div className="billing-ledger">
     <div><h3 className="detail-subheading">Customer</h3>
      <p><span>Billed</span><b><Money value={num(stmt.customer.billed)}/></b></p>
      <p><span>Received</span><b><Money value={num(stmt.customer.received)}/></b></p>
      <p><span>Carried forward</span><b><Money value={num(stmt.customer.carried_forward)}/></b></p>
      <p className="total"><span>Due</span><b><Money value={num(stmt.customer.due)} signed/></b></p></div>
     <div><h3 className="detail-subheading">Owner</h3>
      <p><span>Gross rent</span><b><Money value={num(stmt.owner.gross)}/></b></p>
      <p><span>Offsets</span><b><Money value={num(stmt.owner.offsets)}/></b></p>
      <p><span>Paid</span><b><Money value={num(stmt.owner.paid)}/></b></p>
      <p className="total"><span>Due</span><b><Money value={num(stmt.owner.due)} signed/></b></p></div>
     <div><h3 className="detail-subheading">Driver</h3>
      <p><span>Salary earned</span><b><Money value={num(stmt.driver.earned)}/></b></p>
      <p><span>Advance</span><b><Money value={num(stmt.driver.advance)}/></b></p>
      <p><span>Salary paid (excl. advance)</span><b><Money value={num(stmt.driver.paid)-num(stmt.driver.advance)}/></b></p>
      <p className="total"><span>Due</span><b><Money value={num(stmt.driver.due)} signed/></b></p></div>
    </div>
    <p className={'reconcile '+(ledger.reconciles?'ok':'bad')} role="status">{ledger.reconciles?<><CheckCircle2 size={14}/> The ledger agrees with the obligations for this month.</>:<><CircleAlert size={14}/> The ledger and the obligations disagree for this month. Do not close it; contact support.</>}</p>
    <button type="button" className="text-button" aria-expanded={showLines} onClick={()=>setShowLines(v=>!v)}>{showLines?'Hide':'Show'} ledger lines ({ledger.lines.length})</button>
    {showLines&&<div className="billing-lines" role="table" aria-label="Ledger lines">
     <div role="row" className="head"><span>Entry</span><span>Source</span><span>Account</span><span>Debit</span><span>Credit</span></div>
     {ledger.lines.map((l,i)=><div role="row" key={i}><span>#{l.entry_id}</span><span>{l.source_type.replace(/_/g,' ')} {l.source_id}</span><span>{l.account.replace(/_/g,' ').toLowerCase()}</span><b className="nums"><Money value={num(l.debit)}/></b><b className="nums"><Money value={num(l.credit)}/></b></div>)}
    </div>}
   </>}
  </Card>

  <Card>
   <SectionHeading title="Invoices" subtitle="Status is worked out from payments applied: issued, partly paid, paid, overdue or void."/>
   {invoices.length===0?<EmptyState title="No invoices for this month yet" description="Use Invoice to preview and issue one."/>:<div className="billing-table" role="table" aria-label="Invoices">
    <div role="row" className="head"><span>Number</span><span>Due date</span><span>Amount</span><span>Paid</span><span>Outstanding</span><span>Status</span><span/></div>
    {invoices.map(inv=><div role="row" key={inv.id}><span><b>{inv.number}</b></span><span>{inv.due_date}</span><b className="nums"><Money value={num(inv.amount)}/></b><b className="nums"><Money value={num(inv.paid)}/></b><b className="nums"><Money value={num(inv.outstanding)}/></b>
     <span><Badge tone={invoiceTone[inv.status]}>{invoiceLabel[inv.status]}</Badge></span>
     <span className="row-actions"><Button size="sm" variant="outline" onClick={()=>invoicePdf(inv)} aria-label={`PDF for ${inv.number}`}>PDF</Button>{inv.status!=='void'&&num(inv.paid)===0&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void voidInvoice(inv)} aria-label={`Void ${inv.number}`}>Void</Button>}</span></div>)}
   </div>}
  </Card>

  <Card>
   <SectionHeading title="Charges, credits and adjustments" subtitle="Each one is a permanent ledger entry; correct a mistake with an opposite entry, never an edit."/>
   {charges.length===0?<EmptyState title="No extra charges this month"/>:<div className="billing-table charges" role="table" aria-label="Charges">
    <div role="row" className="head"><span>Kind</span><span>For</span><span>Effect</span><span>Amount</span><span>Note</span></div>
    {charges.map(c=><div role="row" key={c.id}><span>{kindLabel[c.kind]||c.kind}</span><span>{sideLabel[c.side]}</span><span>{c.direction==='increase'?'Increases balance':'Reduces balance'}</span><b className="nums"><Money value={Number(c.amount)}/></b><span>{c.description||c.reference||'-'}</span></div>)}
   </div>}
  </Card>

  <ChargeDialog open={dialog==='charge'} periodId={periodId!} onClose={()=>setDialog('')} onDone={m=>{setDialog('');void changed(m)}}/>
  <InvoiceDialog open={dialog==='invoice'} periodId={periodId!} onClose={()=>setDialog('')} onDone={m=>{setDialog('');void changed(m)}}/>
  <SplitPaymentDialog open={dialog==='split'} periodId={periodId!} onClose={()=>setDialog('')} onDone={m=>{setDialog('');void changed(m)}}/>
 </>;
}
