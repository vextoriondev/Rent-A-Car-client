# TASIN ENTERPRISE — FINANCIAL RECONCILIATION & AUDIT REPORT
**Audit Period:** Current Fiscal Operations 2026  
**Auditor:** Senior Financial Systems Auditor & DeepMind Agent  
**Entity:** TASIN ENTERPRISE (Rent-A-Car Management System)  
**Author Identity:** `pritom-py <145139160+pritom-bod@users.noreply.github.com>`  

---

## 1. Mathematical Formulas & Precision Enforcements

All currency calculations across backend services and database transactions use `Decimal(12, 2)` or `Decimal(14, 2)` arithmetic to eliminate IEEE 754 floating-point rounding errors.

### A. Invoice Billing Formula
$$\text{Total Invoice Amount} = \text{Subtotal} + \text{Tax} - \text{Discount}$$
$$\text{Remaining Due (Client)} = \text{Total Invoice Amount} - \text{Paid Amount}$$

- Tested with `TasinInvoice` records (`INV-2026-0002`):
  - Subtotal: ৳ 7,500.00
  - Total: ৳ 7,500.00
  - Paid Amount: ৳ 3,000.00
  - Remaining Due: ৳ 4,500.00 (Exact match, variance = ৳ 0.00)

### B. Vehicle Profitability Formula
$$\text{Net Profit} = \text{Duty Income} - \Big(\text{Maintenance Cost} + \text{Fuel/CNG Cost} + \text{Mobil Cost} + \text{Driver Allowance} + \text{Owner Rent}\Big)$$
$$\text{Margin \%} = \left(\frac{\text{Net Profit}}{\text{Duty Income}}\right) \times 100$$

- Verified per-vehicle in `rentals/services/tasin.py` and visualized in the Analytics tab.

### C. Driver Net Salary Formula
$$\text{Net Payable} = \text{Basic Monthly Salary} + \text{Overtime Allowance} + \text{Trip Allowance} - \text{Salary Advance Adjustments}$$

- Duplicate salary payments are blocked per driver per month.

### D. Owner Monthly Settlement Formula
$$\text{Net Payable to Owner} = \text{Agreed Monthly Vehicle Rent} - \text{Maintenance Charged to Owner} - \text{Advance Payouts}$$

---

## 2. Bank & Statement Reconciliation Analysis

- **Reconciliation Endpoint:** `POST /api/tasin/orgs/{org_id}/bank-reconciliation/match`
- **Matching Methodology:**
  1. Exact transaction date matching.
  2. Transaction amount matching (credit vs debit).
  3. Reference code or description keyword similarity.
- Unmatched bank rows are highlighted with variance values in the financial ledger view.

