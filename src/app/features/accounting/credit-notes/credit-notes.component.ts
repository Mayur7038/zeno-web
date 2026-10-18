import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccountingService,
  AccountingVoucher,
} from '../../../core/services/accounting.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';

interface JournalLine {
  type: 'DR' | 'CR';
  ledgerId: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

interface StandardLine {
  ledgerId: string;
  amount: number;
  narration?: string;
}

@Component({
  selector: 'app-credit-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent],
  templateUrl: './credit-notes.component.html',
})
export class CreditNotesComponent implements OnInit {
  voucherType: string = 'CREDIT_NOTE';

  viewMode: 'list' | 'create' | 'view' = 'list';
  vouchers: AccountingVoucher[] = [];
  filteredVouchers: AccountingVoucher[] = [];
  viewingVoucher: any = null;

  allLedgers: any[] = [];
  cashBankLedgers: any[] = [];

  searchQuery = '';
  selectedStatus = '';
  startDate = '';
  endDate = '';
  submitting = false;
  errorMessage = '';

  contraAmount = 0;

  createForm: any = {
    voucherDate: new Date().toISOString().split('T')[0],
    sourceAccountLedgerId: '',
    destinationLedgerId: '',
    paymentMode: 'CASH',
    referenceNo: '',
    referenceDate: '',
    narration: '',
  };

  standardLines: StandardLine[] = [
    { ledgerId: '', amount: 0, narration: '' },
  ];

  journalLines: JournalLine[] = [
    { type: 'DR', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '' },
    { type: 'CR', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '' },
  ];

  constructor(
    private accountingService: AccountingService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.initData();
  }

