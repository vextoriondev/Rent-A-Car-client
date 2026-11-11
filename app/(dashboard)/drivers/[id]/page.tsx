"use client";
import {useParams} from 'next/navigation';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,UserRound,CarFront,HandCoins,CheckCircle2,X,AlertTriangle,ShieldCheck} from 'lucide-react';
import {demoDrivers,demoVehicles,demoDuties,Driver} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {EmptyState} from '@/components/shared/empty-state';

const fmt=(n:number)=>'৳'+n.toLocaleString('en-US');

export default function DriverDetailPage(){
  const params=useParams<{id:string}>();
  const rawId=decodeURIComponent(params.id||'');

  const [driver,setDriver]=useState<Driver|undefined>(()=>
    demoDrivers.find(d=>d.id===rawId||d.name.toLowerCase()===rawId.toLowerCase())||demoDrivers[0]
  );

  const [pmtOpen,setPmtOpen]=useState(false);
  const [pmt,setPmt]=useState({date:new Date().toISOString().slice(0,10),amount:'',type:'Salary',method:'Cash',ref:'',note:''});
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  if(!driver){
    return <Card style={{padding:24}}>
      <EmptyState title="Driver Not Found" description={`No driver found matching "${rawId}"`}/>
      <div style={{marginTop:16,textAlign:'center'}}>
        <Button variant="outline" asChild><Link href="/drivers">Return to Drivers List</Link></Button>
      </div>
    </Card>;
  }

  const assignedVeh=demoVehicles.find(v=>v.id===driver.assignedVehicleId);
  const driverDuties=demoDuties.filter(d=>d.driverId===driver.id);
  const netDue=driver.monthlySalary-driver.totalPaid+driver.advance;

  function handlePayment(){
    if(!driver||!pmt.amount)return;
    const amt=parseFloat(pmt.amount)||0;
    setDriver(prev=>prev?{...prev,totalPaid:prev.totalPaid+amt}:prev);
    setPmtOpen(false);
    showToast(`Payment of ${fmt(amt)} recorded for ${driver.name}`);
  }

  return <>
    <div style={{marginBottom:14}}>
      <Link href="/drivers" className="text-button" style={{display:'inline-flex',alignItems:'center',gap:6,color:'#215b70',fontSize:13}}>
        <ArrowLeft size={16}/> Back to Drivers Management
      </Link>
    </div>

    {/* Header Card */}
    <Card style={{padding:20,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947'}}>{driver.name}</h1>
            <span className={`badge ${driver.status==='Active'?'badge-good':'badge-bad'}`}>{driver.status}</span>
          </div>
          <span style={{fontSize:13,color:'#6a7c83'}}>Driver ID: <b>{driver.id}</b> · Joined: {driver.joiningDate} · Mobile: {driver.mobile}</span>
        </div>

        <div style={{display:'flex',gap:8}}>
          <Button onClick={()=>setPmtOpen(true)}>
            <HandCoins size={15}/> Disburse Salary / Allowance
          </Button>
        </div>
      </div>
    </Card>

    {/* Highlights */}
    <div className="metric-grid" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))',marginBottom:16}}>
      {[
        {label:'Monthly Base Salary',value:fmt(driver.monthlySalary),color:'blue',icon:UserRound},
        {label:'Daily Duty Allowance',value:fmt(driver.dailyAllowance)+'/day',color:'purple',icon:CarFront},
        {label:'Advance / Loan Taken',value:fmt(driver.advance),color:'gold',icon:HandCoins},
        {label:'Net Current Payable',value:fmt(netDue),color:netDue>0?'gold':'blue',icon:HandCoins},
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

    {/* Tabs */}
    <Tabs defaultValue="profile">
      <TabsList style={{marginBottom:16}}>
        <TabsTrigger value="profile">Profile & License</TabsTrigger>
        <TabsTrigger value="vehicle">Assigned Vehicle</TabsTrigger>
        <TabsTrigger value="duties">Recent Duties ({driverDuties.length})</TabsTrigger>
        <TabsTrigger value="payroll">Payroll Ledger</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card style={{padding:20}}>
          <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',marginBottom:12}}>Driver Personal Particulars</h3>
          <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[
              ['Full Name',driver.name],
              ['Mobile Phone',driver.mobile],
              ['Alt Mobile',driver.altMobile||'None'],
              ['National NID',driver.nid],
              ['Date of Birth',driver.dob],
              ['Emergency Contact',driver.emergencyContact],
            ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>

          <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',margin:'20px 0 12px'}}>Driving License & Compliance</h3>
          <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[
              ['License Number',driver.licenseNo],
              ['License Class',driver.licenseType],
              ['License Expiry Date',driver.licenseExpiry],
              ['Address',driver.presentAddress],
            ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="vehicle">
        <Card style={{padding:20}}>
          {assignedVeh?(
            <div>
              <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',marginBottom:12}}>Current Assigned Vehicle</h3>
              <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                {[
                  ['Registration No.',assignedVeh.registration],
                  ['Brand & Model',`${assignedVeh.brand} ${assignedVeh.model}`],
                  ['Category',assignedVeh.category],
                  ['Color / Year',`${assignedVeh.color} · ${assignedVeh.year}`],
                  ['Current Status',assignedVeh.status],
                  ['Monthly Rent',fmt(assignedVeh.monthlyRent)],
                ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
              </div>
            </div>
          ):(
            <EmptyState title="No vehicle assigned" description="This driver is currently on standby / unassigned"/>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="duties">
        <Card>
          <div className="billing-table">
            <div className="head" style={{gridTemplateColumns:'100px 1.2fr 1.4fr 100px 90px 100px'}}>
              <span>Duty ID</span>
              <span>Client</span>
              <span>Pickup → Destination</span>
              <span>Agreed Rent</span>
              <span>Status</span>
              <span>Date</span>
            </div>
            {driverDuties.map(d=>(
              <div key={d.id} style={{gridTemplateColumns:'100px 1.2fr 1.4fr 100px 90px 100px'}}>
                <span style={{fontSize:11,color:'#6a7c83'}}>{d.id}</span>
                <span><b>{d.clientName}</b></span>
                <span style={{fontSize:11}}>{d.pickupLocation} → {d.destination}</span>
                <span className="nums" style={{fontSize:12,fontWeight:700}}>{fmt(d.totalAmount)}</span>
                <span><span className="badge badge-blue" style={{fontSize:10}}>{d.status}</span></span>
                <span style={{fontSize:11,color:'#6a7c83'}}>{d.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="payroll">
        <Card style={{padding:20}}>
          <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',marginBottom:12}}>Salary & Allowance Breakdown</h3>
          <div className="statement-lines">
            {[
              ['Monthly Agreed Base Salary',fmt(driver.monthlySalary)],
              ['Daily Duty Allowance',fmt(driver.dailyAllowance)+'/day'],
              ['Advance Balance Taken',fmt(driver.advance)],
              ['Total Disbursed (YTD)',fmt(driver.totalPaid)],
              ['Net Remaining Due',fmt(netDue)],
            ].map(([k,v],i)=><div key={k} className={i===4?'statement-total':''}><span>{k}</span><b>{v}</b></div>)}
          </div>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Payment Modal */}
    <Dialog open={pmtOpen} onOpenChange={setPmtOpen}>
      <DialogContent style={{maxWidth:480}}>
        <DialogHeader>
          <DialogTitle>Disburse Driver Payment – {driver.name}</DialogTitle>
          <DialogDescription>Current net due: {fmt(netDue)}</DialogDescription>
        </DialogHeader>

        <div className="entry-form">
          <div className="form-grid">
            <label>
              <span className="field-label">Disbursement Date</span>
              <Input type="date" value={pmt.date} onChange={e=>setPmt(p=>({...p,date:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Amount (BDT) *</span>
              <Input type="number" placeholder="0" value={pmt.amount} onChange={e=>setPmt(p=>({...p,amount:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Disbursement Type</span>
              <Select value={pmt.type} onValueChange={v=>setPmt(p=>({...p,type:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salary">Monthly Salary</SelectItem>
                  <SelectItem value="Allowance">Trip Allowance</SelectItem>
                  <SelectItem value="Advance">Advance / Loan</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Payment Channel</span>
              <Select value={pmt.method} onValueChange={v=>setPmt(p=>({...p,method:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash in Hand</SelectItem>
                  <SelectItem value="Mobile Banking">bKash / Nagad</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label>
            <span className="field-label">Note</span>
            <Input placeholder="Optional remark" value={pmt.note} onChange={e=>setPmt(p=>({...p,note:e.target.value}))}/>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={()=>setPmtOpen(false)}>Cancel</Button>
          <Button onClick={handlePayment} disabled={!pmt.amount}>Confirm Disbursement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Toast notification */}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </>;
}
