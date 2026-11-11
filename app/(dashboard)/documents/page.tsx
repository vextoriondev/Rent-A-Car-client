"use client";
import {useState,useMemo} from 'react';
import {FileText,Plus,Eye,Download,CheckCircle2,X,ChevronLeft,ChevronRight,Search,AlertTriangle,ShieldCheck,Calendar} from 'lucide-react';
import {demoVehicles,demoDrivers,demoOwners,demoClients} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {EmptyState} from '@/components/shared/empty-state';

export type DocCategory = 'Vehicle Document' | 'Driver Document' | 'Agreement' | 'Company Document';
export type DocType = 'Fitness Certificate' | 'Tax Token' | 'Insurance' | 'Route Permit' | 'Registration Paper' | 'Driver License' | 'NID' | 'Contract Agreement' | 'Trade License';

export interface SystemDoc {
  id: string;
  name: string;
  category: DocCategory;
  docType: DocType;
  relatedEntity: string;
  entityType: 'Vehicle' | 'Driver' | 'Owner' | 'Client' | 'Company';
  documentNumber: string;
  issueDate: string;
  expiryDate?: string;
  status: 'Valid' | 'Expiring Soon' | 'Expired';
}

const INITIAL_DOCS: SystemDoc[] = [
  { id: 'DOC-001', name: 'Fitness Certificate – DHA-METRO-GA-19-7724', category: 'Vehicle Document', docType: 'Fitness Certificate', relatedEntity: 'DHA-METRO-GA-19-7724', entityType: 'Vehicle', documentNumber: 'FIT-2025-99812', issueDate: '2025-04-10', expiryDate: '2027-04-09', status: 'Valid' },
  { id: 'DOC-002', name: 'Tax Token – DHA-METRO-GA-22-4811', category: 'Vehicle Document', docType: 'Tax Token', relatedEntity: 'DHA-METRO-GA-22-4811', entityType: 'Vehicle', documentNumber: 'TAX-2026-1102', issueDate: '2026-01-15', expiryDate: '2027-01-14', status: 'Valid' },
  { id: 'DOC-003', name: 'Comprehensive Insurance – DHA-METRO-GA-18-9922', category: 'Vehicle Document', docType: 'Insurance', relatedEntity: 'DHA-METRO-GA-18-9922', entityType: 'Vehicle', documentNumber: 'INS-GR-00219', issueDate: '2025-11-20', expiryDate: '2026-11-19', status: 'Expiring Soon' },
  { id: 'DOC-004', name: 'Driver License – Rafiqul Islam', category: 'Driver Document', docType: 'Driver License', relatedEntity: 'Rafiqul Islam (DRV-005)', entityType: 'Driver', documentNumber: 'B-678901-2017', issueDate: '2017-07-30', expiryDate: '2025-07-29', status: 'Expired' },
  { id: 'DOC-005', name: 'Driver License – Hasan Ali', category: 'Driver Document', docType: 'Driver License', relatedEntity: 'Hasan Ali (DRV-002)', entityType: 'Driver', documentNumber: 'B-345678-2021', issueDate: '2021-08-22', expiryDate: '2026-08-21', status: 'Expiring Soon' },
  { id: 'DOC-006', name: 'Master Lease Agreement – Farhana Rahman', category: 'Agreement', docType: 'Contract Agreement', relatedEntity: 'Farhana Rahman (OWN-001)', entityType: 'Owner', documentNumber: 'AGR-OWN-2026-01', issueDate: '2026-01-01', expiryDate: '2027-12-31', status: 'Valid' },
  { id: 'DOC-007', name: 'Corporate Transport Agreement – Meridian Textiles Ltd.', category: 'Agreement', docType: 'Contract Agreement', relatedEntity: 'Meridian Textiles Ltd. (CLT-001)', entityType: 'Client', documentNumber: 'AGR-CLT-2026-01', issueDate: '2026-01-01', expiryDate: '2026-12-31', status: 'Expiring Soon' },
  { id: 'DOC-008', name: 'Trade License – TASIN ENTERPRISE', category: 'Company Document', docType: 'Trade License', relatedEntity: 'TASIN ENTERPRISE (Dhaka)', entityType: 'Company', documentNumber: 'TRAD-DNCC-2024-88', issueDate: '2024-07-01', expiryDate: '2027-06-30', status: 'Valid' },
];

