import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { MastersService } from '../../../core/services/masters.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';

interface TransferLineItem {
  itemId: string;
  variantId?: string | null;
  transferQty: number;
  unitRate: number;
  totalAmount: number;
  notes?: string;
  availableStock?: number;
}

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-transfer.component.html',
})
export class StockTransferComponent implements OnInit {
  viewMode: 'list' | 'create' = 'list';
  transfers: any[] = [];
  filteredTransfers: any[] = [];
  godowns: any[] = [];
  itemsList: any[] = [];
  loading = false;
  submitting = false;
  searchQuery = '';
  statusFilter = 'ALL';
  errorMessage = '';
  selectedTransfer: any = null;

  totalUnitsMoved = 0;
  totalTransferValue = 0;

  formData = {
    transferDate: new Date().toISOString().split('T')[0],
    sourceGodownId: '',
    destinationGodownId: '',
    voucherNo: '',
    notes: '',
    items: [] as TransferLineItem[],
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
    this.inventoryService.getTransfers(comp.id).subscribe({
      next: (res: any[]) => {
        this.transfers = res;
        this.filterTransfers();
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

  filterTransfers() {
    let list = this.transfers;
    if (this.statusFilter !== 'ALL') {
      list = list.filter((t) => t.status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.voucherNo?.toLowerCase().includes(q) ||
          t.sourceGodown?.name?.toLowerCase().includes(q) ||
          t.destinationGodown?.name?.toLowerCase().includes(q),
      );
    }
    this.filteredTransfers = list;

    this.totalUnitsMoved = this.transfers
      .filter((t) => t.status === 'COMPLETED')
      .reduce((acc, curr) => acc + Number(curr.totalQty || 0), 0);
    this.totalTransferValue = this.transfers
      .filter((t) => t.status === 'COMPLETED')
      .reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  }

  exportTransfers() {
    if (!this.filteredTransfers || this.filteredTransfers.length === 0) return;
    const headers = ['Voucher No', 'Date', 'Source Warehouse', 'Destination Warehouse', 'Items Count', 'Total Qty', 'Total Value', 'Status'];
    const rows = this.filteredTransfers.map((t) => [
      t.voucherNo || '',
      t.transferDate || '',
      t.sourceGodown?.name || '',
      t.destinationGodown?.name || '',
      t.items?.length || 0,
      t.totalQty || 0,
      t.totalAmount || 0,
      t.status || ''
    ]);
    exportToCsv('Stock_Transfers', headers, rows);
    this.toast.success('Stock transfers exported successfully!', 'Export Complete');
  }

  openCreatePage() {
    this.formData = {
      transferDate: new Date().toISOString().split('T')[0],
      sourceGodownId: this.tenantService.currentGodown()?.id || (this.godowns[0]?.id || ''),
      destinationGodownId: '',
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
      transferQty: 1,
      unitRate: 0,
      totalAmount: 0,
      availableStock: 0,
    });
  }

  removeLineItem(index: number) {
    this.formData.items.splice(index, 1);
  }

  onSourceGodownChange() {
    // Refresh stock for each line item
    for (const line of this.formData.items) {
      if (line.itemId) {
        this.checkStock(line);
      }
    }
  }

  onItemSelect(line: TransferLineItem) {
    const it = this.itemsList.find((i) => i.id === line.itemId);
    if (it) {
      line.unitRate = Number(it.purchaseRate || it.saleRate || 0);
      this.recalcLine(line);
      this.checkStock(line);
    }
  }

  checkStock(line: TransferLineItem) {
    const comp = this.tenantService.currentCompany();
    if (!comp || !this.formData.sourceGodownId || !line.itemId) return;

    this.inventoryService
      .getItemBalance(comp.id, this.formData.sourceGodownId, line.itemId)
      .subscribe({
        next: (res) => {
          line.availableStock = Number(res.currentBalance || 0);
        },
      });
  }

  recalcLine(line: TransferLineItem) {
    const qty = Number(line.transferQty || 0);
    const rate = Number(line.unitRate || 0);
    line.totalAmount = Number((qty * rate).toFixed(2));
  }

  calculateTotalQty(): number {
    return this.formData.items.reduce((acc, curr) => acc + Number(curr.transferQty || 0), 0);
  }

  calculateTotalAmount(): number {
    return this.formData.items.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  }

  saveTransfer() {
    this.errorMessage = '';
    if (!this.formData.sourceGodownId) {
      this.errorMessage = 'Please select a source warehouse.';
      return;
    }
    if (!this.formData.destinationGodownId) {
      this.errorMessage = 'Please select a destination warehouse.';
      return;
    }
    if (this.formData.sourceGodownId === this.formData.destinationGodownId) {
      this.errorMessage = 'Source and destination warehouses cannot be the same.';
      return;
    }
    if (this.formData.items.length === 0) {
      this.errorMessage = 'Please add at least one item to transfer.';
      return;
    }

    for (const it of this.formData.items) {
      if (!it.itemId) {
        this.errorMessage = 'Please choose a product for each line.';
        return;
      }
      if (Number(it.transferQty) <= 0) {
        this.errorMessage = 'Transfer quantity must be greater than zero.';
        return;
      }
      if ((it.availableStock || 0) < Number(it.transferQty)) {
        this.errorMessage = `Transfer quantity exceeds available stock for selected product (${it.availableStock} available).`;
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

    this.inventoryService.createTransfer(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.toast.success(
          `Stock Transfer ${res?.voucherNo || ''} completed successfully!`,
          'Transfer Saved',
        );
        this.viewMode = 'list';
        this.loadData();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to save stock transfer.';
        this.toast.error(this.errorMessage, 'Transfer Failed');
      },
    });
  }

  viewDetails(t: any) {
    this.selectedTransfer = t;
  }

  cancelTransfer(t: any) {
    if (!confirm(`Are you sure you want to cancel transfer ${t.voucherNo}? Stock will be reversed.`)) {
      return;
    }

    this.inventoryService.cancelTransfer(t.id).subscribe({
      next: () => {
        this.toast.success(`Stock Transfer ${t.voucherNo} cancelled and stock reversed.`, 'Transfer Cancelled');
        this.loadData();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to cancel stock transfer';
        this.toast.error(msg, 'Cancellation Failed');
        alert(msg);
      },
    });
  }
}
