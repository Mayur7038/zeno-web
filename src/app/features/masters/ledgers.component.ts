import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ToastService } from '../../core/services/toast.service';
import { INDIAN_STATES } from '../../core/constants/states.constant';
import { exportToCsv } from '../../core/utils/export.util';


export const STANDARD_LEDGER_GROUPS: any[] = [
  // ── Primary groups ──
  { id: 'grp-branch-divisions', name: 'Branch / Divisions', nature: 'LIABILITY', parentId: null },
  { id: 'grp-capital-account', name: 'Capital Account', nature: 'LIABILITY', parentId: null },
  { id: 'grp-current-assets', name: 'Current Assets', nature: 'ASSET', parentId: null },
  { id: 'grp-current-liabilities', name: 'Current Liabilities', nature: 'LIABILITY', parentId: null },
  { id: 'grp-direct-expenses', name: 'Direct Expenses', nature: 'EXPENSE', parentId: null },
  { id: 'grp-direct-incomes', name: 'Direct Incomes', nature: 'INCOME', parentId: null },
  { id: 'grp-fixed-assets', name: 'Fixed Assets', nature: 'ASSET', parentId: null },
  { id: 'grp-indirect-expenses', name: 'Indirect Expenses', nature: 'EXPENSE', parentId: null },
  { id: 'grp-indirect-incomes', name: 'Indirect Incomes', nature: 'INCOME', parentId: null },
  { id: 'grp-investments', name: 'Investments', nature: 'ASSET', parentId: null },
  { id: 'grp-loans-liability', name: 'Loans (Liability)', nature: 'LIABILITY', parentId: null },
  { id: 'grp-misc-expenses-asset', name: 'Misc. Expenses (ASSET)', nature: 'ASSET', parentId: null },
  { id: 'grp-purchase-accounts', name: 'Purchase Accounts', nature: 'EXPENSE', parentId: null },
  { id: 'grp-sales-accounts', name: 'Sales Accounts', nature: 'INCOME', parentId: null },
  { id: 'grp-suspense-account', name: 'Suspense Account', nature: 'LIABILITY', parentId: null },

  // ── Subgroups of Current Assets ──
  { id: 'grp-bank-accounts', name: 'Bank Accounts', nature: 'ASSET', parentId: 'grp-current-assets' },
  { id: 'grp-cash-in-hand', name: 'Cash-in-hand', nature: 'ASSET', parentId: 'grp-current-assets' },
  { id: 'grp-deposits-asset', name: 'Deposits (Asset)', nature: 'ASSET', parentId: 'grp-current-assets' },
  { id: 'grp-loans-advances-asset', name: 'Loans & Advances (Asset)', nature: 'ASSET', parentId: 'grp-current-assets' },
  { id: 'grp-stock-in-hand', name: 'Stock-in-hand', nature: 'ASSET', parentId: 'grp-current-assets' },
  { id: 'grp-sundry-debtors', name: 'Sundry Debtors (Customers)', nature: 'ASSET', parentId: 'grp-current-assets', isDebtorCustomer: true },

  // ── Subgroups of Current Liabilities ──
  { id: 'grp-duties-taxes', name: 'Duties & Taxes', nature: 'LIABILITY', parentId: 'grp-current-liabilities' },
  { id: 'grp-provisions', name: 'Provisions', nature: 'LIABILITY', parentId: 'grp-current-liabilities' },
  { id: 'grp-sundry-creditors', name: 'Sundry Creditors (Vendors)', nature: 'LIABILITY', parentId: 'grp-current-liabilities', isCreditorVendor: true },

  // ── Subgroup of Capital Account ──
  { id: 'grp-reserves-surplus', name: 'Reserves & Surplus', nature: 'LIABILITY', parentId: 'grp-capital-account' },

  // ── Subgroups of Loans (Liability) ──
  { id: 'grp-bank-od', name: 'Bank OD A/c', nature: 'LIABILITY', parentId: 'grp-loans-liability' },
  { id: 'grp-secured-loans', name: 'Secured Loans', nature: 'LIABILITY', parentId: 'grp-loans-liability' },
  { id: 'grp-unsecured-loans', name: 'Unsecured Loans', nature: 'LIABILITY', parentId: 'grp-loans-liability' },
];

@Component({
  selector: 'app-ledgers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ledgers.component.html',
})
export class LedgersComponent implements OnInit {
  readonly indianStates = INDIAN_STATES;
  ledgers: any[] = [];
  groups: any[] = [];
  loadingGroups = false;
  pendingPartyRole: 'CUSTOMER' | 'VENDOR' | null = null;
  searchQuery = '';
  activeFilter: 'ALL' | 'DEBTORS' | 'CREDITORS' | 'BANK' | 'DUTIES' = 'ALL';