const BLANK_FORM = {
  name: '',
  category: 'Vehicle Document' as DocCategory,
  docType: 'Fitness Certificate' as DocType,
  relatedEntity: demoVehicles[0]?.registration || 'DHA-METRO-GA-19-7724',
  entityType: 'Vehicle' as 'Vehicle'|'Driver'|'Owner'|'Client'|'Company',
  documentNumber: '',
  issueDate: new Date().toISOString().slice(0,10),
  expiryDate: new Date(Date.now() + 365*86400000).toISOString().slice(0,10),
};

export default function DocumentsPage(){
  const [docs,setDocs]=useState<SystemDoc[]>(INITIAL_DOCS);
  const [q,setQ]=useState('');
  const [catF,setCatF]=useState<string>('All');
  const [statusF,setStatusF]=useState<string>('All');
  const [page,setPage]=useState(1);

  const [addOpen,setAddOpen]=useState(false);
  const [form,setForm]=useState(BLANK_FORM);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [viewDoc,setViewDoc]=useState<SystemDoc|null>(null);
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const filtered=useMemo(()=>docs.filter(d=>{
    const qLower=q.toLowerCase();
    const qMatch=!q||
      d.name.toLowerCase().includes(qLower)||
      d.relatedEntity.toLowerCase().includes(qLower)||
      d.documentNumber.toLowerCase().includes(qLower);
    const cMatch=catF==='All'||d.category===catF;
    const sMatch=statusF==='All'||d.status===statusF;
    return qMatch&&cMatch&&sMatch;
  }),[docs,q,catF,statusF]);

  const kpi={
    total:docs.length,
    valid:docs.filter(d=>d.status==='Valid').length,
    expiringSoon:docs.filter(d=>d.status==='Expiring Soon').length,
    expired:docs.filter(d=>d.status==='Expired').length,
  };

  function validate(){
    const e:Record<string,string>={};
    if(!form.name.trim())e.name='Document title is required';
    if(!form.documentNumber.trim())e.documentNumber='Document certificate number is required';
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function handleAdd(){
    if(!validate())return;
    const newDoc:SystemDoc={
      id:`DOC-00${docs.length+1}`,
      name:form.name.trim(),
      category:form.category,
      docType:form.docType,
      relatedEntity:form.relatedEntity,
      entityType:form.entityType,
      documentNumber:form.documentNumber.trim(),
      issueDate:form.issueDate,
      expiryDate:form.expiryDate||undefined,
      status:'Valid',
    };
    setDocs(prev=>[newDoc,...prev]);
    setAddOpen(false);
    setForm(BLANK_FORM);
    setErrors({});
    showToast(`Document ${newDoc.name} uploaded successfully`);
  }

  return <>
    {/* KPI Cards */}
    <div className="metric-grid" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))',marginBottom:16}}>
      {[
        {label:'Total Active Documents',value:kpi.total,color:'blue',icon:FileText},
        {label:'Valid & Verified',value:kpi.valid,color:'blue',icon:ShieldCheck},
        {label:'Expiring Soon (<30 Days)',value:kpi.expiringSoon,color:'gold',icon:Calendar},
        {label:'Expired (Requires Renewal)',value:kpi.expired,color:'gold',icon:AlertTriangle},
      ].map(c=>{
        const Icon=c.icon;
        return (
          <Card key={c.label} className="metric">
            <div className="metric-top">
              <span>{c.label}</span>
              <span className={`metric-icon ${c.color}`}><Icon size={17}/></span>
            </div>
            <strong className="nums" style={{fontSize:26}}>{c.value}</strong>
          </Card>
        );
      })}
    </div>

    {/* Expiry Warning Callout */}
    {kpi.expired>0&&(
      <div style={{padding:'12px 16px',background:'#fbebeb',border:'1px solid #e8b3b0',borderRadius:8,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <AlertTriangle size={18} color="#b04b46"/>
          <span style={{fontSize:13,color:'#852a25'}}><b>Attention:</b> {kpi.expired} document(s) have expired and require immediate renewal to maintain regulatory compliance.</span>
        </div>
        <Button size="sm" variant="outline" onClick={()=>setStatusF('Expired')} style={{borderColor:'#b04b46',color:'#852a25'}}>
          View Expired Docs
        </Button>
      </div>
    )}

    {/* Toolbar */}
    <div className="toolbar" style={{marginBottom:16,flexWrap:'wrap',gap:10}}>
      <div className="global-search" style={{width:270}}>
        <Search size={15}/>
        <Input
          placeholder="Search document name, entity, doc no…"
          value={q}
          onChange={e=>{setQ(e.target.value);setPage(1)}}
        />
      </div>

      <Select value={catF} onValueChange={v=>{setCatF(v);setPage(1)}}>
        <SelectTrigger style={{minWidth:160}}><SelectValue placeholder="Category"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Categories</SelectItem>
          <SelectItem value="Vehicle Document">Vehicle Documents</SelectItem>
          <SelectItem value="Driver Document">Driver Documents</SelectItem>
          <SelectItem value="Agreement">Agreements</SelectItem>
          <SelectItem value="Company Document">Company Documents</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusF} onValueChange={v=>{setStatusF(v);setPage(1)}}>
        <SelectTrigger style={{minWidth:140}}><SelectValue placeholder="Status"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Status</SelectItem>
          <SelectItem value="Valid">Valid</SelectItem>
          <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
          <SelectItem value="Expired">Expired</SelectItem>
        </SelectContent>
      </Select>

      <div style={{marginLeft:'auto',display:'flex',gap:8}}>
        <Button onClick={()=>{setForm(BLANK_FORM);setErrors({});setAddOpen(true)}}>
          <Plus size={16}/> Upload Document
        </Button>
      </div>
    </div>

    {/* Document Table */}
    <Card>
      <div style={{overflowX:'auto'}}>
        <div className="billing-table">
          <div className="head" style={{gridTemplateColumns:'100px 1.5fr 130px 1.3fr 120px 100px 100px 100px 100px'}}>
            <span>Doc ID</span>
            <span>Document Title</span>
            <span>Category</span>
            <span>Related Entity</span>
            <span>Doc Number</span>
            <span>Issue Date</span>
            <span>Expiry Date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.length===0&&<div style={{padding:'40px 0'}}><EmptyState title="No documents found" description="Adjust your filters or upload a new record"/></div>}

          {filtered.map(d=>(
            <div key={d.id} style={{gridTemplateColumns:'100px 1.5fr 130px 1.3fr 120px 100px 100px 100px 100px'}}>
              <span style={{fontSize:11,color:'#6a7c83'}}>{d.id}</span>
              <span><b style={{fontSize:12,color:'#1e3947'}}>{d.name}</b></span>
              <span><span className="badge badge-neutral" style={{fontSize:10}}>{d.category}</span></span>
              <span style={{fontSize:11,color:'#1e3947'}}>{d.relatedEntity}</span>
              <span style={{fontSize:11,color:'#6a7c83'}}>{d.documentNumber}</span>
              <span style={{fontSize:11,color:'#6a7c83'}}>{d.issueDate}</span>
              <span style={{fontSize:11,fontWeight:500,color:d.status==='Expired'?'#b04b46':d.status==='Expiring Soon'?'#a57a2b':'#277b55'}}>
                {d.expiryDate||'Permanent'}
              </span>
              <span>
                <span className={`badge ${d.status==='Valid'?'badge-good':d.status==='Expiring Soon'?'badge-warn':'badge-bad'}`}>
                  {d.status}
                </span>
              </span>
              <span className="row-actions">
                <button className="text-button" onClick={()=>setViewDoc(d)} title="View Document"><Eye size={14}/></button>
                <button className="text-button" onClick={()=>showToast(`Downloading ${d.name} (Demo file)`)} style={{color:'#236d80'}} title="Download"><Download size={14}/></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>

    {/* Add Document Modal */}
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent style={{maxWidth:580}}>
        <DialogHeader>
          <DialogTitle>Upload Document / Certificate</DialogTitle>
          <DialogDescription>Attach compliance papers, fitness records, licenses, or agreements.</DialogDescription>
        </DialogHeader>

        <div className="entry-form">
          <label>
            <span className="field-label">Document Title *</span>
            <Input placeholder="e.g. Fitness Certificate – 2026/2027" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            {errors.name&&<span className="field-error">{errors.name}</span>}
          </label>

          <div className="form-grid">
            <label>
              <span className="field-label">Category *</span>
              <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v as DocCategory}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vehicle Document">Vehicle Document</SelectItem>
                  <SelectItem value="Driver Document">Driver Document</SelectItem>
                  <SelectItem value="Agreement">Agreement</SelectItem>
                  <SelectItem value="Company Document">Company Document</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Document Certificate Number *</span>
              <Input placeholder="e.g. BRTA-88120" value={form.documentNumber} onChange={e=>setForm(f=>({...f,documentNumber:e.target.value}))}/>
              {errors.documentNumber&&<span className="field-error">{errors.documentNumber}</span>}
            </label>

            <label>
              <span className="field-label">Related Entity Registration / Name</span>
              <Input placeholder="e.g. DHA-METRO-GA-19-7724" value={form.relatedEntity} onChange={e=>setForm(f=>({...f,relatedEntity:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Issue Date</span>
              <Input type="date" value={form.issueDate} onChange={e=>setForm(f=>({...f,issueDate:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Expiry Date</span>
              <Input type="date" value={form.expiryDate} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))}/>
            </label>
          </div>

          <div style={{border:'2px dashed #cfd9d9',borderRadius:8,padding:20,textAlign:'center',background:'#fbfcfc',marginTop:6}}>
            <FileText size={24} style={{color:'#6a7c83',margin:'0 auto 6px'}}/>
            <span style={{fontSize:12,color:'#4f6169',display:'block'}}>Drag & drop PDF / JPG scan here, or browse files</span>
            <span style={{fontSize:10,color:'#94a3b8'}}>Accepted formats: PDF, PNG, JPG (up to 10MB)</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Save Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* View Document Modal */}
    <Dialog open={!!viewDoc} onOpenChange={o=>!o&&setViewDoc(null)}>
      <DialogContent style={{maxWidth:500}}>
        <DialogHeader>
          <DialogTitle>Document Details</DialogTitle>
          <DialogDescription>{viewDoc?.id} · {viewDoc?.category}</DialogDescription>
        </DialogHeader>

        {viewDoc&&(
          <div>
            <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr',gap:11,marginTop:12}}>
              {[
                ['Document ID',viewDoc.id],
                ['Category',viewDoc.category],
                ['Related Entity',viewDoc.relatedEntity],
                ['Certificate No.',viewDoc.documentNumber],
                ['Issue Date',viewDoc.issueDate],
                ['Expiry Date',viewDoc.expiryDate||'Permanent'],
                ['Current Status',viewDoc.status],
              ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
            </div>

            <div style={{marginTop:16,padding:16,background:'#f0f4f5',borderRadius:8,textAlign:'center'}}>
              <FileText size={32} style={{color:'#215b70',margin:'0 auto 8px'}}/>
              <strong style={{fontSize:13,color:'#1e3947',display:'block'}}>{viewDoc.name}</strong>
              <span style={{fontSize:11,color:'#6a7c83'}}>Simulated scan preview available for download</span>
              <div style={{marginTop:12}}>
                <Button size="sm" onClick={()=>showToast(`Downloading ${viewDoc.name}`)}>
                  <Download size={14}/> Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Toast notification */}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </>;
}
