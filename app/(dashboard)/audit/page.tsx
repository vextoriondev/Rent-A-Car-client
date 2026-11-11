"use client";
import {useState,useMemo} from 'react';
import {History,Search,Filter,Eye,CheckCircle2,X,ChevronLeft,ChevronRight} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {EmptyState} from '@/components/shared/empty-state';

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'STATUS_CHANGE';
  entityType: 'Vehicle' | 'Driver' | 'Owner' | 'Client' | 'Duty' | 'Expense' | 'Maintenance' | 'User';
  entityId: string;
  summary: string;
  details: {
    field?: string;
    before?: string;
    after?: string;
    ipAddress?: string;
    device?: string;
  };
}

const DEMO_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'AUD-8819',
    timestamp: '2026-11-10 11:42:15',
    actor: 'Al-Amin Tasin',
    role: 'Super Admin',
    action: 'CREATE',
    entityType: 'Duty',
    entityId: 'DTY-004',
    summary: 'Created scheduled duty for Eastern Trading Co. (VEH-004)',
    details: { after: 'Agreed Rent: ৳5,000, Vehicle: DHA-METRO-GA-25-1190, Driver: Sabbir Ahmed', ipAddress: '103.205.71.12', device: 'Chrome / Windows 11' }
  },
  {
    id: 'AUD-8818',
    timestamp: '2026-11-10 10:30:00',
    actor: 'Md. Kamrul Hasan',
    role: 'Accountant',
    action: 'PAYMENT',
    entityType: 'Owner',
    entityId: 'OWN-001',
    summary: 'Recorded payment of ৳40,000 to Farhana Rahman',
    details: { before: 'Total Paid: ৳50,000', after: 'Total Paid: ৳90,000, Method: Bank Transfer', ipAddress: '103.205.71.15', device: 'Firefox / Windows 10' }
  },
  {
    id: 'AUD-8817',
    timestamp: '2026-11-10 09:18:22',
    actor: 'Sajid Mahmud',
    role: 'Operations Manager',
    action: 'STATUS_CHANGE',
    entityType: 'Vehicle',
    entityId: 'VEH-006',
    summary: 'Changed vehicle status to In Garage for repair',
    details: { field: 'status', before: 'Available', after: 'In Garage (Engine coolant leak)', ipAddress: '103.205.71.18', device: 'Mobile Safari / iOS' }
  },
  {
    id: 'AUD-8816',
    timestamp: '2026-11-09 16:45:10',
    actor: 'Md. Kamrul Hasan',
    role: 'Accountant',
    action: 'CREATE',
    entityType: 'Expense',
    entityId: 'EXP-001',
    summary: 'Logged ৳2,500 fuel expense for VEH-002',
    details: { after: 'Category: Fuel, Payee: Padma Filling Station, Cash Account', ipAddress: '103.205.71.15', device: 'Firefox / Windows 10' }
  },
  {
    id: 'AUD-8815',
    timestamp: '2026-11-09 14:10:05',
    actor: 'Al-Amin Tasin',
    role: 'Super Admin',
    action: 'UPDATE',
    entityType: 'Driver',
    entityId: 'DRV-003',
    summary: 'Updated Jamal Uddin monthly salary to ৳25,000',
    details: { field: 'monthlySalary', before: '৳22,000', after: '৳25,000', ipAddress: '103.205.71.12', device: 'Chrome / Windows 11' }
  },
  {
    id: 'AUD-8814',
    timestamp: '2026-11-08 11:05:40',
    actor: 'Sajid Mahmud',
    role: 'Operations Manager',
    action: 'STATUS_CHANGE',
    entityType: 'Duty',
    entityId: 'DTY-003',
    summary: 'Marked trip duty DTY-003 as Completed',
    details: { field: 'status', before: 'Running', after: 'Completed', ipAddress: '103.205.71.18', device: 'Chrome / Windows 11' }
  },
];

