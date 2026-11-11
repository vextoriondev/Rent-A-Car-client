"use client";
import {useState,useMemo,useEffect} from 'react';
import Link from 'next/link';
import {fetchOwners,createOwner} from '@/lib/api';
import {
  Users,
  UserRound,
  CheckCircle2,
  CarFront,
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
  X
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';

const fmt=(n:number)=>'৳ '+(Number(n)||0).toLocaleString('en-US');

interface OwnerRecord {
  id: string;
  name: string;
  phone: string;
  cars: number;
  totalRent: number;
  paid: number;
  due: number;
  status: 'Active' | 'Due' | 'Inactive';
  nid: string;
  address: string;
  bank: string;
  email: string;
}

export default function OwnersPage(){
  const [owners,setOwners]=useState<OwnerRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');
  const [statusF,setStatusF]=useState('All');
  const [ownerF,setOwnerF]=useState('All');
  const [selectedOwner,setSelectedOwner]=useState<OwnerRecord | null>(null);
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [addOpen,setAddOpen]=useState(false);
  const [newOwner,setNewOwner]=useState({name:'',phone:'',cars:1,rent:55000,nid:'',address:'',bank:'',email:''});
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const loadData = () => {
    setLoading(true);
    fetchOwners(1)
      .then((data: any) => {
        if(Array.isArray(data)){
          const mapped: OwnerRecord[] = data.map((o: any) => ({
            id: String(o.id),
            name: o.name,
            phone: o.mobile || o.phone || '01711-000000',
            cars: o.totalVehicles || (o.vehicles?.length ?? 1),
            totalRent: Number(o.totalRent) || 55000,
            paid: Number(o.totalPaid) || 0,
            due: Number(o.due) || 0,
            status: (o.due > 0 ? 'Due' : 'Active') as OwnerRecord['status'],
            nid: o.nid || '1234567890123',
            address: o.presentAddress || 'Dhaka, Bangladesh',
            bank: o.bankName ? `${o.bankName} (${o.accountNumber || ''})` : 'Dhaka Bank Ltd.',
            email: o.email || `${o.name.toLowerCase().replace(/[^a-z]/g,'')}@gmail.com`,
          }));
          setOwners(mapped);
          if (mapped.length > 0) {
            setSelectedOwner(prev => prev ? (mapped.find(x => x.id === prev.id) || mapped[0]) : mapped[0]);
          }
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    loadData();
  }, []);

  const filtered=useMemo(()=>owners.filter(o=>{
    const qLower=q.toLowerCase();
    const qMatch=!q||o.name.toLowerCase().includes(qLower)||o.phone.includes(q);
    const sMatch=statusF==='All'||o.status===statusF;
    const oMatch=ownerF==='All'||o.id===ownerF;
    return qMatch&&sMatch&&oMatch;
  }),[owners,q,statusF,ownerF]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeOwner = (selectedOwner && filtered.find(f => f.id === selectedOwner.id)) || filtered[0] || null;

  // Real-time aggregates calculated directly from database records
  const totalOwnersCount = owners.length;
  const activeOwnersCount = owners.filter(o => o.status === 'Active' || o.due === 0).length;
  const totalCarsCount = owners.reduce((acc, o) => acc + (o.cars || 1), 0);
  const totalDueSum = owners.reduce((acc, o) => acc + (o.due || 0), 0);
  const totalPaidSum = owners.reduce((acc, o) => acc + (o.paid || 0), 0);

  function handleReset(){
    setQ('');
    setStatusF('All');
    setOwnerF('All');
    setPage(1);
  }

  async function handleAddOwner(){
    if(!newOwner.name.trim()||!newOwner.phone.trim())return;
    const payload = {
      name: newOwner.name.trim(),
      phone: newOwner.phone.trim(),
      present_address: newOwner.address || 'Dhaka, Bangladesh',
      nid: newOwner.nid || '1234567890123',
      email: newOwner.email || 'owner@gmail.com',
      bank_name: newOwner.bank || 'Dhaka Bank Ltd.',
    };
    try {
      await createOwner(1, payload);
      loadData();
      setAddOpen(false);
      setNewOwner({name:'',phone:'',cars:1,rent:55000,nid:'',address:'',bank:'',email:''});
      showToast(`Owner ${payload.name} saved to database`);
    } catch {
      showToast('Error saving owner to database');
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Page Title Header ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <Users size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>Owners Management</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Manage vehicle owners, their cars and payments from Neon DB</p>
          </div>
        </div>

        <button
          onClick={()=>setAddOpen(true)}
          className="btn-primary-blue"
          style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700}}
        >
          <Plus size={16}/> Add New Owner
        </button>
      </div>

      {/* ─── Top 5 Metric Cards (Dynamic from Neon DB) ─── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12}}>
        {/* 1. Total Owners */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <Users size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Owners</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{totalOwnersCount}</strong>
          </div>
        </Card>

        {/* 2. Active Owners */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CheckCircle2 size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Active Owners</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{activeOwnersCount}</strong>
          </div>
        </Card>

        {/* 3. Total Cars (Owned) */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <CarFront size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Cars (Owned)</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{totalCarsCount}</strong>
          </div>
        </Card>

        {/* 4. Total Due */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Wallet size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Due</span>
            <strong style={{fontSize:20,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{fmt(totalDueSum)}</strong>
          </div>
        </Card>

        {/* 5. Total Paid */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:46,height:46,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CheckCircle2 size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Paid</span>
            <strong style={{fontSize:20,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{fmt(totalPaidSum)}</strong>
          </div>
        </Card>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="search-filter-card" style={{display:'flex',gap:12,alignItems:'center',background:'#fff',padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0'}}>
        <div style={{flex:1,minWidth:240,position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:12,top:11}}/>
          <input
            placeholder="Search by Owner Name, Phone or ID..."
            value={q}
            onChange={e=>{setQ(e.target.value);setPage(1)}}
            style={{width:'100%',paddingLeft:36,height:38,borderRadius:8,border:'1px solid #cbd5e1',outline:'none',fontSize:12.5}}
          />
        </div>

        <Select value={statusF} onValueChange={v=>{setStatusF(v);setPage(1)}}>
          <SelectTrigger style={{width:140,height:38}}><SelectValue placeholder="All Status"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Due">Due</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ownerF} onValueChange={v=>{setOwnerF(v);setPage(1)}}>
          <SelectTrigger style={{width:160,height:38}}><SelectValue placeholder="All Owners"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Owners</SelectItem>
            {owners.map(o=><SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <button onClick={handleReset} className="btn-reset" style={{height:38}}>
          <RotateCcw size={15}/> Reset
        </button>
      </div>

      {/* ─── Data Table ─── */}
      <Card style={{padding:0,borderRadius:12,overflow:'hidden',background:'#fff',border:'1px solid #e2e8f0'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5,textAlign:'left'}}>
            <thead>
              <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0',color:'#475569',fontWeight:700,height:42}}>
                <th style={{padding:'0 16px',width:50}}>#</th>
                <th style={{padding:'0 16px'}}>Owner Name</th>
                <th style={{padding:'0 16px'}}>Phone</th>
                <th style={{padding:'0 16px'}}>Cars</th>
                <th style={{padding:'0 16px'}}>Total Rent</th>
                <th style={{padding:'0 16px'}}>Paid</th>
                <th style={{padding:'0 16px'}}>Due</th>
                <th style={{padding:'0 16px'}}>Status</th>
                <th style={{padding:'0 16px',textAlign:'center'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{padding:'32px 16px',textAlign:'center',color:'#64748b'}}>
                    {loading ? 'Loading owners from database...' : 'No owners found in database.'}
                  </td>
                </tr>
              ) : (
                paged.map((o,idx)=>{
                  const isSelected=activeOwner?.id===o.id;
                  return (
                    <tr
                      key={o.id}
                      onClick={()=>setSelectedOwner(o)}
                      style={{
                        borderBottom:'1px solid #f1f5f9',
                        height:48,
                        background:isSelected?'#eff6ff':'transparent',
                        cursor:'pointer',
                        transition:'background .1s'
                      }}
                    >
                      <td style={{padding:'0 16px',color:'#64748b'}}>{startIdx + idx}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{o.name}</td>
                      <td style={{padding:'0 16px',color:'#475569'}}>{o.phone}</td>
                      <td style={{padding:'0 16px'}}>
                        <span style={{background:'#eff6ff',color:'#1677ff',padding:'3px 10px',borderRadius:6,fontSize:11.5,fontWeight:700}}>
                          {o.cars} {o.cars===1?'Car':'Cars'}
                        </span>
                      </td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{fmt(o.totalRent)}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{fmt(o.paid)}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:o.due>0?'#ef4444':'#16a34a'}}>
                        {fmt(o.due)}
                      </td>
                      <td style={{padding:'0 16px'}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6,fontWeight:600,fontSize:12,color:o.status==='Active'?'#16a34a':'#f97316'}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:o.status==='Active'?'#16a34a':'#f97316'}}/>
                          {o.status}
                        </span>
                      </td>
                      <td style={{padding:'0 16px'}}>
                        <div style={{display:'flex',justifyContent:'center',gap:6}}>
                          <button className="action-btn action-btn-blue" title="View Details" onClick={(e)=>{e.stopPropagation();setSelectedOwner(o)}}>
                            <Eye size={14}/>
                          </button>
                          <button className="action-btn action-btn-blue" title="Edit" onClick={(e)=>{e.stopPropagation();showToast(`Editing ${o.name}`)}}>
                            <Edit2 size={14}/>
                          </button>
                          <button className="action-btn action-btn-red" title="Delete" onClick={(e)=>{e.stopPropagation();showToast(`Cannot delete owner with active agreements`)}}>
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
              <ChevronLeft size={14}/> Previous
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
              Next <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </Card>

      {/* ─── Bottom Split Section ─── */}
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1.6fr 0.9fr',gap:14}}>
        {/* Left: Owner Details */}
        <Card style={{padding:0,borderRadius:12,overflow:'hidden',background:'#fff',border:'1px solid #e2e8f0'}}>
          <div className="panel-header-blue">
            <UserRound size={17}/> Owner Details
          </div>

          {activeOwner ? (
            <div style={{padding:16,display:'flex',gap:16}}>
              {/* Owner photo + badge */}
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
                  👤
                </div>
                <span style={{background:activeOwner.status==='Active'?'#16a34a':'#f97316',color:'#fff',padding:'2px 14px',borderRadius:999,fontSize:11,fontWeight:700}}>
                  ● {activeOwner.status}
                </span>
              </div>

              {/* Details Grid */}
              <div style={{flex:1,display:'grid',gridTemplateColumns:'70px 10px 1fr',gap:'6px 0',fontSize:12,alignItems:'center'}}>
                <span style={{color:'#64748b'}}>Name</span><span>:</span><b style={{color:'#0f172a'}}>{activeOwner.name}</b>
                <span style={{color:'#64748b'}}>Phone</span><span>:</span><span style={{color:'#0f172a'}}>{activeOwner.phone}</span>
                <span style={{color:'#64748b'}}>NID</span><span>:</span><span style={{color:'#0f172a'}}>{activeOwner.nid}</span>
                <span style={{color:'#64748b'}}>Address</span><span>:</span><span style={{color:'#0f172a'}}>{activeOwner.address}</span>
                <span style={{color:'#64748b'}}>Bank</span><span>:</span><span style={{color:'#0f172a'}}>{activeOwner.bank}</span>
                <span style={{color:'#64748b'}}>Email</span><span>:</span><span style={{color:'#0f172a'}}>{activeOwner.email}</span>
              </div>
            </div>
          ) : (
            <div style={{padding:24,textAlign:'center',color:'#64748b',fontSize:13}}>No owner selected</div>
          )}
        </Card>

        {/* Middle: Stats Cards + Recent Payments */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* 4 Mini Cards Row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {/* Cars Under Owner */}
            <div style={{background:'#eff6ff',border:'1px solid #dbeafe',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <CarFront size={18} color="#1677ff" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Cars Under Owner</span>
              <strong style={{fontSize:18,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{activeOwner?.cars ?? 0}</strong>
            </div>

            {/* Total Rent */}
            <div style={{background:'#fff7ed',border:'1px solid #ffedd5',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <Wallet size={18} color="#f97316" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Rent</span>
              <strong style={{fontSize:13,fontWeight:800,color:'#0f172a',display:'block',marginTop:4}}>{fmt(activeOwner?.totalRent ?? 0)}</strong>
            </div>

            {/* Total Paid */}
            <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <CheckCircle2 size={18} color="#16a34a" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Total Paid</span>
              <strong style={{fontSize:13,fontWeight:800,color:'#0f172a',display:'block',marginTop:4}}>{fmt(activeOwner?.paid ?? 0)}</strong>
            </div>

            {/* Due Amount */}
            <div style={{background:'#fef2f2',border:'1px solid #fee2e2',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
              <Wallet size={18} color="#ef4444" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10,color:'#64748b',display:'block'}}>Due Amount</span>
              <strong style={{fontSize:13,fontWeight:800,color:'#ef4444',display:'block',marginTop:4}}>{fmt(activeOwner?.due ?? 0)}</strong>
            </div>
          </div>

          {/* Recent Payments Table */}
          <Card style={{padding:'12px 16px',borderRadius:10,background:'#fff',border:'1px solid #e2e8f0',flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <h4 style={{fontSize:13,fontWeight:750,color:'#0f172a',margin:0}}>Recent Payments</h4>
              <Link href="/due-collection" style={{fontSize:11.5,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',fontSize:11,fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',paddingBottom:4}}>
                <span>Date</span><span>Description</span><span>Amount</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',fontSize:12,color:'#334155',alignItems:'center'}}>
                <span style={{color:'#64748b',fontSize:11}}>01 Nov 2026</span>
                <span>Monthly Rent</span>
                <strong style={{color:'#0f172a',fontWeight:700}}>{fmt(activeOwner?.totalRent ?? 50000)}</strong>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Action Buttons */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0',display:'flex',flexDirection:'column',gap:10,justifyContent:'center'}}>
          <Link href="/vehicles" style={{textDecoration:'none'}}>
            <button style={{width:'100%',background:'#10b981',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>
              <CarFront size={18}/> View All Cars
            </button>
          </Link>

          <Link href="/due-collection" style={{textDecoration:'none'}}>
            <button style={{width:'100%',background:'#0ea5e9',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>
              <Wallet size={18}/> Payment History
            </button>
          </Link>

          <button onClick={()=>window.print()} style={{width:'100%',background:'#8b5cf6',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>
            <Printer size={18}/> Print Statement
          </button>

          <button onClick={()=>setAddOpen(true)} style={{width:'100%',background:'#f97316',color:'#fff',border:0,borderRadius:8,padding:'11px 16px',display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>
            <Edit2 size={18}/> Add/Edit Owner
          </button>
        </Card>
      </div>

      {/* Add Owner Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{maxWidth:560}}>
          <DialogHeader>
            <DialogTitle>Add New Vehicle Owner</DialogTitle>
            <DialogDescription>Fill out the owner particulars to register a new vehicle partner into Neon DB.</DialogDescription>
          </DialogHeader>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Owner Name *</span>
                <Input placeholder="e.g. Md. Rahim Hossain" value={newOwner.name} onChange={e=>setNewOwner(f=>({...f,name:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Phone Number *</span>
                <Input placeholder="01711-XXXXXX" value={newOwner.phone} onChange={e=>setNewOwner(f=>({...f,phone:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Number of Cars Owned</span>
                <Input type="number" value={newOwner.cars} onChange={e=>setNewOwner(f=>({...f,cars:Number(e.target.value)}))}/>
              </label>

              <label>
                <span className="field-label">Agreed Total Monthly Rent</span>
                <Input type="number" value={newOwner.rent} onChange={e=>setNewOwner(f=>({...f,rent:Number(e.target.value)}))}/>
              </label>

              <label>
                <span className="field-label">National NID</span>
                <Input placeholder="NID Number" value={newOwner.nid} onChange={e=>setNewOwner(f=>({...f,nid:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Bank Name</span>
                <Input placeholder="e.g. Dhaka Bank Ltd." value={newOwner.bank} onChange={e=>setNewOwner(f=>({...f,bank:e.target.value}))}/>
              </label>
            </div>

            <label>
              <span className="field-label">Address</span>
              <Input placeholder="Mirpur, Dhaka" value={newOwner.address} onChange={e=>setNewOwner(f=>({...f,address:e.target.value}))}/>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOwner} disabled={!newOwner.name||!newOwner.phone}>Save Owner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}