  initData() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadLedgers();
        this.loadVouchers();
      },
    });
  }

  // --- Master Data Loaders ---
  loadLedgers() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getLedgers(compId).subscribe({
      next: (res: any[]) => {
        this.allLedgers = res || [];
        this.cashBankLedgers = this.allLedgers.filter((l) => {
          const grp = (l.ledgerGroup?.name || '').toLowerCase();
          const nm = (l.name || '').toLowerCase();
          return (
            grp.includes('cash') ||
            grp.includes('bank') ||
            nm.includes('cash') ||
            nm.includes('bank') ||
            nm.includes('petty')
          );
        });
        if (this.cashBankLedgers.length === 0) {
          this.cashBankLedgers = this.allLedgers;
        }
      },
    });
  }

  loadVouchers() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.accountingService
      .getVouchers(compId, this.voucherType, this.startDate, this.endDate, this.searchQuery)
      .subscribe({
        next: (res: any[]) => {
          this.vouchers = res || [];
          this.applyStatusFilter();
        },
      });
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.applyStatusFilter();
  }

  applyStatusFilter() {
    if (!this.selectedStatus) {
      this.filteredVouchers = [...this.vouchers];
    } else {
      this.filteredVouchers = this.vouchers.filter((v) => v.status === this.selectedStatus);
    }
  }

  exportVouchers() {
    if (!this.filteredVouchers || this.filteredVouchers.length === 0) return;
    const headers = ['Voucher No', 'Date', 'Credit Party Account', 'Payment Mode', 'Reference No', 'Narration', 'Amount', 'Status'];
    const rows = this.filteredVouchers.map((v) => [
      v.voucherNo || '',
      v.voucherDate || '',
      this.getVoucherPrimaryAccountName(v) || '',
      v.paymentMode || 'CASH',
      v.referenceNo || '',
      v.narration || '',
      v.totalAmount || 0,
      v.status || ''
    ]);
    exportToCsv(`${this.voucherType}_Vouchers`, headers, rows);
    this.toast.success('Vouchers exported successfully!', 'Export Complete');
  }

  openCreate() {
    this.errorMessage = '';
    const defaultSourceId = this.cashBankLedgers[0]?.id || this.allLedgers[0]?.id || '';
    const defaultDestId = this.cashBankLedgers[1]?.id || this.allLedgers[1]?.id || '';

    this.createForm = {
      voucherDate: new Date().toISOString().split('T')[0],
      sourceAccountLedgerId: defaultSourceId,
      destinationLedgerId: defaultDestId,
      paymentMode: 'CASH',
      referenceNo: '',
      referenceDate: new Date().toISOString().split('T')[0],
      narration: '',
    };

    this.contraAmount = 0;

    this.standardLines = [
      { ledgerId: '', amount: 0, narration: '' },
    ];

    this.journalLines = [
      { type: 'DR', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '' },
      { type: 'CR', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '' },
    ];

    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.viewingVoucher = null;
    this.errorMessage = '';
    this.loadVouchers();
  }

  viewVoucher(id: string) {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.accountingService.getVoucherById(id, compId).subscribe({
      next: (voucher: any) => {
        this.viewingVoucher = voucher;
        this.viewMode = 'view';
      },
      error: (err: any) => {
        alert(err.error?.message || 'Error loading voucher');
      },
    });
  }

  printVoucher() {
    window.print();
  }

  promptCancelVoucher(voucher: AccountingVoucher) {
    const reason = prompt(
      `Are you sure you want to cancel and reverse voucher ${voucher.voucherNo}? Enter reason for cancellation:`,
      'Manual cancellation',
    );
    if (reason !== null) {
      this.accountingService.cancelVoucher(voucher.id, reason).subscribe({
        next: () => {
          this.toast.success(`Voucher ${voucher.voucherNo} cancelled successfully and ledger entries reversed.`, 'Voucher Cancelled');
          if (this.viewMode === 'view') {
            this.viewVoucher(voucher.id);
          } else {
            this.loadVouchers();
          }
        },
        error: (err: any) => {
          const msg = err.error?.message || 'Error cancelling voucher';
          this.toast.error(msg, 'Cancellation Failed');
          alert(msg);
        },
      });
    }
  }

  addStandardLine() {
    this.standardLines.push({ ledgerId: '', amount: 0, narration: '' });
  }

  removeStandardLine(index: number) {
    this.standardLines.splice(index, 1);
  }

  get totalStandardAmount(): number {
    return this.standardLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  }

  addJournalLine() {
    const nextType: 'DR' | 'CR' = this.totalJournalDebits > this.totalJournalCredits ? 'CR' : 'DR';
    const diff = Math.abs(this.totalJournalDebits - this.totalJournalCredits);
    this.journalLines.push({
      type: nextType,
      ledgerId: '',
      debitAmount: nextType === 'DR' ? diff : 0,
      creditAmount: nextType === 'CR' ? diff : 0,
      narration: '',
    });
  }

  removeJournalLine(index: number) {
    this.journalLines.splice(index, 1);
  }

  onJournalTypeChange(line: JournalLine) {
    if (line.type === 'DR') {
      line.debitAmount = line.creditAmount || 0;
      line.creditAmount = 0;
    } else {
      line.creditAmount = line.debitAmount || 0;
      line.debitAmount = 0;
    }
  }

  onJournalAmountChange(line: JournalLine, fromField: 'DR' | 'CR') {
    if (fromField === 'DR') {
      line.creditAmount = 0;
    } else {
      line.debitAmount = 0;
    }
  }

  get totalJournalDebits(): number {
    return this.journalLines.reduce((sum, l) => sum + Number(l.debitAmount || 0), 0);
  }

  get totalJournalCredits(): number {
    return this.journalLines.reduce((sum, l) => sum + Number(l.creditAmount || 0), 0);
  }

  get journalDifference(): number {
    return Math.abs(Number((this.totalJournalDebits - this.totalJournalCredits).toFixed(2)));
  }

  getAvailablePrimaryLedgers(): any[] {
    if (this.voucherType === 'PAYMENT' || this.voucherType === 'RECEIPT' || this.voucherType === 'CONTRA') {
      return this.cashBankLedgers.length > 0 ? this.cashBankLedgers : this.allLedgers;
    }
    return this.allLedgers;
  }

  getVoucherPrimaryAccountName(v: AccountingVoucher): string {
    if (v.sourceAccountLedger?.name) {
      return v.sourceAccountLedger.name;
    }
    if (v.voucherType === 'JOURNAL') {
      return `${v.lines?.length || 0} Accounts Entry`;
    }
    return 'General Account';
  }

  getVoucherSecondaryAccountsSummary(v: AccountingVoucher): string {
    if (!v.lines || v.lines.length === 0) return '';
    if (v.lines.length === 1) {
      return v.lines[0].ledger?.name ? `To: ${v.lines[0].ledger.name}` : '';
    }
    return `${v.lines.length} accounts (${v.lines[0].ledger?.name || 'Multiple'}, etc.)`;
  }

  isFormValid(): boolean {
    if (!this.createForm.voucherDate) return false;

    if (this.voucherType === 'CONTRA') {
      return (
        !!this.createForm.sourceAccountLedgerId &&
        !!this.createForm.destinationLedgerId &&
        this.createForm.sourceAccountLedgerId !== this.createForm.destinationLedgerId &&
        this.contraAmount > 0
      );
    }

    if (this.voucherType === 'JOURNAL') {
      if (this.journalLines.length < 2) return false;
      if (this.journalDifference !== 0) return false;
      if (this.totalJournalDebits <= 0) return false;
      return this.journalLines.every(
        (l) => !!l.ledgerId && (l.debitAmount > 0 || l.creditAmount > 0),
      );
    }

    if (!this.createForm.sourceAccountLedgerId) return false;
    if (this.standardLines.length === 0) return false;
    return (
      this.totalStandardAmount > 0 &&
      this.standardLines.every((l) => !!l.ledgerId && Number(l.amount) > 0)
    );
  }

  submitVoucher() {
    this.errorMessage = '';
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    const branchId = this.tenant.currentBranch()?.id || localStorage.getItem('zeno_branch_id');

    if (!compId || !branchId) {
      this.errorMessage = 'Active company and branch are required.';
      return;
    }

    this.submitting = true;

    let payload: any = {
      companyId: compId,
      branchId: branchId,
      voucherType: this.voucherType,
      voucherDate: this.createForm.voucherDate,
      paymentMode: this.createForm.paymentMode,
      referenceNo: this.createForm.referenceNo || undefined,
      referenceDate: this.createForm.referenceDate || undefined,
      narration: this.createForm.narration || undefined,
      sourceAccountLedgerId: this.createForm.sourceAccountLedgerId,
    };

    if (this.voucherType === 'CONTRA') {
      payload.destinationLedgerId = this.createForm.destinationLedgerId;
      payload.totalAmount = Number(this.contraAmount);
      payload.lines = [
        {
          ledgerId: this.createForm.destinationLedgerId,
          amount: Number(this.contraAmount),
          narration: this.createForm.narration || `Contra deposit/transfer`,
        },
      ];
    } else if (this.voucherType === 'JOURNAL') {
      delete payload.sourceAccountLedgerId;
      payload.lines = this.journalLines.map((j) => ({
        ledgerId: j.ledgerId,
        debitAmount: Number(j.debitAmount || 0),
        creditAmount: Number(j.creditAmount || 0),
        amount: Number(j.debitAmount || j.creditAmount || 0),
        narration: j.narration,
      }));
      payload.totalAmount = Number(this.totalJournalDebits);
    } else {
      payload.lines = this.standardLines.map((l) => ({
        ledgerId: l.ledgerId,
        amount: Number(l.amount),
        narration: l.narration,
      }));
      payload.totalAmount = Number(this.totalStandardAmount);
    }

    this.accountingService.createVoucher(payload).subscribe({
      next: (saved: any) => {
        this.submitting = false;
        this.toast.success(
          `Voucher ${saved.voucherNo || ''} posted successfully! Total: ₹${Number(saved.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Credit Note Saved',
        );
        this.viewVoucher(saved.id);
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMessage =
          err.error?.message || 'Failed to post voucher. Please review entries.';
        this.toast.error(this.errorMessage, 'Voucher Error');
      },
    });
  }
}
