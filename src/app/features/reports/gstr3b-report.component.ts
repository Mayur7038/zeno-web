import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-gstr3b-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gstr3b-report.component.html',
})
export class Gstr3bReportComponent implements OnInit {
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
    
    const sales$ = this.api.get<any[]>(`/sales/sales-invoices?companyId=${compId}`);
    const purchases$ = this.api.get<any[]>(`/procure-to-pay/purchase-invoices?companyId=${compId}`);
    
    forkJoin([sales$, purchases$]).subscribe({
      next: ([salesRes, purchaseRes]) => {
        const start = new Date(this.startDate).getTime();
        const end = new Date(this.endDate).getTime();
        
        let outTaxable = 0; let outCgst = 0; let outSgst = 0; let outIgst = 0;
        salesRes.forEach(inv => {
          if (inv.status === 'CANCELLED') return;
          const dt = new Date(inv.invoiceDate).getTime();
          if (dt >= start && dt <= end) {
            outTaxable += Number(inv.taxableTotal || 0);
            outCgst += Number(inv.cgstTotal || 0);
            outSgst += Number(inv.sgstTotal || 0);
            outIgst += Number(inv.igstTotal || 0);
          }
        });

        let inTaxable = 0; let inCgst = 0; let inSgst = 0; let inIgst = 0;
        purchaseRes.forEach(inv => {
          if (inv.status === 'CANCELLED') return;
          const dt = new Date(inv.invoiceDate).getTime();
          if (dt >= start && dt <= end) {
            inTaxable += Number(inv.taxableTotal || 0);
            inCgst += Number(inv.cgstTotal || 0);
            inSgst += Number(inv.sgstTotal || 0);
            inIgst += Number(inv.igstTotal || 0);
          }
        });

        this.data = {
          outward: { taxable: outTaxable, cgst: outCgst, sgst: outSgst, igst: outIgst },
          inward: { taxable: inTaxable, cgst: inCgst, sgst: inSgst, igst: inIgst }
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
