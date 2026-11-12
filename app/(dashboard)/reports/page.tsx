"use client";
import {useState, useEffect, useMemo} from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  TrendingUp,
  CarFront,
  Building2,
  Users,
  Briefcase,
  Wrench,
  DollarSign,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  fetchDashboardKpis,
  fetchVehicles,
  fetchOwners,
  fetchClients,
  fetchDrivers,
  fetchMaintenance,
  fetchFinancialAccounts
} from '@/lib/api';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,Legend,PieChart,Pie,Cell} from 'recharts';

const fmt=(n:number)=>'৳'+(Number(n)||0).toLocaleString('en-US');
const COLORS=['#236d80','#d4a971','#529e72','#a869a8','#e07a5f','#3d5a80'];

export default function ReportsPage(){
  const [periodF,setPeriodF]=useState<'Daily'|'Weekly'|'Monthly'|'Yearly'>('Monthly');
  const [activeTab,setActiveTab]=useState('financial');
  const [kpis,setKpis]=useState<any>(null);
  const [vehicles,setVehicles]=useState<any[]>([]);
  const [owners,setOwners]=useState<any[]>([]);
  const [clients,setClients]=useState<any[]>([]);
  const [drivers,setDrivers]=useState<any[]>([]);
  const [maintenance,setMaintenance]=useState<any[]>([]);
  const [accounts,setAccounts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const [kRes, vRes, oRes, cRes, dRes, mRes, aRes] = await Promise.all([
        fetchDashboardKpis(1, periodF),
        fetchVehicles(1),
        fetchOwners(1),
        fetchClients(1),
        fetchDrivers(1),
        fetchMaintenance(1),
        fetchFinancialAccounts(1)
      ]);
      if (kRes) setKpis(kRes);
      if (Array.isArray(vRes)) setVehicles(vRes);
      if (Array.isArray(oRes)) setOwners(oRes);
      if (Array.isArray(cRes)) setClients(cRes);
      if (Array.isArray(dRes)) setDrivers(dRes);
      if (Array.isArray(mRes)) setMaintenance(mRes);
      if (Array.isArray(aRes)) setAccounts(aRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    loadAllReports();
  }, [periodF]);

  const totalRevenue = kpis?.financials?.totalRevenue || 0;
  const totalExpense = kpis?.financials?.totalExpenses || 0;
  const netProfit = kpis?.financials?.netProfit || (totalRevenue - totalExpense);
  const customerReceivable = kpis?.financials?.customerReceivable || clients.reduce((s,c)=>s+(c.due||0),0);
  const ownerPayable = kpis?.financials?.ownerPayable || owners.reduce((s,o)=>s+(o.due||0),0);

  const rawChart = kpis?.monthlyChart || kpis?.chartData || [];
  const chartData = rawChart.map((m: any) => ({
    month: m.month,
    income: Number(m.income || 0),
    expenses: Number(m.expenses || 0),
    profit: Number(m.profit || 0),
  }));

  const handleExportCSV = () => {
    let filename = `report_${activeTab}_${periodF}.csv`;
    let content = "";

    if (activeTab === 'financial') {
      content = "Month,Income,Expense,Profit\n" +
        chartData.map((c: any) => `${c.month},${c.income},${c.expenses},${c.profit}`).join("\n");
    } else if (activeTab === 'vehicles') {
      content = "RegNo,Brand,Model,Owner,Driver,Status,MonthlyRent\n" +
        vehicles.map(v => `${v.regNo || v.registration},${v.brand},${v.model},"${v.owner}","${v.driver || ''}",${v.status},${v.monthlyRent}`).join("\n");
    } else if (activeTab === 'owners') {
      content = "Name,Phone,VehiclesCount,TotalRent,TotalPaid,Due\n" +
        owners.map(o => `"${o.name}",${o.mobile || o.phone},${o.totalVehicles || 1},${o.totalRent},${o.totalPaid},${o.due}`).join("\n");
    } else if (activeTab === 'clients') {
      content = "ClientName,ContactPerson,Mobile,Receivable,Collected,Due\n" +
        clients.map(c => `"${c.name}","${c.contactPerson || ''}",${c.mobile},${c.totalReceivable},${c.totalCollected},${c.due}`).join("\n");
    } else if (activeTab === 'drivers') {
      content = "Name,Mobile,License,Salary,Paid,Due\n" +
        drivers.map(d => `"${d.name}",${d.mobile || d.phone},${d.licenseNo || ''},${d.monthlySalary || 18000},${d.totalPaid || 0},${d.remainingDue || 0}`).join("\n");
    } else if (activeTab === 'maintenance') {
      content = "VehicleReg,Garage,ServiceType,Date,Cost,Status\n" +
        maintenance.map(m => `${m.vehicleReg},"${m.garageName}",${m.serviceType},${m.date},${m.totalCost},${m.status}`).join("\n");
    }

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${activeTab} report to CSV`);
  };

  return (
    <>
      {/* Page Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947',marginBottom:4}}>Reports & Analytics</h1>
          <p style={{fontSize:13,color:'#6a7c83'}}>Comprehensive financial, operational, and fleet performance reporting from Neon DB.</p>
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Select value={periodF} onValueChange={(v: any) => setPeriodF(v)}>
            <SelectTrigger style={{minWidth:140}}><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => window.print()}>
            <Download size={15}/> PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileSpreadsheet size={15}/> Excel / CSV
          </Button>
          <Button variant="outline" onClick={()=>window.print()}>
            <Printer size={15}/> Print
          </Button>
        </div>
      </div>

      {/* Metric Highlights (Live from Neon DB) */}
      <div className="kpi-grid-5" style={{marginBottom:16}}>
        {[
          {label:'Total Revenue',value:fmt(totalRevenue),color:'blue',icon:TrendingUp},
          {label:'Total Expenditure',value:fmt(totalExpense),color:'gold',icon:DollarSign},
          {label:'Net Operating Profit',value:fmt(netProfit),color:'blue',icon:TrendingUp},
          {label:'Customer Receivables',value:fmt(customerReceivable),color:'gold',icon:Briefcase},
          {label:'Owner Payables Due',value:fmt(ownerPayable),color:'purple',icon:Building2},
        ].map(c=>{
          const Icon=c.icon;
          return (
            <Card key={c.label} className="metric">
              <div className="metric-top">
                <span>{c.label}</span>
                <span className={`metric-icon ${c.color}`}><Icon size={17}/></span>
              </div>
              <strong className="nums" style={{fontSize:20}}>{c.value}</strong>
            </Card>
          );
        })}
      </div>

      {/* Tabs for Different Report Modules */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{marginBottom:16,display:'flex',gap:6,overflowX:'auto',maxWidth:'100%',whiteSpace:'nowrap',paddingBottom:4}}>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Fleet Performance ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="owners">Owner Statements ({owners.length})</TabsTrigger>
          <TabsTrigger value="clients">Client Invoicing & Due ({clients.length})</TabsTrigger>
          <TabsTrigger value="drivers">Driver Payroll ({drivers.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Garages ({maintenance.length})</TabsTrigger>
        </TabsList>

        {/* 1. Financial Overview */}
        <TabsContent value="financial">
          <div className="split-grid-analytics-2" style={{marginBottom:16}}>
            <Card style={{padding:16}}>
              <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:14}}>Period Income vs Expense Trend (Live Neon DB)</h3>
              <div style={{width:'100%',height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" stroke="#6a7c83" fontSize={11}/>
                    <YAxis stroke="#6a7c83" fontSize={11} tickFormatter={(v)=>`${v/1000}k`}/>
                    <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Amount']}/>
                    <Legend/>
                    <Bar dataKey="income" name="Income" fill="#236d80" radius={[4,4,0,0]}/>
                    <Bar dataKey="expenses" name="Expense" fill="#d4a971" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card style={{padding:16}}>
              <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:14}}>Account Balances</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {accounts.map(a=>(
                  <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0'}}>
                    <div>
                      <strong style={{fontSize:13,color:'#0f172a'}}>{a.name}</strong>
                      <span style={{fontSize:11,color:'#64748b',display:'block'}}>{a.type} {a.bankName ? `• ${a.bankName}` : ''}</span>
                    </div>
                    <strong style={{fontSize:14,color:'#1677ff'}}>{fmt(a.currentBalance)}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Vehicles Fleet Performance */}
        <TabsContent value="vehicles">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Fleet Roster & Status ({vehicles.length} Vehicles)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Reg No</th>
                    <th style={{padding:'0 8px'}}>Brand & Model</th>
                    <th style={{padding:'0 8px'}}>Owner</th>
                    <th style={{padding:'0 8px'}}>Driver</th>
                    <th style={{padding:'0 8px'}}>Status</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Monthly Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i)=>(
                    <tr key={v.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700,color:'#1677ff'}}>{v.regNo || v.registration}</td>
                      <td style={{padding:'0 8px'}}>{v.brand} {v.model}</td>
                      <td style={{padding:'0 8px'}}>{v.owner}</td>
                      <td style={{padding:'0 8px'}}>{v.driver || 'Unassigned'}</td>
                      <td style={{padding:'0 8px'}}><span className="badge badge-good">{v.status}</span></td>
                      <td style={{padding:'0 8px',textAlign:'right',fontWeight:700}}>{fmt(v.monthlyRent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 3. Owner Statements */}
        <TabsContent value="owners">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Owner Payables & Dues ({owners.length} Owners)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Owner Name</th>
                    <th style={{padding:'0 8px'}}>Phone</th>
                    <th style={{padding:'0 8px'}}>Cars</th>
                    <th style={{padding:'0 8px'}}>Monthly Rent</th>
                    <th style={{padding:'0 8px'}}>Total Paid</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Outstanding Due</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o, i)=>(
                    <tr key={o.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700}}>{o.name}</td>
                      <td style={{padding:'0 8px'}}>{o.mobile || o.phone}</td>
                      <td style={{padding:'0 8px'}}>{o.totalVehicles || 1}</td>
                      <td style={{padding:'0 8px',fontWeight:700}}>{fmt(o.totalRent)}</td>
                      <td style={{padding:'0 8px',color:'#16a34a',fontWeight:700}}>{fmt(o.totalPaid)}</td>
                      <td style={{padding:'0 8px',textAlign:'right',color: o.due > 0 ? '#ef4444' : '#16a34a',fontWeight:800}}>{fmt(o.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 4. Client Invoicing & Due */}
        <TabsContent value="clients">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Client Receivables ({clients.length} Clients)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Client / Company</th>
                    <th style={{padding:'0 8px'}}>Contact Person</th>
                    <th style={{padding:'0 8px'}}>Phone</th>
                    <th style={{padding:'0 8px'}}>Total Invoiced</th>
                    <th style={{padding:'0 8px'}}>Collected</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Receivable Due</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i)=>(
                    <tr key={c.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700}}>{c.name}</td>
                      <td style={{padding:'0 8px'}}>{c.contactPerson || '—'}</td>
                      <td style={{padding:'0 8px'}}>{c.mobile}</td>
                      <td style={{padding:'0 8px',fontWeight:700}}>{fmt(c.totalReceivable)}</td>
                      <td style={{padding:'0 8px',color:'#16a34a',fontWeight:700}}>{fmt(c.totalCollected)}</td>
                      <td style={{padding:'0 8px',textAlign:'right',color: c.due > 0 ? '#ef4444' : '#16a34a',fontWeight:800}}>{fmt(c.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 5. Driver Payroll */}
        <TabsContent value="drivers">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Driver Payroll Roster ({drivers.length} Drivers)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Driver Name</th>
                    <th style={{padding:'0 8px'}}>Mobile</th>
                    <th style={{padding:'0 8px'}}>License</th>
                    <th style={{padding:'0 8px'}}>Monthly Salary</th>
                    <th style={{padding:'0 8px'}}>Total Paid</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Remaining Due</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d, i)=>(
                    <tr key={d.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700}}>{d.name}</td>
                      <td style={{padding:'0 8px'}}>{d.mobile || d.phone}</td>
                      <td style={{padding:'0 8px'}}>{d.licenseNo || '—'}</td>
                      <td style={{padding:'0 8px',fontWeight:700}}>{fmt(d.monthlySalary || 18000)}</td>
                      <td style={{padding:'0 8px',color:'#16a34a',fontWeight:700}}>{fmt(d.totalPaid || 0)}</td>
                      <td style={{padding:'0 8px',textAlign:'right',color: (d.remainingDue || 0) > 0 ? '#ef4444' : '#16a34a',fontWeight:800}}>{fmt(d.remainingDue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 6. Maintenance & Garages */}
        <TabsContent value="maintenance">
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:750,color:'#1e3947',marginBottom:12}}>Maintenance Logs ({maintenance.length} Records)</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #f1f5f9',color:'#64748b',fontWeight:700,height:36}}>
                    <th style={{padding:'0 8px'}}>Vehicle Reg</th>
                    <th style={{padding:'0 8px'}}>Garage</th>
                    <th style={{padding:'0 8px'}}>Service Type</th>
                    <th style={{padding:'0 8px'}}>Date</th>
                    <th style={{padding:'0 8px'}}>Status</th>
                    <th style={{padding:'0 8px',textAlign:'right'}}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m, i)=>(
                    <tr key={m.id || i} style={{borderBottom:'1px solid #f8fafc',height:40}}>
                      <td style={{padding:'0 8px',fontWeight:700,color:'#1677ff'}}>{m.vehicleReg}</td>
                      <td style={{padding:'0 8px'}}>{m.garageName}</td>
                      <td style={{padding:'0 8px'}}>{m.serviceType}</td>
                      <td style={{padding:'0 8px'}}>{m.date}</td>
                      <td style={{padding:'0 8px'}}><span className="badge badge-good">{m.status}</span></td>
                      <td style={{padding:'0 8px',textAlign:'right',fontWeight:700}}>{fmt(m.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Toast notification */}
      {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </>
  );
}
