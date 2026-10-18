import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { MastersService } from '../../../core/services/masters.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';

interface AdjustmentLineItem {
  itemId: string;
  variantId?: string | null;
  adjustmentType: 'INCREASE' | 'DECREASE';
  qty: number;
  unitRate: number;
  totalAmount: number;
  reason?: string;
  availableStock?: number;
}

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-adjustment.component.html',
})
export class StockAdjustmentComponent implements OnInit {
  viewMode: 'list' | 'create' = 'list';
  adjustments: any[] = [];
  filteredAdjustments: any[] = [];
  godowns: any[] = [];
  itemsList: any[] = [];
  loading = false;
  submitting = false;
  searchQuery = '';
  reasonFilter = 'ALL';
  statusFilter = 'ALL';
  errorMessage = '';
  selectedAdjustment: any = null;

  totalUnitsAdjusted = 0;
  totalValuationImpact = 0;

  formData = {
    adjustmentDate: new Date().toISOString().split('T')[0],
    godownId: '',
    reason: 'CORRECTION',
    voucherNo: '',
    notes: '',
    items: [] as AdjustmentLineItem[],
  };

  constructor(
    private inventoryService: InventoryService,
    private mastersService: MastersService,
    private tenantService: TenantService,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.loading = true;
    this.inventoryService.getAdjustments(comp.id).subscribe({
      next: (res: any[]) => {
        this.adjustments = res;
        this.filterAdjustments();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.api.get<any[]>('/tenancy/godowns').subscribe({
      next: (res: any[]) => {
        this.godowns = res?.length ? res : this.tenantService.godowns();
      },
    });

    this.mastersService.getItems(comp.id).subscribe({
      next: (res: any[]) => {
        this.itemsList = res;
      },
    });
  }

  filterAdjustments() {
    let list = this.adjustments;
    if (this.statusFilter !== 'ALL') {
      list = list.filter((a) => a.status === this.statusFilter);
    }
    if (this.reasonFilter !== 'ALL') {
      list = list.filter((a) => a.reason === this.reasonFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.voucherNo?.toLowerCase().includes(q) ||
          a.godown?.name?.toLowerCase().includes(q) ||
          a.reason?.toLowerCase().includes(q),
      );
    }
    this.filteredAdjustments = list;

    this.totalUnitsAdjusted = this.adjustments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((acc, curr) => acc + Number(curr.totalQty || 0), 0);
    this.totalValuationImpact = this.adjustments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  }

  exportAdjustments() {
    if (!this.filteredAdjustments || this.filteredAdjustments.length === 0) return;
    const headers = ['Voucher No', 'Date', 'Warehouse', 'Reason', 'Items Count', 'Total Qty', 'Total Amount', 'Status'];
    const rows = this.filteredAdjustments.map((a) => [
      a.voucherNo || '',
      a.adjustmentDate || '',
      a.godown?.name || '',
      a.reason || '',
      a.items?.length || 0,
      a.totalQty || 0,
      a.totalAmount || 0,
      a.status || ''
    ]);
    exportToCsv('Stock_Adjustments', headers, rows);
    this.toast.success('Stock adjustments exported successfully!', 'Export Complete');
  }

  openCreatePage() {
    this.formData = {
      adjustmentDate: new Date().toISOString().split('T')[0],
      godownId: this.tenantService.currentGodown()?.id || (this.godowns[0]?.id || ''),
      reason: 'CORRECTION',
      voucherNo: '',
      notes: '',
      items: [],
    };
    this.errorMessage = '';
    this.addLineItem();
    this.viewMode = 'create';
  }

  addLineItem() {
    this.formData.items.push({
      itemId: '',
      adjustmentType: 'INCREASE',
      qty: 1,
      unitRate: 0,
      totalAmount: 0,
      availableStock: 0,
      reason: '',
    });
  }

  removeLineItem(index: number) {
    this.formData.items.splice(index, 1);
  }

  onGodownChange() {
    for (const line of this.formData.items) {
      if (line.itemId) {
        this.checkStock(line);
      }
    }
  }

  onItemSelect(line: AdjustmentLineItem) {
    const it = this.itemsList.find((i) => i.id === line.itemId);
    if (it) {
      line.unitRate = Number(it.purchaseRate || it.saleRate || 0);
      this.recalcLine(line);
      this.checkStock(line);
    }
  }

  checkStock(line: AdjustmentLineItem) {
    const comp = this.tenantService.currentCompany();
    if (!comp || !this.formData.godownId || !line.itemId) return;

    this.inventoryService
      .getItemBalance(comp.id, this.formData.godownId, line.itemId)
      .subscribe({
        next: (res) => {
          line.availableStock = Number(res.currentBalance || 0);
        },
      });
  }

  recalcLine(line: AdjustmentLineItem) {
    const qty = Number(line.qty || 0);
    const rate = Number(line.unitRate || 0);
    line.totalAmount = Number((qty * rate).toFixed(2));
  }

  calculateTotalQty(): number {
    return this.formData.items.reduce((acc, curr) => acc + Number(curr.qty || 0), 0);
  }

  calculateTotalAmount(): number {
    return this.formData.items.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  }

  saveAdjustment() {
    this.errorMessage = '';
    if (!this.formData.godownId) {
      this.errorMessage = 'Please select a warehouse.';
      return;
    }
    if (this.formData.items.length === 0) {
      this.errorMessage = 'Please add at least one item line to adjust.';
      return;
    }

    for (const it of this.formData.items) {
      if (!it.itemId) {
        this.errorMessage = 'Please select a product for each line.';
        return;
      }
      if (Number(it.qty) <= 0) {
        this.errorMessage = 'Adjustment quantity must be greater than zero.';
        return;
      }
      if (it.adjustmentType === 'DECREASE' && (it.availableStock || 0) < Number(it.qty)) {
        this.errorMessage = `Cannot decrease more stock than currently available (${it.availableStock} available).`;
        return;
      }
    }

    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.submitting = true;
    const payload = {
      ...this.formData,
      companyId: comp.id,
      status: 'COMPLETED',
    };

    this.inventoryService.createAdjustment(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.toast.success(
          `Stock Adjustment ${res?.voucherNo || ''} posted successfully! Inventory reconciled.`,
          'Adjustment Saved',
        );
        this.viewMode = 'list';
        this.loadData();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to post stock adjustment.';
        this.toast.error(this.errorMessage, 'Adjustment Failed');
      },
    });
  }

  viewDetails(a: any) {
    this.selectedAdjustment = a;
  }

  cancelAdjustment(a: any) {
    if (!confirm(`Are you sure you want to cancel adjustment ${a.voucherNo}? Stock changes will be reversed.`)) {
      return;
    }

    this.inventoryService.cancelAdjustment(a.id).subscribe({
      next: () => {
        this.toast.success(`Stock Adjustment ${a.voucherNo} cancelled and stock reversed.`, 'Adjustment Cancelled');
        this.loadData();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to cancel adjustment';
        this.toast.error(msg, 'Cancellation Failed');
        alert(msg);
      },
    });
  }
}
