import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { MastersService } from '../../../core/services/masters.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';

interface OpeningItemRow {
  itemId: string;
  itemName: string;
  sku: string;
  itemGroupName: string;
  unitCode: string;
  openingQty: number;
  unitRate: number;
  totalValue: number;
  effectiveDate?: string;
  isModified?: boolean;
}

@Component({
  selector: 'app-opening-balance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './opening-balance.component.html',
})
export class OpeningBalanceComponent implements OnInit {
  godowns: any[] = [];
  selectedGodownId = '';
  effectiveDate = '2026-04-01'; // Default beginning of Indian FY or current year

  items: OpeningItemRow[] = [];
  filteredItems: OpeningItemRow[] = [];
  stockGroups: string[] = [];

  loading = false;
  submitting = false;
  searchQuery = '';
  groupFilter = 'ALL';
  configuredOnly = 'ALL';
  errorMessage = '';
  saveSuccessMessage = '';

  configuredCount = 0;
  totalQty = 0;
  totalValuation = 0;

  constructor(
    private inventoryService: InventoryService,
    private mastersService: MastersService,
    private tenantService: TenantService,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.api.get<any[]>('/tenancy/godowns').subscribe({
      next: (res: any[]) => {
        this.godowns = res?.length ? res : this.tenantService.godowns();
        if (this.godowns.length > 0) {
          const current = this.tenantService.currentGodown();
          this.selectedGodownId = current?.id || this.godowns[0].id;
          this.loadOpeningBalances();
        }
      },
    });
  }

  loadOpeningBalances() {
    if (!this.selectedGodownId) {
      this.items = [];
      this.filteredItems = [];
      return;
    }

    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.loading = true;
    this.errorMessage = '';
    this.saveSuccessMessage = '';

    this.inventoryService.getOpeningBalances(comp.id, this.selectedGodownId).subscribe({
      next: (res) => {
        this.items = res.map((r: any) => ({
          itemId: r.itemId,
          itemName: r.itemName,
          sku: r.sku,
          itemGroupName: r.itemGroupName || 'General',
          unitCode: r.unitCode || 'NOS',
          openingQty: Number(r.openingQty || 0),
          unitRate: Number(r.unitRate || 0),
          totalValue: Number(r.totalValue || 0),
          effectiveDate: r.effectiveDate,
          isModified: false,
        }));

        // Set effective date from first record if exists
        const withDate = this.items.find((i) => i.effectiveDate);
        if (withDate && withDate.effectiveDate) {
          this.effectiveDate = withDate.effectiveDate;
        }

        // Distinct stock groups
        this.stockGroups = Array.from(new Set(this.items.map((i) => i.itemGroupName)));

        this.filterItems();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to load opening balances';
      },
    });
  }

  filterItems() {
    let list = this.items;

    if (this.groupFilter !== 'ALL') {
      list = list.filter((i) => i.itemGroupName === this.groupFilter);
    }

    if (this.configuredOnly === 'WITH_STOCK') {
      list = list.filter((i) => i.openingQty > 0);
    } else if (this.configuredOnly === 'ZERO_STOCK') {
      list = list.filter((i) => i.openingQty === 0);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.itemGroupName.toLowerCase().includes(q),
      );
    }

    this.filteredItems = list;
    this.recalcTotals();
  }

  onLineChange(item: OpeningItemRow) {
    const qty = Number(item.openingQty || 0);
    const rate = Number(item.unitRate || 0);
    item.totalValue = Number((qty * rate).toFixed(2));
    item.isModified = true;
    this.recalcTotals();
  }

  recalcTotals() {
    this.configuredCount = this.items.filter((i) => i.openingQty > 0).length;
    this.totalQty = this.items.reduce((acc, curr) => acc + Number(curr.openingQty || 0), 0);
    this.totalValuation = this.items.reduce((acc, curr) => acc + Number(curr.totalValue || 0), 0);
  }

  saveOpeningBalances() {
    if (!this.selectedGodownId) {
      alert('Please select a warehouse');
      return;
    }
    if (!this.effectiveDate) {
      alert('Please set an effective date');
      return;
    }

    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.submitting = true;
    this.errorMessage = '';
    this.saveSuccessMessage = '';

    const payload = {
      companyId: comp.id,
      godownId: this.selectedGodownId,
      effectiveDate: this.effectiveDate,
      items: this.items.map((it) => ({
        itemId: it.itemId,
        openingQty: Number(it.openingQty || 0),
        unitRate: Number(it.unitRate || 0),
      })),
    };

    this.inventoryService.updateOpeningBalances(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.saveSuccessMessage = 'Opening balances updated and committed to stock ledger successfully!';
        this.toast.success(
          `Opening balances saved! ${this.configuredCount} products updated with total valuation ₹${Number(this.totalValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
          'Opening Balances Saved',
        );
        this.loadOpeningBalances();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to save opening balances';
        this.toast.error(this.errorMessage, 'Save Failed');
      },
    });
  }

  exportOpeningBalances() {
    if (!this.filteredItems || this.filteredItems.length === 0) return;
    const headers = ['Product Name', 'SKU', 'Stock Group', 'Unit', 'Opening Qty', 'Unit Rate', 'Total Value'];
    const rows = this.filteredItems.map((item) => [
      item.itemName || '',
      item.sku || '',
      item.itemGroupName || '',
      item.unitCode || '',
      item.openingQty || 0,
      item.unitRate || 0,
      item.totalValue || 0
    ]);
    exportToCsv('Opening_Stock_Balances', headers, rows);
    this.toast.success('Opening stock balances exported successfully!', 'Export Complete');
  }
}
