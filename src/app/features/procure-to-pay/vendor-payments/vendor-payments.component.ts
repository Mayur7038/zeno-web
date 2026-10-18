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

@Component({
  selector: 'app-vendor-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent],
  templateUrl: './vendor-payments.component.html',
})
export class VendorPaymentsComponent implements OnInit {
  viewMode: 'list' | 'create' = 'list';
  payments: any[] = [];
  vendors: any[] = [];
  paymentModes: any[] = [];
  pendingBills: any[] = [];

  submitting = false;
  createError = '';
  searchQuery = '';
  selectedVendor = '';

  get filteredPayments(): any[] {
    let list = this.payments || [];
    if (this.selectedVendor) {
      list = list.filter((p: any) => p.vendorLedgerId === this.selectedVendor);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((p: any) =>
        (p.voucherNo && p.voucherNo.toLowerCase().includes(q)) ||
        (p.vendorLedger?.name && p.vendorLedger.name.toLowerCase().includes(q)) ||
        (p.referenceChequeNo && p.referenceChequeNo.toLowerCase().includes(q))
      );
    }
    return list;
  }

  exportPayments() {
    const list = this.filteredPayments;
    if (!list || list.length === 0) return;
    const headers = ['Voucher No', 'Payment Date', 'Vendor', 'Payment Mode', 'Reference No', 'Discount Taken', 'Amount Paid'];
    const rows = list.map((p) => [
      p.voucherNo || '',
      p.paymentDate || '',
      p.vendorLedger?.name || '',
      p.paymentModeLedger?.name || '',
      p.referenceChequeNo || '',
      p.totalDiscountReceived || 0,
      p.totalAmountPaid || 0
    ]);
    exportToCsv('Vendor_Payments', headers, rows);
    this.toast.success('Vendor payments exported successfully!', 'Export Complete');
  }

  get totalDisbursed(): number {
    return this.payments.reduce((sum, p) => sum + Number(p.totalAmountPaid || 0), 0);
  }

  get totalDiscountReceived(): number {
    return this.payments.reduce((sum, p) => sum + Number(p.totalDiscountReceived || 0), 0);
  }

  get uniqueVendorsCount(): number {
    const vIds = new Set(this.payments.map(p => p.vendorLedgerId));
    return vIds.size;
  }

  totalPendingBalance = 0;
  totalAllocated = 0;
  totalDiscount = 0;

  form: any = {
    paymentDate: new Date().toISOString().split('T')[0],
    vendorLedgerId: '',
    paymentModeLedgerId: '',
    paymentType: 'BANK',
    totalAmount: 0,
    referenceChequeNo: '',
    notes: '',
  };

