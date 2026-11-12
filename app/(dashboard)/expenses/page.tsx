"use client";
import {useState,useMemo,useEffect} from 'react';
import {Receipt,Plus,Eye,CheckCircle2,X,ChevronLeft,ChevronRight,Search,Filter,PieChart as PieIcon} from 'lucide-react';
import {fetchExpenses,createExpense,fetchVehicles} from '@/lib/api';
import {demoExpenses,demoVehicles,demoAccounts,Expense,ExpenseCategory,PaymentMethod,expenseCategoryData} from '@/lib/tasin-data';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription} from '@/components/ui/dialog';
import {EmptyState} from '@/components/shared/empty-state';
import {ResponsiveContainer,PieChart,Pie,Cell,Tooltip} from 'recharts';

const fmt=(n:number)=>'৳'+n.toLocaleString('en-US');
const PAGE_SIZE=10;

const CATEGORIES:ExpenseCategory[]=[
  'Fuel','Driver Food/Allowance','Parking','Toll','Vehicle Repair','Maintenance','Office Rent','Staff Salary','Utilities','Transport','Other'
];

const COLORS=['#236d80','#d4a971','#529e72','#a869a8','#e07a5f','#3d5a80','#98c1d9','#ee6c4d','#293241','#8ac926','#ffca3a'];

const BLANK_FORM={
  date:new Date().toISOString().slice(0,10),
  category:'Fuel' as ExpenseCategory,
  title:'',
  amount:'',
  paymentMethod:'Cash' as PaymentMethod,
  account:'Main Cash Account',
  paidTo:'',
  reference:'',
  note:'',
  vehicleId:'',
};

