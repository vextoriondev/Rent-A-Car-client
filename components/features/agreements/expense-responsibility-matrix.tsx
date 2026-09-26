import type {Agreement} from '@/lib/demo';

/** Read-only fuel/repair rows from the agreement's stored rules. The full editable category matrix needs a backend ExpenseRule model (later phase). */
export function ExpenseResponsibilityMatrix({agreement}:{agreement:Agreement}){
 const rows:[string,string][]=[['Fuel',agreement.rules.fuel],['Repair',agreement.rules.repair]];
 return <div>
  <h3 className="detail-subheading">Expense responsibility</h3>
  <div className="terms">{rows.map(([category,responsible])=><div key={category}><span>{category}</span><b>{responsible}</b></div>)}</div>
</div>;
}
