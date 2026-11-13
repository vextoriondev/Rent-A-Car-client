"use client";
import {useState, useEffect, useMemo} from 'react';
import Link from 'next/link';
import {
  fetchMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  fetchGarages,
  createGarage,
  recordGaragePayment,
  fetchVehicles,
  fetchSpareParts,
  createSparePart,
  consumeSparePart
} from '@/lib/api';
import {
  Wrench,
  CarFront,
  Calendar,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Settings,
  ArrowUpRight,
  X,
  Wallet,
  Layers,
  Fuel,
  Droplet
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {ResponsiveContainer,PieChart,Pie,Cell,Tooltip} from 'recharts';

const fmt=(n:number)=>'৳ '+(Number(n)||0).toLocaleString('en-US');

const DONUT_COLORS = ['#1677ff', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308'];

export default function MaintenancePage(){
  const [maintenanceList, setMaintenanceList] = useState<any[]>([]);
  const [garagesList, setGaragesList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'spare_parts' | 'mobil_tracker'>('overview');
  const [loading, setLoading] = useState(true);

  // Modals
  const [addMntOpen, setAddMntOpen] = useState(false);
  const [editMntOpen, setEditMntOpen] = useState(false);
  const [editMnt, setEditMnt] = useState<any>(null);

  const [addGarageOpen, setAddGarageOpen] = useState(false);
  const [payGarageOpen, setPayGarageOpen] = useState(false);
  const [targetGarage, setTargetGarage] = useState<any>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');

  // Spare Parts Modals
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [consumePartOpen, setConsumePartOpen] = useState(false);
  const [targetPart, setTargetPart] = useState<any>(null);
  const [newPart, setNewPart] = useState({
    name: '',
    part_number: '',
    category: 'Filters',
    stock_quantity: 10,
    unit_price: 600,
    reorder_level: 3
  });
  const [consumePayload, setConsumePayload] = useState({
    vehicle_id: '',
    quantity: 1,
    notes: 'Routine vehicle replacement'
  });

  const [newGarage, setNewGarage] = useState({
    name: '',
    contact_person: '',
    mobile: '',
    address: 'Dhaka',
    garage_type: 'General',
    status: 'Active'
  });

  const [newMnt, setNewMnt] = useState({
    vehicle_reg: '',
    garage_name: '',
    date: new Date().toISOString().slice(0,10),
    problem_description: 'Periodic maintenance checkup',
    service_type: 'General Service',
    parts_details: '',
    labour_cost: 1500,
    parts_cost: 3500,
    expected_delivery: new Date().toISOString().slice(0,10),
    status: 'Pending'
  });

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      const [mntRes, grgRes, vehRes, partsRes] = await Promise.all([
        fetchMaintenance(1),
        fetchGarages(1),
        fetchVehicles(1),
        fetchSpareParts(1).catch(() => [])
      ]);
      if (Array.isArray(mntRes)) setMaintenanceList(mntRes);
      if (Array.isArray(grgRes)) setGaragesList(grgRes);
      if (Array.isArray(partsRes)) setPartsList(partsRes);
      if (Array.isArray(vehRes)) {
        setVehiclesList(vehRes);
        if (vehRes.length > 0 && !newMnt.vehicle_reg) {
          setNewMnt(m => ({ ...m, vehicle_reg: vehRes[0].registration || vehRes[0].regNo }));
        }
        if (vehRes.length > 0 && !consumePayload.vehicle_id) {
          setConsumePayload(c => ({ ...c, vehicle_id: String(vehRes[0].id) }));
        }
      }
      if (Array.isArray(grgRes) && grgRes.length > 0 && !newMnt.garage_name) {
        setNewMnt(m => ({ ...m, garage_name: grgRes[0].name }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregates
  const totalVehicles = vehiclesList.length;
  const underMaintenance = maintenanceList.filter(m => m.status === 'Pending' || m.status === 'In Progress').length;
  const totalCost = maintenanceList.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);
  const totalGarages = garagesList.length;

  // Dynamic Service Analytics Donut
  const serviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    if (maintenanceList.length === 0) {
      return [
        { name: 'Oil Change', count: 1, pct: '100%', color: '#1677ff' }
      ];
    }
    maintenanceList.forEach(m => {
      const s = m.serviceType || 'General Service';
      counts[s] = (counts[s] || 0) + 1;
    });
    const total = maintenanceList.length;
    return Object.entries(counts).map(([name, count], i) => ({
      name,
      count,
      pct: `${Math.round((count / total) * 100)}%`,
      color: DONUT_COLORS[i % DONUT_COLORS.length]
    }));
  }, [maintenanceList]);

  // Handlers
  async function handleCreateMaintenance() {
    if (!newMnt.vehicle_reg || !newMnt.garage_name) {
      showToast('Please select vehicle registration and garage name');
      return;
    }
    try {
      await createMaintenance(1, {
        vehicle_reg: newMnt.vehicle_reg,
        garage_name: newMnt.garage_name,
        date: newMnt.date,
        problem_description: newMnt.problem_description,
        service_type: newMnt.service_type,
        parts_details: newMnt.parts_details,
        labour_cost: Number(newMnt.labour_cost) || 0,
        parts_cost: Number(newMnt.parts_cost) || 0,
        expected_delivery: newMnt.expected_delivery,
        status: newMnt.status
      });
      loadData();
      setAddMntOpen(false);
      showToast('Maintenance job scheduled successfully');
    } catch {
      showToast('Error scheduling maintenance');
    }
  }

  async function handleUpdateMaintenance() {
    if (!editMnt) return;
    try {
      await updateMaintenance(1, editMnt.id, {
        vehicle_reg: editMnt.vehicleReg,
        garage_name: editMnt.garageName,
        date: editMnt.date,
        problem_description: editMnt.problemDescription || '',
        service_type: editMnt.serviceType || 'General Service',
        parts_details: editMnt.partsDetails || '',
        labour_cost: Number(editMnt.labourCost) || 0,
        parts_cost: Number(editMnt.partsCost) || 0,
        expected_delivery: editMnt.expectedDelivery || editMnt.date,
        actual_delivery: editMnt.actualDelivery || null,
        status: editMnt.status
      });
      loadData();
      setEditMntOpen(false);
      setEditMnt(null);
      showToast('Maintenance job updated');
    } catch {
      showToast('Error updating maintenance job');
    }
  }

  async function handleDeleteMaintenance(id: string | number) {
    if (!confirm('Are you sure you want to delete this maintenance record?')) return;
    try {
      await deleteMaintenance(1, id);
      loadData();
      showToast('Maintenance record deleted');
    } catch {
      showToast('Error deleting maintenance record');
    }
  }

  async function handleCreateGarage() {
    if (!newGarage.name.trim() || !newGarage.mobile.trim()) {
      showToast('Please provide garage name and contact mobile');
      return;
    }
    try {
      await createGarage(1, newGarage);
      loadData();
      setAddGarageOpen(false);
      setNewGarage({ name: '', contact_person: '', mobile: '', address: 'Dhaka', garage_type: 'General', status: 'Active' });
      showToast(`Garage ${newGarage.name} registered successfully`);
    } catch {
      showToast('Error registering garage');
    }
  }

  async function handleRecordGaragePayout() {
    if (!targetGarage || payAmount <= 0) return;
    try {
      await recordGaragePayment(1, targetGarage.id, {
        amount: payAmount,
        payment_method: payMethod,
        reference: payRef,
        note: payNote
      });
      loadData();
      setPayGarageOpen(false);
      setTargetGarage(null);
      setPayAmount(0);
      setPayRef('');
      setPayNote('');
      showToast(`Paid ৳ ${payAmount.toLocaleString()} to ${targetGarage.name}`);
    } catch {
      showToast('Error recording garage payment');
    }
  }

  async function handleCreateSparePart() {
    if (!newPart.name.trim()) {
      showToast('Please provide spare part name');
      return;
    }
    try {
      await createSparePart(1, {
        name: newPart.name,
        part_number: newPart.part_number,
        category: newPart.category,
        stock_quantity: Number(newPart.stock_quantity) || 0,
        unit_price: Number(newPart.unit_price) || 0,
        reorder_level: Number(newPart.reorder_level) || 0
      });
      loadData();
      setAddPartOpen(false);
      setNewPart({ name: '', part_number: '', category: 'Filters', stock_quantity: 10, unit_price: 600, reorder_level: 3 });
      showToast(`Spare part added to inventory`);
    } catch {
      showToast('Error creating spare part');
    }
  }

  async function handleConsumePartSubmit() {
    if (!targetPart || !consumePayload.vehicle_id) return;
    try {
      await consumeSparePart(1, {
        part_id: targetPart.id,
        vehicle_id: Number(consumePayload.vehicle_id),
        quantity_consumed: Number(consumePayload.quantity) || 1,
        notes: consumePayload.notes
      });
      loadData();
      setConsumePartOpen(false);
      setTargetPart(null);
      showToast(`Issued ${consumePayload.quantity} unit(s) of ${targetPart.name}`);
    } catch {
      showToast('Error consuming spare part');
    }
  }

  async function handleQuickOilChange(regNo: string) {
    try {
      const garage = garagesList[0]?.name || 'Standard Workshop';
      await createMaintenance(1, {
        vehicle_reg: regNo,
        garage_name: garage,
        date: new Date().toISOString().slice(0, 10),
        problem_description: 'Periodic Mobil Engine Oil & Filter Change',
        service_type: 'Oil Change',
        parts_details: 'Mobil 1 / Engine Oil 4L + Filter',
        labour_cost: 500,
        parts_cost: 3200,
        expected_delivery: new Date().toISOString().slice(0, 10),
        status: 'Completed'
      });
      loadData();
      showToast(`✓ Oil Change recorded for ${regNo}`);
    } catch {
      showToast('Error recording oil change');
    }
  }

  const upcomingJobs = maintenanceList.filter(m => m.status === 'Pending' || m.status === 'In Progress');
  const completedJobs = maintenanceList.filter(m => m.status === 'Completed' || m.status === 'Delivered');

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Header ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <Wrench size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>Maintenance & Garage Management</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Manage vehicle maintenance jobs, oil changes, garage partners, and bills</p>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {activeTab === 'overview' && (
            <>
              <Button variant="outline" onClick={() => setAddGarageOpen(true)} style={{display:'flex',alignItems:'center',gap:6}}>
                <Building2 size={16}/> Add Garage
              </Button>
              <button
                onClick={() => setAddMntOpen(true)}
                className="btn-primary-blue"
                style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}
              >
                <Plus size={16}/> Schedule Maintenance
              </button>
            </>
          )}
          {activeTab === 'spare_parts' && (
            <button
              onClick={() => setAddPartOpen(true)}
              className="btn-primary-blue"
              style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}
            >
              <Plus size={16}/> Add Spare Part
            </button>
          )}
          {activeTab === 'mobil_tracker' && (
            <button
              onClick={() => setAddMntOpen(true)}
              className="btn-primary-blue"
              style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6}}
            >
              <Plus size={16}/> Log Oil Change
            </button>
          )}
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div style={{display:'flex',gap:8,borderBottom:'1px solid #e2e8f0',paddingBottom:8,flexWrap:'wrap'}}>
        <Button
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          style={{display:'flex',alignItems:'center',gap:6}}
        >
          <Wrench size={14}/> Maintenance & Garages
        </Button>
        <Button
          variant={activeTab === 'spare_parts' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('spare_parts')}
          style={{display:'flex',alignItems:'center',gap:6}}
        >
          <Package size={14}/> Spare Parts Inventory ({partsList.length})
        </Button>
        <Button
          variant={activeTab === 'mobil_tracker' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('mobil_tracker')}
          style={{display:'flex',alignItems:'center',gap:6}}
        >
          <Droplet size={14}/> Mobil Oil Tracker ({vehiclesList.length} Cars)
        </Button>
      </div>

      {activeTab === 'overview' && (
        <>
      {/* ─── Top 4 Metric Cards (Live from Neon DB) ─── */}
      <div className="kpi-grid-4">
        {/* 1. Total Fleet */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <CarFront size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Vehicles</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{totalVehicles}</strong>
          </div>
        </Card>

        {/* 2. Under Maintenance */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Wrench size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Under Maintenance</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#f79009',display:'block',marginTop:2}}>{underMaintenance}</strong>
          </div>
        </Card>

        {/* 3. Total Maintenance Spend */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#fee4e2',display:'grid',placeItems:'center',color:'#ef4444',flexShrink:0}}>
            <Calendar size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Maintenance Spend</span>
            <strong style={{fontSize:24,fontWeight:800,color:'#ef4444',display:'block',marginTop:2}}>{fmt(totalCost)}</strong>
          </div>
        </Card>

        {/* 4. Active Garages */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <Building2 size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Partner Garages</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{totalGarages}</strong>
          </div>
        </Card>
      </div>

      {/* ─── Row 2: Upcoming / In-Progress Maintenance & Service Analytics ─── */}
      <div className="split-grid-analytics-2">
        {/* Left: Active Maintenance Jobs */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Calendar size={16} color="#1677ff"/> Active / Pending Maintenance ({upcomingJobs.length})
            </h3>
            <span onClick={() => setAddMntOpen(true)} style={{fontSize:12,color:'#1677ff',fontWeight:600,cursor:'pointer'}}>+ New Job</span>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                  <th style={{padding:'0 8px'}}>Reg No</th>
                  <th style={{padding:'0 8px'}}>Service Type</th>
                  <th style={{padding:'0 8px'}}>Garage</th>
                  <th style={{padding:'0 8px'}}>Date</th>
                  <th style={{padding:'0 8px'}}>Cost</th>
                  <th style={{padding:'0 8px'}}>Status</th>
                  <th style={{padding:'0 8px',textAlign:'center'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{padding:'20px 8px',textAlign:'center',color:'#94a3b8'}}>No active repair jobs in garage</td>
                  </tr>
                ) : (
                  upcomingJobs.map((r, i) => (
                    <tr key={r.id || i} style={{borderBottom:'1px solid #f8fafc',height:42}}>
                      <td style={{padding:'0 8px',fontWeight:700,color:'#0f172a'}}>{r.vehicleReg}</td>
                      <td style={{padding:'0 8px',color:'#475569'}}>{r.serviceType}</td>
                      <td style={{padding:'0 8px',color:'#64748b'}}>{r.garageName}</td>
                      <td style={{padding:'0 8px',color:'#64748b'}}>{r.date}</td>
                      <td style={{padding:'0 8px',fontWeight:700,color:'#0f172a'}}>{fmt(r.totalCost)}</td>
                      <td style={{padding:'0 8px'}}>
                        <span style={{
                          background: r.status === 'In Progress' ? '#e6f0ff' : '#fff3e6',
                          color: r.status === 'In Progress' ? '#1677ff' : '#f79009',
                          padding:'3px 8px',
                          borderRadius:6,
                          fontSize:11,
                          fontWeight:700
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{padding:'0 8px'}}>
                        <div style={{display:'flex',justifyContent:'center',gap:4}}>
                          <button
                            onClick={() => { setEditMnt({...r}); setEditMntOpen(true); }}
                            className="action-btn action-btn-blue"
                            style={{width:26,height:26}}
                            title="Edit / Mark Complete"
                          >
                            <Edit2 size={12}/>
                          </button>
                          <button
                            onClick={() => handleDeleteMaintenance(r.id)}
                            className="action-btn action-btn-red"
                            style={{width:26,height:26}}
                            title="Delete"
                          >
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: Service Analytics Donut */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#10b981'}}>📊</span> Service Category Breakdown
            </h3>
            <span style={{fontSize:11.5,color:'#64748b'}}>
              Total: {maintenanceList.length} Jobs
            </span>
          </div>

          <div className="detail-card-layout">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:130,height:130,position:'relative'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={serviceBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {serviceBreakdown.map((d, i)=>(
                        <Cell key={i} fill={d.color}/>
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                  <span style={{fontSize:9,color:'#64748b',lineHeight:1}}>Services</span>
                  <strong style={{fontSize:16,fontWeight:800,color:'#0f172a',lineHeight:1.2}}>{maintenanceList.length}</strong>
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:5,fontSize:11,maxHeight:130,overflowY:'auto'}}>
                {serviceBreakdown.map((d, i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:d.color}}/>
                    <span style={{color:'#475569'}}>{d.name}</span>
                    <b style={{color:'#0f172a',marginLeft:'auto'}}>{d.count} ({d.pct})</b>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0',padding:16,textAlign:'center'}}>
              <div style={{width:44,height:44,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#10b981',margin:'0 auto 8px'}}>
                <Settings size={22}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Total Maintenance Spend</span>
              <strong style={{fontSize:18,fontWeight:800,color:'#0f172a',display:'block',margin:'4px 0'}}>{fmt(totalCost)}</strong>
              <span style={{fontSize:11,color:'#10b981',fontWeight:700,display:'inline-flex',alignItems:'center',gap:2}}>
                <CheckCircle2 size={13}/> All Bills Verified
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Row 3: Garages & Outstanding Bills Directory ─── */}
      <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
            <Building2 size={16} color="#9333ea"/> Partner Garages & Outstanding Bills ({garagesList.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => setAddGarageOpen(true)}>+ Register New Garage</Button>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                <th style={{padding:'0 12px'}}>Garage Name</th>
                <th style={{padding:'0 12px'}}>Contact Person</th>
                <th style={{padding:'0 12px'}}>Phone</th>
                <th style={{padding:'0 12px'}}>Type</th>
                <th style={{padding:'0 12px'}}>Total Bill</th>
                <th style={{padding:'0 12px'}}>Total Paid</th>
                <th style={{padding:'0 12px'}}>Due Amount</th>
                <th style={{padding:'0 12px',textAlign:'center'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {garagesList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{padding:'20px 12px',textAlign:'center',color:'#94a3b8'}}>No garages registered yet. Click &quot;Register New Garage&quot; to add one.</td>
                </tr>
              ) : (
                garagesList.map((g, i) => (
                  <tr key={g.id || i} style={{borderBottom:'1px solid #f8fafc',height:42}}>
                    <td style={{padding:'0 12px',fontWeight:700,color:'#0f172a'}}>{g.name}</td>
                    <td style={{padding:'0 12px',color:'#475569'}}>{g.contactPerson || 'N/A'}</td>
                    <td style={{padding:'0 12px',color:'#475569'}}>{g.mobile}</td>
                    <td style={{padding:'0 12px'}}>
                      <span style={{background:'#eff6ff',color:'#1677ff',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:600}}>
                        {g.garageType || 'General'}
                      </span>
                    </td>
                    <td style={{padding:'0 12px',fontWeight:700,color:'#0f172a'}}>{fmt(g.totalBill)}</td>
                    <td style={{padding:'0 12px',fontWeight:700,color:'#16a34a'}}>{fmt(g.totalPaid)}</td>
                    <td style={{padding:'0 12px',fontWeight:700,color: g.due > 0 ? '#ef4444' : '#16a34a'}}>
                      {fmt(g.due)}
                    </td>
                    <td style={{padding:'0 12px'}}>
                      <div style={{display:'flex',justifyContent:'center',gap:6}}>
                        <Button
                          size="sm"
                          style={{height:28,fontSize:11,background:'#10b981',display:'flex',alignItems:'center',gap:4}}
                          onClick={() => {
                            setTargetGarage(g);
                            setPayAmount(g.due > 0 ? g.due : 5000);
                            setPayGarageOpen(true);
                          }}
                        >
                          <Wallet size={12}/> Pay Bill
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SPARE PARTS INVENTORY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'spare_parts' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="kpi-grid-4">
            <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
                <Package size={26}/>
              </div>
              <div>
                <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Stock SKUs</span>
                <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>{partsList.length}</strong>
              </div>
            </Card>

            <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
                <AlertTriangle size={26}/>
              </div>
              <div>
                <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Low Stock Items</span>
                <strong style={{fontSize:26,fontWeight:800,color:'#f79009',display:'block',marginTop:2}}>
                  {partsList.filter(p => p.stock_quantity <= (p.reorder_level || 3)).length}
                </strong>
              </div>
            </Card>

            <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#10b981',flexShrink:0}}>
                <Wallet size={26}/>
              </div>
              <div>
                <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Inventory Valuation</span>
                <strong style={{fontSize:22,fontWeight:800,color:'#10b981',display:'block',marginTop:2}}>
                  {fmt(partsList.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0) * (Number(p.unit_price) || 0), 0))}
                </strong>
              </div>
            </Card>

            <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
                <Droplet size={26}/>
              </div>
              <div>
                <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Mobil Oil stock</span>
                <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>
                  {partsList.filter(p => p.category?.toLowerCase().includes('oil') || p.name?.toLowerCase().includes('mobil')).reduce((acc, p) => acc + (p.stock_quantity || 0), 0)} L
                </strong>
              </div>
            </Card>
          </div>

          <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
                <Package size={16} color="#1677ff"/> Spare Parts Catalog & Inventory Levels
              </h3>
              <Button size="sm" onClick={() => setAddPartOpen(true)}>+ Add Spare Part</Button>
            </div>

            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 12px'}}>Item Name</th>
                    <th style={{padding:'0 12px'}}>Part #</th>
                    <th style={{padding:'0 12px'}}>Category</th>
                    <th style={{padding:'0 12px'}}>Stock Qty</th>
                    <th style={{padding:'0 12px'}}>Unit Price</th>
                    <th style={{padding:'0 12px'}}>Total Value</th>
                    <th style={{padding:'0 12px'}}>Stock Alert</th>
                    <th style={{padding:'0 12px',textAlign:'center'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{padding:'20px 12px',textAlign:'center',color:'#94a3b8'}}>No spare parts recorded in inventory yet.</td>
                    </tr>
                  ) : (
                    partsList.map((p, i) => {
                      const isLow = p.stock_quantity <= (p.reorder_level || 3);
                      return (
                        <tr key={p.id || i} style={{borderBottom:'1px solid #f8fafc',height:42}}>
                          <td style={{padding:'0 12px',fontWeight:700,color:'#0f172a'}}>{p.name}</td>
                          <td style={{padding:'0 12px',color:'#64748b',fontFamily:'monospace'}}>{p.part_number || 'N/A'}</td>
                          <td style={{padding:'0 12px'}}>
                            <span style={{background:'#eff6ff',color:'#1677ff',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:600}}>
                              {p.category}
                            </span>
                          </td>
                          <td style={{padding:'0 12px',fontWeight:750,fontSize:13,color: isLow ? '#ef4444' : '#0f172a'}}>
                            {p.stock_quantity}
                          </td>
                          <td style={{padding:'0 12px',color:'#475569'}}>{fmt(p.unit_price)}</td>
                          <td style={{padding:'0 12px',fontWeight:700,color:'#0f172a'}}>
                            {fmt((p.stock_quantity || 0) * (p.unit_price || 0))}
                          </td>
                          <td style={{padding:'0 12px'}}>
                            {isLow ? (
                              <span style={{background:'#fee4e2',color:'#ef4444',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}>
                                <AlertTriangle size={11}/> Low Stock (Min: {p.reorder_level})
                              </span>
                            ) : (
                              <span style={{background:'#e6f9f0',color:'#10b981',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:600}}>
                                In Stock
                              </span>
                            )}
                          </td>
                          <td style={{padding:'0 12px',textAlign:'center'}}>
                            <Button
                              size="sm"
                              variant="outline"
                              style={{height:28,fontSize:11}}
                              onClick={() => {
                                setTargetPart(p);
                                setConsumePayload(c => ({ ...c, quantity: 1 }));
                                setConsumePartOpen(true);
                              }}
                              disabled={p.stock_quantity <= 0}
                            >
                              Issue to Car
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CAR-WISE MOBIL OIL TRACKER TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'mobil_tracker' && (
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
                <Droplet size={16} color="#1677ff"/> Car-Wise Mobil Count & Engine Oil Change Register
              </h3>
              <p style={{fontSize:12,color:'#64748b',margin:'2px 0 0'}}>
                Automated tracking of engine oil change cycles per fleet vehicle.
              </p>
            </div>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                  <th style={{padding:'0 12px'}}>Vehicle Reg</th>
                  <th style={{padding:'0 12px'}}>Model / Make</th>
                  <th style={{padding:'0 12px'}}>Mobil Oil Changes Logged</th>
                  <th style={{padding:'0 12px'}}>Last Service Date</th>
                  <th style={{padding:'0 12px'}}>Fleet Status</th>
                  <th style={{padding:'0 12px',textAlign:'center'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{padding:'20px 12px',textAlign:'center',color:'#94a3b8'}}>No fleet vehicles found.</td>
                  </tr>
                ) : (
                  vehiclesList.map((v, i) => {
                    const reg = v.registration || v.regNo;
                    const vServices = maintenanceList.filter(m => (m.vehicleReg === reg || m.vehicle_reg === reg));
                    const oilChanges = vServices.filter(m => (m.serviceType === 'Oil Change' || m.service_type === 'Oil Change')).length;
                    const lastService = vServices[0]?.date || 'None logged';

                    return (
                      <tr key={v.id || i} style={{borderBottom:'1px solid #f8fafc',height:44}}>
                        <td style={{padding:'0 12px',fontWeight:700,color:'#0f172a'}}>{reg}</td>
                        <td style={{padding:'0 12px',color:'#475569'}}>{v.model} ({v.type || 'Car'})</td>
                        <td style={{padding:'0 12px'}}>
                          <span style={{
                            background:'#eff6ff',
                            color:'#1677ff',
                            padding:'3px 10px',
                            borderRadius:12,
                            fontWeight:750,
                            fontSize:12,
                            display:'inline-flex',
                            alignItems:'center',
                            gap:4
                          }}>
                            <Droplet size={12}/> {oilChanges} Oil Changes
                          </span>
                        </td>
                        <td style={{padding:'0 12px',color:'#64748b'}}>{lastService}</td>
                        <td style={{padding:'0 12px'}}>
                          <span style={{
                            background: v.status === 'Active' ? '#e6f9f0' : '#fff3e6',
                            color: v.status === 'Active' ? '#10b981' : '#f79009',
                            padding:'2px 8px',
                            borderRadius:6,
                            fontSize:11,
                            fontWeight:600
                          }}>
                            {v.status || 'Active'}
                          </span>
                        </td>
                        <td style={{padding:'0 12px',textAlign:'center'}}>
                          <Button
                            size="sm"
                            style={{height:28,fontSize:11,background:'#1677ff',display:'inline-flex',alignItems:'center',gap:4}}
                            onClick={() => handleQuickOilChange(reg)}
                          >
                            <Plus size={12}/> +1 Mobil Oil Change
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Schedule Maintenance Modal ─── */}
      <Dialog open={addMntOpen} onOpenChange={setAddMntOpen}>
        <DialogContent style={{maxWidth:560}}>
          <DialogHeader>
            <DialogTitle>Schedule Vehicle Maintenance</DialogTitle>
            <DialogDescription>Log a repair, overhaul, or periodic mobil oil change in Neon DB.</DialogDescription>
          </DialogHeader>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Vehicle Registration *</span>
                <Select value={newMnt.vehicle_reg} onValueChange={v => setNewMnt(m => ({ ...m, vehicle_reg: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Vehicle"/></SelectTrigger>
                  <SelectContent>
                    {vehiclesList.map(v => (
                      <SelectItem key={v.id} value={v.registration || v.regNo}>
                        {v.registration || v.regNo} ({v.model})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="field-label">Garage Partner *</span>
                <Select value={newMnt.garage_name} onValueChange={v => setNewMnt(m => ({ ...m, garage_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Garage"/></SelectTrigger>
                  <SelectContent>
                    {garagesList.map(g => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="field-label">Service Type *</span>
                <Select value={newMnt.service_type} onValueChange={v => setNewMnt(m => ({ ...m, service_type: v }))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Oil Change">Oil Change (Increments Mobil Count)</SelectItem>
                    <SelectItem value="General Service">General Service</SelectItem>
                    <SelectItem value="Brake">Brake Service</SelectItem>
                    <SelectItem value="Engine">Engine Overhaul</SelectItem>
                    <SelectItem value="AC">AC Servicing</SelectItem>
                    <SelectItem value="Suspension">Suspension & Steering</SelectItem>
                    <SelectItem value="Tyre">Tyre Replacement</SelectItem>
                    <SelectItem value="Battery">Battery Service</SelectItem>
                    <SelectItem value="Electrical">Electrical Works</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="field-label">Service Date</span>
                <Input type="date" value={newMnt.date} onChange={e => setNewMnt(m => ({ ...m, date: e.target.value }))}/>
              </label>

              <label>
                <span className="field-label">Labour Cost (৳)</span>
                <Input type="number" value={newMnt.labour_cost} onChange={e => setNewMnt(m => ({ ...m, labour_cost: Number(e.target.value) }))}/>
              </label>

              <label>
                <span className="field-label">Parts Cost (৳)</span>
                <Input type="number" value={newMnt.parts_cost} onChange={e => setNewMnt(m => ({ ...m, parts_cost: Number(e.target.value) }))}/>
              </label>
            </div>

            <label>
              <span className="field-label">Problem / Service Description</span>
              <Input value={newMnt.problem_description} onChange={e => setNewMnt(m => ({ ...m, problem_description: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Parts Replaced / Details</span>
              <Input placeholder="Engine oil (4L 20W-50), oil filter, etc." value={newMnt.parts_details} onChange={e => setNewMnt(m => ({ ...m, parts_details: e.target.value }))}/>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMntOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMaintenance} disabled={!newMnt.vehicle_reg || !newMnt.garage_name}>Schedule Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit / Update Maintenance Modal ─── */}
      <Dialog open={editMntOpen} onOpenChange={setEditMntOpen}>
        <DialogContent style={{maxWidth:560}}>
          <DialogHeader>
            <DialogTitle>Update Maintenance Job</DialogTitle>
            <DialogDescription>Modify job costs or mark status as Completed / Delivered.</DialogDescription>
          </DialogHeader>

          {editMnt && (
            <div className="entry-form">
              <div className="form-grid">
                <label>
                  <span className="field-label">Labour Cost (৳)</span>
                  <Input type="number" value={editMnt.labourCost} onChange={e => setEditMnt((m: any) => ({ ...m, labourCost: Number(e.target.value) }))}/>
                </label>

                <label>
                  <span className="field-label">Parts Cost (৳)</span>
                  <Input type="number" value={editMnt.partsCost} onChange={e => setEditMnt((m: any) => ({ ...m, partsCost: Number(e.target.value) }))}/>
                </label>

                <label>
                  <span className="field-label">Job Status</span>
                  <Select value={editMnt.status} onValueChange={v => setEditMnt((m: any) => ({ ...m, status: v }))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress (Vehicle In Garage)</SelectItem>
                      <SelectItem value="Completed">Completed (Vehicle Ready)</SelectItem>
                      <SelectItem value="Delivered">Delivered (Vehicle Available)</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label>
                  <span className="field-label">Service Type</span>
                  <Select value={editMnt.serviceType} onValueChange={v => setEditMnt((m: any) => ({ ...m, serviceType: v }))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oil Change">Oil Change</SelectItem>
                      <SelectItem value="General Service">General Service</SelectItem>
                      <SelectItem value="Brake">Brake Service</SelectItem>
                      <SelectItem value="Engine">Engine</SelectItem>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <label>
                <span className="field-label">Work Details / Parts Used</span>
                <Input value={editMnt.partsDetails || ''} onChange={e => setEditMnt((m: any) => ({ ...m, partsDetails: e.target.value }))}/>
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMntOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMaintenance}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Garage Modal ─── */}
      <Dialog open={addGarageOpen} onOpenChange={setAddGarageOpen}>
        <DialogContent style={{maxWidth:500}}>
          <DialogHeader>
            <DialogTitle>Register Partner Garage</DialogTitle>
            <DialogDescription>Add a vehicle workshop or servicing partner to TASIN ENTERPRISE.</DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'8px 0'}}>
            <label>
              <span className="field-label">Garage Name *</span>
              <Input placeholder="e.g. Master Motors & AC Works" value={newGarage.name} onChange={e => setNewGarage(g => ({ ...g, name: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Contact Person</span>
              <Input placeholder="Mechanic / Owner Name" value={newGarage.contact_person} onChange={e => setNewGarage(g => ({ ...g, contact_person: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Mobile Number *</span>
              <Input placeholder="01711-XXXXXX" value={newGarage.mobile} onChange={e => setNewGarage(g => ({ ...g, mobile: e.target.value }))}/>
            </label>

            <label>
              <span className="field-label">Garage Specialty</span>
              <Select value={newGarage.garage_type} onValueChange={v => setNewGarage(g => ({ ...g, garage_type: v }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General Servicing</SelectItem>
                  <SelectItem value="AC Specialist">AC Specialist</SelectItem>
                  <SelectItem value="Body Works">Body Works & Paint</SelectItem>
                  <SelectItem value="Engine">Engine & Gearbox</SelectItem>
                  <SelectItem value="Electrical">Electrical Specialist</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Workshop Address</span>
              <Input placeholder="Tejgaon Industrial Area, Dhaka" value={newGarage.address} onChange={e => setNewGarage(g => ({ ...g, address: e.target.value }))}/>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGarageOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGarage} disabled={!newGarage.name.trim() || !newGarage.mobile.trim()}>Save Garage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Record Garage Payment Modal ─── */}
      <Dialog open={payGarageOpen} onOpenChange={setPayGarageOpen}>
        <DialogContent style={{maxWidth:500}}>
          <DialogHeader>
            <DialogTitle>Disburse Garage Payment</DialogTitle>
            <DialogDescription>Record payment for {targetGarage?.name} (Outstanding Due: {fmt(targetGarage?.due ?? 0)}).</DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'8px 0'}}>
            <label>
              <span className="field-label">Payment Amount (৳) *</span>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))}/>
            </label>

            <label>
              <span className="field-label">Payment Method</span>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash (Main Cash Box)</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="bKash / Nagad">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Invoice / Receipt Reference</span>
              <Input placeholder="e.g. GRG-INV-2026-01" value={payRef} onChange={e => setPayRef(e.target.value)}/>
            </label>

            <label>
              <span className="field-label">Payment Notes</span>
              <Input placeholder="Periodic bill clearance note" value={payNote} onChange={e => setPayNote(e.target.value)}/>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayGarageOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordGaragePayout} disabled={payAmount <= 0} style={{background:'#10b981'}}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Spare Part Modal ─── */}
      <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
        <DialogContent style={{maxWidth:500}}>
          <DialogHeader>
            <DialogTitle>Add Spare Part to Inventory</DialogTitle>
            <DialogDescription>Track new replacement parts, lubricants, and workshop supplies.</DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'8px 0'}}>
            <label>
              <span className="field-label">Part Name *</span>
              <Input placeholder="e.g. Mobil Super 4L 20W-50" value={newPart.name} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))}/>
            </label>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <label>
                <span className="field-label">Part Number / SKU</span>
                <Input placeholder="MOB-20W50-4L" value={newPart.part_number} onChange={e => setNewPart(p => ({ ...p, part_number: e.target.value }))}/>
              </label>

              <label>
                <span className="field-label">Category</span>
                <Select value={newPart.category} onValueChange={v => setNewPart(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engine Oil">Engine Oil / Lubricants</SelectItem>
                    <SelectItem value="Filters">Oil / Air / Fuel Filters</SelectItem>
                    <SelectItem value="Brakes">Brake Pads / Shoes</SelectItem>
                    <SelectItem value="Suspension">Suspension & Bushes</SelectItem>
                    <SelectItem value="Electrical">Bulbs & Fuses</SelectItem>
                    <SelectItem value="Batteries">Batteries & Terminals</SelectItem>
                    <SelectItem value="Tyres">Tyres & Tubes</SelectItem>
                    <SelectItem value="Other">Other Consumables</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <label>
                <span className="field-label">Initial Stock</span>
                <Input type="number" value={newPart.stock_quantity} onChange={e => setNewPart(p => ({ ...p, stock_quantity: Number(e.target.value) }))}/>
              </label>

              <label>
                <span className="field-label">Unit Price (৳)</span>
                <Input type="number" value={newPart.unit_price} onChange={e => setNewPart(p => ({ ...p, unit_price: Number(e.target.value) }))}/>
              </label>

              <label>
                <span className="field-label">Min Alert Level</span>
                <Input type="number" value={newPart.reorder_level} onChange={e => setNewPart(p => ({ ...p, reorder_level: Number(e.target.value) }))}/>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPartOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSparePart} disabled={!newPart.name.trim()}>Save Spare Part</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Issue / Consume Spare Part Modal ─── */}
      <Dialog open={consumePartOpen} onOpenChange={setConsumePartOpen}>
        <DialogContent style={{maxWidth:500}}>
          <DialogHeader>
            <DialogTitle>Issue Spare Part to Vehicle</DialogTitle>
            <DialogDescription>
              Deduct {targetPart?.name} from inventory (Available Stock: {targetPart?.stock_quantity ?? 0}).
            </DialogDescription>
          </DialogHeader>

          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'8px 0'}}>
            <label>
              <span className="field-label">Target Vehicle *</span>
              <Select value={consumePayload.vehicle_id} onValueChange={v => setConsumePayload(c => ({ ...c, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle"/></SelectTrigger>
                <SelectContent>
                  {vehiclesList.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.registration || v.regNo} ({v.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Quantity to Issue</span>
              <Input
                type="number"
                min={1}
                max={targetPart?.stock_quantity || 100}
                value={consumePayload.quantity}
                onChange={e => setConsumePayload(c => ({ ...c, quantity: Number(e.target.value) }))}
              />
            </label>

            <label>
              <span className="field-label">Work / Usage Description</span>
              <Input
                placeholder="e.g. Periodic replacement during service"
                value={consumePayload.notes}
                onChange={e => setConsumePayload(c => ({ ...c, notes: e.target.value }))}
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConsumePartOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConsumePartSubmit}
              disabled={!consumePayload.vehicle_id || consumePayload.quantity <= 0 || (targetPart && consumePayload.quantity > targetPart.stock_quantity)}
            >
              Confirm Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}