export default function ExpensesPage(){
  const [expenses,setExpenses]=useState<Expense[]>(demoExpenses);
  const [vehicles,setVehicles]=useState<any[]>(demoVehicles);
  const [q,setQ]=useState('');
  const [categoryF,setCategoryF]=useState<string>('All');
  const [methodF,setMethodF]=useState<string>('All');
  const [vehicleF,setVehicleF]=useState<string>('All');
  const [page,setPage]=useState(1);

  const [addOpen,setAddOpen]=useState(false);
  const [form,setForm]=useState(BLANK_FORM);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [viewExp,setViewExp]=useState<Expense|null>(null);
  const [toast,setToast]=useState('');
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)};

  const loadExpenses = () => {
    fetchExpenses(1)
      .then((data: any) => {
        if(Array.isArray(data) && data.length > 0){
          setExpenses(data.map((e: any) => ({
            id: e.expenseId || `EXP-${String(e.id).padStart(3, '0')}`,
            date: e.date,
            category: e.category as ExpenseCategory,
            title: e.title,
            amount: Number(e.amount) || 0,
            paymentMethod: e.paymentMethod as PaymentMethod,
            account: 'Main Cash Account',
            paidTo: e.paidTo || 'Supplier',
            reference: e.reference || '',
            note: e.note || '',
            vehicleReg: e.vehicleReg || '',
          })));
        }
      })
      .catch(()=>{});

    fetchVehicles(1).then((data: any) => {
      if(Array.isArray(data) && data.length > 0){
        setVehicles(data.map((v: any) => ({
          id: String(v.id),
          registration: v.registration || v.regNo,
          model: v.model
        })));
      }
    }).catch(()=>{});
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const vehicleMap=useMemo(()=>{
    const m=new Map<string,string>();
    vehicles.forEach(v=>m.set(v.id,v.registration));
    return m;
  },[vehicles]);

  const filtered=useMemo(()=>expenses.filter(e=>{
    const qLower=q.toLowerCase();
    const qMatch=!q||
      e.title.toLowerCase().includes(qLower)||
      e.paidTo.toLowerCase().includes(qLower)||
      (e.vehicleReg||'').toLowerCase().includes(qLower)||
      (e.reference||'').toLowerCase().includes(qLower);
    const cMatch=categoryF==='All'||e.category===categoryF;
    const mMatch=methodF==='All'||e.paymentMethod===methodF;
    const vMatch=vehicleF==='All'||e.vehicleId===vehicleF;
    return qMatch&&cMatch&&mMatch&&vMatch;
  }),[expenses,q,categoryF,methodF,vehicleF]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paged=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const kpi={
    total:expenses.reduce((s,e)=>s+e.amount,0),
    today:expenses.filter(e=>e.date==='2026-11-10').reduce((s,e)=>s+e.amount,0),
    fuel:expenses.filter(e=>e.category==='Fuel').reduce((s,e)=>s+e.amount,0),
    maintenance:expenses.filter(e=>e.category==='Maintenance'||e.category==='Vehicle Repair').reduce((s,e)=>s+e.amount,0),
    office:expenses.filter(e=>e.category==='Office Rent'||e.category==='Staff Salary'||e.category==='Utilities').reduce((s,e)=>s+e.amount,0),
  };

  const dynamicCategoryChart=useMemo(()=>{
    const counts:Record<string,number>={};
    expenses.forEach(e=>{
      counts[e.category]=(counts[e.category]||0)+e.amount;
    });
    return Object.entries(counts).map(([name,value])=>({name,value}));
  },[expenses]);

  function validate(){
    const e:Record<string,string>={};
    if(!form.title.trim())e.title='Expense title is required';
    if(!form.amount||Number(form.amount)<=0)e.amount='Valid amount is required';
    if(!form.paidTo.trim())e.paidTo='Paid-to recipient is required';
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function handleAdd(){
    if(!validate())return;
    const vReg=form.vehicleId?vehicleMap.get(form.vehicleId):undefined;
    const newExp:Expense={
      id:`EXP-00${expenses.length+1}`,
      date:form.date,
      category:form.category,
      title:form.title.trim(),
      amount:Number(form.amount)||0,
      paymentMethod:form.paymentMethod,
      account:form.account,
      paidTo:form.paidTo.trim(),
      reference:form.reference.trim()||undefined,
      note:form.note.trim()||undefined,
      vehicleId:form.vehicleId||undefined,
      vehicleReg:vReg,
    };
    createExpense(1, {
      date: form.date,
      category: form.category,
      title: form.title.trim(),
      amount: Number(form.amount) || 0,
      payment_method: form.paymentMethod,
      account_name: form.account,
      paid_to: form.paidTo.trim(),
      reference: form.reference.trim(),
      note: form.note.trim(),
      vehicle_reg: vReg || '',
    }).then(() => loadExpenses()).catch(() => {});

    setExpenses(prev=>[newExp,...prev]);
    setAddOpen(false);
    setForm(BLANK_FORM);
    setErrors({});
    showToast(`Expense ${fmt(newExp.amount)} recorded under ${newExp.category}`);
  }

  return <>
    {/* KPI Cards */}
    <div className="kpi-grid-5">
      {[
        {label:"Today's Expenses",value:fmt(kpi.today),color:'gold'},
        {label:'Total Fleet Fuel',value:fmt(kpi.fuel),color:'blue'},
        {label:'Vehicle Repairs & Maintenance',value:fmt(kpi.maintenance),color:'gold'},
        {label:'Office & Staff Operations',value:fmt(kpi.office),color:'purple'},
        {label:'Overall Expenses (YTD)',value:fmt(kpi.total),color:'gold'},
      ].map(c=>(
        <Card key={c.label} className="metric">
          <div className="metric-top">
            <span>{c.label}</span>
            <span className={`metric-icon ${c.color}`}><Receipt size={17}/></span>
          </div>
          <strong className="nums" style={{fontSize:20}}>{c.value}</strong>
        </Card>
      ))}
    </div>

    {/* Category Breakdown & Overview */}
    <div className="split-grid-analytics-2" style={{marginBottom:16}}>
      <Card style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#1e3947'}}>Expense Category Distribution</h3>
          <span style={{fontSize:11,color:'#6a7c83'}}>All registered expenditures</span>
        </div>
        <div className="detail-card-layout">
          <div style={{width:160,height:140}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dynamicCategoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {dynamicCategoryChart.map((_,idx)=>(
                    <Cell key={`cell-${idx}`} fill={COLORS[idx%COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip formatter={(v:any)=>[fmt(Number(v)),'Amount']}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,flex:1}}>
            {dynamicCategoryChart.map((c,i)=>(
              <div key={c.name} style={{display:'flex',alignItems:'center',gap:6,background:'#f7f8f7',padding:'4px 8px',borderRadius:6,border:'1px solid #e2e9e9'}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:COLORS[i%COLORS.length]}}/>
                <span style={{fontSize:11,color:'#1e3947'}}>{c.name}:</span>
                <b className="nums" style={{fontSize:11}}>{fmt(c.value)}</b>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card style={{padding:16,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center'}}>
        <span style={{color:'#215b70',marginBottom:8}}><Receipt size={32}/></span>
        <h4 style={{fontSize:14,fontWeight:700,color:'#1e3947'}}>Log Fleet & Office Expense</h4>
        <p style={{fontSize:12,color:'#6a7c83',margin:'6px 0 14px'}}>Track daily fuel, tolls, repairs, salaries, and office bills in real-time.</p>
        <Button onClick={()=>{setForm(BLANK_FORM);setErrors({});setAddOpen(true)}} style={{width:'100%'}}>
          <Plus size={16}/> Record Expense
        </Button>
      </Card>
    </div>

    {/* Toolbar */}
    <div className="toolbar" style={{marginBottom:16,flexWrap:'wrap',gap:10}}>
      <div className="global-search" style={{width:260}}>
        <Search size={15}/>
        <Input
          placeholder="Search title, payee, vehicle, ref…"
          value={q}
          onChange={e=>{setQ(e.target.value);setPage(1)}}
        />
      </div>

      <Select value={categoryF} onValueChange={v=>{setCategoryF(v);setPage(1)}}>
        <SelectTrigger style={{minWidth:150}}><SelectValue placeholder="Category"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Categories</SelectItem>
          {CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={methodF} onValueChange={v=>{setMethodF(v);setPage(1)}}>
        <SelectTrigger style={{minWidth:140}}><SelectValue placeholder="Method"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Methods</SelectItem>
          <SelectItem value="Cash">Cash</SelectItem>
          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
          <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
        </SelectContent>
      </Select>

      <Select value={vehicleF} onValueChange={v=>{setVehicleF(v);setPage(1)}}>
        <SelectTrigger style={{minWidth:160}}><SelectValue placeholder="Vehicle"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Vehicles</SelectItem>
          {demoVehicles.map(v=><SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>)}
        </SelectContent>
      </Select>

      <div style={{marginLeft:'auto',display:'flex',gap:8}}>
        <Button variant="outline" onClick={()=>showToast('Export feature will be available after backend integration')}>Export</Button>
      </div>
    </div>

    {/* Expenses Table */}
    <Card>
      <div className="table-responsive-container">
        <div className="billing-table">
          <div className="head" style={{gridTemplateColumns:'100px 95px 120px 1.4fr 1.2fr 110px 110px 100px 70px'}}>
            <span>Expense ID</span>
            <span>Date</span>
            <span>Category</span>
            <span>Title / Description</span>
            <span>Vehicle</span>
            <span>Paid To</span>
            <span>Account / Method</span>
            <span>Amount</span>
            <span>Actions</span>
          </div>

          {paged.length===0&&<div style={{padding:'40px 0'}}><EmptyState title="No expenses found" description="Adjust your filters or add a new expense record"/></div>}

          {paged.map(e=>(
            <div key={e.id} style={{gridTemplateColumns:'100px 95px 120px 1.4fr 1.2fr 110px 110px 100px 70px'}}>
              <span style={{fontSize:11,color:'#6a7c83'}}>{e.id}</span>
              <span style={{fontSize:11,color:'#6a7c83'}}>{e.date}</span>
              <span><span className="badge badge-neutral" style={{fontSize:10}}>{e.category}</span></span>
              <span><b style={{fontSize:12,color:'#1e3947'}}>{e.title}</b></span>
              <span style={{fontSize:11}}>
                {e.vehicleReg?(
                  <span style={{color:'#215b70',fontWeight:500}}>{e.vehicleReg}</span>
                ):(
                  <span style={{color:'#94a3b8',fontStyle:'italic'}}>General Office</span>
                )}
              </span>
              <span style={{fontSize:11}}>{e.paidTo}</span>
              <span style={{fontSize:11}}>
                <span style={{display:'block',color:'#1e3947'}}>{e.account}</span>
                <span style={{fontSize:10,color:'#6a7c83'}}>{e.paymentMethod}</span>
              </span>
              <span className="nums" style={{fontSize:12,fontWeight:700,color:'#b04b46'}}>{fmt(e.amount)}</span>
              <span className="row-actions">
                <button className="text-button" onClick={()=>setViewExp(e)} title="View Voucher"><Eye size={14}/></button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages>1&&<div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0 4px',justifyContent:'flex-end',fontSize:12,color:'#6a7c83'}}>
        <span>Page {page} of {totalPages} ({filtered.length} expenses)</span>
        <button className="text-button" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}><ChevronLeft size={16}/></button>
        <button className="text-button" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}><ChevronRight size={16}/></button>
      </div>}
    </Card>

    {/* Add Expense Modal */}
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent style={{maxWidth:600,maxHeight:'90vh',overflowY:'auto'}}>
        <DialogHeader>
          <DialogTitle>Record New Expense</DialogTitle>
          <DialogDescription>Log an operational or vehicle-related expenditure.</DialogDescription>
        </DialogHeader>

        <div className="entry-form">
          <div className="form-grid">
            <label>
              <span className="field-label">Date *</span>
              <Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            </label>

            <label>
              <span className="field-label">Category *</span>
              <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v as ExpenseCategory}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Amount (BDT) *</span>
              <Input type="number" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
              {errors.amount&&<span className="field-error">{errors.amount}</span>}
            </label>

            <label>
              <span className="field-label">Paid To / Recipient *</span>
              <Input placeholder="e.g. Padma Filling Station" value={form.paidTo} onChange={e=>setForm(f=>({...f,paidTo:e.target.value}))}/>
              {errors.paidTo&&<span className="field-error">{errors.paidTo}</span>}
            </label>

            <label>
              <span className="field-label">Payment Method</span>
              <Select value={form.paymentMethod} onValueChange={v=>setForm(f=>({...f,paymentMethod:v as PaymentMethod}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Source Account</span>
              <Select value={form.account} onValueChange={v=>setForm(f=>({...f,account:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {demoAccounts.map(a=><SelectItem key={a.id} value={a.name}>{a.name} ({fmt(a.currentBalance)})</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label>
            <span className="field-label">Title / Particulars *</span>
            <Input placeholder="Brief title explaining the expense" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
            {errors.title&&<span className="field-error">{errors.title}</span>}
          </label>

          <div className="form-grid">
            <label>
              <span className="field-label">Related Vehicle (Optional)</span>
              <Select value={form.vehicleId||'NONE'} onValueChange={v=>setForm(f=>({...f,vehicleId:v==='NONE'?'':v}))}>
                <SelectTrigger><SelectValue placeholder="Office / None"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Office / General Expense —</SelectItem>
                  {demoVehicles.map(v=><SelectItem key={v.id} value={v.id}>{v.registration} ({v.model})</SelectItem>)}
                </SelectContent>
              </Select>
            </label>

            <label>
              <span className="field-label">Voucher / Bill Reference</span>
              <Input placeholder="e.g. BILL-9912" value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))}/>
            </label>
          </div>

          <label>
            <span className="field-label">Note / Remark</span>
            <Input placeholder="Optional additional remarks" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Save Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* View Expense Voucher Modal */}
    <Dialog open={!!viewExp} onOpenChange={o=>!o&&setViewExp(null)}>
      <DialogContent style={{maxWidth:500}}>
        <DialogHeader>
          <DialogTitle>Expense Voucher – {viewExp?.id}</DialogTitle>
          <DialogDescription>TASIN ENTERPRISE Payment Voucher</DialogDescription>
        </DialogHeader>

        {viewExp&&(
          <div style={{marginTop:12}}>
            <div className="detail-relations" style={{gridTemplateColumns:'1fr 1fr',gap:11}}>
              {[
                ['Voucher ID',viewExp.id],
                ['Date',viewExp.date],
                ['Category',viewExp.category],
                ['Amount',fmt(viewExp.amount)],
                ['Payment Method',viewExp.paymentMethod],
                ['Disbursing Account',viewExp.account],
                ['Paid To',viewExp.paidTo],
                ['Reference',viewExp.reference||'None'],
                ['Related Vehicle',viewExp.vehicleReg||'General Office Expense'],
              ].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}
            </div>

            <div style={{marginTop:14}}>
              <span className="field-label">Title / Particulars</span>
              <p style={{fontSize:13,color:'#1e3947',fontWeight:600}}>{viewExp.title}</p>
            </div>

            {viewExp.note&&(
              <div style={{marginTop:8}}>
                <span className="field-label">Note</span>
                <p style={{fontSize:12,color:'#4f6169'}}>{viewExp.note}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Toast notification */}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </>;
}
