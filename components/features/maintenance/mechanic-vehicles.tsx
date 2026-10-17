"use client";
import {useEffect,useState} from 'react';
import {CarFront} from 'lucide-react';
import {apiRequest} from '@/lib/api';
import {useQueryParam} from '@/lib/use-list-filters';
import {useRentflowStore} from '@/lib/store-context';
import {Card} from '@/components/ui/card';
import {EmptyState} from '@/components/shared/empty-state';
import {ErrorState} from '@/components/shared/error-state';
import {SectionHeading} from '@/components/shared/section-heading';
import {t} from '@/lib/copy';

type Vehicle={id:number;registration:string;model_name:string;owner:string};

/** A mechanic has no financial snapshot, so the fleet comes straight from /vehicles: registration, model and owner, nothing about rent or balances (F11). */
export function MechanicVehicles(){
 const orgId=useRentflowStore().store.backend?.orgId;
 const [q]=useQueryParam('q');
 const [vehicles,setVehicles]=useState<Vehicle[]|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!orgId)return;
  let stale=false;
  apiRequest(`/orgs/${orgId}/vehicles?limit=200`).then(r=>{if(!stale){setVehicles(r.items);setError('')}}).catch(e=>{if(!stale)setError((e as Error).message)});
  return()=>{stale=true};
 },[orgId]);
 const needle=q.trim().toLowerCase();
 const shown=(vehicles??[]).filter(v=>!needle||`${v.registration} ${v.model_name} ${v.owner}`.toLowerCase().includes(needle));
 return <Card>
  <SectionHeading title={t('maintenance.mechanicVehicles.fleet')} subtitle={t('maintenance.mechanicVehicles.vehiclesYouCanRaise')}/>
  {error&&<ErrorState message={error} onRetry={()=>location.reload()}/>}
  {vehicles&&<div className="vehicle-grid">{shown.map(v=><div className="vehicle-card" key={v.id}><div className="vehicle-card-top"><span className="vehicle-art"><CarFront size={22}/></span></div><strong>{v.model_name}</strong><small>{v.registration}</small><div className="vehicle-divider"/><div><span>{t('common.owner')}</span><b>{v.owner}</b></div></div>)}</div>}
  {vehicles&&shown.length===0&&<EmptyState title={t('common.noVehiclesMatchThe')}/>}
 </Card>;
}
