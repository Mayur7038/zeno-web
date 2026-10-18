import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { P2pService } from '../../../core/services/p2p.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';
import { ZenoItemFastEntryComponent } from '../../../shared/ui/zeno-item-fast-entry.component';

@Component({
  selector: 'app-purchase-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './purchase-returns.component.html',
})
export class PurchaseReturnsComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  returns: any[] = [];
  vendors: any[] = [];
  itemsList: any[] = [];
  vendorInvoices: any[] = [];
  searchQuery = '';
  selectedVendor = '';

  submitting = false;
  createError = '';
  viewingReturn: any = null;

  returnForm: any = {
    returnDate: new Date().toISOString().split('T')[0],
    vendorLedgerId: '',
    purchaseInvoiceId: '',
    godownId: '',
    reason: 'Damaged Goods / Packaging Defect',
    remarks: '',
    items: [],
  };

  returnSubtotal = 0;
  returnTaxTotal = 0;
  returnGrandTotal = 0;

  get filteredReturns(): any[] {
    let list = this.returns || [];
    if (this.selectedVendor) {
      list = list.filter((r) => r.vendorLedgerId === this.selectedVendor);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.voucherNo?.toLowerCase().includes(q) ||
          r.vendorLedger?.name?.toLowerCase().includes(q) ||
          r.purchaseInvoice?.voucherNo?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q),
      );
    }
    return list;
  }

  exportReturns() {
    const list = this.filteredReturns;
    if (!list || list.length === 0) return;
    const headers = ['Debit Note No', 'Return Date', 'Vendor', 'Against Invoice', 'Godown', 'Reason', 'Taxable', 'Tax Reversed', 'Grand Total'];
    const rows = list.map((pr) => [
      pr.voucherNo || '',
      pr.returnDate || '',
      pr.vendorLedger?.name || '',
      pr.purchaseInvoice?.voucherNo || 'Direct Return',
      pr.godown?.name || '',
      pr.reason || '',
      pr.taxableTotal || 0,
      pr.taxTotal || 0,
      pr.grandTotal || 0
    ]);
    exportToCsv('Purchase_Returns_Debit_Notes', headers, rows);
    this.toast.success('Purchase returns exported successfully!', 'Export Complete');
  }

  get totalReturnValue(): number {
    return this.returns.reduce((sum, r) => sum + (+r.grandTotal || 0), 0);
  }

  get totalTaxReversal(): number {
    return this.returns.reduce((sum, r) => sum + (+r.taxTotal || 0), 0);
  }

  get totalRestockedUnits(): number {
    return this.returns.reduce((sum, r) => sum + (r.items?.reduce((s: number, i: any) => s + Number(i.quantity || i.returnedQty || 0), 0) || 0), 0);
  }

  constructor(
    private p2p: P2pService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadReturns();
        this.loadMasters();
        this.checkQueryInvoice();
      },
    });
  }

  checkQueryInvoice() {
    this.route.queryParams.subscribe((params) => {
      const invId = params['invoiceId'];
      if (invId) {
        this.openCreateModal();
        this.p2p.getPurchaseInvoiceById(invId).subscribe({
          next: (inv) => {
            if (inv) {
              this.returnForm.vendorLedgerId = inv.vendorLedgerId;
              this.returnForm.purchaseInvoiceId = inv.id;
              this.populateItemsFromInvoiceData(inv);
            }
          },
        });
      }
    });
  }

  loadReturns() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.p2p.getPurchaseReturns(compId).subscribe({
      next: (res) => (this.returns = res || []),
    });
  }

  loadMasters() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;

    this.masters.getLedgers(compId, true).subscribe({
      next: (v) => (this.vendors = v || []),
    });

    this.masters.getItems(compId).subscribe({
      next: (it) => (this.itemsList = it || []),
    });
  }

  openCreateModal() {
    this.returnForm = {
      returnDate: new Date().toISOString().split('T')[0],
      vendorLedgerId: this.vendors[0]?.id || '',
      purchaseInvoiceId: '',
      godownId: this.tenant.currentGodown()?.id || (this.tenant.godowns()[0]?.id || ''),
      reason: 'Damaged Goods / Packaging Defect',
      remarks: '',
      items: [
        {
          itemId: this.itemsList[0]?.id || '',
          unitId: this.itemsList[0]?.unitId || '',
          unitCode: this.itemsList[0]?.unit?.code || 'NOS',
          returnedQty: 1,
          rate: Number(this.itemsList[0]?.purchaseRate || 100),
          gstRate: Number(this.itemsList[0]?.gstRate || 18),
          totalAmount: 0,
        },
      ],
    };

    if (this.returnForm.vendorLedgerId) {
      this.onVendorChange();
    }
    this.calculateLine(this.returnForm.items[0]);
    this.createError = '';
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.viewingReturn = null;
    this.createError = '';
    this.loadReturns();
  }

  onVendorChange() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId || !this.returnForm.vendorLedgerId) return;

    this.p2p.getPurchaseInvoices(compId).subscribe({
      next: (invoices) => {
        this.vendorInvoices = (invoices || []).filter(
          (inv) => inv.vendorLedgerId === this.returnForm.vendorLedgerId,
        );
      },
    });
  }

  onInvoiceSelect() {
    if (this.returnForm.purchaseInvoiceId) {
      this.pullInvoiceItems();
    }
  }

  pullInvoiceItems() {
    this.p2p.getPurchaseInvoiceById(this.returnForm.purchaseInvoiceId).subscribe({
      next: (inv) => {
        if (inv) {
          this.populateItemsFromInvoiceData(inv);
        }
      },
    });
  }

  populateItemsFromInvoiceData(inv: any) {
    if (inv.godownId) {
      this.returnForm.godownId = inv.godownId;
    }
    if (inv.items && inv.items.length > 0) {
      this.returnForm.items = inv.items.map((it: any) => ({
        itemId: it.itemId,
        unitId: it.unitId,
        unitCode: it.unit?.code || 'NOS',
        returnedQty: Number(it.receivedQty || 1),
        rate: Number(it.rate || 0),
        gstRate: Number(it.gstRate || 18),
        totalAmount: 0,
      }));
      this.returnForm.items.forEach((line: any) => this.calculateLine(line));
    }
  }

  addLine() {
    this.returnForm.items.push({
      itemId: '',
      unitId: '',
      unitCode: 'NOS',
      returnedQty: 1,
      rate: 0,
      gstRate: 18,
      totalAmount: 0,
    });
  }

  editingItemData: { item: any, index: number } | null = null;

  onFastItemAdded(itemData: any) {
    if (this.returnForm.items.length === 1 && !this.returnForm.items[0].itemId) {
      this.returnForm.items = [];
    }
    const line = {
      itemId: itemData.itemId,
      unitId: itemData.itemObj?.unitId || '',
      unitCode: itemData.unit || 'NOS',
      returnedQty: itemData.qty,
      rate: itemData.rate,
      gstRate: itemData.gstRate,
      totalAmount: itemData.amount
    };
    this.returnForm.items.push(line);
    this.calculateLine(line);
  }

  editItemRow(index: number) {
    const row = this.returnForm.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.returnedQty,
          rate: row.rate,
          discount: 0,
          gstRate: row.gstRate
        },
        index
      };
    }
  }

  onFastItemUpdated(itemData: any) {
    if (this.editingItemData !== null && this.editingItemData.index >= 0) {
      const idx = this.editingItemData.index;
      const line = this.returnForm.items[idx];
      if (line) {
        line.itemId = itemData.itemId;
        line.unitId = itemData.itemObj?.unitId || line.unitId || '';
        line.unitCode = itemData.unit || line.unitCode || 'NOS';
        line.returnedQty = itemData.qty;
        line.rate = itemData.rate;
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
    this.returnForm.items.splice(index, 1);
    this.recalculateTotals();
  }

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.itemsList.find(i => i.id === itemId);
    return item ? (item.name || item.itemName) : 'Selected Item';
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
    const qty = Number(line.returnedQty || 0);
    const rate = Number(line.rate || 0);
    const gstRate = Number(line.gstRate || 0);

    const taxable = qty * rate;
    const tax = (taxable * gstRate) / 100;
    line.totalAmount = Number((taxable + tax).toFixed(2));
    this.recalculateTotals();
  }

  recalculateTotals() {
    let sub = 0;
    let tax = 0;
    for (const l of this.returnForm.items) {
      const q = Number(l.returnedQty || 0);
      const r = Number(l.rate || 0);
      const g = Number(l.gstRate || 0);
      const taxable = q * r;
      sub += taxable;
      tax += (taxable * g) / 100;
    }
    this.returnSubtotal = sub;
    this.returnTaxTotal = tax;
    this.returnGrandTotal = sub + tax;
  }

  submitCreateReturn() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    const branchId = this.tenant.currentBranch()?.id;

    if (!this.returnForm.vendorLedgerId) {
      this.createError = 'Please select a vendor';
      return;
    }
    if (!this.returnForm.godownId) {
      this.createError = 'Please select a warehouse godown for stock-out dispatch';
      return;
    }
    if (this.returnForm.items.length === 0) {
      this.createError = 'Please add at least one line item to return';
      return;
    }

    this.submitting = true;
    this.createError = '';

    const vendor = this.vendors.find((v) => v.id === this.returnForm.vendorLedgerId);
    const isInterstate = vendor?.stateCode && vendor.stateCode !== '27';
    const reasonText = this.returnForm.remarks?.trim()
      ? (this.returnForm.reason
          ? `${this.returnForm.reason} - ${this.returnForm.remarks.trim()}`
          : this.returnForm.remarks.trim())
      : (this.returnForm.reason || 'Goods Return');

    const payload = {
      companyId: compId,
      branchId,
      godownId: this.returnForm.godownId,
      vendorLedgerId: this.returnForm.vendorLedgerId,
      purchaseInvoiceId: this.returnForm.purchaseInvoiceId || null,
      returnDate: this.returnForm.returnDate,
      reason: reasonText,
      remarks: this.returnForm.remarks?.trim() || null,
      items: this.returnForm.items.map((i: any) => {
        const taxable = Number(i.returnedQty) * Number(i.rate);
        const tax = (taxable * Number(i.gstRate)) / 100;
        return {
          itemId: i.itemId,
          variantId: null,
          returnedQty: Number(i.returnedQty),
          rate: Number(i.rate),
          taxableAmount: taxable,
          cgstAmount: isInterstate ? 0 : tax / 2,
          sgstAmount: isInterstate ? 0 : tax / 2,
          igstAmount: isInterstate ? tax : 0,
        };
      }),
    };

    this.p2p.createPurchaseReturn(payload).subscribe({
      next: (pr: any) => {
        this.submitting = false;
        this.toast.success(
          `Purchase Return / Debit Note ${pr?.voucherNo || ''} recorded successfully! Total: ₹${Number(this.returnGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Debit Note Created',
        );
        this.viewMode = 'list';
        this.loadReturns();
      },
      error: (err) => {
        this.submitting = false;
        this.createError = err.error?.message || 'Failed to create purchase return';
        this.toast.error(this.createError, 'Return Failed');
      },
    });
  }

  viewReturn(pr: any) {
    this.viewingReturn = pr;
    this.viewMode = 'view';
  }
}
