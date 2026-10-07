"use client";
import {FileDown,Printer} from 'lucide-react';
import {apiMode} from '@/lib/api';
import {downloadCsv,downloadServerCsv,printPdf,type DownloadTable} from '@/lib/downloads';
import {useRentflowStore} from '@/lib/store-context';
import {Button} from '@/components/ui/button';

/** Excel-safe CSV and print-to-PDF for what is on screen. In API mode a full, unfiltered report uses the server export (all rows, audit-logged) via `serverPath`. */
export function DownloadButtons({table,stem,serverPath}:{table:DownloadTable;stem:string;serverPath?:string}){
 const rf=useRentflowStore();
 const csv=async()=>{
  try{
   if(apiMode&&serverPath)await downloadServerCsv(serverPath,stem+'.csv');
   else downloadCsv(table,stem+'.csv');
  }catch(e){rf.setToast((e as Error).message)}
 };
 return <div className="download-buttons">
  <Button variant="outline" onClick={()=>void csv()} title="Opens correctly in Excel, including Bangla text"><FileDown size={16}/> Download CSV</Button>
  <Button variant="outline" onClick={()=>printPdf(table,stem)} title="Opens the print dialog; choose Save as PDF"><Printer size={16}/> Download PDF</Button>
 </div>;
}
