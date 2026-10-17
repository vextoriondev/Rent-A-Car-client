"use client";
import {CarFront,ChevronRight} from 'lucide-react';
import {driverLabel,statement} from '@/lib/demo';
import {useRentflowStore} from '@/lib/store-context';
import {useRelatedAgreements} from '@/lib/use-related-agreements';
import {SectionHeading} from '@/components/shared/section-heading';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {EmptyState} from '@/components/shared/empty-state';
import {Money} from '@/components/shared/money';
import {MechanicVehicles} from '@/components/features/maintenance/mechanic-vehicles';
import {t} from '@/lib/copy';

export default function VehiclesPage(){
 const rf=useRentflowStore();
 const {agreements}=useRelatedAgreements();
 if(rf.store.backend?.role==='mechanic')return <MechanicVehicles/>;
 return <Card>
  <SectionHeading title={t('vehicles.fleetAndAssignments')} subtitle={t('vehicles.ownerCustomerAndDriver')}/>
  <div className="vehicle-grid">{agreements.map(a=>{const s=statement(a,rf.store.entries);return <button type="button" className="vehicle-card" key={a.id} onClick={()=>rf.setSelected(a.id)}><div className="vehicle-card-top"><span className="vehicle-art"><CarFront size={27}/></span><Badge tone="good">{t('vehicles.assigned')}</Badge></div><strong>{a.vehicle}</strong><small>{a.registration}</small><div className="vehicle-divider"/><div><span>{t('common.owner')}</span><b>{a.owner}</b></div><div><span>{t('common.customer')}</span><b>{a.customer}</b></div><div><span>{t('common.driver')}</span><b>{driverLabel(a)}</b></div><div className="vehicle-foot"><span>{t('common.customerDue')} <b className="nums"><Money value={s.customerDue}/></b></span><ChevronRight size={18}/></div></button>})}</div>
  {agreements.length===0&&<EmptyState title={t('common.noVehiclesMatchThe')}/>}
 </Card>;
}
