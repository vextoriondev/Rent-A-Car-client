"use client";
import {useParams,useRouter} from 'next/navigation';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Building2,CarFront,HandCoins,CheckCircle2,X} from 'lucide-react';
import {demoOwners,demoVehicles,Owner} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {EmptyState} from '@/components/shared/empty-state';

const fmt=(n:number)=>'৳'+n.toLocaleString('en-US');

export default function OwnerDetailPage(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const rawId=decodeURIComponent(params.id||'');

  const [owner,setOwner]=useState<Owner|undefined>(()=>
    demoOwners.find(o=>o.id===rawId||o.name.toLowerCase()===rawId.toLowerCase())||demoOwners[0]
  );

  const [pmtOpen,setPmtOpen]=useState(false);
  const [pmt,setPmt]=useState({date:new Date().toISOString().slice(0,10),amount:'',method:'Bank Transfer',ref:'',note:''});
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  if(!owner){
    return <Card style={{padding:24}}>
      <EmptyState title="Owner Not Found" description={`No vehicle owner found matching "${rawId}"`}/>
      <div style={{marginTop:16,textAlign:'center'}}>
        <Button variant="outline" asChild><Link href="/owners">Return to Owners List</Link></Button>
      </div>
    </Card>;
  }

  const vehicles=demoVehicles.filter(v=>v.ownerId===owner.id);
  const remainingDue=owner.totalPayable-owner.totalPaid;

  function handlePayment(){
    if(!owner||!pmt.amount)return;
    const amt=parseFloat(pmt.amount)||0;
    setOwner(prev=>prev?{...prev,totalPaid:prev.totalPaid+amt}:prev);
    setPmtOpen(false);
    showToast(`Payment of ${fmt(amt)} recorded for ${owner.name}`);
  }

  return <>
    <div style={{marginBottom:14}}>
      <Link href="/owners" className="text-button" style={{display:'inline-flex',alignItems:'center',gap:6,color:'#215b70',fontSize:13}}>
        <ArrowLeft size={16}/> Back to Owners Management
      </Link>
    </div>

    {/* Header Card */}
    <Card style={{padding:20,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <h1 style={{fontSize:22,fontWeight:700,color:'#1e3947'}}>{owner.name}</h1>
            <span className={`badge ${owner.status==='Active'?'badge-good':'badge-bad'}`}>{owner.status}</span>
          </div>
          <span style={{fontSize:13,color:'#6a7c83'}}>Owner ID: <b>{owner.id}</b> · Joined: {owner.joiningDate} · Contact: {owner.mobile}</span>
        </div>

        <div style={{display:'flex',gap:8}}>
          <Button onClick={()=>setPmtOpen(true)}>
            <HandCoins size={15}/> Record Owner Payment
          </Button>
        </div>
      </div>
    </Card>

    {/* Financial Highlights */}
    <div className="metric-grid" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))',marginBottom:16}}>
      {[
        {label:'Total Vehicles',value:vehicles.length,color:'blue',icon:CarFront},
        {label:'Total Rent Payable',value:fmt(owner.totalPayable),color:'gold',icon:Building2},
        {label:'Total Rent Disbursed',value:fmt(owner.totalPaid),color:'blue',icon:HandCoins},
        {label:'Net Outstanding Due',value:fmt(remainingDue),color:remainingDue>0?'gold':'blue',icon:Building2},
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

    {/* Detail Tabs */}
    <Tabs defaultValue="vehicles">
      <TabsList style={{marginBottom:16}}>
        <TabsTrigger value="vehicles">Assigned Vehicles ({vehicles.length})</TabsTrigger>
        <TabsTrigger value="profile">Profile & Banking</TabsTrigger>
        <TabsTrigger value="payments">Disbursement History</TabsTrigger>
      </TabsList>

      <TabsContent value="vehicles">
        <Card>
          <div className="billing-table">
            <div className="head" style={{gridTemplateColumns:'120px 1.4fr 1.2fr 100px 110px 110px 100px'}}>
              <span>Registration</span>
              <span>Vehicle</span>
              <span>Category</span>
              <span>Year</span>
              <span>Monthly Rent</span>
              <span>Agreement Start</span>
              <span>Status</span>
            </div>
            {vehicles.map(v=>(
              <div key={v.id} style={{gridTemplateColumns:'120px 1.4fr 1.2fr 100px 110px 110px 100px'}}>
                <span><b>{v.registration}</b></span>
                <span>{v.brand} {v.model}</span>
                <span>{v.category}</span>
                <span>{v.year}</span>
                <span className="nums" style={{fontSize:12,fontWeight:700}}>{fmt(v.monthlyRent)}</span>
                <span style={{fontSize:11,color:'#6a7c83'}}>{v.agreementStart}</span>
                <span><span className={`badge ${v.status==='Available'?'badge-good':v.status==='On Duty'?'badge-blue':v.status==='In Garage'?'badge-warn':'badge-bad'}`}>{v.status}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="profile">
        <Card style={{padding:20}}>
          <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',marginBottom:12}}>Identity & Contact Particulars</h3>
          <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[
              ['Full Name',owner.name],
              ['Mobile Phone',owner.mobile],
              ['Alt Mobile',owner.altMobile||'None'],
              ['Email Address',owner.email||'None'],
              ['National NID',owner.nid],
              ['Registration Date',owner.joiningDate],
            ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>

          <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',margin:'20px 0 12px'}}>Disbursement Bank Account</h3>
          <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[
              ['Bank Name',owner.bankName||'Not Specified'],
              ['Account Name',owner.accountName||owner.name],
              ['Account Number',owner.accountNumber||'Not Specified'],
              ['Branch Name',owner.branchName||'Dhaka Main'],
              ['Account Type',owner.accountType||'Current Account'],
            ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>

          <h3 style={{fontSize:15,fontWeight:700,color:'#1e3947',margin:'20px 0 12px'}}>Addresses</h3>
          <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><span>Present Address</span><b>{owner.presentAddress}</b></div>
            <div><span>Permanent Address</span><b>{owner.permanentAddress}</b></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="payments">
        <Card>
          <div className="billing-table">
            <div className="head" style={{gridTemplateColumns:'120px 120px 140px 1.2fr 100px'}}>
              <span>Date</span>
              <span>Disbursed Amount</span>
              <span>Payment Channel</span>
              <span>Reference Number</span>
              <span>Status</span>
            </div>
            {[
              {date:'2026-10-05',amt:40000,method:'Bank Transfer (BEFTN)',ref:'BEFTN-8712',status:'Disbursed'},
              {date:'2026-09-19',amt:40000,method:'Bank Transfer (BEFTN)',ref:'BEFTN-8700',status:'Disbursed'},
              {date:'2026-08-20',amt:10000,method:'Cash in Hand',ref:'CASH-DISB-001',status:'Disbursed'},
            ].map((p,i)=>(
              <div key={i} style={{gridTemplateColumns:'120px 120px 140px 1.2fr 100px'}}>
                <span style={{fontSize:11,color:'#6a7c83'}}>{p.date}</span>
                <span className="nums" style={{fontSize:12,fontWeight:700,color:'#277b55'}}>{fmt(p.amt)}</span>
                <span style={{fontSize:11}}>{p.method}</span>
                <span style={{fontSize:11,color:'#6a7c83'}}>{p.ref}</span>
                <span><span className="badge badge-good" style={{fontSize:10}}>{p.status}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Payment Modal */}
    <Dialog open={pmtOpen} onOpenChange={setPmtOpen}>
      <DialogContent style={{maxWidth:480}}>
        <DialogHeader>
          <DialogTitle>Disburse Owner Payment – {owner.name}</DialogTitle>
          <DialogDescription>Current remaining due: {fmt(remainingDue)}</DialogDescription>
        </DialogHeader>

        <div className="entry-form">
          <div className="form-grid">
            <label>
              <span className="field-label">Disbursement Date</span>
              <Input type="date" value={pmt.date} onChange={e=>setPmt(p=>({...p,date:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Payment Amount (BDT) *</span>
              <Input type="number" placeholder="0" value={pmt.amount} onChange={e=>setPmt(p=>({...p,amount:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Payment Method</span>
              <Select value={pmt.method} onValueChange={v=>setPmt(p=>({...p,method:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer (BEFTN)</SelectItem>
                  <SelectItem value="Cash">Cash in Hand</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Reference</span>
              <Input placeholder="e.g. BEFTN-9982" value={pmt.ref} onChange={e=>setPmt(p=>({...p,ref:e.target.value}))}/>
            </label>
          </div>

          <label>
            <span className="field-label">Note</span>
            <Input placeholder="Optional disbursement remark" value={pmt.note} onChange={e=>setPmt(p=>({...p,note:e.target.value}))}/>
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
