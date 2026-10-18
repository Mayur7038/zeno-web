import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { P2pService } from '../../../core/services/p2p.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';
import { ZenoItemFastEntryComponent } from '../../../shared/ui/zeno-item-fast-entry.component';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './purchase-orders.component.html',
})
export class PurchaseOrdersComponent implements OnInit {
  Math = Math;
  viewMode: 'list' | 'create' | 'view' = 'list';
  orders: any[] = [];
  vendors: any[] = [];
  itemsList: any[] = [];
  selectedStatus = '';
  searchQuery = '';

  submitting = false;
  createError = '';
  viewingPo: any = null;

  get pendingCount(): number {
    return this.orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIALLY_CLEARED').length;
  }

  get clearedCount(): number {
    return this.orders.filter(o => o.status === 'CLEARED').length;
  }

  get totalPoValue(): number {
    return this.orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  }

  form: any = {
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    paymentTerms: 'Net 30 Days',
    creditDays: 30,
    vendorLedgerId: '',
    branchId: '',
    notes: '',
    items: [],
  };

  orderSubtotal = 0;
  orderTaxTotal = 0;
  orderGrandTotal = 0;

  constructor(
    private p2p: P2pService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadOrders();
        this.loadMasters();
      },
    });
  }

  loadOrders() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.p2p.getPurchaseOrders(compId, this.selectedStatus, this.searchQuery).subscribe({
      next: (res) => (this.orders = res),
    });
  }

  loadMasters() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;

    this.masters.getLedgers(compId, true).subscribe({
      next: (v) => (this.vendors = v),
    });

    this.masters.getItems(compId).subscribe({
      next: (it) => (this.itemsList = it),
    });
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.loadOrders();
  }

  onVendorSelected() {
    const v = this.vendors.find((item) => item.id === this.form.vendorLedgerId);
    if (v && v.creditDays !== undefined && v.creditDays !== null) {
      this.form.creditDays = v.creditDays;
    }
  }

  openCreateModal() {
    this.form = {
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      paymentTerms: 'Net 30 Days',
      creditDays: 30,
      vendorLedgerId: '',
      branchId: this.tenant.currentBranch()?.id || '',
      notes: '',
      items: [],
    };
    this.recalculateTotals();
    this.createError = '';
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.viewingPo = null;
    this.createError = '';
    this.loadOrders();
  }

  addItemRow() {
    this.form.items.push({
      itemId: '',
      unitId: '',
      unitCode: 'NOS',
      orderedQty: 1,
      rate: 0,
      discount: 0,
      gstRate: 18,
      totalAmount: 0,
    });
  }

  editingItemData: { item: any, index: number } | null = null;

  onFastItemAdded(itemData: any) {
    const item = this.itemsList.find(i => i.id === itemData.itemId);
    const uVal = item?.unitCode || item?.unit;
    const uStr = typeof uVal === 'object' ? (uVal.code || uVal.name || 'NOS') : (uVal || 'NOS');

    let emptyRow = this.form.items.find((r: any) => !r.itemId);
    if (emptyRow) {
      emptyRow.itemId = itemData.itemId;
      emptyRow.unitId = itemData.itemObj?.unitId || item?.unitId || '';
      emptyRow.unitCode = uStr;
      emptyRow.orderedQty = itemData.qty;
      emptyRow.rate = itemData.rate;
      emptyRow.discount = itemData.discount || 0;
      emptyRow.gstRate = itemData.gstRate;
    } else {
      this.form.items.push({
        itemId: itemData.itemId,
        unitId: itemData.itemObj?.unitId || item?.unitId || '',
        unitCode: uStr,
        orderedQty: itemData.qty,
        rate: itemData.rate,
        discount: itemData.discount || 0,
        gstRate: itemData.gstRate,
        totalAmount: itemData.amount
      });
    }
    this.recalculateTotals();
  }

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.itemsList.find(i => i.id === itemId);
    return item ? (item.name || item.itemName) : 'Selected Item';
  }

  getUnitCode(row: any): string {
    if (row.unitCode) return row.unitCode;
    if (row.itemId) {
      const it = this.itemsList.find(i => i.id === row.itemId);
      const uVal = it?.unitCode || it?.unit;
      return typeof uVal === 'object' ? (uVal.code || uVal.name || 'NOS') : (uVal || 'NOS');
    }
    return 'NOS';
  }

  isValidOrder(): boolean {
    return !!this.form.vendorLedgerId && this.form.items.some((i: any) => i.itemId && i.orderedQty > 0);
  }

  editItemRow(index: number) {
    const row = this.form.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.orderedQty,
          rate: row.rate,
          discount: row.discount || 0,
          gstRate: row.gstRate
        },
        index
      };
    }
  }

  onFastItemUpdated(itemData: any) {
    if (this.editingItemData !== null && this.editingItemData.index >= 0) {
      const idx = this.editingItemData.index;
      const line = this.form.items[idx];
      if (line) {
        line.itemId = itemData.itemId;
        line.unitId = itemData.itemObj?.unitId || line.unitId || '';
        line.unitCode = itemData.unit || line.unitCode || 'NOS';
        line.orderedQty = itemData.qty;
        line.rate = itemData.rate;
        line.discount = itemData.discount || 0;
        line.gstRate = itemData.gstRate;
        this.calculateLine(line);
      }
      this.editingItemData = null;
    }
  }

  removeLine(index: number) {
    if (this.editingItemData?.index === index) {
      this.editingItemData = null;
    }
    this.form.items.splice(index, 1);
    this.recalculateTotals();
  }

  onItemSelect(line: any) {
    const it = this.itemsList.find((i) => i.id === line.itemId);
    if (it) {
      line.unitId = it.unitId;
      line.unitCode = it.unit?.code || 'NOS';
      line.rate = Number(it.purchaseRate || 0);
      line.gstRate = Number(it.gstRate || 18);
      this.calculateLine(line);
    }
  }

  calculateLine(line: any) {
    const qty = Number(line.orderedQty || 0);
    const rate = Number(line.rate || 0);
    const discount = Number(line.discount || 0);
    const gstRate = Number(line.gstRate || 0);

    const taxable = Math.max(0, qty * rate - discount);
    const tax = (taxable * gstRate) / 100;
    line.totalAmount = Number((taxable + tax).toFixed(2));
    this.recalculateTotals();
  }

  recalculateTotals() {
    let sub = 0;
    let tax = 0;
    for (const l of this.form.items) {
      const q = Number(l.orderedQty || 0);
      const r = Number(l.rate || 0);
      const d = Number(l.discount || 0);
      const g = Number(l.gstRate || 0);
      const taxable = Math.max(0, q * r - d);
      sub += taxable;
      tax += (taxable * g) / 100;
    }
    this.orderSubtotal = sub;
    this.orderTaxTotal = tax;
    this.orderGrandTotal = sub + tax;
  }

  submitCreatePO() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    const branchId = this.form.branchId || this.tenant.currentBranch()?.id;

    if (!this.form.vendorLedgerId) {
      this.createError = 'Please select a vendor';
      return;
    }

    this.submitting = true;
    this.createError = '';

    const payload = {
      companyId: compId,
      branchId,
      vendorLedgerId: this.form.vendorLedgerId,
      orderDate: this.form.orderDate,
      notes: this.form.notes,
      items: this.form.items.map((i: any) => ({
        itemId: i.itemId,
        unitId: i.unitId,
        orderedQty: i.orderedQty,
        rate: i.rate,
        gstRate: i.gstRate,
        isInterstate: false,
      })),
    };

    this.p2p.createPurchaseOrder(payload).subscribe({
      next: (po: any) => {
        this.submitting = false;
        this.toast.success(
          `Purchase Order ${po?.voucherNo || ''} created successfully! Total: ₹${Number(this.orderGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'PO Generated',
        );
        this.viewMode = 'list';
        this.loadOrders();
      },
      error: (err) => {
        this.submitting = false;
        this.createError = err.error?.message || 'Failed to create PO';
        this.toast.error(this.createError, 'Creation Failed');
      },
    });
  }

  cancelOrder(id: string) {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    this.p2p.cancelPurchaseOrder(id).subscribe({
      next: () => {
        this.toast.success('Purchase Order cancelled successfully.', 'PO Cancelled');
        this.loadOrders();
      },
      error: (err) => {
        const msg = err.error?.message || 'Cannot cancel PO';
        this.toast.error(msg, 'Cancellation Failed');
        alert(msg);
      },
    });
  }

  viewOrder(id: string) {
    this.p2p.getPurchaseOrderById(id).subscribe({
      next: (po) => {
        this.viewingPo = po;
        this.viewMode = 'view';
      },
    });
  }

  editOrder(id: string) {
    this.p2p.getPurchaseOrderById(id).subscribe({
      next: (po) => {
        if (!po) return;
        this.viewingPo = po;
        this.form = {
          vendorId: po.vendorId,
          orderDate: po.orderDate,
          expectedDeliveryDate: po.expectedDeliveryDate || '',
          paymentTerms: po.paymentTerms || 'Net 30 Days',
          shippingAddress: po.shippingAddress || '',
          notes: po.notes || '',
          items: (po.items || []).map((it: any) => ({
            itemId: it.itemId,
            orderedQty: it.orderedQty || it.qty || 1,
            unitPrice: it.rate || it.unitPrice || 0,
            discountAmount: it.discountAmount || 0,
            taxRate: it.taxRate || 18,
            unitCode: it.unitCode || 'Pcs'
          }))
        };
        this.viewMode = 'create';
      },
    });
  }

  exportOrders() {
    if (!this.orders || this.orders.length === 0) return;
    const headers = ['Voucher No', 'Order Date', 'Vendor', 'Items Count', 'Subtotal', 'Tax Total', 'Grand Total', 'Status'];
    const rows = this.orders.map((o) => [
      o.voucherNo || '',
      o.orderDate || '',
      o.vendorLedger?.name || '',
      o.items?.length || 0,
      o.taxableAmount || o.subtotal || 0,
      o.taxTotal || 0,
      o.grandTotal || 0,
      o.status || '',
    ]);
    exportToCsv('Purchase_Orders', headers, rows);
    this.toast.success('Purchase orders exported successfully!', 'Export Complete');
  }
}
