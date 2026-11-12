"use client";
import {useState} from 'react';
import {BarChart3,PieChart as PieIcon,FileSpreadsheet,Printer,Download,Calendar,TrendingUp,CarFront,Building2,Users,Briefcase,Wrench,DollarSign} from 'lucide-react';
import {demoVehicles,demoOwners,demoDrivers,demoClients,demoMaintenance,demoExpenses,demoAccounts,monthlyChartData,expenseCategoryData} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,Legend,PieChart,Pie,Cell,LineChart,Line} from 'recharts';

const fmt=(n:number)=>'৳'+n.toLocaleString('en-US');

export default function ReportsPage(){
  const [periodF,setPeriodF]=useState('year');
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const COLORS=['#236d80','#d4a971','#529e72','#a869a8','#e07a5f','#3d5a80'];

  const totalRevenue=monthlyChartData.reduce((s,m)=>s+m.income,0);
  const totalExpense=monthlyChartData.reduce((s,m)=>s+m.expenses,0);
  const netProfit=totalRevenue-totalExpense;

  return <>
    {/* Page Header */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:12}}>
      <div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947',marginBottom:4}}>Reports & Analytics</h1>
        <p style={{fontSize:13,color:'#6a7c83'}}>Comprehensive financial, operational, and fleet performance reporting for TASIN ENTERPRISE.</p>
      </div>

      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <Select value={periodF} onValueChange={setPeriodF}>
          <SelectTrigger style={{minWidth:140}}><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Current Month</SelectItem>
            <SelectItem value="last_month">Previous Month</SelectItem>
            <SelectItem value="year">Full Year (2026)</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={()=>showToast('PDF Export will be available after backend integration')}>
          <Download size={15}/> PDF
        </Button>
        <Button variant="outline" onClick={()=>showToast('Excel Export will be available after backend integration')}>
          <FileSpreadsheet size={15}/> Excel
        </Button>
        <Button variant="outline" onClick={()=>window.print()}>
          <Printer size={15}/> Print
        </Button>
      </div>
    </div>

    {/* Metric Highlights */}
    <div className="kpi-grid-5" style={{marginBottom:16}}>
      {[
        {label:'Total Revenue',value:fmt(totalRevenue),color:'blue',icon:TrendingUp},
        {label:'Total Expenditure',value:fmt(totalExpense),color:'gold',icon:DollarSign},
        {label:'Net Operating Profit',value:fmt(netProfit),color:'blue',icon:TrendingUp},
        {label:'Customer Receivables',value:fmt(demoClients.reduce((s,c)=>s+(c.totalReceivable-c.totalCollected),0)),color:'gold',icon:Briefcase},
        {label:'Owner Payables Due',value:fmt(demoOwners.reduce((s,o)=>s+(o.totalPayable-o.totalPaid),0)),color:'purple',icon:Building2},
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
    <Tabs defaultValue="financial">
      <TabsList style={{marginBottom:16,display:'flex',gap:6,overflowX:'auto',maxWidth:'100%',whiteSpace:'nowrap',paddingBottom:4}}>
        <TabsTrigger value="financial">Financial Overview</TabsTrigger>
        <TabsTrigger value="vehicles">Fleet Performance</TabsTrigger>
        <TabsTrigger value="owners">Owner Statements</TabsTrigger>
        <TabsTrigger value="clients">Client Invoicing & Due</TabsTrigger>
        <TabsTrigger value="drivers">Driver Payroll</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance & Garages</TabsTrigger>
      </TabsList>

      {/* 1. Financial Overview */}
      <TabsContent value="financial">
        <div className="split-grid-analytics-2" style={{marginBottom:16}}>
          <Card style={{padding:16}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:14}}>Monthly Income vs Expense Trend (BDT)</h3>
            <div style={{width:'100%',height:260}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
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
            <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:14}}>Expense Category Allocation</h3>
            <div style={{width:'100%',height:180}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseCategoryData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {expenseCategoryData.map((_,i)=>(
                      <Cell key={i} fill={COLORS[i%COLORS.length]}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Amount']}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
              {expenseCategoryData.map((d,i)=>(
                <span key={d.name} style={{fontSize:11,color:'#4f6169',display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:COLORS[i%COLORS.length]}}/>
                  {d.name} ({fmt(d.amount)})
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Bank & Cash Balances */}
        <Card style={{padding:16}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Cash & Bank Accounts Status</h3>
          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',minWidth:600}}>
                <span>Account Name</span>
                <span>Account Number</span>
                <span>Account Type</span>
                <span>Opening Balance</span>
                <span>Current Balance</span>
              </div>
              {demoAccounts.map(a=>(
                <div key={a.id} style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',minWidth:600}}>
                  <span><b>{a.name}</b></span>
                  <span style={{fontSize:12,color:'#6a7c83'}}>{a.accountNumber||'—'}</span>
                  <span><span className="badge badge-neutral">{a.type}</span></span>
                  <span className="nums" style={{fontSize:12}}>{fmt(a.openingBalance)}</span>
                  <span className="nums" style={{fontSize:13,fontWeight:700,color:'#236d80'}}>{fmt(a.currentBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 2. Fleet Performance */}
      <TabsContent value="vehicles">
        <Card style={{padding:16}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Vehicle Fleet Utilization & Rent Summary</h3>
          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'100px 1.4fr 1.2fr 100px 100px 110px 110px',minWidth:760}}>
                <span>ID</span>
                <span>Registration</span>
                <span>Brand / Model</span>
                <span>Category</span>
                <span>Status</span>
                <span>Monthly Rent</span>
                <span>YTD Estimated Cost</span>
              </div>
              {demoVehicles.map(v=>(
                <div key={v.id} style={{gridTemplateColumns:'100px 1.4fr 1.2fr 100px 100px 110px 110px',minWidth:760}}>
                  <span style={{fontSize:11,color:'#6a7c83'}}>{v.id}</span>
                  <span><b>{v.registration}</b></span>
                  <span>{v.brand} {v.model} ({v.year})</span>
                  <span>{v.category}</span>
                  <span><span className={`badge ${v.status==='Available'?'badge-good':v.status==='On Duty'?'badge-blue':v.status==='In Garage'?'badge-warn':'badge-bad'}`}>{v.status}</span></span>
                  <span className="nums" style={{fontSize:12,fontWeight:700}}>{fmt(v.monthlyRent)}</span>
                  <span className="nums" style={{fontSize:12}}>{fmt(v.monthlyRent*10)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 3. Owner Statements */}
      <TabsContent value="owners">
        <Card style={{padding:16}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Owner Accounts & Payables Summary</h3>
          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'100px 1.4fr 120px 90px 120px 120px 120px 90px',minWidth:850}}>
                <span>Owner ID</span>
                <span>Name</span>
                <span>Mobile</span>
                <span>Vehicles</span>
                <span>Total Payable</span>
                <span>Total Paid</span>
                <span>Outstanding Due</span>
                <span>Status</span>
              </div>
              {demoOwners.map(o=>{
                const due=o.totalPayable-o.totalPaid;
                return (
                  <div key={o.id} style={{gridTemplateColumns:'100px 1.4fr 120px 90px 120px 120px 120px 90px',minWidth:850}}>
                    <span style={{fontSize:11,color:'#6a7c83'}}>{o.id}</span>
                    <span><b>{o.name}</b></span>
                    <span style={{fontSize:12}}>{o.mobile}</span>
                    <span style={{fontSize:12}}>{o.totalVehicles}</span>
                    <span className="nums" style={{fontSize:12,fontWeight:700}}>{fmt(o.totalPayable)}</span>
                    <span className="nums" style={{fontSize:12,color:'#277b55',fontWeight:700}}>{fmt(o.totalPaid)}</span>
                    <span className="nums" style={{fontSize:12,fontWeight:700,color:due>0?'#a57a2b':'#277b55'}}>{fmt(due)}</span>
                    <span><span className={`badge ${o.status==='Active'?'badge-good':'badge-bad'}`}>{o.status}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 4. Client Invoicing & Due */}
      <TabsContent value="clients">
        <Card style={{padding:16}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Client Receivables & Collection Aging</h3>
          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'100px 1.4fr 1.2fr 110px 110px 110px 110px 90px',minWidth:860}}>
                <span>Client ID</span>
                <span>Company / Client</span>
                <span>Contact Person</span>
                <span>Type</span>
                <span>Total Invoiced</span>
                <span>Total Collected</span>
                <span>Outstanding Due</span>
                <span>Status</span>
              </div>
              {demoClients.map(c=>{
                const due=c.totalReceivable-c.totalCollected;
                return (
                  <div key={c.id} style={{gridTemplateColumns:'100px 1.4fr 1.2fr 110px 110px 110px 110px 90px',minWidth:860}}>
                    <span style={{fontSize:11,color:'#6a7c83'}}>{c.id}</span>
                    <span><b>{c.name}</b></span>
                    <span style={{fontSize:12}}>{c.contactPerson}</span>
                    <span><span className="badge badge-neutral">{c.clientType}</span></span>
                    <span className="nums" style={{fontSize:12,fontWeight:700}}>{fmt(c.totalReceivable)}</span>
                    <span className="nums" style={{fontSize:12,color:'#277b55',fontWeight:700}}>{fmt(c.totalCollected)}</span>
                    <span className="nums" style={{fontSize:12,fontWeight:700,color:due>0?'#a57a2b':'#277b55'}}>{fmt(due)}</span>
                    <span><span className={`badge ${c.status==='Active'?'badge-good':'badge-bad'}`}>{c.status}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 5. Driver Payroll */}
      <TabsContent value="drivers">
        <Card style={{padding:16}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Driver Salaries, Allowances & Advance Statement</h3>
          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'100px 1.4fr 120px 110px 110px 110px 110px 110px',minWidth:860}}>
                <span>Driver ID</span>
                <span>Driver Name</span>
                <span>License No</span>
                <span>Monthly Salary</span>
                <span>Allowance/day</span>
                <span>Advance Balance</span>
                <span>Total Paid YTD</span>
                <span>Net Due</span>
              </div>
              {demoDrivers.map(d=>(
                <div key={d.id} style={{gridTemplateColumns:'100px 1.4fr 120px 110px 110px 110px 110px 110px',minWidth:860}}>
                  <span style={{fontSize:11,color:'#6a7c83'}}>{d.id}</span>
                  <span><b>{d.name}</b></span>
                  <span style={{fontSize:11}}>{d.licenseNo}</span>
                  <span className="nums" style={{fontSize:12}}>{fmt(d.monthlySalary)}</span>
                  <span className="nums" style={{fontSize:12}}>{fmt(d.dailyAllowance)}</span>
                  <span className="nums" style={{fontSize:12,color:'#a57a2b'}}>{fmt(d.advance)}</span>
                  <span className="nums" style={{fontSize:12,color:'#277b55'}}>{fmt(d.totalPaid)}</span>
                  <span className="nums" style={{fontSize:12,fontWeight:700}}>{fmt(d.monthlySalary-d.totalPaid+d.advance)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* 6. Maintenance & Garages */}
      <TabsContent value="maintenance">
        <Card style={{padding:16}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947',marginBottom:12}}>Fleet Maintenance Cost & Workshop Ledger</h3>
          <div className="table-responsive-container">
            <div className="billing-table">
              <div className="head" style={{gridTemplateColumns:'100px 1.4fr 1.2fr 100px 110px 100px 100px 100px',minWidth:840}}>
                <span>ID</span>
                <span>Vehicle</span>
                <span>Garage</span>
                <span>Date</span>
                <span>Category</span>
                <span>Labour</span>
                <span>Parts</span>
                <span>Total Cost</span>
              </div>
              {demoMaintenance.map(m=>(
                <div key={m.id} style={{gridTemplateColumns:'100px 1.4fr 1.2fr 100px 110px 100px 100px 100px',minWidth:840}}>
                  <span style={{fontSize:11,color:'#6a7c83'}}>{m.id}</span>
                  <span><b>{m.vehicleReg}</b></span>
                  <span>{m.garageName}</span>
                  <span style={{fontSize:11,color:'#6a7c83'}}>{m.date}</span>
                  <span><span className="badge badge-neutral">{m.serviceType}</span></span>
                  <span className="nums" style={{fontSize:12}}>{fmt(m.labourCost)}</span>
                  <span className="nums" style={{fontSize:12}}>{fmt(m.partsCost)}</span>
                  <span className="nums" style={{fontSize:12,fontWeight:700,color:'#b04b46'}}>{fmt(m.totalCost)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Toast notification */}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </>;
}
