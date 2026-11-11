"use client";
import {useState,useMemo,useEffect} from 'react';
import Link from 'next/link';
import {fetchVehicles,createVehicle} from '@/lib/api';
import {
  CarFront,
  CheckCircle2,
  Wrench,
  Ban,
  Disc,
  Search,
  RotateCcw,
  Plus,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Receipt,
  UserCheck,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';

const fmt=(n:number)=>'৳ '+(Number(n)||0).toLocaleString('en-US');

interface VehicleRecord {
  id: string;
  regNo: string;
  model: string;
  brand: string;
  year: number;
  owner: string;
  driver: string;
  status: 'On Duty' | 'Available' | 'In Garage' | 'Inactive';
  monthlyRent: number;
  joiningDate: string;
}

export default function VehiclesPage(){
  const [vehicles,setVehicles]=useState<VehicleRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [selectedVeh,setSelectedVeh]=useState<VehicleRecord | null>(null);
  const [q,setQ]=useState('');
  const [ownerF,setOwnerF]=useState('All');
  const [statusF,setStatusF]=useState('All');
  const [driverF,setDriverF]=useState('All');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [addOpen,setAddOpen]=useState(false);
  const [newVeh,setNewVeh]=useState({
    regNo:'',
    model:'Axio',
    brand:'Toyota',
    year:2022,
    owner:'TASIN Enterprise',
    driver:'Unassigned',
    status:'Available' as VehicleRecord['status'],
    monthlyRent:50000
  });
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const loadData = () => {
    setLoading(true);
    fetchVehicles(1)
      .then((data: any) => {
        if(Array.isArray(data)){
          const mapped: VehicleRecord[] = data.map((v: any) => ({
            id: String(v.id),
            regNo: v.registration || v.regNo || 'DHA-METRO-GA-12-3456',
            model: v.model || 'Axio',
            brand: v.brand || 'Toyota',
            year: Number(v.year) || 2022,
            owner: v.owner || 'TASIN Enterprise',
            driver: v.driver || 'Unassigned',
            status: (['On Duty','Available','In Garage','Inactive'].includes(v.status) ? v.status : 'Available') as VehicleRecord['status'],
            monthlyRent: Number(v.monthlyRent) || 50000,
            joiningDate: v.registrationDate || '15 Jan 2022',
          }));
          setVehicles(mapped);
          if (mapped.length > 0) {
            setSelectedVeh(prev => prev ? (mapped.find(x => x.id === prev.id) || mapped[0]) : mapped[0]);
          }
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    loadData();
  }, []);

  // Distinct options for filters
  const ownerOptions = useMemo(()=>{
    const set = new Set<string>();
    vehicles.forEach(v => { if(v.owner) set.add(v.owner); });
    return Array.from(set);
  }, [vehicles]);

  const driverOptions = useMemo(()=>{
    const set = new Set<string>();
    vehicles.forEach(v => { if(v.driver) set.add(v.driver); });
    return Array.from(set);
  }, [vehicles]);

  const filtered=useMemo(()=>vehicles.filter(v=>{
    const qLower=q.toLowerCase();
    const qMatch=!q||v.regNo.toLowerCase().includes(qLower)||v.model.toLowerCase().includes(qLower)||v.brand.toLowerCase().includes(qLower);
    const oMatch=ownerF==='All'||v.owner===ownerF;
    const sMatch=statusF==='All'||v.status===statusF;
    const dMatch=driverF==='All'||v.driver===driverF;
    return qMatch&&oMatch&&sMatch&&dMatch;
  }),[vehicles,q,ownerF,statusF,driverF]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeVeh = (selectedVeh && filtered.find(v => v.id === selectedVeh.id)) || filtered[0] || null;

  // Real-time aggregates directly from database vehicles
  const totalVehiclesCount = vehicles.length;
  const activeVehiclesCount = vehicles.filter(v => v.status !== 'Inactive').length;
  const inGarageVehiclesCount = vehicles.filter(v => v.status === 'In Garage').length;
  const inactiveVehiclesCount = vehicles.filter(v => v.status === 'Inactive').length;
  const onDutyVehiclesCount = vehicles.filter(v => v.status === 'On Duty').length;
  const availableVehiclesCount = vehicles.filter(v => v.status === 'Available').length;

  function handleReset(){
    setQ('');
    setOwnerF('All');
    setStatusF('All');
    setDriverF('All');
    setPage(1);
  }

  async function handleAddVehicle(){
    if(!newVeh.regNo.trim())return;
    const payload = {
      registration: newVeh.regNo.trim(),
      reg_no: newVeh.regNo.trim(),
      model: newVeh.model,
      brand: newVeh.brand,
      year: Number(newVeh.year)||2022,
      category: 'Sedan',
      status: newVeh.status,
      monthly_rent: Number(newVeh.monthlyRent)||50000,
    };
    try {
      await createVehicle(1, payload);
      loadData();
      setAddOpen(false);
      setNewVeh({regNo:'',model:'Axio',brand:'Toyota',year:2022,owner:'TASIN Enterprise',driver:'Unassigned',status:'Available',monthlyRent:50000});
      showToast(`Vehicle ${payload.registration} saved to database`);
    } catch {
      showToast('Error saving vehicle to database');
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Page Title Header ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <CarFront size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>Vehicle Management</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Manage fleet cars, assignments and performance from Neon DB</p>
          </div>
        </div>

        <button
          onClick={()=>setAddOpen(true)}
          className="btn-primary-blue"
          style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700}}
        >
          <Plus size={16}/> Add New Vehicle
        </button>
      </div>

      {/* ─── Top 6 Metric Cards (Dynamic from Neon DB) ─── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:12}}>
        {/* 1. Total Vehicles */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <CarFront size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Vehicles</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{totalVehiclesCount}</strong>
          </div>
        </Card>

        {/* 2. Active Vehicles */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <CheckCircle2 size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Active Vehicles</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{activeVehiclesCount}</strong>
          </div>
        </Card>

        {/* 3. In Garage */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Wrench size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>In Garage</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{inGarageVehiclesCount}</strong>
          </div>
        </Card>

        {/* 4. Inactive */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <Ban size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Inactive</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{inactiveVehiclesCount}</strong>
          </div>
        </Card>

        {/* 5. On Duty */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#ecfeff',display:'grid',placeItems:'center',color:'#06b6d4',flexShrink:0}}>
            <Disc size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>On Duty</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{onDutyVehiclesCount}</strong>
          </div>
        </Card>

        {/* 6. Available */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <CarFront size={24}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Available</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{availableVehiclesCount}</strong>
          </div>
        </Card>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="search-filter-card" style={{display:'flex',gap:12,alignItems:'center',background:'#fff',padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:220,position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:12,top:11}}/>
          <input
            placeholder="Search by Vehicle Number, Model, Brand..."
            value={q}
            onChange={e=>{setQ(e.target.value);setPage(1)}}
            style={{width:'100%',paddingLeft:36,height:38,borderRadius:8,border:'1px solid #cbd5e1',outline:'none',fontSize:12.5}}
          />
        </div>

        <Select value={ownerF} onValueChange={v=>{setOwnerF(v);setPage(1)}}>
          <SelectTrigger style={{width:160,height:38}}><SelectValue placeholder="All Owners"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Owners</SelectItem>
            {ownerOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusF} onValueChange={v=>{setStatusF(v);setPage(1)}}>
          <SelectTrigger style={{width:140,height:38}}><SelectValue placeholder="All Status"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="On Duty">On Duty</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="In Garage">In Garage</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={driverF} onValueChange={v=>{setDriverF(v);setPage(1)}}>
          <SelectTrigger style={{width:160,height:38}}><SelectValue placeholder="All Drivers"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Drivers</SelectItem>
            {driverOptions.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}
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
                <th style={{padding:'0 16px'}}>Vehicle No</th>
                <th style={{padding:'0 16px'}}>Model</th>
                <th style={{padding:'0 16px'}}>Owner</th>
                <th style={{padding:'0 16px'}}>Driver</th>
                <th style={{padding:'0 16px'}}>Status</th>
                <th style={{padding:'0 16px'}}>Monthly Rent</th>
                <th style={{padding:'0 16px',textAlign:'center'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{padding:'32px 16px',textAlign:'center',color:'#64748b'}}>
                    {loading ? 'Loading vehicles from database...' : 'No vehicles found in database.'}
                  </td>
                </tr>
              ) : (
                paged.map((v,idx)=>{
                  const isSelected=activeVeh?.id===v.id;
                  const statusColors: Record<VehicleRecord['status'], {bg:string,color:string}> = {
                    'On Duty': {bg:'#dcfce7',color:'#15803d'},
                    'Available': {bg:'#e0f2fe',color:'#0284c7'},
                    'In Garage': {bg:'#fef3c7',color:'#b45309'},
                    'Inactive': {bg:'#fee2e2',color:'#b91c1c'},
                  };
                  const sc=statusColors[v.status] || {bg:'#f1f5f9',color:'#475569'};

                  return (
                    <tr
                      key={v.id}
                      onClick={()=>setSelectedVeh(v)}
                      style={{
                        borderBottom:'1px solid #f1f5f9',
                        height:48,
                        background:isSelected?'#eff6ff':'transparent',
                        cursor:'pointer',
                        transition:'background .1s'
                      }}
                    >
                      <td style={{padding:'0 16px',color:'#64748b'}}>{startIdx + idx}</td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#1677ff'}}>{v.regNo}</td>
                      <td style={{padding:'0 16px',color:'#334155'}}>{v.model}</td>
                      <td style={{padding:'0 16px',color:'#475569'}}>{v.owner}</td>
                      <td style={{padding:'0 16px',color:'#475569'}}>{v.driver}</td>
                      <td style={{padding:'0 16px'}}>
                        <span style={{background:sc.bg,color:sc.color,padding:'3px 10px',borderRadius:6,fontSize:11.5,fontWeight:700}}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{padding:'0 16px',fontWeight:700,color:'#0f172a'}}>{fmt(v.monthlyRent)}</td>
                      <td style={{padding:'0 16px'}}>
                        <div style={{display:'flex',justifyContent:'center',gap:6}}>
                          <button className="action-btn action-btn-blue" title="View Details" onClick={(e)=>{e.stopPropagation();setSelectedVeh(v)}}>
                            <Eye size={14}/>
                          </button>
                          <button className="action-btn action-btn-blue" title="Edit" onClick={(e)=>{e.stopPropagation();showToast(`Editing ${v.regNo}`)}}>
                            <Edit2 size={14}/>
                          </button>
                          <button className="action-btn action-btn-red" title="Delete" onClick={(e)=>{e.stopPropagation();showToast(`Cannot delete active vehicle`)}}>
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
      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1.3fr 1.3fr',gap:14}}>
        {/* Left: Vehicle Details */}
        <Card style={{padding:0,borderRadius:12,overflow:'hidden',background:'#fff',border:'1px solid #e2e8f0'}}>
          <div className="panel-header-blue">
            <CarFront size={17}/> Vehicle Details
          </div>

          {activeVeh ? (
            <div style={{padding:16,display:'flex',gap:16}}>
              {/* Vehicle image + badge */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                <div style={{
                  width:130,
                  height:85,
                  borderRadius:8,
                  background:'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                  display:'grid',
                  placeItems:'center',
                  color:'#1e293b',
                  fontWeight:800,
                  fontSize:32,
                  border:'2px solid #e2e8f0'
                }}>
                  🚗
                </div>
                <span style={{background:'#16a34a',color:'#fff',padding:'2px 14px',borderRadius:999,fontSize:11,fontWeight:700}}>
                  ● {activeVeh.status}
                </span>
              </div>

              {/* Details Grid */}
              <div style={{flex:1,display:'grid',gridTemplateColumns:'85px 10px 1fr',gap:'5px 0',fontSize:12,alignItems:'center'}}>
                <span style={{color:'#64748b'}}>Vehicle No</span><span>:</span><b style={{color:'#0f172a'}}>{activeVeh.regNo}</b>
                <span style={{color:'#64748b'}}>Model</span><span>:</span><span style={{color:'#0f172a'}}>{activeVeh.model}</span>
                <span style={{color:'#64748b'}}>Brand</span><span>:</span><span style={{color:'#0f172a'}}>{activeVeh.brand}</span>
                <span style={{color:'#64748b'}}>Year</span><span>:</span><span style={{color:'#0f172a'}}>{activeVeh.year}</span>
                <span style={{color:'#64748b'}}>Owner</span><span>:</span><span style={{color:'#0f172a'}}>{activeVeh.owner}</span>
                <span style={{color:'#64748b'}}>Driver</span><span>:</span><span style={{color:'#0f172a'}}>{activeVeh.driver}</span>
                <span style={{color:'#64748b'}}>Monthly Rent</span><span>:</span><b style={{color:'#0f172a'}}>{fmt(activeVeh.monthlyRent)}</b>
                <span style={{color:'#64748b'}}>Joining Date</span><span>:</span><span style={{color:'#0f172a'}}>{activeVeh.joiningDate}</span>
              </div>
            </div>
          ) : (
            <div style={{padding:24,textAlign:'center',color:'#64748b',fontSize:13}}>No vehicle selected</div>
          )}
        </Card>

        {/* Middle: Financial Summary */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,color:'#16a34a',fontWeight:750,fontSize:14}}>
            <span>💰</span> Financial Summary
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:9,fontSize:12.5}}>
            <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #f1f5f9',paddingBottom:5}}>
              <span style={{color:'#64748b'}}>Monthly Rent</span>
              <strong style={{color:'#0f172a'}}>{fmt(activeVeh?.monthlyRent ?? 50000)}</strong>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #f1f5f9',paddingBottom:5}}>
              <span style={{color:'#64748b'}}>Total Paid</span>
              <strong style={{color:'#0f172a'}}>{fmt((activeVeh?.monthlyRent ?? 50000) * 0.85)}</strong>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #f1f5f9',paddingBottom:5}}>
              <span style={{color:'#ef4444',fontWeight:700}}>Owner Due</span>
              <strong style={{color:'#ef4444',fontWeight:800}}>{fmt((activeVeh?.monthlyRent ?? 50000) * 0.15)}</strong>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #f1f5f9',paddingBottom:5}}>
              <span style={{color:'#64748b'}}>Estimated Maintenance</span>
              <strong style={{color:'#0f172a'}}>৳ 4,500</strong>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',paddingTop:3}}>
              <span style={{color:'#16a34a',fontWeight:700}}>Net Margin</span>
              <strong style={{color:'#16a34a',fontWeight:800,fontSize:14}}>৳ 18,500</strong>
            </div>
          </div>
        </Card>

        {/* Right: Quick Actions */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,color:'#9333ea',fontWeight:750,fontSize:14}}>
            <span>⚡</span> Quick Actions
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            <Link href={activeVeh ? `/vehicle-search?reg=${encodeURIComponent(activeVeh.regNo)}` : '/vehicle-search'} style={{textDecoration:'none'}}>
              <div style={{background:'#eff6ff',border:'1px solid #dbeafe',borderRadius:8,padding:'10px 4px',textAlign:'center',cursor:'pointer'}}>
                <FileSpreadsheet size={18} color="#1677ff" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Statement</span>
              </div>
            </Link>

            <button onClick={()=>setAddOpen(true)} style={{background:'#eff6ff',border:'1px solid #dbeafe',borderRadius:8,padding:'10px 4px',textAlign:'center',cursor:'pointer'}}>
              <Edit2 size={18} color="#1677ff" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Add/Edit</span>
            </button>

            <Link href="/expenses" style={{textDecoration:'none'}}>
              <div style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
                <Receipt size={18} color="#16a34a" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Add Expense</span>
              </div>
            </Link>

            <Link href="/maintenance" style={{textDecoration:'none'}}>
              <div style={{background:'#fff7ed',border:'1px solid #ffedd5',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
                <Wrench size={18} color="#f97316" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Maintenance</span>
              </div>
            </Link>

            <Link href="/drivers" style={{textDecoration:'none'}}>
              <div style={{background:'#faf5ff',border:'1px solid #f3e8ff',borderRadius:8,padding:'10px 4px',textAlign:'center'}}>
                <UserCheck size={18} color="#9333ea" style={{margin:'0 auto 4px'}}/>
                <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Drivers</span>
              </div>
            </Link>

            <button onClick={()=>window.print()} style={{background:'#f0fdf4',border:'1px solid #dcfce7',borderRadius:8,padding:'10px 4px',textAlign:'center',cursor:'pointer'}}>
              <Printer size={18} color="#16a34a" style={{margin:'0 auto 4px'}}/>
              <span style={{fontSize:10.5,fontWeight:700,color:'#1e293b',display:'block'}}>Print Report</span>
            </button>
          </div>
        </Card>
      </div>

      {/* ─── Bottom Row ─── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        {/* Vehicle History */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h4 style={{fontSize:13,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Calendar size={15} color="#1677ff"/> Vehicle History
            </h4>
            <Link href="/duties" style={{fontSize:11.5,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:11.5}}>
            <div style={{display:'grid',gridTemplateColumns:'85px 85px 1fr',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',paddingBottom:4}}>
              <span>Date</span><span>Event</span><span>Details</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'85px 85px 1fr',color:'#334155'}}>
              <span style={{color:'#64748b'}}>01 Nov 2026</span>
              <span>Daily Duty</span>
              <span>Dhaka - Airport</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'85px 85px 1fr',color:'#334155'}}>
              <span style={{color:'#64748b'}}>15 Oct 2026</span>
              <span>Maintenance</span>
              <span>Engine Oil Change</span>
            </div>
          </div>
        </Card>

        {/* Upcoming Alerts */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h4 style={{fontSize:13,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#f59e0b'}}>🔔</span> Upcoming Alerts
            </h4>
            <Link href="/documents" style={{fontSize:11.5,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:11.5}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:6,color:'#334155'}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:'#f97316'}}/> Fitness Expiry
              </span>
              <span style={{color:'#64748b',fontSize:11}}>15 Dec 2026</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:6,color:'#334155'}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:'#f97316'}}/> Insurance Expiry
              </span>
              <span style={{color:'#64748b',fontSize:11}}>20 Jan 2027</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:6,color:'#334155'}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:'#ef4444'}}/> Tax Token Expiry
              </span>
              <span style={{color:'#64748b',fontSize:11}}>10 Feb 2027</span>
            </div>
          </div>
        </Card>

        {/* Recent Payments */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h4 style={{fontSize:13,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <FileText size={15} color="#1677ff"/> Recent Payments
            </h4>
            <Link href="/due-collection" style={{fontSize:11.5,color:'#1677ff',fontWeight:600,textDecoration:'none'}}>View All →</Link>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:11.5}}>
            <div style={{display:'grid',gridTemplateColumns:'85px 1fr auto',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',paddingBottom:4}}>
              <span>Date</span><span>Description</span><span>Amount</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'85px 1fr auto',color:'#334155',alignItems:'center'}}>
              <span style={{color:'#64748b'}}>01 Nov 2026</span>
              <span>Monthly Rent</span>
              <strong style={{color:'#16a34a',fontWeight:700}}>{fmt(activeVeh?.monthlyRent ?? 50000)}</strong>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'85px 1fr auto',color:'#334155',alignItems:'center'}}>
              <span style={{color:'#64748b'}}>01 Oct 2026</span>
              <span>Monthly Rent</span>
              <strong style={{color:'#16a34a',fontWeight:700}}>{fmt(activeVeh?.monthlyRent ?? 50000)}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Vehicle Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{maxWidth:560}}>
          <DialogHeader>
            <DialogTitle>Add New Fleet Vehicle</DialogTitle>
            <DialogDescription>Register a new car under TASIN ENTERPRISE operations into Neon DB.</DialogDescription>
          </DialogHeader>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Registration No. *</span>
                <Input placeholder="e.g. DHA-METRO-GA-12-3456" value={newVeh.regNo} onChange={e=>setNewVeh(f=>({...f,regNo:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Model Name</span>
                <Input placeholder="Axio, Premio, Hiace..." value={newVeh.model} onChange={e=>setNewVeh(f=>({...f,model:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Brand</span>
                <Input placeholder="Toyota, Honda, Nissan..." value={newVeh.brand} onChange={e=>setNewVeh(f=>({...f,brand:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Manufacturing Year</span>
                <Input type="number" value={newVeh.year} onChange={e=>setNewVeh(f=>({...f,year:Number(e.target.value)}))}/>
              </label>

              <label>
                <span className="field-label">Monthly Rent (BDT)</span>
                <Input type="number" value={newVeh.monthlyRent} onChange={e=>setNewVeh(f=>({...f,monthlyRent:Number(e.target.value)}))}/>
              </label>

              <label>
                <span className="field-label">Initial Status</span>
                <Select value={newVeh.status} onValueChange={(v: VehicleRecord['status'])=>setNewVeh(f=>({...f,status:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="On Duty">On Duty</SelectItem>
                    <SelectItem value="In Garage">In Garage</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVehicle} disabled={!newVeh.regNo.trim()}>Save Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}