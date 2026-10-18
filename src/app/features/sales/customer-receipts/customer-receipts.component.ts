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

@Component({
  selector: 'app-customer-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent],
  templateUrl: './customer-receipts.component.html',
})
export class CustomerReceiptsComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  receipts: any[] = [];
  customers: any[] = [];
  bankLedgers: any[] = [];
  unpaidInvoices: any[] = [];
  loading = false;
  submitting = false;
  searchQuery: string = '';
  selectedMode: string = '';

  selectedReceipt: any = null;

  newRec: any = {
    customerLedgerId: '',
    paymentLedgerId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    paymentMode: 'BANK',
    amount: null,
    referenceNo: '',
    notes: '',
  };

  constructor(
    private salesService: SalesService,
    private tenantService: TenantService,
    private mastersService: MastersService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadReceipts();
    this.loadMasters();

    // Check query params if navigated with ?invoiceId=...
    this.route.queryParams.subscribe(params => {
      if (params['invoiceId']) {
        this.openCreatePage();
        this.newRec.customerLedgerId = params['customerId'] || '';
        this.onCustomerSelected(params['invoiceId']);
      }
    });
  }

  get companyId(): string {
    return this.tenantService.currentCompany()?.id || '';
  }

  get branchId(): string {
    return this.tenantService.currentBranch()?.id || '';
  }

  get totalInflow(): number {
    return this.receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  get uniqueCustomersCount(): number {
    const custIds = new Set(this.receipts.map(r => r.customerLedgerId));
    return custIds.size;
  }

  get totalAllocated(): number {
    return this.unpaidInvoices.reduce((sum, i) => sum + Number(i.allocatedNow || 0), 0);
  }

  get unallocatedAmount(): number {
    return Math.max(0, Number(this.newRec.amount || 0) - this.totalAllocated);
  }

  get filteredReceipts(): any[] {
    let list = this.receipts || [];
    if (this.selectedMode) {
      list = list.filter((r: any) => (r.paymentMode || '').toUpperCase() === this.selectedMode.toUpperCase());
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((r: any) =>
        (r.voucherNo && r.voucherNo.toLowerCase().includes(q)) ||
        (r.customerLedger?.name && r.customerLedger.name.toLowerCase().includes(q)) ||
        (r.paymentLedger?.name && r.paymentLedger.name.toLowerCase().includes(q)) ||
        (r.referenceNo && r.referenceNo.toLowerCase().includes(q))
      );
    }
    return list;
  }

  exportReceipts() {
    const list = this.filteredReceipts;
    if (!list || list.length === 0) return;
    const headers = ['Receipt No', 'Date', 'Customer', 'Deposit Account', 'Mode', 'Ref No', 'Amount', 'Remarks'];
    const rows = list.map((r: any) => [
      r.voucherNo || '',
      r.receiptDate || '',
      r.customerLedger?.name || '',
      r.paymentLedger?.name || '',
      r.paymentMode || '',
      r.referenceNo || '',
      r.amount || 0,
      r.remarks || ''
    ]);
    exportToCsv('Customer_Receipts', headers, rows);
    this.toast.success('Customer receipts exported successfully!', 'Export Complete');
  }

  loadReceipts() {
    if (!this.companyId) return;
    this.loading = true;
    this.salesService.getCustomerReceipts(this.companyId).subscribe({
      next: (res) => {
        this.receipts = res || [];
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
    this.mastersService.getLedgers(this.companyId).subscribe((data) => {
      // Find bank and cash ledgers
      this.bankLedgers = (data || []).filter((l: any) =>
        l.name.toLowerCase().includes('bank') ||
        l.name.toLowerCase().includes('cash') ||
        l.ledgerGroup?.name?.toLowerCase().includes('bank') ||
        l.ledgerGroup?.name?.toLowerCase().includes('cash')
      );
    });
  }

  openCreatePage() {
    this.newRec = {
      customerLedgerId: '',
      paymentLedgerId: this.bankLedgers[0]?.id || '',
      receiptDate: new Date().toISOString().split('T')[0],
      paymentMode: 'BANK',
      amount: null,
      referenceNo: '',
      notes: '',
    };
    this.unpaidInvoices = [];
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedReceipt = null;
  }

  onCustomerSelected(preselectInvoiceId?: string) {
    if (!this.newRec.customerLedgerId) {
      this.unpaidInvoices = [];
      return;
    }
    this.salesService.getCustomerPendingInvoices(this.newRec.customerLedgerId, this.companyId).subscribe((invs) => {
      this.unpaidInvoices = (invs || []).map((i: any) => {
        const due = Number(i.grandTotal || 0) - Number(i.paidAmount || 0);
        let allocatedNow = 0;
        if (preselectInvoiceId && i.id === preselectInvoiceId) {
          allocatedNow = due;
          this.newRec.amount = due;
        }
        return {
          ...i,
          allocatedNow
        };
      });
    });
  }

  onAmountChanged() {
    // When amount is updated, we can auto-fill if only 1 invoice exists
    if (this.unpaidInvoices.length === 1 && !this.unpaidInvoices[0].allocatedNow) {
      const due = Number(this.unpaidInvoices[0].grandTotal || 0) - Number(this.unpaidInvoices[0].paidAmount || 0);
      this.unpaidInvoices[0].allocatedNow = Math.min(Number(this.newRec.amount || 0), due);
    }
  }

  autoAllocateFIFO() {
    let remaining = Number(this.newRec.amount || 0);
    for (const inv of this.unpaidInvoices) {
      const due = Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0);
      if (remaining <= 0) {
        inv.allocatedNow = 0;
      } else if (remaining >= due) {
        inv.allocatedNow = due;
        remaining -= due;
      } else {
        inv.allocatedNow = remaining;
        remaining = 0;
      }
    }
  }

  recalculateAllocations() {
    // triggers getter update
  }

  isValidReceipt(): boolean {
    return (
      !!this.newRec.customerLedgerId &&
      !!this.newRec.paymentLedgerId &&
      Number(this.newRec.amount) > 0
    );
  }

  submitReceipt() {
    if (!this.isValidReceipt()) return;
    this.submitting = true;

    const allocations = this.unpaidInvoices
      .filter((i: any) => Number(i.allocatedNow) > 0)
      .map((i: any) => ({
        salesInvoiceId: i.id,
        allocatedAmount: Number(i.allocatedNow)
      }));

    const payload = {
      companyId: this.companyId,
      branchId: this.branchId,
      ...this.newRec,
      amount: Number(this.newRec.amount),
      allocations
    };

    this.salesService.createCustomerReceipt(payload).subscribe({
      next: (created: any) => {
        this.submitting = false;
        this.toast.success(
          `Customer Receipt ${created?.receiptNo || ''} recorded successfully! Total: ₹${Number(this.newRec.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Receipt Recorded',
        );
        this.backToList();
        this.loadReceipts();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to record customer receipt';
        this.toast.error(msg, 'Recording Failed');
        alert(msg);
      }
    });
  }

  viewReceipt(rec: any) {
    this.selectedReceipt = rec;
    this.viewMode = 'view';
  }
}
