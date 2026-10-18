import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-stock-summary',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './stock-summary.component.html',
})
export class StockSummaryComponent implements OnInit {
  items: any[] = [];
  grandValuation = 0;

  constructor(
    private masters: MastersService,
    public tenant: TenantService,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => this.loadStock(),
    });
  }

  loadStock() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getStockSummary(compId).subscribe({
      next: (res) => {
        this.items = res || [];
        this.grandValuation = this.items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
      },
    });
  }
}
