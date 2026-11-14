# TASIN ENTERPRISE — SECURITY AUDIT & RBAC CONFORMANCE REPORT
**Classification:** Internal Security Architecture Audit  
**System:** TASIN ENTERPRISE Rent-A-Car Management System  
**Audit Date:** November 14, 2026  
**Author Identity:** `pritom-py <145139160+pritom-bod@users.noreply.github.com>`  

---

## 1. Role-Based Access Control (RBAC) Matrix

TASIN ENTERPRISE enforces a strict 5-tier role hierarchy based on the client's official organizational structure:

| Capability / Module | Super Admin | Admin | Accountant | Operations Manager | Staff |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard (Executive KPIs)** | Full | Full | Financial Only | Operations Only | View Duties |
| **Fleet / Vehicles Management** | Full | Full | Read Only | Full | Read Only |
| **Vehicle Paper Expiry Management** | Full | Full | Read Only | Full | Read Only |
| **Driver Profile & Attendance Register**| Full | Full | Read Only | Full | Mark Attendance |
| **Owner Records & Payables** | Full | Full | Full | Read Only | No Access |
| **Client Management & Contracts** | Full | Full | Read Only | Full | No Access |
| **Daily Operations / Duties** | Full | Full | Read Only | Full | View & Update |
| **Trip Sheet Dispatch (SMS/WhatsApp)**| Full | Full | No Access | Full | Full |
| **Operating Expenses Management** | Full | Full | Full | Create Only | No Access |
| **Garage Directory & Maintenance** | Full | Full | Full | Full | Read Only |
| **Spare Parts Inventory** | Full | Full | Read Only | Full | No Access |
| **Billing & Invoices Engine** | Full | Full | Full | Read Only | No Access |
| **Cash & Bank Accounts Ledger** | Full | Full | Full | No Access | No Access |
| **Bank Statement Reconciliation** | Full | Full | Full | No Access | No Access |
| **Debtor Follow-up Management** | Full | Full | Full | Full | No Access |
| **Ad-Hoc Custom Report Builder** | Full | Full | Full | Full | No Access |
| **System Settings & User Management**| Full | Full | No Access | No Access | No Access |
| **Database Backup & Disaster Recovery**| Full | Full | No Access | No Access | No Access |
| **Append-Only Audit Logs** | Full | Read Only | Read Only | No Access | No Access |

---

## 2. Multi-Tenant Organization Isolation

- **Tenant Isolation:** Every operational and financial query filters strictly by `organization_id`.
- **Private Documents:** Document uploads write to secure directories (`private_media/org_<id>/<entity>/`) with authentication tokens required for retrieval.
- **Append-Only Audit Log:** The `AuditEvent` model strictly blocks `UPDATE` and `DELETE` queries at the database model layer:
  ```python
  def save(self, *args, **kwargs):
      if self.pk:
          raise RuntimeError("AuditEvent is append-only.")
      super().save(*args, **kwargs)

  def delete(self, *args, **kwargs):
      raise RuntimeError("AuditEvent cannot be deleted.")
  ```

