"use client";
import {useState,useMemo,useEffect} from 'react';
import {apiRequest} from '@/lib/api';
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
  action: string;
  entityType: string;
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

const show=(v:unknown)=>v==null||v===''?'':typeof v==='string'?v:JSON.stringify(v);
/** Maps a server audit event (rentals/api/_shared.audit_dict) to the row this screen shows. Nothing is invented. */
function toRecord(e:any):AuditRecord{
  return {id:String(e.id),timestamp:e.at?new Date(e.at).toLocaleString():'',actor:e.actor_name||(e.actor_id?`User #${e.actor_id}`:'System'),role:'',
    action:String(e.action||''),entityType:String(e.target_type||''),entityId:String(e.target_id||''),
    summary:[e.action,e.target_type&&`${e.target_type} ${e.target_id||''}`.trim(),e.reason].filter(Boolean).join(' · '),
    details:{before:show(e.before),after:show(e.after),ipAddress:e.ip||''}};
}

export default function AuditPage(){
  const [logs,setLogs]=useState<AuditRecord[]>([]);
  const [next,setNext]=useState<number|null>(null);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  async function load(offset:number){
    setLoading(true);setError('');
    try{
      const r:any=await apiRequest(`/orgs/1/audit-events?limit=50&offset=${offset}`);
      const items=(r.items||[]).map(toRecord);
      setLogs(prev=>offset?[...prev,...items]:items);setNext(r.next??null);setTotal(r.count??items.length);
    }catch(e:any){setError(e?.message||'The audit log could not be loaded');}
    finally{setLoading(false);}
  }
  useEffect(()=>{load(0)},[]);
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

  const actionBadge=(a:string)=>{
    const x=a.toLowerCase();
    if(/delete|reverse|void|reject|cancel/.test(x)) return 'badge-bad';
    if(/create|payment|pay|approve|issue/.test(x)) return 'badge-good';
    if(/update|edit|change/.test(x)) return 'badge-blue';
    return 'badge-neutral';
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
          {Array.from(new Set(logs.map(l=>l.action))).sort().map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={entityF} onValueChange={setEntityF}>
        <SelectTrigger style={{minWidth:150}}><SelectValue placeholder="Entity Type"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Entities</SelectItem>
          {Array.from(new Set(logs.map(l=>l.entityType).filter(Boolean))).sort().map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}
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

          {error&&<div role="alert" style={{padding:'12px 16px',color:'#b42318',fontSize:13}}>{error}</div>}
          {!error&&loading&&logs.length===0&&<div style={{padding:'24px',color:'#6a7c83',fontSize:13}}>Loading audit events…</div>}
          {!loading&&!error&&filtered.length===0&&<div style={{padding:'40px 0'}}><EmptyState title="No audit events matched" description="Try broadening your search query"/></div>}

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
      {next!==null&&<div style={{padding:12,textAlign:'center'}}><Button variant="outline" disabled={loading} onClick={()=>load(next)}>{loading?'Loading…':`Load more (${logs.length} of ${total})`}</Button></div>}
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
                
                ['Action Type',viewLog.action],
                ['Entity Affected',`${viewLog.entityType} (${viewLog.entityId})`],
                ['Client IP',viewLog.details.ipAddress||'—'],
                
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