  constructor(
    private p2p: P2pService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadPayments();
        this.loadMasters();
        this.checkQueryParams();
      },
    });
  }

  loadPayments() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.p2p.getVendorPayments(compId).subscribe({
      next: (res) => (this.payments = res),
    });
  }

  loadMasters() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;

    this.masters.getLedgers(compId, true).subscribe({ next: (v) => (this.vendors = v) });

    this.masters.getLedgers(compId).subscribe({
      next: (all) => {
        this.paymentModes = all.filter((l) =>
          ['Cash-in-Hand', 'Bank Accounts', 'Cash', 'Bank'].some((grp) =>
            l.ledgerGroup?.name?.toLowerCase().includes(grp.toLowerCase()),
          ),
        );
        if (this.paymentModes.length === 0) {
          this.paymentModes = all;
        }
      },
    });
  }

  checkQueryParams() {
    this.route.queryParams.subscribe((params) => {
      if (params['vendorId']) {
        this.openCreateModal();
        this.form.vendorLedgerId = params['vendorId'];
        this.onVendorChange(params['invoiceId'], Number(params['amount'] || 0));
      }
    });
  }

  openCreateModal() {
    this.form = {
      paymentDate: new Date().toISOString().split('T')[0],
      vendorLedgerId: this.vendors[0]?.id || '',
      paymentModeLedgerId: this.paymentModes[0]?.id || '',
      paymentType: 'BANK',
      totalAmount: 0,
      referenceChequeNo: '',
      notes: '',
    };
    this.pendingBills = [];
    this.createError = '';
    this.viewMode = 'create';
    if (this.form.vendorLedgerId) {
      this.onVendorChange();
    }
  }

  onAmountChanged() {
    let unallocated = Number(this.form.totalAmount || 0);
    for (const b of this.pendingBills) {
      if (unallocated > 0) {
        const take = Math.min(unallocated, b.pendingBalance);
        b.allocatedAmount = take;
        unallocated -= take;
      } else {
        b.allocatedAmount = 0;
      }
    }
    this.recalculateAllocations();
  }

  autoAllocateFIFO() {
    let remaining = Number(this.form.totalAmount || 0);
    if (remaining <= 0) {
      remaining = this.totalPendingBalance;
      this.form.totalAmount = remaining;
    }
    for (const b of this.pendingBills) {
      if (remaining > 0) {
        const alloc = Math.min(remaining, b.pendingBalance);
        b.allocatedAmount = alloc;
        remaining -= alloc;
      } else {
        b.allocatedAmount = 0;
      }
    }
    this.recalculateAllocations();
  }

  backToList() {
    this.viewMode = 'list';
    this.createError = '';
    this.loadPayments();
  }

  onVendorChange(targetInvoiceId?: string, targetAmount?: number) {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId || !this.form.vendorLedgerId) return;

    this.p2p.getVendorPendingInvoices(this.form.vendorLedgerId, compId).subscribe({
      next: (bills) => {
        this.pendingBills = bills.map((b) => {
          const balance = Number(b.grandTotal) - Number(b.paidAmount || 0);
          const isTarget = targetInvoiceId && b.id === targetInvoiceId;
          return {
            id: b.id,
            voucherNo: b.voucherNo,
            invoiceDate: b.invoiceDate,
            grandTotal: b.grandTotal,
            pendingBalance: balance,
            allocatedAmount: isTarget ? targetAmount || balance : 0,
            discountAmount: 0,
          };
        });

        this.totalPendingBalance = this.pendingBills.reduce((s, b) => s + b.pendingBalance, 0);
        this.recalculateAllocations();
      },
    });
  }

  recalculateAllocations() {
    let alloc = 0;
    let disc = 0;
    for (const b of this.pendingBills) {
      alloc += Number(b.allocatedAmount || 0);
      disc += Number(b.discountAmount || 0);
    }
    this.totalAllocated = alloc;
    this.totalDiscount = disc;
  }

  submitPayment() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    const branchId = this.tenant.currentBranch()?.id;

    if (!this.form.paymentModeLedgerId) {
      this.createError = 'Please select a Cash or Bank payment account';
      return;
    }

    const allocations = this.pendingBills
      .filter((b) => Number(b.allocatedAmount) > 0 || Number(b.discountAmount) > 0)
      .map((b) => ({
        purchaseInvoiceId: b.id,
        allocatedAmount: Number(b.allocatedAmount || 0),
        discountAmount: Number(b.discountAmount || 0),
      }));

    if (allocations.length === 0) {
      this.createError = 'Please allocate payment amount to at least one bill';
      return;
    }

    this.submitting = true;
    this.createError = '';

    const payload = {
      companyId: compId,
      branchId,
      vendorLedgerId: this.form.vendorLedgerId,
      paymentModeLedgerId: this.form.paymentModeLedgerId,
      paymentDate: this.form.paymentDate,
      referenceChequeNo: this.form.referenceChequeNo,
      notes: this.form.notes,
      totalAmountPaid: this.totalAllocated,
      totalDiscountReceived: this.totalDiscount,
      allocations,
    };

    this.p2p.createVendorPayment(payload).subscribe({
      next: (vp: any) => {
        this.submitting = false;
        this.toast.success(
          `Vendor Payment ${vp?.voucherNo || ''} recorded successfully! Total Paid: ₹${Number(this.totalAllocated || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Disbursement Complete',
        );
        this.viewMode = 'list';
        this.loadPayments();
      },
      error: (err) => {
        this.submitting = false;
        this.createError = err.error?.message || 'Failed to record payment';
        this.toast.error(this.createError, 'Payment Failed');
      },
    });
  }
}
