import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-ledger-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ledger-report.component.html',
})
export class LedgerReportComponent implements OnInit {
  loading = false;
  error = false;
  ledgers: any[] = [];
  selectedLedgerId = '';
  startDate = '';
  endDate = '';
  data: any = null;
  Math = Math;

  constructor(private masters: MastersService, public tenant: TenantService) {}

  ngOnInit() {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    this.startDate = `${fy}-04-01`;
    this.endDate = `${fy + 1}-03-31`;

    this.tenant.loadHierarchy().subscribe({
      next: () => {
        const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
        if (compId) {
          this.masters.getLedgers(compId).subscribe(res => {
            this.ledgers = res;
          });
        }
      }
    });
  }

  load() {
    if (!this.selectedLedgerId) {
      this.data = null;
      return;
    }
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.loading = true;
    this.error = false;
    this.masters.getLedgerStatement(compId, this.selectedLedgerId, this.startDate, this.endDate).subscribe({
      next: (res) => { this.data = res; this.loading = false; },
      error: () => { this.loading = false; this.error = true; }
    });
  }
}