  viewMode: 'list' | 'create' | 'edit' = 'list';
  showCreateModal = false;
  viewingLedger: any = null;
  editingLedgerId: string | null = null;
  modalTab: 'address' | 'contact' | 'bank' | 'business' = 'address';
  submitting = false;
  createError = '';

  form: any = this.getInitialForm();

  constructor(
    private masters: MastersService,
    public tenant: TenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    // Load immediately using active or stored company
    this.loadLedgers();
    this.loadGroups();

    // Also listen to hierarchy changes
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadLedgers();
        this.loadGroups();
      },
    });
  }

  getInitialForm() {
    return {
      name: '',
      code: '',
      ledgerGroupId: '',
      gstin: '',
      gstType: 'Regular',
      pan: '',
      tan: '',
      stateCode: '27',
      openingBalance: 0,
      balanceType: 'DR',
      isActive: true,
      creditLimit: null,
      creditDays: 30,
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      shippingAddress: '',
      shippingCountry: 'India',
      shippingState: '',
      shippingCity: '',
      shippingPincode: '',
      contactPerson: '',
      phone: '',
      mobile: '',
      email: '',
      website: '',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankIfsc: '',
      bankBranch: '',
      upiId: '',
    };
  }

  loadLedgers() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getLedgers(compId).subscribe({
      next: (res) => (this.ledgers = res || []),
      error: (err) => console.error('Failed to load ledgers', err),
    });
  }

  loadGroups(onComplete?: () => void) {
    this.loadingGroups = true;
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    this.masters.getLedgerGroups(compId || undefined).subscribe({
      next: (res) => {
        this.loadingGroups = false;
        if (res && res.length > 0) {
          const seen = new Set<string>();
          this.groups = res.filter((g: any) => {
            const key = (g.name || '').trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        } else if (this.groups.length === 0) {
          this.groups = [...STANDARD_LEDGER_GROUPS];
        }
        this.applyDefaultGroupSelection();
        if (onComplete) onComplete();
      },
      error: (err) => {
        console.error('Failed to load ledger groups', err);
        this.loadingGroups = false;
        if (this.groups.length === 0) {
          this.groups = [...STANDARD_LEDGER_GROUPS];
        }
        this.applyDefaultGroupSelection();
        if (onComplete) onComplete();
      },
    });
  }

  applyDefaultGroupSelection() {
    if (!this.form.ledgerGroupId && this.groups.length > 0) {
      if (this.pendingPartyRole === 'CUSTOMER') {
        const customerGrp =
          this.groups.find((g) => g.isDebtorCustomer) ||
          this.groups.find((g) => (g.name || '').toLowerCase().includes('debtor'));
        if (customerGrp) {
          this.form.ledgerGroupId = customerGrp.id;
          this.onGroupChange();
          return;
        }
      } else if (this.pendingPartyRole === 'VENDOR') {
        const vendorGrp =
          this.groups.find((g) => g.isCreditorVendor) ||
          this.groups.find((g) => (g.name || '').toLowerCase().includes('creditor'));
        if (vendorGrp) {
          this.form.ledgerGroupId = vendorGrp.id;
          this.onGroupChange();
          return;
        }
      }

      const defaultGrp =
        this.groups.find((g) => g.isCreditorVendor) ||
        this.groups.find((g) => (g.name || '').toLowerCase().includes('creditor')) ||
        this.groups.find((g) => g.isDebtorCustomer) ||
        this.groups[0];

      if (defaultGrp) {
        this.form.ledgerGroupId = defaultGrp.id;
        this.onGroupChange();
      }
    }
  }

  isGroupParty(group: any): boolean {
    if (!group) return false;
    if (group.isDebtorCustomer || group.isCreditorVendor) return true;
    const name = (group.name || '').toLowerCase();
    const code = (group.code || '').toLowerCase();
    return (
      name.includes('debtor') ||
      name.includes('creditor') ||
      name.includes('customer') ||
      name.includes('vendor') ||
      name.includes('supplier') ||
      code.includes('debtor') ||
      code.includes('creditor')
    );
  }

  isDebtorGroup(group: any): boolean {
    if (!group) return false;
    if (group.isDebtorCustomer) return true;
    const name = (group.name || '').toLowerCase();
    const code = (group.code || '').toLowerCase();
    return name.includes('debtor') || name.includes('customer') || name.includes('client') || code.includes('debtor');
  }

  isCreditorGroup(group: any): boolean {
    if (!group) return false;
    if (group.isCreditorVendor) return true;
    const name = (group.name || '').toLowerCase();
    const code = (group.code || '').toLowerCase();
    return name.includes('creditor') || name.includes('vendor') || name.includes('supplier') || code.includes('creditor');
  }

  get isParty(): boolean {
    const selected = this.groups.find((g) => g.id === this.form.ledgerGroupId);
    return this.isGroupParty(selected);
  }

  get partyRole(): 'CUSTOMER' | 'VENDOR' | 'OTHER' {
    const selected = this.groups.find((g) => g.id === this.form.ledgerGroupId);
    if (this.isDebtorGroup(selected)) return 'CUSTOMER';
    if (this.isCreditorGroup(selected)) return 'VENDOR';
    return 'OTHER';
  }

  get isViewingParty(): boolean {
    if (!this.viewingLedger?.ledgerGroup) return false;
    return this.isGroupParty(this.viewingLedger.ledgerGroup);
  }

  onGroupChange() {
    const selected = this.groups.find((g) => g.id === this.form.ledgerGroupId);
    if (selected) {
      if (this.isDebtorGroup(selected)) {
        this.form.balanceType = 'DR';
      } else if (this.isCreditorGroup(selected)) {
        this.form.balanceType = 'CR';
      } else if (selected.nature === 'LIABILITY' || selected.nature === 'INCOME') {
        this.form.balanceType = 'CR';
      } else {
        this.form.balanceType = 'DR';
      }
    }
    // If switched away from sundry debtors/creditors, clear party tax fields
    if (!this.isParty) {
      this.modalTab = 'address';
      this.form.gstin = '';
      this.form.pan = '';
    }
  }

  onPartyStateCodeChange() {
    const found = this.indianStates.find((s) => s.code === this.form.stateCode);
    if (found) {
      this.form.state = found.name;
    }
  }

  onPartyStateChange() {
    const found = this.indianStates.find(
      (s) => s.name.toLowerCase() === (this.form.state || '').trim().toLowerCase(),
    );
    if (found) {
      this.form.stateCode = found.code;
    }
  }

  onGstinInput() {
    const gstin = (this.form.gstin || '').trim().toUpperCase();
    this.form.gstin = gstin;
    if (gstin.length >= 2) {
      const code = gstin.substring(0, 2);
      this.form.stateCode = code;
      const found = this.indianStates.find((s) => s.code === code);
      if (found) {
        this.form.state = found.name;
      }
    }
    if (gstin.length >= 12) {
      this.form.pan = gstin.substring(2, 12);
    }
  }

  copyBillingToShipping() {
    this.form.shippingAddress = this.form.address || '';
    this.form.shippingCountry = this.form.country || 'India';
    this.form.shippingState = this.form.state || '';
    this.form.shippingCity = this.form.city || '';
    this.form.shippingPincode = this.form.pincode || '';
  }

  backToList() {
    this.viewMode = 'list';
    this.editingLedgerId = null;
  }

  openCreateModal() {
    this.editingLedgerId = null;
    this.form = this.getInitialForm();
    this.modalTab = 'address';
    this.createError = '';
    this.pendingPartyRole = null;

    if (this.groups.length === 0) {
      this.loadGroups(() => {
        this.applyDefaultGroupSelection();
      });
    } else {
      this.applyDefaultGroupSelection();
    }
    this.viewMode = 'create';
    this.showCreateModal = false;
  }

  openPartyModal(type: 'CUSTOMER' | 'VENDOR') {
    this.editingLedgerId = null;
    this.form = this.getInitialForm();
    this.modalTab = 'address';
    this.createError = '';
    this.pendingPartyRole = type;

    if (this.groups.length === 0) {
      this.loadGroups(() => {
        this.applyDefaultGroupSelection();
      });
    } else {
      this.applyDefaultGroupSelection();
    }
    this.viewMode = 'create';
    this.showCreateModal = false;
  }

  editLedger(l: any) {
    this.editingLedgerId = l.id;
    this.pendingPartyRole = null;
    this.form = {
      name: l.name || '',
      code: l.code || '',
      ledgerGroupId: l.ledgerGroupId || '',
      gstin: l.gstin || '',
      gstType: l.gstType || 'Regular',
      pan: l.pan || '',
      tan: l.tan || '',
      stateCode: l.stateCode || '27',
      openingBalance: l.openingBalance || 0,
      balanceType: l.balanceType || 'DR',
      isActive: l.isActive !== undefined && l.isActive !== null ? l.isActive : true,
      creditLimit: l.creditLimit || null,
      creditDays: l.creditDays || 30,
      address: l.address || '',
      city: l.city || '',
      state: l.state || '',
      pincode: l.pincode || '',
      country: l.country || 'India',
      shippingAddress: l.shippingAddress || '',
      shippingCountry: l.shippingCountry || 'India',
      shippingState: l.shippingState || '',
      shippingCity: l.shippingCity || '',
      shippingPincode: l.shippingPincode || '',
      contactPerson: l.contactPerson || '',
      phone: l.phone || '',
      mobile: l.mobile || '',
      email: l.email || '',
      website: l.website || '',
      bankName: l.bankName || '',
      bankAccountName: l.bankAccountName || '',
      bankAccountNumber: l.bankAccountNumber || '',
      bankIfsc: l.bankIfsc || '',
      bankBranch: l.bankBranch || '',
      upiId: l.upiId || '',
    };
    this.modalTab = 'address';
    this.createError = '';
    if (this.groups.length === 0) {
      this.loadGroups();
    }
    this.viewMode = 'edit';
    this.showCreateModal = false;
  }

  nextModalTab() {
    if (!this.isParty) return;
    if (this.modalTab === 'address') this.modalTab = 'business';
    else if (this.modalTab === 'business') this.modalTab = 'contact';
    else if (this.modalTab === 'contact') this.modalTab = 'bank';
  }

  saveLedger() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    this.submitting = true;
    this.createError = '';

    const payload = {
      ...this.form,
      companyId: compId,
      openingBalance: Number(this.form.openingBalance) || 0,
      creditLimit: this.form.creditLimit ? Number(this.form.creditLimit) : 0,
      creditDays: this.form.creditDays ? Number(this.form.creditDays) : 0,
    };

    const request$ = this.editingLedgerId
      ? this.masters.updateLedger(this.editingLedgerId, payload)
      : this.masters.createLedger(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(
          `Ledger "${this.form.name}" ${this.editingLedgerId ? 'updated' : 'created'} successfully!`,
          'Ledger Saved',
        );
        this.viewMode = 'list';
        this.editingLedgerId = null;
        this.showCreateModal = false;
        this.loadLedgers();
      },
      error: (err) => {
        this.submitting = false;
        this.createError = err.error?.message || 'Failed to save ledger profile';
        this.toast.error(this.createError, 'Save Failed');
      },
    });
  }

  viewLedgerDetails(l: any) {
    this.viewingLedger = l;
  }

  isBankGroup(group: any): boolean {
    if (!group) return false;
    const n = (group.name || '').toLowerCase();
    return n.includes('bank') || n.includes('cash');
  }

  countDebtors(): number {
    return this.ledgers.filter((l) => l.ledgerGroup?.isDebtorCustomer).length;
  }

  countCreditors(): number {
    return this.ledgers.filter((l) => l.ledgerGroup?.isCreditorVendor).length;
  }

  countBankCash(): number {
    return this.ledgers.filter((l) => this.isBankGroup(l.ledgerGroup)).length;
  }

  countDuties(): number {
    return this.ledgers.filter((l) => (l.ledgerGroup?.name || '').toLowerCase().includes('duties')).length;
  }

  filteredLedgers(): any[] {
    let list = this.ledgers;

    if (this.activeFilter === 'DEBTORS') {
      list = list.filter((l) => l.ledgerGroup?.isDebtorCustomer);
    } else if (this.activeFilter === 'CREDITORS') {
      list = list.filter((l) => l.ledgerGroup?.isCreditorVendor);
    } else if (this.activeFilter === 'BANK') {
      list = list.filter((l) => this.isBankGroup(l.ledgerGroup));
    } else if (this.activeFilter === 'DUTIES') {
      list = list.filter((l) => (l.ledgerGroup?.name || '').toLowerCase().includes('duties'));
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((l) => {
        return (
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.code && l.code.toLowerCase().includes(q)) ||
          (l.gstin && l.gstin.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.mobile && l.mobile.toLowerCase().includes(q)) ||
          (l.ledgerGroup?.name && l.ledgerGroup.name.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }

  exportLedgers() {
    const list = this.filteredLedgers();
    if (!list || list.length === 0) return;
    const headers = ['Ledger Name', 'Code', 'Group', 'GSTIN', 'PAN', 'City', 'State', 'Phone', 'Email', 'Opening Balance', 'Dr/Cr'];
    const rows = list.map((l) => [
      l.name || '',
      l.code || '',
      l.ledgerGroup?.name || '',
      l.gstin || '',
      l.pan || '',
      l.city || '',
      l.state || '',
      l.phone || l.mobile || '',
      l.email || '',
      l.openingBalance || 0,
      l.openingBalanceType || 'DR'
    ]);
    exportToCsv('Ledgers_Master', headers, rows);
    this.toast.success('Ledgers exported successfully!', 'Export Complete');
  }
}
