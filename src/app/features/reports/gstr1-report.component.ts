import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-gstr1-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gstr1-report.component.html',
})
export class Gstr1ReportComponent implements OnInit {
  loading = false;
  startDate = '';
  endDate = '';
  data: any = null;

  constructor(private api: ApiService, public tenant: TenantService) {}

  ngOnInit() {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    this.startDate = `${fy}-04-01`;
    this.endDate = `${fy + 1}-03-31`;

    this.tenant.loadHierarchy().subscribe({
      next: () => this.load()
    });
  }

  load() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.loading = true;
    
    this.api.get<any[]>(`/sales/sales-invoices?companyId=${compId}`).subscribe({
      next: (res) => {
        // Filter by date
        const start = new Date(this.startDate).getTime();
        const end = new Date(this.endDate).getTime();
        
        let filtered = res.filter(inv => {
          if (inv.status === 'CANCELLED') return false;
          const invDate = new Date(inv.invoiceDate).getTime();
          return invDate >= start && invDate <= end;
        });
        
        // Sort by date ascending
        filtered.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

        let taxable = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        
        const invoices = filtered.map(inv => {
          const t = Number(inv.taxableTotal || 0);
          const c = Number(inv.cgstTotal || 0);
          const s = Number(inv.sgstTotal || 0);
          const i = Number(inv.igstTotal || 0);
          
          taxable += t;
          cgst += c;
          sgst += s;
          igst += i;
          
          return {
            id: inv.id,
            voucherNo: inv.voucherNo,
            invoiceDate: inv.invoiceDate,
            customerName: inv.customerLedger?.name || 'Cash',
            customerGstin: inv.customerLedger?.gstin || '',
            taxableTotal: t,
            cgstTotal: c,
            sgstTotal: s,
            igstTotal: i,
            grandTotal: Number(inv.grandTotal || 0)
          };
        });

        this.data = {
          totalInvoices: invoices.length,
          taxableValue: taxable,
          cgst: cgst,
          sgst: sgst,
          igst: igst,
          invoices
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
