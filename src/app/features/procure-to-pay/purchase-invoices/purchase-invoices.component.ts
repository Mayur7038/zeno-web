import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { P2pService } from '../../../core/services/p2p.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';
import { ZenoItemFastEntryComponent } from '../../../shared/ui/zeno-item-fast-entry.component';

@Component({
  selector: 'app-purchase-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './purchase-invoices.component.html',
})
export class PurchaseInvoicesComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  invoices: any[] = [];
  vendors: any[] = [];
  itemsList: any[] = [];
  pendingGrns: any[] = [];
  selectedGrnIds: string[] = [];

  selectedStatus = '';
  searchQuery = '';
  showGrnModal = false;
  submitting = false;

  get unpaidInvoicesCount(): number {
    return this.invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID').length;
  }

  get paidInvoicesCount(): number {
    return this.invoices.filter(i => i.status === 'PAID').length;
  }

  get totalInvoiceValue(): number {
    return this.invoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
  }
  createError = '';
  viewingPi: any = null;

  isInterstate = false;
  invSubtotal = 0;
  invTaxableTotal = 0;
  invTaxTotal = 0;
  invGrandTotal = 0;

  form: any = {
    invoiceDate: new Date().toISOString().split('T')[0],
    vendorLedgerId: '',
    vendorBillNo: '',
    vendorBillDate: new Date().toISOString().split('T')[0],
    items: [],
  };

  constructor(
    private p2p: P2pService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadInvoices();
        this.loadMasters();
      },
    });
  }

  loadInvoices() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.p2p.getPurchaseInvoices(compId, this.selectedStatus, this.searchQuery).subscribe({
      next: (res) => (this.invoices = res),
    });
  }

  loadMasters() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getLedgers(compId, true).subscribe({ next: (v) => (this.vendors = v) });
    this.masters.getItems(compId).subscribe({ next: (it) => (this.itemsList = it) });
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.loadInvoices();
  }

  openCreateModal() {
    this.form = {
      invoiceDate: new Date().toISOString().split('T')[0],
      vendorLedgerId: this.vendors[0]?.id || '',
      vendorBillNo: '',
      vendorBillDate: new Date().toISOString().split('T')[0],
      items: [],
    };
    this.pendingGrns = [];
    this.selectedGrnIds = [];
    this.createError = '';
    this.viewMode = 'create';
    if (this.form.vendorLedgerId) {
      this.onVendorChange();
    }
  }

  backToList() {
    this.viewMode = 'list';
    this.viewingPi = null;
    this.createError = '';
    this.loadInvoices();
  }

  onVendorChange() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId || !this.form.vendorLedgerId) return;

    const vendor = this.vendors.find((v) => v.id === this.form.vendorLedgerId);
    const compState = this.tenant.currentCompany()?.stateCode || '27';
    const vendState = vendor?.stateCode || '27';
    this.isInterstate = compState !== vendState;

    this.p2p.getVendorPendingGrns(this.form.vendorLedgerId, compId).subscribe({
      next: (grns) => (this.pendingGrns = grns),
    });
  }

  openGrnModal() {
    this.showGrnModal = true;
  }

  toggleGrnSelect(grnId: string) {
    if (this.selectedGrnIds.includes(grnId)) {
      this.selectedGrnIds = this.selectedGrnIds.filter((id) => id !== grnId);
    } else {
      this.selectedGrnIds.push(grnId);
    }
  }

  confirmPullGRNs() {
    const selected = this.pendingGrns.filter((g) => this.selectedGrnIds.includes(g.id));
    this.form.items = [];

    for (const grn of selected) {
      for (const item of grn.items || []) {
        const itemMaster = this.itemsList.find((it) => it.id === item.itemId);
        this.form.items.push({
          grnItemId: item.id,
          itemId: item.itemId,
          itemName: item.item?.name,
          unitId: item.unitId,
          unitCode: item.unit?.code || 'NOS',
          receivedQty: Number(item.receivedQty),
          rate: Number(item.rate),
          discountAmount: 0,
          gstRate: Number(itemMaster?.gstRate || 18),
          taxableAmount: 0,
          totalAmount: 0,
        });
        this.calculateLine(this.form.items[this.form.items.length - 1]);
      }
    }
    this.showGrnModal = false;
  }

  addDirectItem() {
    const first = this.itemsList[0];
    const line = {
      itemId: first?.id || '',
      itemName: first?.name || '',
      unitId: first?.unitId || '',
      unitCode: first?.unit?.code || 'NOS',
      receivedQty: 1,
      rate: Number(first?.purchaseRate || first?.standardCost || 0),
      discountAmount: 0,
      gstRate: Number(first?.gstRate || 18),
      taxableAmount: 0,
      totalAmount: 0,
    };
    this.form.items.push(line);
    this.calculateLine(line);
  }

  editingItemData: { item: any, index: number } | null = null;

  onFastItemAdded(itemData: any) {
    const line = {
      itemId: itemData.itemId,
      itemName: itemData.itemName,
      unitId: itemData.itemObj?.unitId || '',
      unitCode: itemData.unit || 'NOS',
      receivedQty: itemData.qty,
      rate: itemData.rate,
      discountAmount: itemData.discount,
      gstRate: itemData.gstRate,
      taxableAmount: 0,
      totalAmount: 0
    };
    this.form.items.push(line);
    this.calculateLine(line);
  }

  editItemRow(index: number) {
    const row = this.form.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.receivedQty,
          rate: row.rate,
          discount: row.discountAmount,
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
        line.itemName = itemData.itemName;
        line.receivedQty = itemData.qty;
        line.rate = itemData.rate;
        line.discountAmount = itemData.discount;
        line.gstRate = itemData.gstRate;
        this.calculateLine(line);
      }
      this.editingItemData = null;
    }
  }

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.itemsList.find(i => i.id === itemId);
    return item ? (item.name || item.itemName) : 'Selected Item';
  }

  onDirectItemSelect(line: any) {
    const selected = this.itemsList.find((it) => it.id === line.itemId);
    if (selected) {
      line.itemName = selected.name;
      line.unitId = selected.unitId;
      line.unitCode = selected.unit?.code || 'NOS';
      line.rate = Number(selected.purchaseRate || selected.standardCost || 0);
      line.gstRate = Number(selected.gstRate || 18);
      this.calculateLine(line);
    }
  }

  removeLine(index: number) {
    if (this.editingItemData?.index === index) {
      this.editingItemData = null;
    }
    this.form.items.splice(index, 1);
    this.recalculateTotals();
  }

  calculateLine(line: any) {
    const qty = Number(line.receivedQty || 0);
    const rate = Number(line.rate || 0);
    const disc = Number(line.discountAmount || 0);
    const gstRate = Number(line.gstRate || 0);

    const taxable = qty * rate - disc;
    const tax = (taxable * gstRate) / 100;
    line.taxableAmount = Number(taxable.toFixed(2));
    line.totalAmount = Number((taxable + tax).toFixed(2));
    this.recalculateTotals();
  }

  recalculateTotals() {
    let sub = 0;
    let taxable = 0;
    let tax = 0;

    for (const l of this.form.items) {
      const q = Number(l.receivedQty || 0);
      const r = Number(l.rate || 0);
      const d = Number(l.discountAmount || 0);
      const g = Number(l.gstRate || 0);

      const lineTaxable = q * r - d;
      sub += q * r;
      taxable += lineTaxable;
      tax += (lineTaxable * g) / 100;
    }

    this.invSubtotal = sub;
    this.invTaxableTotal = taxable;
    this.invTaxTotal = tax;
    this.invGrandTotal = Math.round(taxable + tax);
  }

  submitCreateInvoice() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    const branchId = this.tenant.currentBranch()?.id;
    const godownId = this.tenant.currentGodown()?.id;

    if (!this.form.vendorBillNo) {
      this.createError = 'Please enter vendor bill number';
      return;
    }

    this.submitting = true;
    this.createError = '';

    const payload = {
      companyId: compId,
      branchId,
      godownId,
      purchaseType: 'GOODS',
      vendorLedgerId: this.form.vendorLedgerId,
      vendorBillNo: this.form.vendorBillNo,
      vendorBillDate: this.form.vendorBillDate,
      grnIds: this.selectedGrnIds,
      items: this.form.items.map((i: any) => ({
        grnItemId: i.grnItemId || null,
        itemId: i.itemId,
        unitId: i.unitId,
        receivedQty: i.receivedQty,
        rate: i.rate,
        discountAmount: i.discountAmount || 0,
        gstRate: i.gstRate,
      })),
    };

    this.p2p.createPurchaseInvoice(payload).subscribe({
      next: (pi: any) => {
        this.submitting = false;
        this.toast.success(
          `Purchase Invoice ${pi?.voucherNo || ''} recorded successfully! Total: ₹${Number(this.invGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Purchase Invoice Recorded',
        );
        this.viewMode = 'list';
        this.loadInvoices();
      },
      error: (err) => {
        this.submitting = false;
        this.createError = err.error?.message || 'Failed to record invoice';
        this.toast.error(this.createError, 'Recording Failed');
      },
    });
  }

  makePaymentFor(pi: any) {
    this.router.navigate(['/procure-to-pay/vendor-payments'], {
      queryParams: {
        vendorId: pi.vendorLedgerId,
        invoiceId: pi.id,
        amount: Number(pi.grandTotal) - Number(pi.paidAmount || 0),
      },
    });
  }

  createReturnFor(pi: any) {
    this.router.navigate(['/procure-to-pay/purchase-returns'], {
      queryParams: { invoiceId: pi.id },
    });
  }

  viewInvoice(id: string) {
    this.p2p.getPurchaseInvoiceById(id).subscribe({
      next: (pi) => {
        this.viewingPi = pi;
        this.viewMode = 'view';
      },
    });
  }

  exportInvoices() {
    if (!this.invoices || this.invoices.length === 0) return;
    const headers = ['Invoice No', 'Date', 'Vendor', 'Vendor Bill No', 'Taxable Total', 'Tax Total', 'Grand Total', 'Status'];
    const rows = this.invoices.map((pi: any) => [
      pi.voucherNo || '',
      pi.invoiceDate || '',
      pi.vendorLedger?.name || '',
      pi.vendorBillNo || '',
      pi.taxableTotal || 0,
      pi.taxTotal || 0,
      pi.grandTotal || 0,
      pi.status || ''
    ]);
    exportToCsv('Purchase_Invoices', headers, rows);
    this.toast.success('Purchase Invoices exported successfully!', 'Export Complete');
  }
}
