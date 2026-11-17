"use client";
import Link from 'next/link';
import {DailyReport} from '@/components/features/finance/daily-report';

export default function DailyReportPage(){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div className="no-print" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <h1 style={{fontSize:20,fontWeight:800,margin:0}}>Daily Income &amp; Expense Report</h1>
        <Link href="/expenses" style={{fontSize:13,color:'#1677ff'}}>← Back to Expenses</Link>
      </div>
      <DailyReport/>
    </div>
  );
}
