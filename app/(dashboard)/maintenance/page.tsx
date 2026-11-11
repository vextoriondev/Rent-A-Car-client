"use client";
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {fetchMaintenance, createMaintenance, fetchGarages} from '@/lib/api';
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
  X
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {ResponsiveContainer,PieChart,Pie,Cell,Tooltip} from 'recharts';

const fmt=(n:number)=>'৳ '+n.toLocaleString('en-US');

const SERVICE_DONUT = [
  { name: 'Oil Change', count: 40, pct: '33.3%', color: '#1677ff' },
  { name: 'Brake Service', count: 32, pct: '26.7%', color: '#10b981' },
  { name: 'Tire Service', count: 28, pct: '23.3%', color: '#f97316' },
  { name: 'Others', count: 20, pct: '16.7%', color: '#8b5cf6' },
];

export default function MaintenancePage(){
  const [addOpen,setAddOpen]=useState(false);
  const [newMnt,setNewMnt]=useState({vehicleNo:'Dhaka Metro-GA-12-3456',serviceType:'Engine Oil Change',dueDate:new Date().toISOString().slice(0,10),status:'Pending'});
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  useEffect(()=>{
    fetchMaintenance(1).catch(()=>{});
    fetchGarages(1).catch(()=>{});
  },[]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ─── Page Title Header matching Screenshot 4 ─── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff'}}>
            <Wrench size={26}/>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,lineHeight:1.2}}>Maintenance & Garage</h1>
            <p style={{fontSize:12.5,color:'#64748b',margin:'2px 0 0'}}>Manage vehicle maintenance, garage services and service history</p>
          </div>
        </div>

        <button
          onClick={()=>setAddOpen(true)}
          className="btn-primary-blue"
          style={{height:40,borderRadius:8,padding:'0 20px',fontSize:13,fontWeight:700}}
        >
          <Plus size={16}/> Add Maintenance
        </button>
      </div>

      {/* ─── Top 4 Metric Cards matching Screenshot 4 ─── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
        {/* 1. Total Vehicles */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f0ff',display:'grid',placeItems:'center',color:'#1677ff',flexShrink:0}}>
            <CarFront size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Total Vehicles</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>200</strong>
          </div>
        </Card>

        {/* 2. Under Maintenance */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#12b76a',flexShrink:0}}>
            <Wrench size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Under Maintenance</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>12</strong>
          </div>
        </Card>

        {/* 3. Next Service Due */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#fff3e6',display:'grid',placeItems:'center',color:'#f79009',flexShrink:0}}>
            <Calendar size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Next Service Due</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>18</strong>
          </div>
        </Card>

        {/* 4. Garage Services */}
        <Card style={{padding:'14px 18px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#f3e8ff',display:'grid',placeItems:'center',color:'#9333ea',flexShrink:0}}>
            <Building2 size={26}/>
          </div>
          <div>
            <span style={{fontSize:11.5,color:'#64748b',fontWeight:600,display:'block'}}>Garage Services</span>
            <strong style={{fontSize:26,fontWeight:800,color:'#0f172a',display:'block',marginTop:2}}>25</strong>
          </div>
        </Card>
      </div>

      {/* ─── Row 2: Upcoming Maintenance & Recent Maintenance matching Screenshot 4 ─── */}
      <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:14}}>
        {/* Left: Upcoming Maintenance */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Calendar size={16} color="#1677ff"/> Upcoming Maintenance
            </h3>
            <span style={{fontSize:12,color:'#1677ff',fontWeight:600,cursor:'pointer'}}>View All →</span>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                  <th style={{padding:'0 8px',width:30}}>#</th>
                  <th style={{padding:'0 8px'}}>Vehicle No</th>
                  <th style={{padding:'0 8px'}}>Service Type</th>
                  <th style={{padding:'0 8px'}}>Due Date</th>
                  <th style={{padding:'0 8px'}}>Status</th>
                  <th style={{padding:'0 8px',textAlign:'center'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id:1, vNo:'Dhaka Metro-GA-12-3456', type:'Engine Oil Change', due:'15 Nov 2026', status:'Pending', bg:'#fff3e6', color:'#f79009' },
                  { id:2, vNo:'Dhaka Metro-GA-13-7890', type:'Brake Check', due:'18 Nov 2026', status:'Due Soon', bg:'#fef9c3', color:'#a16207' },
                  { id:3, vNo:'Dhaka Metro-GA-14-2468', type:'Tire Check', due:'20 Nov 2026', status:'Scheduled', bg:'#e6f0ff', color:'#1677ff' },
                  { id:4, vNo:'Dhaka Metro-GA-15-1357', type:'AC Service', due:'25 Nov 2026', status:'Scheduled', bg:'#e6f0ff', color:'#1677ff' },
                  { id:5, vNo:'Dhaka Metro-GA-16-9753', type:'Full Service', due:'28 Nov 2026', status:'Pending', bg:'#fff3e6', color:'#f79009' },
                ].map(r=>(
                  <tr key={r.id} style={{borderBottom:'1px solid #f8fafc',height:42}}>
                    <td style={{padding:'0 8px',color:'#64748b'}}>{r.id}</td>
                    <td style={{padding:'0 8px',fontWeight:700,color:'#0f172a'}}>{r.vNo}</td>
                    <td style={{padding:'0 8px',color:'#475569'}}>{r.type}</td>
                    <td style={{padding:'0 8px',color:'#64748b'}}>{r.due}</td>
                    <td style={{padding:'0 8px'}}>
                      <span style={{background:r.bg,color:r.color,padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{padding:'0 8px'}}>
                      <div style={{display:'flex',justifyContent:'center',gap:4}}>
                        <button className="action-btn action-btn-blue" style={{width:26,height:26}}>
                          <Edit2 size={12}/>
                        </button>
                        <button className="action-btn action-btn-red" style={{width:26,height:26}}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: Recent Maintenance */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Clock size={16} color="#10b981"/> Recent Maintenance
            </h3>
            <span style={{fontSize:12,color:'#1677ff',fontWeight:600,cursor:'pointer'}}>View All →</span>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                  <th style={{padding:'0 8px',width:30}}>#</th>
                  <th style={{padding:'0 8px'}}>Vehicle No</th>
                  <th style={{padding:'0 8px'}}>Service</th>
                  <th style={{padding:'0 8px'}}>Date</th>
                  <th style={{padding:'0 8px',textAlign:'right'}}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id:1, vNo:'Dhaka Metro-GA-12-3456', srv:'Oil Change', date:'01 Nov 2026', cost:2500 },
                  { id:2, vNo:'Dhaka Metro-GA-13-7890', srv:'Brake Repair', date:'28 Oct 2026', cost:5000 },
                  { id:3, vNo:'Dhaka Metro-GA-14-2468', srv:'Tire Change', date:'25 Oct 2026', cost:6000 },
                  { id:4, vNo:'Dhaka Metro-GA-15-1357', srv:'AC Service', date:'20 Oct 2026', cost:4000 },
                  { id:5, vNo:'Dhaka Metro-GA-16-9753', srv:'Engine Service', date:'18 Oct 2026', cost:5500 },
                ].map(r=>(
                  <tr key={r.id} style={{borderBottom:'1px solid #f8fafc',height:42}}>
                    <td style={{padding:'0 8px',color:'#64748b'}}>{r.id}</td>
                    <td style={{padding:'0 8px',fontWeight:700,color:'#0f172a'}}>{r.vNo}</td>
                    <td style={{padding:'0 8px',color:'#475569'}}>{r.srv}</td>
                    <td style={{padding:'0 8px',color:'#64748b'}}>{r.date}</td>
                    <td style={{padding:'0 8px',textAlign:'right',fontWeight:700,color:'#0f172a'}}>{fmt(r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ─── Row 3: Garage Stock & Service Analytics matching Screenshot 4 ─── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr',gap:14}}>
        {/* Left: Garage Stock */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <Package size={16} color="#8b5cf6"/> Garage Stock
            </h3>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                  <th style={{padding:'0 8px',width:40}}>#</th>
                  <th style={{padding:'0 8px'}}>Item Name</th>
                  <th style={{padding:'0 8px'}}>Quantity</th>
                  <th style={{padding:'0 8px'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id:1, name:'Engine Oil', qty:10, status:'In Stock', bg:'#e6f9f0', color:'#12b76a' },
                  { id:2, name:'Brake Pad', qty:8, status:'In Stock', bg:'#e6f9f0', color:'#12b76a' },
                  { id:3, name:'Tire', qty:12, status:'In Stock', bg:'#e6f9f0', color:'#12b76a' },
                  { id:4, name:'Battery', qty:6, status:'Low Stock', bg:'#fff3e6', color:'#f79009' },
                  { id:5, name:'Air Filter', qty:20, status:'In Stock', bg:'#e6f9f0', color:'#12b76a' },
                  { id:6, name:'Coolant', qty:8, status:'In Stock', bg:'#e6f9f0', color:'#12b76a' },
                ].map(item=>(
                  <tr key={item.id} style={{borderBottom:'1px solid #f8fafc',height:38}}>
                    <td style={{padding:'0 8px',color:'#64748b'}}>{item.id}</td>
                    <td style={{padding:'0 8px',fontWeight:600,color:'#0f172a'}}>{item.name}</td>
                    <td style={{padding:'0 8px',fontWeight:700,color:'#0f172a'}}>{item.qty}</td>
                    <td style={{padding:'0 8px'}}>
                      <span style={{background:item.bg,color:item.color,padding:'2px 8px',borderRadius:6,fontSize:10.5,fontWeight:700}}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: Service Analytics Donut & Summary Box */}
        <Card style={{padding:16,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#0f172a',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#10b981'}}>📊</span> Service Analytics
            </h3>
            <span style={{fontSize:11.5,color:'#64748b',border:'1px solid #cbd5e1',borderRadius:6,padding:'3px 8px'}}>
              Last 6 Months ▾
            </span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:14,alignItems:'center'}}>
            {/* Donut chart + Legend */}
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:130,height:130,position:'relative'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={SERVICE_DONUT} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {SERVICE_DONUT.map((d)=>(
                        <Cell key={d.name} fill={d.color}/>
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                  <span style={{fontSize:9,color:'#64748b',lineHeight:1}}>Total Services</span>
                  <strong style={{fontSize:16,fontWeight:800,color:'#0f172a',lineHeight:1.2}}>120</strong>
                </div>
              </div>

              {/* Legend List */}
              <div style={{display:'flex',flexDirection:'column',gap:5,fontSize:11}}>
                {SERVICE_DONUT.map(d=>(
                  <div key={d.name} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:d.color}}/>
                    <span style={{color:'#475569'}}>{d.name}</span>
                    <b style={{color:'#0f172a',marginLeft:'auto'}}>{d.count} ({d.pct})</b>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Summary Box with Green Gear */}
            <div style={{background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0',padding:16,textAlign:'center'}}>
              <div style={{width:44,height:44,borderRadius:10,background:'#e6f9f0',display:'grid',placeItems:'center',color:'#10b981',margin:'0 auto 8px'}}>
                <Settings size={22}/>
              </div>
              <span style={{fontSize:11,color:'#64748b',display:'block'}}>Total Maintenance Cost</span>
              <strong style={{fontSize:18,fontWeight:800,color:'#0f172a',display:'block',margin:'4px 0'}}>৳ 95,000</strong>
              <span style={{fontSize:11,color:'#10b981',fontWeight:700,display:'inline-flex',alignItems:'center',gap:2}}>
                <ArrowUpRight size={13}/> 12% vs last month
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Maintenance Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{maxWidth:540}}>
          <DialogHeader>
            <DialogTitle>Schedule Vehicle Maintenance</DialogTitle>
            <DialogDescription>Log a new repair or periodic servicing job.</DialogDescription>
          </DialogHeader>

          <div className="entry-form">
            <div className="form-grid">
              <label>
                <span className="field-label">Vehicle Registration No.</span>
                <Input value={newMnt.vehicleNo} onChange={e=>setNewMnt(m=>({...m,vehicleNo:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Service Type</span>
                <Select value={newMnt.serviceType} onValueChange={v=>setNewMnt(m=>({...m,serviceType:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engine Oil Change">Engine Oil Change</SelectItem>
                    <SelectItem value="Brake Check">Brake Check</SelectItem>
                    <SelectItem value="Tire Check">Tire Check</SelectItem>
                    <SelectItem value="AC Service">AC Service</SelectItem>
                    <SelectItem value="Full Service">Full Service</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="field-label">Due Date</span>
                <Input type="date" value={newMnt.dueDate} onChange={e=>setNewMnt(m=>({...m,dueDate:e.target.value}))}/>
              </label>

              <label>
                <span className="field-label">Status</span>
                <Select value={newMnt.status} onValueChange={v=>setNewMnt(m=>({...m,status:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Due Soon">Due Soon</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
            <Button onClick={()=>{
              createMaintenance(1, {
                vehicle_reg: newMnt.vehicleNo,
                service_type: newMnt.serviceType,
                due_date: newMnt.dueDate,
                status: newMnt.status,
                garage_name: 'City Auto Works',
                cost: 5000,
              }).catch(()=>{});
              setAddOpen(false);
              showToast('Maintenance scheduled successfully');
            }}>Save Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}
