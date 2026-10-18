import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';
import { ZenoItemFastEntryComponent } from '../../../shared/ui/zeno-item-fast-entry.component';

@Component({
  selector: 'app-sales-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './sales-returns.component.html',
})
export class SalesReturnsComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  returns: any[] = [];
  customers: any[] = [];
  godowns: any[] = [];
  itemsList: any[] = [];
  customerInvoices: any[] = [];
  loading = false;
  submitting = false;
  searchQuery: string = '';
  selectedCustomer: string = '';

  selectedReturn: any = null;

  newSr: any = {
    customerLedgerId: '',
    salesInvoiceId: '',
    godownId: '',
    returnDate: new Date().toISOString().split('T')[0],
    reason: 'Customer Cancellation / Defect',
    items: [
      { itemId: '', returnedQty: 1, unitPrice: 0, taxRate: 18, isInterstate: false, salesInvoiceItemId: null }
    ]
  };

  modalTotals = {
    taxableSubtotal: 0,
    taxTotal: 0,
    grandTotal: 0
  };

  constructor(
    private salesService: SalesService,
    private tenantService: TenantService,
    private mastersService: MastersService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadReturns();
    this.loadMasters();

    // Check query params if navigated with ?invoiceId=...
    this.route.queryParams.subscribe(params => {
      if (params['invoiceId']) {
        this.openCreatePage();
        this.newSr.customerLedgerId = params['customerId'] || '';
        this.onCustomerSelected();
        this.newSr.salesInvoiceId = params['invoiceId'];
        this.onInvoiceSelected();
      }
    });
  }

  get companyId(): string {
    return this.tenantService.currentCompany()?.id || '';
  }

  get branchId(): string {
    return this.tenantService.currentBranch()?.id || '';
  }

  get totalReturnValue(): number {
    return this.returns.reduce((sum, r) => sum + Number(r.grandTotal || 0), 0);
  }

  get totalRestockedUnits(): number {
    return this.returns.reduce((sum, r) => sum + (r.items?.reduce((s: number, i: any) => s + Number(i.returnedQty || 0), 0) || 0), 0);
  }

  get filteredReturns(): any[] {
    let list = this.returns || [];
    if (this.selectedCustomer) {
      list = list.filter((sr: any) => sr.customerLedgerId === this.selectedCustomer);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((sr: any) =>
        (sr.voucherNo && sr.voucherNo.toLowerCase().includes(q)) ||
        (sr.customerLedger?.name && sr.customerLedger.name.toLowerCase().includes(q)) ||
        (sr.reason && sr.reason.toLowerCase().includes(q))
      );
    }
    return list;
  }

  exportReturns() {
    const list = this.filteredReturns;
    if (!list || list.length === 0) return;
    const headers = ['Credit Note No', 'Date', 'Customer', 'Original Invoice', 'Warehouse', 'Reason', 'Taxable', 'Tax Reversed', 'Grand Total'];
    const rows = list.map((sr) => [
      sr.voucherNo || '',
      sr.returnDate || '',
      sr.customerLedger?.name || '',
      sr.salesInvoice?.voucherNo || 'Direct Return',
      sr.godown?.name || '',
      sr.reason || '',
      sr.taxableAmount || sr.taxableSubtotal || 0,
      sr.taxAmount || sr.taxTotal || 0,
      sr.totalAmount || sr.grandTotal || 0
    ]);
    exportToCsv('Sales_Returns_Credit_Notes', headers, rows);
    this.toast.success('Sales returns exported successfully!', 'Export Complete');
  }

  loadReturns() {
    if (!this.companyId) return;
    this.loading = true;
    this.salesService.getSalesReturns(this.companyId).subscribe({
      next: (res) => {
        this.returns = res || [];
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
      this.itemsList = data || [];
    });
    const defaultGodowns = this.tenantService.godowns();
    if (defaultGodowns && defaultGodowns.length > 0) {
      this.godowns = defaultGodowns;
    }
  }

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.itemsList.find(i => i.id === itemId);
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

  openCreatePage() {
    this.newSr = {
      customerLedgerId: '',
      salesInvoiceId: '',
      godownId: this.godowns[0]?.id || '',
      returnDate: new Date().toISOString().split('T')[0],
      reason: 'Customer Cancellation / Defect',
      items: []
    };
    this.recalculateTotals();
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedReturn = null;
  }

  addItemRow() {
    this.newSr.items.push({
      itemId: '',
      returnedQty: 1,
      unitPrice: 0,
      taxRate: 18,
      isInterstate: false,
      salesInvoiceItemId: null
    });
    this.recalculateTotals();
  }

  editingItemData: { item: any, index: number } | null = null;

  onFastItemAdded(itemData: any) {
    if (this.newSr.items.length === 1 && !this.newSr.items[0].itemId) {
      this.newSr.items = [];
    }
    this.newSr.items.push({
      itemId: itemData.itemId,
      returnedQty: itemData.qty,
      unitPrice: itemData.rate,
      taxRate: itemData.gstRate,
      isInterstate: false,
      salesInvoiceItemId: null
    });
    this.recalculateTotals();
  }

  editItemRow(index: number) {
    const row = this.newSr.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.returnedQty,
          rate: row.unitPrice,
          discount: 0,
          gstRate: row.taxRate
        },
        index
      };
    }
  }

  onFastItemUpdated(itemData: any) {
    if (this.editingItemData !== null && this.editingItemData.index >= 0) {
      const idx = this.editingItemData.index;
      if (this.newSr.items[idx]) {
        this.newSr.items[idx].itemId = itemData.itemId;
        this.newSr.items[idx].returnedQty = itemData.qty;
        this.newSr.items[idx].unitPrice = itemData.rate;
        this.newSr.items[idx].taxRate = itemData.gstRate;
      }
      this.editingItemData = null;
      this.recalculateTotals();
    }
  }

  removeItemRow(index: number) {
    if (this.editingItemData?.index === index) {
      this.editingItemData = null;
    }
    this.newSr.items.splice(index, 1);
    this.recalculateTotals();
  }

  onCustomerSelected() {
    if (!this.newSr.customerLedgerId) return;
    this.salesService.getCustomerPendingInvoices(this.newSr.customerLedgerId, this.companyId).subscribe((invs) => {
      this.customerInvoices = invs || [];
    });
  }

  onInvoiceSelected() {
    const inv = this.customerInvoices.find(i => i.id === this.newSr.salesInvoiceId);
    if (inv && inv.items && inv.items.length > 0) {
      this.newSr.items = inv.items.map((i: any) => ({
        itemId: i.itemId,
        returnedQty: Number(i.billedQty || 1),
        unitPrice: Number(i.rate || 0),
        taxRate: Number(i.gstRate || 18),
        isInterstate: Number(i.igstAmount || 0) > 0,
        salesInvoiceItemId: i.id
      }));
      this.recalculateTotals();
    }
  }

  onItemSelect(index: number) {
    const row = this.newSr.items[index];
    const item = this.itemsList.find(i => i.id === row.itemId);
    if (item) {
      row.unitPrice = Number(item.salesPrice || item.purchasePrice || 0);
      row.taxRate = Number(item.taxRate || 18);
      this.recalculateTotals();
    }
  }

  calculateRowTotal(row: any): number {
    const qty = Number(row.returnedQty || 0);
    const rate = Number(row.unitPrice || 0);
    const taxable = qty * rate;
    const tax = (taxable * Number(row.taxRate || 0)) / 100;
    return taxable + tax;
  }

  recalculateTotals() {
    let subtotal = 0;
    let tax = 0;

    for (const r of this.newSr.items) {
      const qty = Number(r.returnedQty || 0);
      const rate = Number(r.unitPrice || 0);
      const taxable = qty * rate;
      const taxRate = Number(r.taxRate || 0);

      subtotal += taxable;
      tax += (taxable * taxRate) / 100;
    }

    this.modalTotals = {
      taxableSubtotal: subtotal,
      taxTotal: tax,
      grandTotal: subtotal + tax
    };
  }

  isValidReturn(): boolean {
    return (
      !!this.newSr.customerLedgerId &&
      !!this.newSr.godownId &&
      !!this.newSr.reason &&
      this.newSr.items.length > 0 &&
      this.newSr.items.every((i: any) => !!i.itemId && Number(i.returnedQty) > 0)
    );
  }

  submitReturn() {
    if (!this.isValidReturn()) return;
    this.submitting = true;
    const payload = {
      companyId: this.companyId,
      branchId: this.branchId,
      ...this.newSr
    };

    this.salesService.createSalesReturn(payload).subscribe({
      next: (created: any) => {
        this.submitting = false;
        this.toast.success(
          `Sales Return / Credit Note ${created?.creditNoteNo || ''} created successfully! Total: ₹${Number(this.modalTotals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Credit Note Issued',
        );
        this.backToList();
        this.loadReturns();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to issue credit note';
        this.toast.error(msg, 'Issue Failed');
        alert(msg);
      }
    });
  }

  viewReturn(sr: any) {
    this.selectedReturn = sr;
    this.viewMode = 'view';
  }
}
