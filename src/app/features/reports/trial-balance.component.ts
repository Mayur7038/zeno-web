import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './trial-balance.component.html',
})
export class TrialBalanceComponent implements OnInit {
  rows: any[] = [];
  totalDebit = 0;
  totalCredit = 0;
  isBalanced = true;
  Math = Math;

  constructor(
    private masters: MastersService,
    public tenant: TenantService,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => this.loadTrialBalance(),
    });
  }

  loadTrialBalance() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getTrialBalance(compId).subscribe({
      next: (res) => {
        this.rows = res.rows || [];
        this.totalDebit = res.totalDebit || 0;
        this.totalCredit = res.totalCredit || 0;
        this.isBalanced = res.isBalanced;
      },
    });
  }
}
