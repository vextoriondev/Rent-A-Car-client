"use client";
import {useState,useMemo,useEffect} from 'react';
import Link from 'next/link';
import {fetchClients,createClient,updateClient,deleteClient,recordClientCollection} from '@/lib/api';
import {
  Briefcase,
  CheckCircle2,
  Building2,
  Wallet,
  Search,
  RotateCcw,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  FileText,
  X,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';

const fmt=(n:number)=>'৳ '+(Number(n)||0).toLocaleString('en-US');

export interface ClientRecord {
  id: string;
  clientId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  tradeLicense: string;
  type: 'Company' | 'Individual' | 'Government';
  status: 'Active' | 'Due' | 'Inactive';
  totalBilled: number;
  collected: number;
  due: number;
  joiningDate: string;
}

export default function CustomersPage(){
  const [clients,setClients]=useState<ClientRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [selectedClient,setSelectedClient]=useState<ClientRecord | null>(null);
  const [q,setQ]=useState('');
  const [statusF,setStatusF]=useState('All');
  const [typeF,setTypeF]=useState('All');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);

  // Modal states
  const [addOpen,setAddOpen]=useState(false);
  const [editOpen,setEditOpen]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [colOpen,setColOpen]=useState(false);

  // Form states
  const [formClient,setFormClient]=useState({
    name:'',
    contactPerson:'',
    phone:'',
    type:'Company' as ClientRecord['type'],
    address:'',
    email:'',
    tradeLicense:'',
    status:'Active' as ClientRecord['status']
  });

  const [colData,setColData]=useState({
    amount:'',
    method:'Cash',
    reference:'',
    note:''
  });

  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const loadData = () => {
    setLoading(true);
    fetchClients(1)
      .then((data: any) => {
        if(Array.isArray(data)){
          const mapped: ClientRecord[] = data.map((c: any) => ({
            id: String(c.id),
            clientId: c.clientId || `CLT-${String(c.id).padStart(3, '0')}`,
            name: c.name || 'Unnamed Client',
            contactPerson: c.contactPerson || 'Contact Person',
            phone: c.mobile || c.phone || '01711-000000',
            email: c.email || 'client@company.com',
            address: c.address || c.presentAddress || 'Dhaka, Bangladesh',
            tradeLicense: c.tradeLicense || 'TL-2024-XXXXX',
            type: (['Company','Individual','Government'].includes(c.clientType) ? c.clientType : 'Company') as ClientRecord['type'],
            status: (c.due > 0 ? 'Due' : (c.status === 'Inactive' ? 'Inactive' : 'Active')) as ClientRecord['status'],
            totalBilled: Number(c.totalReceivable) || 0,
            collected: Number(c.totalCollected) || 0,
            due: Number(c.due) || 0,
            joiningDate: c.joiningDate || '2026-01-01',
          }));
          setClients(mapped);
          if (mapped.length > 0) {
            setSelectedClient(prev => prev ? (mapped.find(x => x.id === prev.id) || mapped[0]) : mapped[0]);
          }
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    loadData();
  }, []);

  const filtered=useMemo(()=>clients.filter(c=>{
    const qLower=q.toLowerCase().trim();
    const qMatch=!qLower
      || c.name.toLowerCase().includes(qLower)
      || c.clientId.toLowerCase().includes(qLower)
      || c.contactPerson.toLowerCase().includes(qLower)
      || c.phone.includes(qLower)
      || c.email.toLowerCase().includes(qLower);
    const sMatch=statusF==='All'||c.status===statusF;
    const tMatch=typeF==='All'||c.type===typeF;
    return qMatch&&sMatch&&tMatch;
  }),[clients,q,statusF,typeF]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeClient = (selectedClient && filtered.find(c => c.id === selectedClient.id)) || filtered[0] || null;

  // Real-time aggregates directly from database records
  const totalClientsCount = clients.length;
  const activeClientsCount = clients.filter(c => c.status === 'Active' || c.due === 0).length;
  const corporateCount = clients.filter(c => c.type === 'Company').length;
  const totalBilledSum = clients.reduce((acc, c) => acc + (c.totalBilled || 0), 0);
  const totalDueSum = clients.reduce((acc, c) => acc + (c.due || 0), 0);

  function handleReset(){
    setQ('');
    setStatusF('All');
    setTypeF('All');
    setPage(1);
  }

  function openAddModal(){
    setFormClient({
      name:'',
      contactPerson:'',
      phone:'',
      type:'Company',
      address:'',
      email:'',
      tradeLicense:'',
      status:'Active'
    });
    setAddOpen(true);
  }

  function openEditModal(c: ClientRecord){
    setSelectedClient(c);
    setFormClient({
      name: c.name,
      contactPerson: c.contactPerson,
      phone: c.phone,
      type: c.type,
      address: c.address,
      email: c.email,
      tradeLicense: c.tradeLicense,
      status: c.status
    });
    setEditOpen(true);
  }

  async function handleAddClient(){
    if(!formClient.name.trim()||!formClient.phone.trim())return;
    const payload = {
      name: formClient.name.trim(),
      phone: formClient.phone.trim(),
      contact_person: formClient.contactPerson.trim() || 'Contact Officer',
      client_type: formClient.type,
      address: formClient.address.trim(),
      email: formClient.email.trim(),
      trade_license: formClient.tradeLicense.trim(),
      status: formClient.status
    };
    try {
      await createClient(1, payload);
      loadData();
      setAddOpen(false);
      showToast(`Client ${payload.name} created successfully`);
    } catch {
      showToast('Error saving client to database');
    }
  }

  async function handleUpdateClient(){
    if(!activeClient||!formClient.name.trim()||!formClient.phone.trim())return;
    const payload = {
      name: formClient.name.trim(),
      phone: formClient.phone.trim(),
      contact_person: formClient.contactPerson.trim() || 'Contact Officer',
      client_type: formClient.type,
      address: formClient.address.trim(),
      email: formClient.email.trim(),
      trade_license: formClient.tradeLicense.trim(),
      status: formClient.status
    };
    try {
      await updateClient(1, activeClient.id, payload);
      loadData();
      setEditOpen(false);
      showToast(`Client ${payload.name} updated successfully`);
    } catch {
      showToast('Error updating client in database');
    }
  }

  async function handleDeleteClient(){
    if(!activeClient)return;
    try {
      await deleteClient(1, activeClient.id);
      loadData();
      setDeleteOpen(false);
      showToast(`Client ${activeClient.name} deleted`);
    } catch {
      showToast('Error deleting client from database');
    }
  }

  async function handleCollectDue(){
    if(!activeClient||!colData.amount)return;
    const amt = Number(colData.amount);
    if(isNaN(amt)||amt<=0)return;
    try {
      await recordClientCollection(1, activeClient.id, {
        amount: amt,
        payment_method: colData.method,
        reference: colData.reference || 'Direct Collection',
        note: colData.note || `Collection for ${activeClient.name}`
      });
      loadData();
      setColOpen(false);
      setColData({amount:'',method:'Cash',reference:'',note:''});
      showToast(`Collected ${fmt(amt)} from ${activeClient.name}`);
    } catch {
      showToast('Error recording payment collection');
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Page Title Header ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <Briefcase size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>Clients Management</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Manage corporate accounts, client contracts and billing synced with Neon DB</p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="btn-primary-blue"
          style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700}}
        >
          <Plus size={16}/> Add New Client
        </button>
      </div>

      {/* ─── Top 5 Metric Cards (Dynamic from Neon DB) ─── */}
      <div className="kpi-grid-5">
        {/* 1. Total Clients */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <Briefcase size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Clients</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{totalClientsCount}</strong>
          </div>
        </Card>

        {/* 2. Active Clients */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CheckCircle2 size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Active Clients</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{activeClientsCount}</strong>
          </div>
        </Card>

        {/* 3. Corporate Companies */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <Building2 size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Corporate Clients</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{corporateCount}</strong>
          </div>
        </Card>

        {/* 4. Total Billed */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Wallet size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Billed</span>
            <strong style={{fontSize:20,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{fmt(totalBilledSum)}</strong>
          </div>
        </Card>

        {/* 5. Total Due */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#fef2f2',display:'grid',placeItems:'center',color:'#ef4444',flexShrink:0}}>
            <Wallet size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Due</span>
            <strong style={{fontSize:20,fontWeight:800,color:'#ef4444',display:'block',marginTop:2}}>{fmt(totalDueSum)}</strong>
          </div>
        </Card>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="search-filter-responsive">
        <div data-search="true" style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:12,top:11}}/>
          <input
            placeholder="Search by Client Name, ID (CLT-xxx), Contact, Phone..."
            value={q}
            onChange={e=>{setQ(e.target.value);setPage(1)}}
            style={{width:'100%',paddingLeft:36,height:38,borderRadius:8,border:'1px solid #cbd5e1',outline:'none',fontSize:12.5}}
          />
        </div>

        <Select value={statusF} onValueChange={v=>{setStatusF(v);setPage(1)}}>
          <SelectTrigger style={{minWidth:130,height:38}}><SelectValue placeholder="All Status"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Due">Due</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeF} onValueChange={v=>{setTypeF(v);setPage(1)}}>
          <SelectTrigger style={{minWidth:140,height:38}}><SelectValue placeholder="Client Type"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="Company">Company</SelectItem>
            <SelectItem value="Individual">Individual</SelectItem>
            <SelectItem value="Government">Government</SelectItem>
          </SelectContent>
        </Select>

        <button onClick={handleReset} className="btn-reset" style={{height:38}}>
          <RotateCcw size={15}/> Reset
        </button>
      </div>

      {/* ─── Data Table ─── */}
      <Card style={{padding:0,borderRadius:12,overflow:'hidden',background:'#fff',border:'1px solid #e2e8f0'}}>
        <div className="table-responsive-container">
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5,textAlign:'left'}}>
            <thead>
              <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0',color:'#475569',fontWeight:700,height:42}}>
                <th style={{padding:'0 16px',width:50}}>#</th>
                <th style={{padding:'0 16px',width:90}}>Client ID</th>
                <th style={{padding:'0 16px'}}>Client / Company</th>
                <th style={{padding:'0 16px'}}>Contact Person</th>
                <th style={{padding:'0 16px'}}>Phone</th>
                <th style={{padding:'0 16px'}}>Type</th>
                <th style={{padding:'0 16px'}}>Total Billed</th>
                <th style={{padding:'0 16px'}}>Collected</th>
                <th style={{padding:'0 16px'}}>Due</th>
                <th style={{padding:'0 16px'}}>Status</th>
                <th style={{padding:'0 16px',textAlign:'center'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{padding:'32px 16px',textAlign:'center',color:'#64748b'}}>
                    {loading ? 'Loading clients from Neon DB...' : 'No clients found in database.'}
                  </td>
                </tr>
              ) : (
                paged.map((c,idx)=>{
                  const isSelected=activeClient?.id===c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={()=>setSelectedClient(c)}
                      style={{
                        borderBottom:'1px solid #f1f5f9',
                        height:48,
                        background:isSelected?'#eff6ff':'transparent',
                        cursor:'pointer',
                        transition:'background .1s'
                      }}
                    >
                      <td style={{padding:'0 16px',color:'#64748b'}}>{startIdx + idx}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#1677ff'}}>{c.clientId}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{c.name}</td>
                      <td style={{padding:'0 16px',color:'#334155'}}>{c.contactPerson}</td>
                      <td style={{padding:'0 16px',color:'#475569'}}>{c.phone}</td>
                      <td style={{padding:'0 16px'}}>
                        <span style={{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:6,fontSize:11.5,fontWeight:600}}>
                          {c.type}
                        </span>
                      </td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{fmt(c.totalBilled)}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{fmt(c.collected)}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:c.due>0?'#ef4444':'#16a34a'}}>
                        {fmt(c.due)}
                      </td>
                      <td style={{padding:'0 16px'}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6,fontWeight:600,fontSize:12,color:c.status==='Active'?'#16a34a':c.status==='Due'?'#f97316':'#64748b'}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:c.status==='Active'?'#16a34a':c.status==='Due'?'#f97316':'#64748b'}}/>
                          {c.status}
                        </span>
                      </td>
                      <td style={{padding:'0 16px'}}>
                        <div style={{display:'flex',justifyContent:'center',gap:6}}>
                          <button className="action-btn action-btn-blue" title="View Details" onClick={(e)=>{e.stopPropagation();setSelectedClient(c)}}>
                            <Eye size={14}/>
                          </button>
                          <button className="action-btn action-btn-blue" title="Edit Client" onClick={(e)=>{e.stopPropagation();openEditModal(c)}}>
                            <Edit2 size={14}/>
                          </button>
                          <button className="action-btn action-btn-red" title="Delete Client" onClick={(e)=>{e.stopPropagation();setSelectedClient(c);setDeleteOpen(true)}}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic & Clickable Table Footer Pagination */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderTop:'1px solid #e2e8f0',fontSize:12,color:'#64748b',flexWrap:'wrap',gap:8}}>
          <span>Showing {startIdx} to {endIdx} of {totalItems} entries</span>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <button
              onClick={()=>setPage(p=>Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                border:'1px solid #cbd5e1',
                borderRadius:6,
                background:currentPage <= 1 ? '#f8fafc' : '#fff',
                padding:'4px 10px',
                fontSize:12,
                cursor:currentPage <= 1 ? 'not-allowed' : 'pointer',
                color:currentPage <= 1 ? '#94a3b8' : '#475569',
                display:'flex',
                alignItems:'center',
                gap:2
              }}
            >
              <ChevronLeft size={14}/> ‹
            </button>
            {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={()=>setPage(p)}
                style={{
                  border: p === currentPage ? 0 : '1px solid #cbd5e1',
                  borderRadius:6,
                  background: p === currentPage ? '#1677ff' : '#fff',
                  color: p === currentPage ? '#fff' : '#475569',
                  padding:'4px 10px',
                  fontSize:12,
                  fontWeight: p === currentPage ? 700 : 500,
                  cursor:'pointer'
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={()=>setPage(p=>Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                border:'1px solid #cbd5e1',
                borderRadius:6,
                background:currentPage >= totalPages ? '#f8fafc' : '#fff',
                padding:'4px 10px',
                fontSize:12,
                cursor:currentPage >= totalPages ? 'not-allowed' : 'pointer',
                color:currentPage >= totalPages ? '#94a3b8' : '#475569',
                display:'flex',
                alignItems:'center',
                gap:2
              }}
            >
              › <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </Card>

      {/* ─── Bottom Split Section ─── */}
      <div className="split-grid-owners-3">
        {/* Left: Client Details */}
        <Card style={{padding:0,borderRadius:12,overflow:'hidden',background:'#fff',border:'1px solid #e2e8f0'}}>
          <div className="panel-header-blue">
            <Building2 size={17}/> Client & Company Details
          </div>

          {activeClient ? (
            <div className="detail-card-layout" style={{padding:16}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                <div style={{
                  width:90,
                  height:100,
                  borderRadius:8,
                  background:'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                  display:'grid',
                  placeItems:'center',
                  color:'#1e293b',
                  fontWeight:800,
                  fontSize:24,
                  border:'2px solid #e2e8f0'
                }}>
                  🏢
                </div>
                <span style={{background:activeClient.status==='Active'?'#16a34a':activeClient.status==='Due'?'#f97316':'#64748b',color:'#fff',padding:'2px 14px',borderRadius:999,fontSize:11,fontWeight:700}}>
                  ● {activeClient.status}
                </span>
              </div>

              {/* Details Grid */}
              <div style={{flex:1,display:'grid',gridTemplateColumns:'85px 10px 1fr',gap:'6px 0',fontSize:12,alignItems:'center'}}>
                <span style={{color:'#64748b'}}>Client ID</span><span>:</span><b style={{color:'#1677ff'}}>{activeClient.clientId}</b>
                <span style={{color:'#64748b'}}>Company</span><span>:</span><b style={{color:'#0f172a'}}>{activeClient.name}</b>
                <span style={{color:'#64748b'}}>Contact</span><span>:</span><span style={{color:'#0f172a'}}>{activeClient.contactPerson}</span>
                <span style={{color:'#64748b'}}>Phone</span><span>:</span><span style={{color:'#0f172a'}}>{activeClient.phone}</span>
                <span style={{color:'#64748b'}}>Trade Lic.</span><span>:</span><span style={{color:'#0f172a'}}>{activeClient.tradeLicense}</span>
                <span style={{color:'#64748b'}}>Address</span><span>:</span><span style={{color:'#0f172a'}}>{activeClient.address}</span>
                <span style={{color:'#64748b'}}>Email</span><span>:</span><span style={{color:'#0f172a'}}>{activeClient.email}</span>
                <span style={{color:'#64748b'}}>Type</span><span>:</span><span style={{color:'#0f172a'}}>{activeClient.type}</span>
              </div>
            </div>
          ) : (
            <div style={{padding:24,textAlign:'center',color:'#64748b',fontSize:13}}>No client selected</div>
          )}
        </Card>

        {/* Middle: Financial Status + Recent Invoices */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(95px, 1fr))',gap:8}}>
            <div style={{background:'#fff7ed',border:'1px solid #ffedd5',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <Wallet size={18} color="#f97316" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Billed</span>
              <strong style={{fontSize:14,fontWeight:800,color:'#0f172a',display:'block',marginTop:4}}>{fmt(activeClient?.totalBilled ?? 0)}</strong>
            </div>

            <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <CheckCircle2 size={18} color="#16a34a" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Collected</span>
              <strong style={{fontSize:14,fontWeight:800,color:'#0f172a',display:'block',marginTop:4}}>{fmt(activeClient?.collected ?? 0)}</strong>
            </div>

            <div style={{background:'#fef2f2',border:'1px solid #fee2e2',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <Wallet size={18} color="#ef4444" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Due Amount</span>
              <strong style={{fontSize:14,fontWeight:800,color:'#ef4444',display:'block',marginTop:4}}>{fmt(activeClient?.due ?? 0)}</strong>
            </div>
          </div>

          <Card style={{padding:'12px 16px',borderRadius:10,background:'#fff',border:'1px solid #e2e8f0',flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <h4 style={{fontSize:13,fontWeight:750,color:'#0f172a',margin:0}}>Recent Invoices & Activity</h4>
              <Link href="/due-collection" style={{fontSize:11.5,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>Due Collection →</Link>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',fontSize:11,fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',paddingBottom:4}}>
                <span>Date</span><span>Invoice / Service</span><span>Amount</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',fontSize:12,color:'#334155',alignItems:'center'}}>
                <span style={{color:'#64748b',fontSize:11}}>{activeClient?.joiningDate || '2026-01-01'}</span>
                <span>Monthly Vehicle Operations & Rental</span>
                <strong style={{color:'#0f172a',fontWeight:700}}>{fmt(activeClient?.totalBilled ?? 0)}</strong>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',fontSize:12,color:'#334155',alignItems:'center'}}>
                <span style={{color:'#64748b',fontSize:11}}>Collection</span>
                <span style={{color:'#16a34a'}}>Payment Cleared</span>
                <strong style={{color:'#16a34a',fontWeight:700}}>{fmt(activeClient?.collected ?? 0)}</strong>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Action Buttons */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0',display:'flex',flexDirection:'column',gap:10,justifyContent:'center'}}>
          <button
            onClick={()=>{
              if(activeClient){
                setColData({
                  amount: String(activeClient.due || ''),
                  method: 'Cash',
                  reference: `INV-${activeClient.clientId}`,
                  note: `Direct collection for ${activeClient.name}`
                });
                setColOpen(true);
              }
            }}
            style={{width:'100%',background:'#10b981',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}
          >
            <HandCoins size={18}/> Collect Due Payment
          </button>

          <Link href="/duties" style={{textDecoration:'none'}}>
            <button style={{width:'100%',background:'#0ea5e9',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>
              <FileText size={18}/> Book / Assign Duty
            </button>
          </Link>

          <button onClick={()=>window.print()} style={{width:'100%',background:'#8b5cf6',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>
            <Printer size={18}/> Print Client Ledger
          </button>

          <button
            onClick={()=>{
              if(activeClient) openEditModal(activeClient);
              else openAddModal();
            }}
            style={{width:'100%',background:'#f97316',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}
          >
            <Edit2 size={18}/> Edit Client Details
          </button>
        </Card>
      </div>

      {/* ─── Collect Due Modal ─── */}
      <Dialog open={colOpen} onOpenChange={setColOpen}>
        <DialogContent style={{maxWidth:480}}>
          <DialogHeader>
            <DialogTitle>Collect Payment: {activeClient?.name}</DialogTitle>
            <DialogDescription>Record a cash, bank or mobile wallet collection against client dues in Neon DB.</DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:14,padding:'10px 0'}}>
            <div style={{background:'#f8fafc',padding:12,borderRadius:8,fontSize:13,display:'flex',justifyContent:'space-between'}}>
              <span>Current Outstanding Due:</span>
              <b style={{color:'#ef4444',fontSize:15}}>{fmt(activeClient?.due ?? 0)}</b>
            </div>

            <label>
              <span className="field-label" style={{fontSize:12,fontWeight:600,color:'#334155',display:'block',marginBottom:4}}>Collection Amount (৳) *</span>
              <Input
                type="number"
                value={colData.amount}
                onChange={e=>setColData(f=>({...f,amount:e.target.value}))}
                placeholder="e.g. 25000"
              />
            </label>

            <label>
              <span className="field-label" style={{fontSize:12,fontWeight:600,color:'#334155',display:'block',marginBottom:4}}>Payment Method</span>
              <Select value={colData.method} onValueChange={v=>setColData(f=>({...f,method:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash in Hand</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="bKash">bKash</SelectItem>
                  <SelectItem value="Nagad">Nagad</SelectItem>
                  <SelectItem value="Cheque">Bank Cheque</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label" style={{fontSize:12,fontWeight:600,color:'#334155',display:'block',marginBottom:4}}>Reference / Receipt No.</span>
              <Input
                value={colData.reference}
                onChange={e=>setColData(f=>({...f,reference:e.target.value}))}
                placeholder="e.g. MR-2026-001"
              />
            </label>

            <label>
              <span className="field-label" style={{fontSize:12,fontWeight:600,color:'#334155',display:'block',marginBottom:4}}>Note / Remarks</span>
              <Input
                value={colData.note}
                onChange={e=>setColData(f=>({...f,note:e.target.value}))}
                placeholder="e.g. Advance cleared for November"
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setColOpen(false)}>Cancel</Button>
            <Button onClick={handleCollectDue} disabled={!colData.amount || Number(colData.amount) <= 0}>Record Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Client Modal ─── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{maxWidth:560}}>
          <DialogHeader>
            <DialogTitle>Add New Client / Corporate Partner</DialogTitle>
            <DialogDescription>Register a new client organisation or individual account into Neon DB.</DialogDescription>
          </DialogHeader>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Company / Client Name *</span>
                <Input
                  placeholder="e.g. Acme Corporation Ltd."
                  value={formClient.name}
                  onChange={e=>setFormClient(f=>({...f,name:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Contact Person Name</span>
                <Input
                  placeholder="Mr. / Ms. ..."
                  value={formClient.contactPerson}
                  onChange={e=>setFormClient(f=>({...f,contactPerson:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Phone Number *</span>
                <Input
                  placeholder="01711-XXXXXX"
                  value={formClient.phone}
                  onChange={e=>setFormClient(f=>({...f,phone:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Client Type</span>
                <Select value={formClient.type} onValueChange={(v: ClientRecord['type'])=>setFormClient(f=>({...f,type:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="field-label">Trade License / Tax ID</span>
                <Input
                  placeholder="TL-2022-XXXXX"
                  value={formClient.tradeLicense}
                  onChange={e=>setFormClient(f=>({...f,tradeLicense:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Email Address</span>
                <Input
                  placeholder="billing@company.com"
                  value={formClient.email}
                  onChange={e=>setFormClient(f=>({...f,email:e.target.value}))}
                />
              </label>
            </div>

            <label>
              <span className="field-label">Office Address</span>
              <Input
                placeholder="Gulshan-1, Dhaka"
                value={formClient.address}
                onChange={e=>setFormClient(f=>({...f,address:e.target.value}))}
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!formClient.name.trim()||!formClient.phone.trim()}>Save Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Client Modal ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{maxWidth:560}}>
          <DialogHeader>
            <DialogTitle>Edit Client: {activeClient?.name}</DialogTitle>
            <DialogDescription>Update client credentials, contact info or status in Neon DB.</DialogDescription>
          </DialogHeader>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Company / Client Name *</span>
                <Input
                  placeholder="Client name"
                  value={formClient.name}
                  onChange={e=>setFormClient(f=>({...f,name:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Contact Person Name</span>
                <Input
                  placeholder="Contact person"
                  value={formClient.contactPerson}
                  onChange={e=>setFormClient(f=>({...f,contactPerson:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Phone Number *</span>
                <Input
                  placeholder="01711-XXXXXX"
                  value={formClient.phone}
                  onChange={e=>setFormClient(f=>({...f,phone:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Client Type</span>
                <Select value={formClient.type} onValueChange={(v: ClientRecord['type'])=>setFormClient(f=>({...f,type:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="field-label">Trade License</span>
                <Input
                  placeholder="Trade license"
                  value={formClient.tradeLicense}
                  onChange={e=>setFormClient(f=>({...f,tradeLicense:e.target.value}))}
                />
              </label>

              <label>
                <span className="field-label">Email Address</span>
                <Input
                  placeholder="Email"
                  value={formClient.email}
                  onChange={e=>setFormClient(f=>({...f,email:e.target.value}))}
                />
              </label>
            </div>

            <label>
              <span className="field-label">Office Address</span>
              <Input
                placeholder="Office Address"
                value={formClient.address}
                onChange={e=>setFormClient(f=>({...f,address:e.target.value}))}
              />
            </label>

            <label>
              <span className="field-label">Status</span>
              <Select value={formClient.status} onValueChange={(v: ClientRecord['status'])=>setFormClient(f=>({...f,status:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Due">Due</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateClient} disabled={!formClient.name.trim()||!formClient.phone.trim()}>Update Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Modal ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent style={{maxWidth:400}}>
          <DialogHeader>
            <DialogTitle style={{display:'flex',alignItems:'center',gap:8,color:'#ef4444'}}>
              <AlertTriangle size={20}/> Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete client <b>{activeClient?.name}</b>? This action permanently removes them from Neon DB.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteClient}>Delete Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}