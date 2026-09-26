"use client";
import {statement,type Agreement,type Entry} from '@/lib/demo';
import {fmtDate} from '@/lib/format';
import {Money} from '@/components/shared/money';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';

type Tab='customer'|'owner'|'driver'|'operator';

function lines(tab:Tab,a:Agreement,s:ReturnType<typeof statement>):[string,number][]{
 switch(tab){
  case 'customer':return [['Monthly rent',a.rent],['Receipts',-s.received],['Outstanding',s.customerDue]];
  case 'owner':return [['Gross owner rent',s.ownerGross],['Authorized offsets',-s.offsets],['Net payable',s.ownerNet],['Already paid',-s.ownerPaid],['Due to owner',s.ownerDue]];
  case 'driver':return [['Salary earned',s.driverEarned],['Advances',-s.advance],['Already paid',-s.driverPaid],['Due to driver',s.driverDue]];
  case 'operator':return [['Earned rent',a.rent],['Owner obligation',-a.ownerRent],['Driver obligation',-a.salary],['Operator costs',-s.operatorCosts],['Accrual margin',s.margin],['Actual cash movement',s.cash]];
 }
}

/** The four party statements plus agreement terms. Readiness badges, exceptions and PDF export are later-phase work. */
export function SettlementStatement({agreement,entries}:{agreement:Agreement;entries:Entry[]}){
 const s=statement(agreement,entries);
 return <Tabs defaultValue="customer">
  <TabsList className="detail-tabs"><TabsTrigger value="customer">Customer</TabsTrigger><TabsTrigger value="owner">Owner</TabsTrigger><TabsTrigger value="driver">Driver</TabsTrigger><TabsTrigger value="operator">Operator</TabsTrigger><TabsTrigger value="terms">Terms</TabsTrigger></TabsList>
  {(['customer','owner','driver','operator'] as const).map(tab=>{const rows=lines(tab,agreement,s);return <TabsContent value={tab} key={tab}>
   <div className="statement-lines">{rows.map(([label,value],i)=><div className={i===rows.length-1?'statement-total':''} key={label}><span>{label}</span><b className="nums"><Money value={value} signed/></b></div>)}</div>
   {tab==='operator'&&<p className="note">Accrual margin uses earned rent. Cash movement uses only recorded receipts and payments.</p>}
   {tab==='owner'&&<p className="note">Only operator funded owner costs with an authorized offset reduce this payable.</p>}
  </TabsContent>})}
  <TabsContent value="terms"><div className="terms"><div><span>Started</span><b>{fmtDate(agreement.start)}</b></div><div><span>Fuel responsibility</span><b>{agreement.rules.fuel}</b></div><div><span>Repair responsibility</span><b>{agreement.rules.repair}</b></div><div><span>Owner offsets</span><b>{agreement.rules.offset?'Permitted for owner costs':'Separate reimbursement'}</b></div></div></TabsContent>
 </Tabs>;
}
