"use client";
import {ArrowUpRight,Plus} from 'lucide-react';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {StatementLedger,type StatementColumn} from '@/components/features/accounts/statement-ledger';
import {BillStateLegend} from '@/components/shared/bill-state-legend';
import {Can} from '@/lib/roles';
import {t} from '@/lib/copy';

const columns:StatementColumn[]=[
 {label: t('common.earned'),value:(_a,s)=>s.driverEarned},
 {label: t('common.advance'),value:(_a,s)=>s.advance},
 {label: t('common.paid'),value:(_a,s)=>s.driverPaid},
 {label: t('common.due'),value:(_a,s)=>s.driverDue,due:true},
];

export default function PayrollPage(){
 const rf=useRentflowStore();
 const {agreements}=useRelatedAgreements();
 return <Card>
  <SectionHeading title={t('payroll.driverPayAndAdvances')} subtitle={t('payroll.onlySalaryAdvancesAnd')} action={<Can action="payment.post"><Button onClick={()=>rf.openEntry('Driver payout')}><Plus size={16}/> {t('common.recordPayout')}</Button></Can>}/>
  <BillStateLegend/>
  <StatementLedger billChip party="Driver" partyHeader={t('partyHeader.driver')} columns={columns} agreements={agreements} store={rf.store} onSelect={rf.setSelected} emptyTitle={t('payroll.noDriversMatchYour')}/>
  <Can action="payment.post"><div className="under-table"><button type="button" className="text-button" onClick={()=>rf.openEntry('Salary advance')}>{t('payroll.recordASalaryAdvance')} <ArrowUpRight size={15}/></button></div></Can>
 </Card>;
}
