import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';
import { ZenoItemFastEntryComponent } from '../../../shared/ui/zeno-item-fast-entry.component';

@Component({
  selector: 'app-delivery-challans',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './delivery-challans.component.html',
})
export class DeliveryChallansComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  challans: any[] = [];
  customers: any[] = [];
  godowns: any[] = [];
  itemsList: any[] = [];
  loading = false;
  submitting = false;
  loadingPendingOrders = false;
  showPendingOrdersModal = false;
  pendingOrdersList: any[] = [];
  selectedOrderIds: string[] = [];

  searchQuery = '';
  selectedStatus = '';
  selectedChallan: any = null;

  Number = Number;

  newDc: any = {
    customerLedgerId: '',
    godownId: '',
    challanDate: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    driverContact: '',
    dispatchAddress: '',
    soIds: [] as string[],
    items: [
      { itemId: '', dispatchedQty: 1, rate: 0, remarks: '', soItemId: null }
    ]
  };

  constructor(
    private salesService: SalesService,
    private tenantService: TenantService,
    private mastersService: MastersService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadChallans();
    this.loadMasters();
  }

  get companyId(): string {
    return this.tenantService.currentCompany()?.id || '';
  }

  get branchId(): string {
    return this.tenantService.currentBranch()?.id || '';
  }

  get pendingCount(): number {
    return this.challans.filter(c => c.status === 'PENDING').length;
  }

  get clearedCount(): number {
    return this.challans.filter(c => c.status === 'CLEARED').length;
  }

  loadChallans() {
    if (!this.companyId) return;
    this.loading = true;
    this.salesService.getDeliveryChallans(this.companyId, this.selectedStatus, this.searchQuery).subscribe({
      next: (res) => {
        this.challans = res || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getChallanTotal(): number {
    return (this.newDc?.items || []).reduce((sum: number, r: any) => sum + (Number(r.dispatchedQty || 0) * Number(r.rate || 0)), 0);
  }

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.itemsList.find(i => i.id === itemId);
    return item ? (item.name || item.itemName) : 'Selected Item';
  }

  loadMasters() {
    if (!this.companyId) return;
    this.mastersService.getLedgers(this.companyId, false, true).subscribe((data) => {
      this.customers = data || [];
    });
    this.mastersService.getItems(this.companyId).subscribe((data) => {
      this.itemsList = data || [];
    });
    const defaultGodowns = this.tenantService.godowns();
    if (defaultGodowns && defaultGodowns.length > 0) {
      this.godowns = defaultGodowns;
    } else {
      this.godowns = [
        { id: this.tenantService.currentGodown()?.id || 'main-godown', name: 'Main Godown', code: 'MAIN' }
      ];
    }
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.loadChallans();
  }

  openCreateModal() {
    this.newDc = {
      customerLedgerId: '',
      godownId: this.godowns[0]?.id || '',
      challanDate: new Date().toISOString().split('T')[0],
      vehicleNo: '',
      driverContact: '',
      dispatchAddress: '',
      soIds: [],
      items: [
        { itemId: '', dispatchedQty: 1, rate: 0, remarks: '', soItemId: null }
      ]
    };
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedChallan = null;
    this.loadChallans();
  }

  onCustomerSelected() {
    const cust = this.customers.find(c => c.id === this.newDc.customerLedgerId);
    if (cust) {
      this.newDc.dispatchAddress = cust.addressLine1 || '';
    }
    if (this.newDc.customerLedgerId) {
      this.openPendingOrdersModal();
    }
  }

  addItemRow() {
    this.newDc.items.push({
      itemId: '',
      dispatchedQty: 1,
      rate: 0,
      remarks: '',
      soItemId: null
    });
  }

  editingItemData: { item: any, index: number } | null = null;

  getUnitCode(row: any): string {
    if (row.unitCode) return row.unitCode;
    if (row.itemId) {
      const it = this.itemsList.find(i => i.id === row.itemId);
      const uVal = it?.unitCode || it?.unit;
      return typeof uVal === 'object' ? (uVal.code || uVal.name || 'Pcs') : (uVal || 'Pcs');
    }
    return 'Pcs';
  }

  onFastItemAdded(itemData: any) {
    if (this.newDc.items.length === 1 && !this.newDc.items[0].itemId) {
      this.newDc.items = [];
    }
    this.newDc.items.push({
      itemId: itemData.itemId,
      dispatchedQty: itemData.qty,
      rate: itemData.rate,
      remarks: '',
      soItemId: null
    });
    this.recalculateTotals();
  }

  editItemRow(index: number) {
    const row = this.newDc.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.dispatchedQty,
          rate: row.rate,
          discount: 0,
          gstRate: 0
        },
        index
      };
    }
  }

  onFastItemUpdated(itemData: any) {
    if (this.editingItemData !== null && this.editingItemData.index >= 0) {
      const idx = this.editingItemData.index;
      if (this.newDc.items[idx]) {
        this.newDc.items[idx].itemId = itemData.itemId;
        this.newDc.items[idx].dispatchedQty = itemData.qty;
        this.newDc.items[idx].rate = itemData.rate;
      }
      this.editingItemData = null;
      this.recalculateTotals();
    }
  }

  removeItemRow(index: number) {
    if (this.editingItemData?.index === index) {
      this.editingItemData = null;
    }
    this.newDc.items.splice(index, 1);
    this.recalculateTotals();
  }

  onItemSelect(row: any) {
    const it = this.itemsList.find(i => i.id === row.itemId);
    if (it) {
      row.rate = Number(it.saleRate || 0);
    }
  }

  openPendingOrdersModal() {
    if (!this.newDc.customerLedgerId) return;
    this.showPendingOrdersModal = true;
    this.loadingPendingOrders = true;
    this.selectedOrderIds = [];
    this.pendingOrdersList = [];

    this.salesService.getCustomerPendingOrders(this.newDc.customerLedgerId, this.companyId).subscribe({
      next: (orders) => {
        this.loadingPendingOrders = false;
        this.pendingOrdersList = (orders || []).filter(order => {
          return (order.items || []).some((item: any) => {
            const pendingQty = Number(item.orderedQty || 0) - Number(item.dispatchedQty || 0);
            return pendingQty > 0;
          });
        });
        // Select all available orders by default
        this.selectedOrderIds = this.pendingOrdersList.map(o => o.id);
      },
      error: () => {
        this.loadingPendingOrders = false;
        this.pendingOrdersList = [];
      }
    });
  }

  closePendingOrdersModal() {
    this.showPendingOrdersModal = false;
  }

  isOrderSelected(orderId: string): boolean {
    return this.selectedOrderIds.includes(orderId);
  }

  toggleOrderSelection(orderId: string) {
    const idx = this.selectedOrderIds.indexOf(orderId);
    if (idx > -1) {
      this.selectedOrderIds.splice(idx, 1);
    } else {
      this.selectedOrderIds.push(orderId);
    }
  }

  isAllOrdersSelected(): boolean {
    return this.pendingOrdersList.length > 0 && this.selectedOrderIds.length === this.pendingOrdersList.length;
  }

  toggleSelectAllOrders() {
    if (this.isAllOrdersSelected()) {
      this.selectedOrderIds = [];
    } else {
      this.selectedOrderIds = this.pendingOrdersList.map(o => o.id);
    }
  }

  applySelectedOrders() {
    if (this.selectedOrderIds.length === 0) {
      this.closePendingOrdersModal();
      return;
    }

    const selectedOrders = this.pendingOrdersList.filter(o => this.selectedOrderIds.includes(o.id));
    const lines: any[] = [];
    const soIds: string[] = [];

    for (const order of selectedOrders) {
      soIds.push(order.id);
      for (const item of order.items || []) {
        const pendingQty = Number(item.orderedQty || 0) - Number(item.dispatchedQty || 0);
        if (pendingQty > 0) {
          lines.push({
            itemId: item.itemId,
            dispatchedQty: pendingQty,
            rate: Number(item.rate || 0),
            remarks: `SO #${order.voucherNo}`,
            soItemId: item.id
          });
        }
      }
    }

    if (lines.length > 0) {
      this.newDc.items = lines;
      this.newDc.soIds = soIds;
      this.toast.success(`Loaded ${lines.length} line item(s) from ${selectedOrders.length} sales order(s).`, 'Orders Loaded');
    }

    this.closePendingOrdersModal();
  }

  getPendingItemsSummary(order: any): any[] {
    return (order.items || [])
      .filter((item: any) => (Number(item.orderedQty || 0) - Number(item.dispatchedQty || 0)) > 0)
      .map((item: any) => ({
        itemId: item.itemId,
        itemName: item.item?.name || this.getItemName(item.itemId) || 'Item',
        unit: item.unit?.code || 'Pcs',
        pendingQty: Number(item.orderedQty || 0) - Number(item.dispatchedQty || 0)
      }));
  }

  getSelectedCustomerName(): string {
    const cust = this.customers.find(c => c.id === this.newDc.customerLedgerId);
    return cust ? (cust.name || 'Selected Customer') : 'Customer';
  }

  recalculateTotals() {
    // triggers UI update for line totals
  }

  isValidChallan(): boolean {
    return (
      !!this.newDc.customerLedgerId &&
      !!this.newDc.godownId &&
      this.newDc.items.length > 0 &&
      this.newDc.items.every((i: any) => !!i.itemId && Number(i.dispatchedQty) > 0)
    );
  }

  submitChallan() {
    if (!this.isValidChallan()) return;
    this.submitting = true;
    const payload = {
      companyId: this.companyId,
      branchId: this.branchId,
      ...this.newDc
    };

    this.salesService.createDeliveryChallan(payload).subscribe({
      next: (created: any) => {
        this.submitting = false;
        this.toast.success(
          `Delivery Challan ${created?.challanNo || ''} created successfully!`,
          'Challan Created',
        );
        this.viewMode = 'list';
        this.loadChallans();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to create delivery challan';
        this.toast.error(msg, 'Creation Failed');
        alert(msg);
      }
    });
  }

  viewChallan(id: string) {
    this.salesService.getDeliveryChallanById(id).subscribe({
      next: (dc) => {
        this.selectedChallan = dc;
        this.viewMode = 'view';
      }
    });
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'PARTIALLY_INVOICED': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'CLEARED': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  }

  formatStatus(status: string): string {
    return status?.replace(/_/g, ' ') || '';
  }

  exportChallans() {
    if (!this.challans || this.challans.length === 0) return;
    const headers = ['Challan No', 'Date', 'Customer', 'Godown', 'Vehicle No', 'Items Count', 'Status'];
    const rows = this.challans.map((c) => [
      c.voucherNo || c.challanNo || '',
      c.challanDate || '',
      c.customerLedger?.name || '',
      c.godown?.name || '',
      c.vehicleNo || '',
      c.items?.length || 0,
      c.status || ''
    ]);
    exportToCsv('Delivery_Challans', headers, rows);
    this.toast.success('Delivery challans exported successfully!', 'Export Complete');
  }
}