export default function AuditPage(){
  const [logs]=useState<AuditRecord[]>(DEMO_AUDIT_LOGS);
  const [q,setQ]=useState('');
  const [actionF,setActionF]=useState('All');
  const [entityF,setEntityF]=useState('All');
  const [viewLog,setViewLog]=useState<AuditRecord|null>(null);

  const filtered=useMemo(()=>logs.filter(l=>{
    const qLower=q.toLowerCase();
    const qMatch=!q||
      l.actor.toLowerCase().includes(qLower)||
      l.summary.toLowerCase().includes(qLower)||
      l.entityId.toLowerCase().includes(qLower);
    const aMatch=actionF==='All'||l.action===actionF;
    const eMatch=entityF==='All'||l.entityType===entityF;
    return qMatch&&aMatch&&eMatch;
  }),[logs,q,actionF,entityF]);

  const actionBadge=(a:AuditRecord['action'])=>{
    switch(a){
      case 'CREATE': return 'badge-good';
      case 'UPDATE': return 'badge-blue';
      case 'DELETE': return 'badge-bad';
      case 'PAYMENT': return 'badge-good';
      case 'STATUS_CHANGE': return 'badge-warn';
      default: return 'badge-neutral';
    }
  };

  return <>
    <div style={{marginBottom:16}}>
      <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947',marginBottom:4}}>System Audit Trail</h1>
      <p style={{fontSize:13,color:'#6a7c83'}}>Immutable chronological record of all system activities, financial entries, and status changes.</p>
    </div>

    {/* Toolbar */}
    <div className="toolbar" style={{marginBottom:16,flexWrap:'wrap',gap:10}}>
      <div className="global-search" style={{width:270}}>
        <Search size={15}/>
        <Input
          placeholder="Search user, action, summary, entity…"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
      </div>

      <Select value={actionF} onValueChange={setActionF}>
        <SelectTrigger style={{minWidth:140}}><SelectValue placeholder="Action Type"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Actions</SelectItem>
          <SelectItem value="CREATE">Create</SelectItem>
          <SelectItem value="UPDATE">Update</SelectItem>
          <SelectItem value="PAYMENT">Payment</SelectItem>
          <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
          <SelectItem value="DELETE">Delete</SelectItem>
        </SelectContent>
      </Select>

      <Select value={entityF} onValueChange={setEntityF}>
        <SelectTrigger style={{minWidth:150}}><SelectValue placeholder="Entity Type"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Entities</SelectItem>
          <SelectItem value="Vehicle">Vehicle</SelectItem>
          <SelectItem value="Driver">Driver</SelectItem>
          <SelectItem value="Owner">Owner</SelectItem>
          <SelectItem value="Client">Client</SelectItem>
          <SelectItem value="Duty">Duty</SelectItem>
          <SelectItem value="Expense">Expense</SelectItem>
          <SelectItem value="Maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Table */}
    <Card>
      <div style={{overflowX:'auto'}}>
        <div className="billing-table">
          <div className="head" style={{gridTemplateColumns:'100px 140px 1.2fr 110px 100px 1.8fr 70px'}}>
            <span>Log ID</span>
            <span>Timestamp</span>
            <span>Actor / Role</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Activity Summary</span>
            <span>Detail</span>
          </div>

          {filtered.length===0&&<div style={{padding:'40px 0'}}><EmptyState title="No audit events matched" description="Try broadening your search query"/></div>}

          {filtered.map(l=>(
            <div key={l.id} style={{gridTemplateColumns:'100px 140px 1.2fr 110px 100px 1.8fr 70px'}}>
              <span style={{fontSize:11,color:'#6a7c83'}}>{l.id}</span>
              <span style={{fontSize:11,color:'#6a7c83'}}>{l.timestamp}</span>
              <span>
                <b style={{fontSize:12,color:'#1e3947'}}>{l.actor}</b>
                <span style={{display:'block',fontSize:10,color:'#6a7c83'}}>{l.role}</span>
              </span>
              <span><span className={`badge ${actionBadge(l.action)}`}>{l.action}</span></span>
              <span>
                <b style={{fontSize:11,color:'#1e3947'}}>{l.entityType}</b>
                <span style={{display:'block',fontSize:10,color:'#6a7c83'}}>{l.entityId}</span>
              </span>
              <span style={{fontSize:12,color:'#1e3947'}}>{l.summary}</span>
              <span className="row-actions">
                <button className="text-button" onClick={()=>setViewLog(l)} title="View Audit Details"><Eye size={14}/></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>

    {/* Detail Dialog */}
    <Dialog open={!!viewLog} onOpenChange={o=>!o&&setViewLog(null)}>
      <DialogContent style={{maxWidth:520}}>
        <DialogHeader>
          <DialogTitle>Audit Event Details – {viewLog?.id}</DialogTitle>
          <DialogDescription>Recorded at {viewLog?.timestamp}</DialogDescription>
        </DialogHeader>

        {viewLog&&(
          <div>
            <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr',gap:11,marginTop:12}}>
              {[
                ['Log ID',viewLog.id],
                ['Timestamp',viewLog.timestamp],
                ['Actor',viewLog.actor],
                ['Assigned Role',viewLog.role],
                ['Action Type',viewLog.action],
                ['Entity Affected',`${viewLog.entityType} (${viewLog.entityId})`],
                ['Client IP',viewLog.details.ipAddress||'127.0.0.1'],
                ['Device / Browser',viewLog.details.device||'Web Browser'],
              ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
            </div>

            <div style={{marginTop:16}}>
              <span className="field-label">Summary</span>
              <p style={{fontSize:13,color:'#1e3947',fontWeight:600}}>{viewLog.summary}</p>
            </div>

            {viewLog.details.before&&(
              <div style={{marginTop:8,padding:10,background:'#fef3f2',borderRadius:6,border:'1px solid #fee4e2'}}>
                <span className="field-label" style={{color:'#b04b46'}}>State Before:</span>
                <p style={{fontSize:12,color:'#852a25'}}>{viewLog.details.before}</p>
              </div>
            )}

            {viewLog.details.after&&(
              <div style={{marginTop:8,padding:10,background:'#edf8f3',borderRadius:6,border:'1px solid #bce6ce'}}>
                <span className="field-label" style={{color:'#277b55'}}>State After:</span>
                <p style={{fontSize:12,color:'#175037'}}>{viewLog.details.after}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>;
}
