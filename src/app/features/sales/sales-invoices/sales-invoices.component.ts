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
  selector: 'app-sales-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './sales-invoices.component.html',
})
export class SalesInvoicesComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  invoices: any[] = [];
  customers: any[] = [];
  itemsList: any[] = [];
  loading = false;
  submitting = false;
  loadingPendingChallans = false;

  searchQuery = '';
  selectedStatus = '';
  selectedInvoice: any = null;

  Number = Number;
  Math = Math;

  createDefaultGridRows(count = 1): any[] {
    const compState = this.tenantService.currentCompany()?.stateCode || '27';
    const isInter = compState !== (this.newInv?.placeOfSupplyStateCode || '27');
    return Array.from({ length: count }, () => ({
      itemId: '',
      billedQty: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxRate: 18,
      unitCode: 'Pcs',
      isInterstate: isInter
    }));
  }

  newInv: any = {
    customerLedgerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentDueDate: '',
    placeOfSupplyStateCode: '27',
    billingAddress: '',
    shippingAddress: '',
    narration: '',
    dcIds: [] as string[],
    items: [
      { itemId: '', billedQty: 1, unitPrice: 0, discountAmount: 0, taxRate: 18, unitCode: 'Pcs', isInterstate: false }
    ]
  };

  modalTotals = {
    taxableSubtotal: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    roundOff: 0,
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
    this.loadInvoices();
    this.loadMasters();
  }

  get companyId(): string {
    return this.tenantService.currentCompany()?.id || '';
  }

  get branchId(): string {
    return this.tenantService.currentBranch()?.id || '';
  }

  get paidCount(): number {
    return this.invoices.filter(i => i.status === 'PAID').length;
  }

  get totalSalesValue(): number {
    return this.invoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
  }

  get totalReceivables(): number {
    return this.invoices
      .filter(i => i.status !== 'PAID')
      .reduce((sum, i) => sum + (Number(i.grandTotal || 0) - Number(i.paidAmount || 0)), 0);
  }

  loadInvoices() {
    if (!this.companyId) return;
    this.loading = true;
    this.salesService.getSalesInvoices(this.companyId, this.selectedStatus, this.searchQuery).subscribe({
      next: (res) => {
        this.invoices = res || [];
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
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.loadInvoices();
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

  openCreateModal() {
    this.newInv = {
      customerLedgerId: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      paymentDueDate: '',
      placeOfSupplyStateCode: this.tenantService.currentCompany()?.stateCode || '27',
      billingAddress: '',
      shippingAddress: '',
      narration: '',
      dcIds: [],
      items: []
    };
    this.recalculateTotals();
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedInvoice = null;
    this.loadInvoices();
  }

  onCustomerSelected() {
    const cust = this.customers.find(c => c.id === this.newInv.customerLedgerId);
    if (cust) {
      this.newInv.billingAddress = cust.addressLine1 || '';
      this.newInv.shippingAddress = cust.addressLine1 || '';
      this.newInv.placeOfSupplyStateCode = cust.stateCode || '27';
      const compState = this.tenantService.currentCompany()?.stateCode || '27';
      const isInter = compState !== (cust.stateCode || '27');
      this.newInv.items.forEach((it: any) => it.isInterstate = isInter);
      this.recalculateTotals();
    }
  }

  addItemRow() {
    const compState = this.tenantService.currentCompany()?.stateCode || '27';
    const isInter = compState !== (this.newInv.placeOfSupplyStateCode || '27');
    this.newInv.items.push({
      itemId: '',
      billedQty: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxRate: 18,
      unitCode: 'Pcs',
      isInterstate: isInter
    });
  }

  onFastItemAdded(itemData: any) {
    const compState = this.tenantService.currentCompany()?.stateCode || '27';
    const isInter = compState !== (this.newInv.placeOfSupplyStateCode || '27');
    const item = this.itemsList.find(i => i.id === itemData.itemId);
    
    let emptyRow = this.newInv.items.find((r: any) => !r.itemId);
    if (emptyRow) {
      emptyRow.itemId = itemData.itemId;
      emptyRow.billedQty = itemData.qty;
      emptyRow.unitPrice = itemData.rate;
      emptyRow.discountAmount = itemData.discount;
      emptyRow.taxRate = itemData.gstRate;
      emptyRow.unitCode = item?.unitCode || item?.unit || 'Pcs';
      emptyRow.isInterstate = isInter;
    } else {
      this.newInv.items.push({
        itemId: itemData.itemId,
        billedQty: itemData.qty,
        unitPrice: itemData.rate,
        discountAmount: itemData.discount,
        taxRate: itemData.gstRate,
        unitCode: item?.unitCode || item?.unit || 'Pcs',
        isInterstate: isInter
      });
    }
    this.recalculateTotals();
  }

  editingItemData: any = null;

  editItemRow(index: number) {
    this.editingItemData = { item: this.newInv.items[index], index };
  }

  onFastItemUpdated(itemData: any) {
    if (itemData.index !== null && itemData.index !== undefined) {
      const compState = this.tenantService.currentCompany()?.stateCode || '27';
      const isInter = compState !== (this.newInv.placeOfSupplyStateCode || '27');
      const item = this.itemsList.find(i => i.id === itemData.itemId);
      this.newInv.items[itemData.index] = {
        itemId: itemData.itemId,
        billedQty: itemData.qty,
        unitPrice: itemData.rate,
        discountAmount: itemData.discount,
        taxRate: itemData.gstRate,
        unitCode: item?.unitCode || item?.unit || 'Pcs',
        isInterstate: isInter
      };
      this.editingItemData = null;
      this.recalculateTotals();
    }
  }

  removeItemRow(index: number) {
    this.newInv.items.splice(index, 1);
    if (this.newInv.items.length === 0) {
      this.newInv.items = this.createDefaultGridRows(1);
    }
    this.recalculateTotals();
  }

  onItemSelect(index: number) {
    const row = this.newInv.items[index];
    const item = this.itemsList.find(i => i.id === row.itemId);
    if (item) {
      row.unitPrice = Number(item.salesPrice || item.purchasePrice || 0);
      row.taxRate = Number(item.taxRate || 18);
      row.unitCode = item.unitCode || item.unit || 'Pcs';
      this.recalculateTotals();
    }
  }

  pullPendingChallans() {
    if (!this.newInv.customerLedgerId) return;
    this.loadingPendingChallans = true;
    this.salesService.getCustomerPendingChallans(this.newInv.customerLedgerId, this.companyId).subscribe({
      next: (challans) => {
        this.loadingPendingChallans = false;
        if (!challans || challans.length === 0) {
          alert('No unbilled delivery challans found for this customer.');
          return;
        }

        const lines: any[] = [];
        const dcIds: string[] = [];

        for (const dc of challans) {
          dcIds.push(dc.id);
          for (const item of dc.items || []) {
            const pendingQty = Number(item.dispatchedQty || 0) - Number(item.invoicedQty || 0);
            if (pendingQty > 0) {
              lines.push({
                itemId: item.itemId,
                billedQty: pendingQty,
                unitPrice: Number(item.rate || 0),
                discountAmount: Number(item.discountAmount || 0),
                taxRate: Number(item.gstRate || 18),
                isInterstate: false,
                dcItemId: item.id
              });
            }
          }
        }

        if (lines.length > 0) {
          this.newInv.items = lines;
          this.newInv.dcIds = dcIds;
          this.recalculateTotals();
        } else {
          alert('All items in dispatched challans have already been billed.');
        }
      },
      error: () => {
        this.loadingPendingChallans = false;
      }
    });
  }

  recalculateTotals() {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const r of this.newInv.items) {
      if (!r.itemId) continue;
      const qty = Number(r.billedQty || 0);
      const rate = Number(r.unitPrice || 0);
      const disc = Number(r.discountAmount || 0);
      const taxable = Math.max(0, qty * rate - disc);
      const taxRate = Number(r.taxRate || 0);

      subtotal += taxable;
      if (r.isInterstate) {
        igst += (taxable * taxRate) / 100;
      } else {
        cgst += (taxable * (taxRate / 2)) / 100;
        sgst += (taxable * (taxRate / 2)) / 100;
      }
    }

    const unrounded = subtotal + cgst + sgst + igst;
    const rounded = Math.round(unrounded);
    const roundOff = rounded - unrounded;

    this.modalTotals = {
      taxableSubtotal: subtotal,
      cgstTotal: cgst,
      sgstTotal: sgst,
      igstTotal: igst,
      roundOff: roundOff,
      grandTotal: rounded
    };
  }

  isValidInvoice(): boolean {
    const validItems = this.newInv.items.filter((i: any) => !!i.itemId && Number(i.billedQty) > 0);
    return (
      !!this.newInv.customerLedgerId &&
      validItems.length > 0
    );
  }

  submitInvoice() {
    if (!this.isValidInvoice()) return;
    this.submitting = true;
    const validItems = this.newInv.items.filter((i: any) => !!i.itemId && Number(i.billedQty) > 0);
    const payload = {
      companyId: this.companyId,
      branchId: this.branchId,
      ...this.newInv,
      items: validItems
    };

    this.salesService.createSalesInvoice(payload).subscribe({
      next: (created: any) => {
        this.submitting = false;
        this.toast.success(
          `Sales Invoice ${created?.invoiceNo || ''} created successfully! Total: ₹${Number(this.modalTotals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Invoice Generated',
        );
        this.viewMode = 'list';
        this.loadInvoices();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to create sales invoice';
        this.toast.error(msg, 'Creation Failed');
        alert(msg);
      }
    });
  }

  viewInvoice(id: string) {
    this.salesService.getSalesInvoiceById(id).subscribe({
      next: (inv) => {
        this.selectedInvoice = inv;
        this.viewMode = 'view';
      }
    });
  }

  recordPayment(inv: any) {
    this.router.navigate(['/sales/customer-receipts'], {
      queryParams: { invoiceId: inv.id, customerId: inv.customerLedgerId }
    });
  }

  createReturn(inv: any) {
    this.router.navigate(['/sales/sales-returns'], {
      queryParams: { invoiceId: inv.id, customerId: inv.customerLedgerId }
    });
  }

  printInvoice() {
    window.print();
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'PARTIALLY_PAID': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'PAID': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  }

  formatStatus(status: string): string {
    return status?.replace(/_/g, ' ') || '';
  }

  exportInvoices() {
    if (!this.invoices || this.invoices.length === 0) return;
    const headers = ['Invoice No', 'Date', 'Customer', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Grand Total', 'Balance Due', 'Status'];
    const rows = this.invoices.map((inv) => [
      inv.invoiceNo || '',
      inv.invoiceDate || '',
      inv.customerLedger?.name || '',
      inv.taxableSubtotal || 0,
      inv.cgstTotal || 0,
      inv.sgstTotal || 0,
      inv.igstTotal || 0,
      inv.grandTotal || 0,
      Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0),
      inv.status || '',
    ]);
    exportToCsv('Sales_Invoices', headers, rows);
    this.toast.success('Sales invoices exported successfully!', 'Export Complete');
  }
}
