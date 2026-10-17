"use client";
import {statement,type Agreement,type Entry} from '@/lib/demo';
import {fmtDate} from '@/lib/format';
import {Money} from '@/components/shared/money';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {t} from '@/lib/copy';

type Tab='customer'|'owner'|'driver'|'operator';

function lines(tab:Tab,a:Agreement,s:ReturnType<typeof statement>):[string,number][]{
 switch(tab){
  case 'customer':return [[t('stmt.monthlyRent'),a.rent],[t('stmt.receipts'),-s.received],[t('stmt.moneyToTake'),s.customerDue]];
  case 'owner':return [[t('stmt.ownerRent'),s.ownerGross],[t('stmt.takenOff'),-s.offsets],[t('stmt.netToOwner'),s.ownerNet],[t('stmt.alreadyPaid'),-s.ownerPaid],[t('stmt.dueOwner'),s.ownerDue]];
  case 'driver':return [[t('stmt.salaryEarned'),s.driverEarned],[t('stmt.paidEarly'),-s.advance],[t('stmt.alreadyPaid'),-s.driverPaid],[t('stmt.dueDriver'),s.driverDue]];
  case 'operator':return [[t('stmt.rentEarned'),a.rent],[t('stmt.ownerShare'),-a.ownerRent],[t('stmt.driverSalary'),-a.salary],[t('stmt.yourCosts'),-s.operatorCosts],[t('stmt.profit'),s.margin],[t('stmt.cashInOut'),s.cash]];
 }
}

/** The four party statements plus agreement terms. Readiness badges, exceptions and PDF export are later-phase work. */
export function SettlementStatement({agreement,entries}:{agreement:Agreement;entries:Entry[]}){
 const s=statement(agreement,entries);
 return <Tabs defaultValue="customer">
  <TabsList className="detail-tabs"><TabsTrigger value="customer">{t('common.customer')}</TabsTrigger><TabsTrigger value="owner">{t('common.owner')}</TabsTrigger><TabsTrigger value="driver">{t('common.driver')}</TabsTrigger><TabsTrigger value="operator">{t('settlements.settlementStatement.operator')}</TabsTrigger><TabsTrigger value="terms">{t('settlements.settlementStatement.terms')}</TabsTrigger></TabsList>
  {(['customer','owner','driver','operator'] as const).map(tab=>{const rows=lines(tab,agreement,s);return <TabsContent value={tab} key={tab}>
   <div className="statement-lines">{rows.map(([label,value],i)=><div className={i===rows.length-1?'statement-total':''} key={label+i}><span>{label}</span><b className="nums"><Money value={value} signed/></b></div>)}</div>
   {tab==='operator'&&<p className="note">{t('settlements.settlementStatement.accrualMarginUsesEarned')}</p>}
   {tab==='owner'&&<p className="note">{t('settlements.settlementStatement.onlyOperatorFundedOwner')}</p>}
  </TabsContent>})}
  <TabsContent value="terms"><div className="terms"><div><span>{t('settlements.settlementStatement.started')}</span><b>{fmtDate(agreement.start)}</b></div><div><span>{t('common.fuelResponsibility')}</span><b>{agreement.rules.fuel}</b></div><div><span>{t('common.repairResponsibility')}</span><b>{agreement.rules.repair}</b></div><div><span>{t('settlements.settlementStatement.ownerOffsets')}</span><b>{agreement.rules.offset?t('settlements.settlementStatement.permittedForOwnerCosts'):t('settlements.settlementStatement.separateReimbursement')}</b></div></div></TabsContent>
 </Tabs>;
}
