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
  selector: 'app-sales-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './sales-orders.component.html',
})
export class SalesOrdersComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  orders: any[] = [];
  customers: any[] = [];
  items: any[] = [];
  loading = false;
  submitting = false;

  searchQuery = '';
  selectedStatus = '';
  selectedOrder: any = null;

  Number = Number;
  Math = Math;

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.items.find(i => i.id === itemId);
    return item ? (item.name || item.itemName) : 'Selected Item';
  }

  getUnitCode(row: any): string {
    if (!row) return 'Pcs';
    const val = row.unitCode || row.unit;
    if (!val) return 'Pcs';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.code || val.name || val.unitCode || 'Pcs';
    return String(val);
  }

  createDefaultGridRows(count = 1): any[] {
    const compState = this.tenantService.currentCompany()?.stateCode || '27';
    const cust = this.customers.find(c => c.id === this.newOrder?.customerLedgerId);
    const isInter = cust && (compState !== (cust.stateCode || '27'));
    return Array.from({ length: count }, () => ({
      itemId: '',
      orderedQty: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxRate: 18,
      unitCode: 'Pcs',
      isInterstate: !!isInter
    }));
  }

  // New order form model
  newOrder: any = {
    customerLedgerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDueDate: '',
    paymentTerms: 'Net 30 Days',
    billingAddress: '',
    shippingAddress: '',
    narration: '',
    items: []
  };

  modalTotals = {
    taxableSubtotal: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    grandTotal: 0
  };

  constructor(
    private salesService: SalesService,
    private tenantService: TenantService,
    private mastersService: MastersService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.loadMasters();
  }

  get companyId(): string {
    return this.tenantService.currentCompany()?.id || '';
  }

  get branchId(): string {
    return this.tenantService.currentBranch()?.id || '';
  }

  get pendingCount(): number {
    return this.orders.filter(o => o.status === 'PENDING').length;
  }

  get clearedCount(): number {
    return this.orders.filter(o => o.status === 'CLEARED').length;
  }

  get totalPipelineValue(): number {
    return this.orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  }

  loadOrders() {
    if (!this.companyId) return;
    this.loading = true;
    this.salesService.getSalesOrders(this.companyId, this.selectedStatus, this.searchQuery).subscribe({
      next: (res) => {
        this.orders = res || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadMasters() {
    if (!this.companyId) return;
    this.mastersService.getLedgers(this.companyId, false, true).subscribe((data) => {
      this.customers = data || [];
    });
    this.mastersService.getItems(this.companyId).subscribe((data) => {
      this.items = data || [];
    });
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.loadOrders();
  }

  openCreateModal() {
    this.newOrder = {
      customerLedgerId: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDueDate: '',
      paymentTerms: 'Net 30 Days',
      billingAddress: '',
      shippingAddress: '',
      narration: '',
      items: []
    };
    this.recalculateTotals();
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedOrder = null;
    this.loadOrders();
  }

  onCustomerSelected() {
    const cust = this.customers.find(c => c.id === this.newOrder.customerLedgerId);
    if (cust) {
      this.newOrder.billingAddress = cust.addressLine1 || '';
      this.newOrder.shippingAddress = cust.addressLine1 || '';
      const compState = this.tenantService.currentCompany()?.stateCode || '27';
      const custState = cust.stateCode || '27';
      const isInter = compState !== custState;
      this.newOrder.items.forEach((it: any) => it.isInterstate = isInter);
      this.recalculateTotals();
    }
  }

  addItemRow() {
    const compState = this.tenantService.currentCompany()?.stateCode || '27';
    const cust = this.customers.find(c => c.id === this.newOrder.customerLedgerId);
    const isInter = cust && (compState !== (cust.stateCode || '27'));
    this.newOrder.items.push({
      itemId: '',
      orderedQty: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxRate: 18,
      unitCode: 'Pcs',
      isInterstate: !!isInter
    });
  }

  editingItemData: { item: any, index: number } | null = null;

  onFastItemAdded(itemData: any) {
    const compState = this.tenantService.currentCompany()?.stateCode || '27';
    const cust = this.customers.find(c => c.id === this.newOrder.customerLedgerId);
    const isInter = cust && (compState !== (cust.stateCode || '27'));
    const it = this.items.find(i => i.id === itemData.itemId);
    const uVal = it?.unitCode || it?.unit;
    const uStr = typeof uVal === 'object' ? (uVal.code || uVal.name || 'Pcs') : (uVal || 'Pcs');
    
    let emptyRow = this.newOrder.items.find((r: any) => !r.itemId);
    if (emptyRow) {
      emptyRow.itemId = itemData.itemId;
      emptyRow.orderedQty = itemData.qty;
      emptyRow.unitPrice = itemData.rate;
      emptyRow.discountAmount = itemData.discount;
      emptyRow.taxRate = itemData.gstRate;
      emptyRow.unitCode = uStr;
      emptyRow.isInterstate = !!isInter;
    } else {
      this.newOrder.items.push({
        itemId: itemData.itemId,
        orderedQty: itemData.qty,
        unitPrice: itemData.rate,
        discountAmount: itemData.discount,
        taxRate: itemData.gstRate,
        unitCode: uStr,
        isInterstate: !!isInter
      });
    }
    this.recalculateTotals();
  }

  editItemRow(index: number) {
    const row = this.newOrder.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.orderedQty,
          rate: row.unitPrice,
          discount: row.discountAmount,
          gstRate: row.taxRate
        },
        index
      };
    }
  }

  onFastItemUpdated(itemData: any) {
    if (this.editingItemData !== null && this.editingItemData.index >= 0) {
      const idx = this.editingItemData.index;
      if (this.newOrder.items[idx]) {
        this.newOrder.items[idx].itemId = itemData.itemId;
        this.newOrder.items[idx].orderedQty = itemData.qty;
        this.newOrder.items[idx].unitPrice = itemData.rate;
        this.newOrder.items[idx].discountAmount = itemData.discount;
        this.newOrder.items[idx].taxRate = itemData.gstRate;
      }
      this.editingItemData = null;
      this.recalculateTotals();
    }
  }

  removeItemRow(index: number) {
    if (this.editingItemData?.index === index) {
      this.editingItemData = null;
    }
    this.newOrder.items.splice(index, 1);
    this.recalculateTotals();
  }

  onItemSelect(row: any) {
    const it = this.items.find(i => i.id === row.itemId);
    if (it) {
      row.unitPrice = Number(it.saleRate || 0);
      row.taxRate = Number(it.gstRate || 18);
      const uVal = it?.unitCode || it?.unit;
      row.unitCode = typeof uVal === 'object' ? (uVal.code || uVal.name || 'Pcs') : (uVal || 'Pcs');
      this.recalculateTotals();
    }
  }

  recalculateTotals() {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const r of this.newOrder.items) {
      if (!r.itemId) continue;
      const qty = Number(r.orderedQty || 0);
      const rate = Number(r.unitPrice || 0);
      const disc = Number(r.discountAmount || 0);
      const taxable = Math.max(0, qty * rate - disc);
      const taxRate = Number(r.taxRate || 0);

      subtotal += taxable;
      if (r.isInterstate) {
        igst += (taxable * taxRate) / 100;
      } else {
        cgst += (taxable * (taxRate / 2)) / 100;
      }
    }

    this.modalTotals = {
      taxableSubtotal: subtotal,
      cgstTotal: cgst,
      sgstTotal: sgst,
      igstTotal: igst,
      grandTotal: subtotal + cgst + sgst + igst
    };
  }

  isValidOrder(): boolean {
    const validItems = this.newOrder.items.filter((i: any) => !!i.itemId && Number(i.orderedQty) > 0);
    return (
      !!this.newOrder.customerLedgerId &&
      validItems.length > 0
    );
  }

  submitOrder() {
    if (!this.isValidOrder()) return;
    this.submitting = true;
    const validItems = this.newOrder.items.filter((i: any) => !!i.itemId && Number(i.orderedQty) > 0);
    const payload = {
      companyId: this.companyId,
      branchId: this.branchId,
      ...this.newOrder,
      items: validItems
    };

    this.salesService.createSalesOrder(payload).subscribe({
      next: (created: any) => {
        this.submitting = false;
        this.toast.success(
          `Sales Order ${created?.orderNo || ''} created successfully! Total: ₹${Number(this.modalTotals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Sales Order Created',
        );
        this.viewMode = 'list';
        this.loadOrders();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to create sales order';
        this.toast.error(msg, 'Creation Failed');
        alert(msg);
      }
    });
  }

  viewOrder(id: string) {
    this.salesService.getSalesOrderById(id).subscribe({
      next: (order) => {
        this.selectedOrder = order;
        this.viewMode = 'view';
      }
    });
  }

  editOrder(id: string) {
    this.salesService.getSalesOrderById(id).subscribe({
      next: (order) => {
        if (!order) return;
        this.selectedOrder = order;
        this.newOrder = {
          customerLedgerId: order.customerLedgerId,
          orderDate: order.orderDate,
          deliveryDueDate: order.deliveryDueDate || '',
          paymentTerms: order.paymentTerms || 'Net 30 Days',
          billingAddress: order.billingAddress || '',
          shippingAddress: order.shippingAddress || '',
          narration: order.narration || '',
          items: (order.items || []).map((it: any) => ({
            itemId: it.itemId,
            orderedQty: it.orderedQty || it.qty || 1,
            unitPrice: it.rate || it.unitPrice || 0,
            discountAmount: it.discountAmount || 0,
            taxRate: it.taxRate || 18,
            unitCode: this.getUnitCode(it)
          }))
        };
        this.recalculateTotals();
        this.viewMode = 'create';
      }
    });
  }

  cancelOrder(id: string) {
    if (confirm('Are you sure you want to cancel this sales order?')) {
      this.salesService.cancelSalesOrder(id).subscribe({
        next: () => {
          this.toast.success('Sales order cancelled successfully.', 'Order Cancelled');
          this.loadOrders();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to cancel sales order.', 'Cancellation Failed');
        }
      });
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'PARTIALLY_DISPATCHED': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'CLEARED': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  }

  formatStatus(status: string): string {
    return status?.replace(/_/g, ' ') || '';
  }

  exportOrders() {
    if (!this.orders || this.orders.length === 0) return;
    const headers = ['Voucher No', 'Order Date', 'Customer', 'Delivery Due Date', 'Taxable Amount', 'Tax Total', 'Grand Total', 'Status'];
    const rows = this.orders.map((o) => [
      o.voucherNo || '',
      o.orderDate || '',
      o.customerLedger?.name || '',
      o.deliveryDueDate || '',
      o.taxableSubtotal || o.taxableAmount || 0,
      o.taxTotal || 0,
      o.grandTotal || 0,
      o.status || '',
    ]);
    exportToCsv('Sales_Orders', headers, rows);
    this.toast.success('Sales orders exported successfully!', 'Export Complete');
  }
}
