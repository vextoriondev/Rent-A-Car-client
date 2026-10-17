"use client";
import {Plus} from 'lucide-react';
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
 {label: t('ownerPayables.gross'),value:(_a,s)=>s.ownerGross},
 {label: t('common.offsets'),value:(_a,s)=>s.offsets},
 {label: t('ownerPayables.netPayable'),value:(_a,s)=>s.ownerNet},
 {label: t('common.paid'),value:(_a,s)=>s.ownerPaid},
 {label: t('common.due'),value:(_a,s)=>s.ownerDue,due:true},
];

export default function OwnerPayablesPage(){
 const rf=useRentflowStore();
 const {agreements}=useRelatedAgreements();
 return <Card>
  <SectionHeading title={t('common.ownerPayables')} subtitle={t('ownerPayables.grossRentLessAuthorized')} action={<Can action="payment.post"><Button onClick={()=>rf.openEntry('Owner payout')}><Plus size={16}/> {t('common.recordPayout')}</Button></Can>}/>
  <BillStateLegend/>
  <StatementLedger billChip party="Owner" partyHeader={t('partyHeader.owner')} columns={columns} agreements={agreements} store={rf.store} onSelect={rf.setSelected} emptyTitle={t('ownerPayables.noOwnerPayablesMatch')}/>
 </Card>;
}
