import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './balance-sheet.component.html',
})
export class BalanceSheetComponent implements OnInit {
  loading = false;
  error = false;
  data: any = null;
  asOfDate = '';
  Math = Math;
  
  groupedLiabilities: any[] = [];
  groupedAssets: any[] = [];

  constructor(private masters: MastersService, public tenant: TenantService) {}

  ngOnInit() {
    const now = new Date();
    this.asOfDate = now.toISOString().split('T')[0];
    this.tenant.loadHierarchy().subscribe({ next: () => this.load() });
  }

  load() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.loading = true;
    this.error = false;
    this.masters.getBalanceSheet(compId, this.asOfDate).subscribe({
      next: (res) => { 
        this.data = res; 
        this.groupData();
        this.loading = false; 
      },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  groupData() {
    this.groupedLiabilities = this.groupByGroup(this.data.liabilityRows || []);
    this.groupedAssets = this.groupByGroup(this.data.assetRows || []);
  }

  groupByGroup(rows: any[]) {
    const groupsMap = new Map<string, any>();
    for (const r of rows) {
      if (!groupsMap.has(r.groupId)) {
        groupsMap.set(r.groupId, {
          groupId: r.groupId,
          groupName: r.groupName,
          amount: 0,
          expanded: false,
          ledgers: []
        });
      }
      const g = groupsMap.get(r.groupId);
      g.amount += r.amount;
      g.ledgers.push(r);
    }
    return Array.from(groupsMap.values());
  }

  toggleGroup(g: any) {
    g.expanded = !g.expanded;
  }
}
