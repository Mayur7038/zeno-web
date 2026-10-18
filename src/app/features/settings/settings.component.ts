import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TenantService } from '../../core/services/tenant.service';
import { MastersService } from '../../core/services/masters.service';
import { ToastService } from '../../core/services/toast.service';
import { AccountingService, FinancialYear } from '../../core/services/accounting.service';
import { INDIAN_STATES } from '../../core/constants/states.constant';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  readonly indianStates = INDIAN_STATES;
  activeTab: 'company' | 'branches' | 'warehouses' | 'financial-years' | 'toggles' | 'roles' | 'users' | 'mappings' | 'vouchers' | 'sales' | 'purchase' | 'inventory' | 'gst' | 'taxes' = 'company';
  gstSubTab: 'hierarchy' | 'slabs' = 'hierarchy';
  companySubTab: 'basic' | 'address' | 'gst' | 'contact' | 'logo' = 'basic';
  saving = false;
  savingCompany = false;
  savingWarehouse = false;
  saveSuccess = false;
  saveMessage = '';

  companyForm: any = {
    legalName: '',
    tradeName: '',
    code: '',
    businessType: 'Private Limited Company',
    financialYearStart: '2025-04-01',
    financialYearEnd: '2026-03-31',
    booksBeginFrom: '2025-04-01',
    currencyCode: 'INR',
    gstRegistrationType: 'Regular',
    gstin: '',
    pan: '',
    stateName: 'Maharashtra (27)',
    filingFrequency: 'Monthly',
    tanNumber: '',
    arnNumber: '',
    billingAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    shippingAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    contactDetails: {
      contactPerson: '',
      email: '',
      phone: '',
      alternatePhone: '',
      website: '',
    },
    logoUrl: '/zeno-books-logo.png',
    extraDetails: {
      tagline: 'Precision Accounting & Financial ERP',
      invoiceHeaderNote: '',
      invoiceFooterNote: '',
    },
  };

  // Branch Master State
  branches: any[] = [];
  branchSearchQuery: string = '';
  createBranchModalVisible = false;
  editBranchModalVisible = false;
  deleteBranchModalVisible = false;
  branchToEdit: any = null;
  branchToDelete: any = null;
  savingBranch = false;

  newBranch: any = {
    branchName: '',
    branchCode: '',
    stateCode: '27',
    stateName: 'Maharashtra',
    addressLine1: '',
    pincode: '',
    isHeadOffice: false,
  };

  // Warehouse Master State
  warehouses: any[] = [];
  warehouseSearchQuery: string = '';
  warehouseBranchFilter: string = 'ALL';
  createWarehouseModalVisible = false;
  editWarehouseModalVisible = false;
  deleteWarehouseModalVisible = false;
  warehouseToEdit: any = null;
  warehouseToDelete: any = null;

  newWarehouse: any = {
    name: '',
    code: '',
    branchId: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    contactPhone: '',
    isActive: true,
  };

  // Financial Year State
  financialYears: any[] = [];
  financialYearSearchQuery = '';
  showCreateFyModal = false;
  creatingFy = false;
  newFyData = {
    name: '',
    startDate: '',
    endDate: '',
  };
  showCloseFyModal = false;
  closingFy = false;
  selectedFyToClose: any = null;
  fyClosingNotes = '';

  get filteredFinancialYears(): any[] {
    if (!this.financialYearSearchQuery.trim()) {
      return this.financialYears;
    }
    const q = this.financialYearSearchQuery.toLowerCase().trim();
    return this.financialYears.filter((fy) =>
      (fy.name && fy.name.toLowerCase().includes(q)) ||
      (fy.startDate && fy.startDate.includes(q)) ||
      (fy.endDate && fy.endDate.includes(q))
    );
  }

  get currentCompany() {
    return this.tenant.currentCompany();
  }

  get currentBranch() {
    return this.tenant.currentBranch();
  }

  get companyDisplayName(): string {
    const c = this.currentCompany;
    if (c) {
      return c.legalName || c.tradeName || c.name || 'Apex Technologies Pvt Ltd';
    }
    const all = this.tenant.companies();
    if (all && all.length > 0) {
      return all[0].legalName || all[0].tradeName || all[0].name || 'Apex Technologies Pvt Ltd';
    }
    return 'Apex Technologies Pvt Ltd';
  }

  get branchDisplayName(): string {
    const b = this.currentBranch;
    if (b) {
      return b.branchName || b.name || 'Main Branch (HQ)';
    }
    const all = this.tenant.branches();
    if (all && all.length > 0) {
      return all[0].branchName || all[0].name || 'Main Branch (HQ)';
    }
    return 'Main Branch (HQ)';
  }

  get branchCodeDisplay(): string {
    const b = this.currentBranch;
    return b?.branchCode || b?.code || 'HQ-01';
  }

  get companyGstin(): string {
    return this.currentCompany?.gstin || this.tenant.companies()?.[0]?.gstin || '27AABCU9603R1ZM';
  }

  get companyPan(): string {
    return this.currentCompany?.pan || this.tenant.companies()?.[0]?.pan || 'AABCU9603R';
  }

  get branchState(): string {
    const b = this.currentBranch;
    return b?.stateName ? `${b.stateName} (${b.stateCode || '27'})` : 'Maharashtra (27)';
  }

  get branchAddress(): string {
    const b = this.currentBranch;
    return b?.addressLine1 ? `${b.addressLine1}${b.pincode ? ' - ' + b.pincode : ''}` : 'Corporate Headquarters, Nariman Point, Mumbai - 400021';
  }

  settings: any = {
    gstActiveLevel: 'ITEM',
    defaultPurchaseLedgerId: null,
    defaultSalesLedgerId: null,
    defaultSalesReturnLedgerId: null,
    defaultPurchaseReturnLedgerId: null,
    defaultCgstInputLedgerId: null,
    defaultSgstInputLedgerId: null,
    defaultIgstInputLedgerId: null,
    defaultCgstOutputLedgerId: null,
    defaultSgstOutputLedgerId: null,
    defaultIgstOutputLedgerId: null,
    defaultCessInputLedgerId: null,
    defaultCessOutputLedgerId: null,
    defaultCashLedgerId: null,
    defaultBankLedgerId: null,
    defaultDiscountLedgerId: null,
    defaultDiscountAllowedLedgerId: null,
    defaultRoundOffLedgerId: null,
    defaultFreightLedgerId: null,
    voucherConfig: {},
    salesSettings: {},
    purchaseSettings: {},
    inventorySettings: {},
  };

  // Pre-seed all system capability toggles including Sales Order & Delivery Challan
  toggles: any[] = [
    { featureKey: 'GST', isEnabled: true },
    { featureKey: 'PURCHASE_ORDER', isEnabled: true },
    { featureKey: 'GRN', isEnabled: true },
    { featureKey: 'SALES_ORDER', isEnabled: true },
    { featureKey: 'DELIVERY_CHALLAN', isEnabled: true },
    { featureKey: 'VARIANTS', isEnabled: true },
    { featureKey: 'RACK_BIN', isEnabled: true },
    { featureKey: 'MANUFACTURING', isEnabled: true },
    { featureKey: 'STOCK_TRANSFER', isEnabled: true },
    { featureKey: 'STOCK_ADJUSTMENT', isEnabled: true },
    { featureKey: 'PRICE_LIST', isEnabled: true },
  ];

  taxMasters: any[] = [];
  ledgers: any[] = [];

  // Roles & Permissions state
  roles: any[] = [];
  users: any[] = [];
  userSearchQuery: string = '';
  userRoleFilter: string = 'ALL';
  selectedRole: any = null;
  roleViewMode: 'list' | 'permissions' | 'create' = 'list';
  roleSearchQuery: string = '';
  roleTypeFilter: 'all' | 'system' | 'custom' = 'all';
  moduleSearchQuery: string = '';
  selectedCategoryFilter: string = 'ALL';
  createBaseRoleId: string = '';
  savingRole = false;
  showNewRoleModal = false;
  newRole: any = { name: '', description: '', permissions: [] };
  showNewUserModal = false;
  newUser = { fullName: '', email: '', phone: '', roleId: '' };

  editRoleModalVisible = false;
  editingRole: any = { id: '', name: '', description: '', isSystem: false };
  deleteRoleModalVisible = false;
  roleToDelete: any = null;
  deletingRole = false;

  showTaxModal = false;
  newTax: any = {
    taxName: '',
    rate: 18,
    cessRate: 0,
    description: '',
  };

  voucherKeys = [
    { key: 'PO', name: 'Purchase Order' },
    { key: 'GRN', name: 'Goods Receipt Note' },
    { key: 'PI', name: 'Purchase Invoice' },
    { key: 'PR', name: 'Purchase Return' },
    { key: 'VP', name: 'Vendor Payment' },
    { key: 'SO', name: 'Sales Order' },
    { key: 'DC', name: 'Delivery Challan' },
    { key: 'SI', name: 'Sales Invoice' },
    { key: 'SR', name: 'Sales Return' },
    { key: 'CR', name: 'Customer Receipt' },
    { key: 'PAYMENT', name: 'Payment Voucher' },
    { key: 'RECEIPT', name: 'Receipt Voucher' },
    { key: 'CONTRA', name: 'Contra Voucher' },
    { key: 'JOURNAL', name: 'Journal Voucher' },
    { key: 'DEBIT_NOTE', name: 'Debit Note' },
    { key: 'CREDIT_NOTE', name: 'Credit Note' },
    { key: 'PRODUCTION', name: 'Production Entry' },
    { key: 'BOM', name: 'Bill of Materials' },
  ];

  defaultVoucherConfigs: Record<string, any> = {
    PO: { prefix: 'PO-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    GRN: { prefix: 'GRN-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    PI: { prefix: 'PI-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    PR: { prefix: 'PR-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    VP: { prefix: 'VP-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    SO: { prefix: 'SO-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    DC: { prefix: 'DC-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    SI: { prefix: 'INV-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    SR: { prefix: 'SR-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    CR: { prefix: 'RCP-', suffix: '/25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    PAYMENT: { prefix: 'PAY/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    RECEIPT: { prefix: 'REC/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    CONTRA: { prefix: 'CTR/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    JOURNAL: { prefix: 'JRN/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    DEBIT_NOTE: { prefix: 'DN/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    CREDIT_NOTE: { prefix: 'CN/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    PRODUCTION: { prefix: 'PRD/', suffix: '25-26', startingNumber: 1, padding: 4, resetFrequency: 'YEARLY', isAuto: true },
    BOM: { prefix: 'BOM/', suffix: '', startingNumber: 1, padding: 3, resetFrequency: 'NEVER', isAuto: true },
  };

  permissionModules = [
    // Masters
    { key: 'LEDGER_GROUP', label: 'Ledger Groups', category: 'Masters', icon: 'pi pi-sitemap' },
    { key: 'LEDGER', label: 'Ledgers', category: 'Masters', icon: 'pi pi-file-edit' },
    { key: 'ITEM', label: 'Products & SKUs', category: 'Masters', icon: 'pi pi-tags' },
    { key: 'ITEM_GROUP', label: 'Stock Groups', category: 'Masters', icon: 'pi pi-folder' },
    { key: 'ITEM_CATEGORY', label: 'Stock Categories', category: 'Masters', icon: 'pi pi-tag' },
    { key: 'UNIT', label: 'Units of Measure', category: 'Masters', icon: 'pi pi-compass' },
    { key: 'VARIANT', label: 'Item Variants', category: 'Masters', icon: 'pi pi-sliders-v', featureKey: 'VARIANTS' },
    { key: 'RACK_BIN', label: 'Rack & Bin Locations', category: 'Masters', icon: 'pi pi-th-large', featureKey: 'RACK_BIN' },

    // Transactions - Procure to Pay
    { key: 'PURCHASE_ORDER', label: 'Purchase Orders', category: 'Transactions', icon: 'pi pi-shopping-bag', featureKey: 'PURCHASE_ORDER' },
    { key: 'GOODS_RECEIPT_NOTE', label: 'Goods Receipt (GRN)', category: 'Transactions', icon: 'pi pi-box', featureKey: 'GRN' },
    { key: 'PURCHASE_INVOICE', label: 'Purchase Invoices', category: 'Transactions', icon: 'pi pi-file' },
    { key: 'PURCHASE_RETURN', label: 'Purchase Returns', category: 'Transactions', icon: 'pi pi-replay' },
    { key: 'VENDOR_PAYMENT', label: 'Vendor Payments', category: 'Transactions', icon: 'pi pi-credit-card' },

    // Transactions - Order to Cash (Sales)
    { key: 'SALES_ORDER', label: 'Sales Orders', category: 'Transactions', icon: 'pi pi-shopping-cart', featureKey: 'SALES_ORDER' },
    { key: 'DELIVERY_CHALLAN', label: 'Delivery Challans', category: 'Transactions', icon: 'pi pi-truck', featureKey: 'DELIVERY_CHALLAN' },
    { key: 'SALES_INVOICE', label: 'Sales Invoices', category: 'Transactions', icon: 'pi pi-receipt' },
    { key: 'SALES_RETURN', label: 'Sales Returns', category: 'Transactions', icon: 'pi pi-backward' },
    { key: 'CUSTOMER_RECEIPT', label: 'Customer Receipts', category: 'Transactions', icon: 'pi pi-wallet' },

    // Transactions - Accounting Vouchers
    { key: 'PAYMENT_VOUCHER', label: 'Payment Vouchers', category: 'Transactions', icon: 'pi pi-arrow-circle-up' },
    { key: 'RECEIPT_VOUCHER', label: 'Receipt Vouchers', category: 'Transactions', icon: 'pi pi-arrow-circle-down' },
    { key: 'CONTRA_VOUCHER', label: 'Contra Vouchers', category: 'Transactions', icon: 'pi pi-sync' },
    { key: 'JOURNAL_VOUCHER', label: 'Journal Vouchers', category: 'Transactions', icon: 'pi pi-book' },
    { key: 'DEBIT_NOTE', label: 'Debit Notes', category: 'Transactions', icon: 'pi pi-file-export' },
    { key: 'CREDIT_NOTE', label: 'Credit Notes', category: 'Transactions', icon: 'pi pi-file-import' },

    // Transactions - Inventory & Warehouse
    { key: 'STOCK_TRANSFER', label: 'Stock Transfers', category: 'Transactions', icon: 'pi pi-arrows-h', featureKey: 'STOCK_TRANSFER' },
    { key: 'STOCK_ADJUSTMENT', label: 'Stock Adjustments', category: 'Transactions', icon: 'pi pi-sliders-h', featureKey: 'STOCK_ADJUSTMENT' },
    { key: 'STOCK_OPENING_BALANCE', label: 'Opening Stock Balance', category: 'Transactions', icon: 'pi pi-calendar-plus' },
    { key: 'PRICE_LIST', label: 'Price Lists & Multi-Tier Pricing', category: 'Transactions', icon: 'pi pi-percentage', featureKey: 'PRICE_LIST' },

    // Transactions - Manufacturing
    { key: 'BOM', label: 'Bills of Materials (BOM)', category: 'Transactions', icon: 'pi pi-list', featureKey: 'MANUFACTURING' },
    { key: 'PRODUCTION', label: 'Production Entries', category: 'Transactions', icon: 'pi pi-cog', featureKey: 'MANUFACTURING' },

    // Reports
    { key: 'REPORTS', label: 'Financial & Audit Reports', category: 'Reports', icon: 'pi pi-chart-line' },

    // Administration
    { key: 'SETTINGS', label: 'System Settings', category: 'Administration', icon: 'pi pi-cog' },
    { key: 'BRANCH', label: 'Branches & Locations', category: 'Administration', icon: 'pi pi-building' },
    { key: 'GODOWN', label: 'Godowns & Warehouses', category: 'Administration', icon: 'pi pi-warehouse' },
    { key: 'ROLES', label: 'Roles & Privileges', category: 'Administration', icon: 'pi pi-shield' },
    { key: 'USERS', label: 'User Directory', category: 'Administration', icon: 'pi pi-users' },
  ];

  isModuleFeatureEnabled(moduleKeyOrMod: any): boolean {
    const mod = typeof moduleKeyOrMod === 'string'
      ? this.permissionModules.find((m) => m.key === moduleKeyOrMod)
      : moduleKeyOrMod;
    if (!mod || !mod.featureKey) return true;
    const toggle = this.toggles.find((t) => t.featureKey === mod.featureKey);
    return toggle ? toggle.isEnabled !== false : true;
  }

  get activePermissionModules(): any[] {
    return this.permissionModules.filter((m) => this.isModuleFeatureEnabled(m));
  }

  get categoryOptions(): { key: string; label: string; count: number }[] {
    const active = this.activePermissionModules;
    const uniqueCats: string[] = [];
    for (const mod of active) {
      if (mod.category && !uniqueCats.includes(mod.category)) {
        uniqueCats.push(mod.category);
      }
    }
    return [
      { key: 'ALL', label: 'All', count: active.length },
      ...uniqueCats.map((cat) => ({
        key: cat,
        label: cat,
        count: active.filter((m) => m.category === cat).length,
      })),
    ];
  }

  get totalPrivilegesCount(): number {
    return this.activePermissionModules.length * this.permissionActions.length;
  }

  permissionActions = [
    { key: 'VIEW', label: 'View' },
    { key: 'CREATE', label: 'Create' },
    { key: 'EDIT', label: 'Edit' },
    { key: 'DELETE', label: 'Delete' },
    { key: 'PRINT', label: 'Print' },
    { key: 'EXPORT', label: 'Export' },
  ];

  constructor(
    private api: ApiService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private accountingService: AccountingService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'taxes') {
        this.activeTab = 'gst';
        this.gstSubTab = 'slabs';
      } else if (tab === 'gst') {
        this.activeTab = 'gst';
        this.gstSubTab = 'hierarchy';
      } else if (
        tab &&
        ['company', 'branches', 'warehouses', 'financial-years', 'toggles', 'roles', 'users', 'mappings', 'vouchers', 'sales', 'purchase', 'inventory'].includes(tab)
      ) {
        this.activeTab = tab as any;
      }
    });

    if (!this.tenant.currentCompany()) {
      this.tenant.loadHierarchy().subscribe({
        next: () => this.loadAll(),
        error: () => this.loadAll(),
      });
    } else {
      this.loadAll();
    }
  }

  getActiveTabTitle(): string {
    switch (this.activeTab) {
      case 'company':
        return 'Company Profile';
      case 'branches':
        return 'Branches & Locations';
      case 'warehouses':
        return 'Warehouse';
      case 'toggles':
        return 'Features';
      case 'roles':
        if (this.roleViewMode === 'permissions' && this.selectedRole) {
          return `${this.selectedRole.name} Permissions`;
        }
        if (this.roleViewMode === 'create') {
          return 'Create New Custom Role';
        }
        return 'User Roles';
      case 'users':
        return 'Users';
      case 'mappings':
        return 'Default Ledgers';
      case 'vouchers':
        return 'Voucher Numbers';
      case 'sales':
        return 'Sales Configuration';
      case 'purchase':
        return 'Purchase Configuration';
      case 'inventory':
        return 'Inventory Configuration';
      case 'gst':
      case 'taxes':
        return 'GST';
      default:
        return 'Enterprise Settings';
    }
  }

  goHome() {
    this.router.navigate(['/dashboard']);
  }

  getVoucherItem(key: string): any {
    if (!this.settings.voucherConfig) {
      this.settings.voucherConfig = {};
    }
    if (!this.settings.voucherConfig[key]) {
      this.settings.voucherConfig[key] = {
        ...(this.defaultVoucherConfigs[key] || {
          prefix: `${key}-`,
          suffix: '/25-26',
          startingNumber: 1,
          padding: 4,
          resetFrequency: 'YEARLY',
          isAuto: true,
        }),
      };
    }
    return this.settings.voucherConfig[key];
  }

  ensureVoucherConfig() {
    if (!this.settings.voucherConfig) {
      this.settings.voucherConfig = {};
    }
    for (const v of this.voucherKeys) {
      if (!this.settings.voucherConfig[v.key]) {
        this.settings.voucherConfig[v.key] = {
          ...(this.defaultVoucherConfigs[v.key] || {
            prefix: `${v.key}-`,
            suffix: '/25-26',
            startingNumber: 1,
            padding: 4,
            resetFrequency: 'YEARLY',
            isAuto: true,
          }),
        };
      }
    }
  }

  loadAll() {
    this.loadCompanyProfile();
    this.loadBranches();
    this.loadWarehouses();
    this.loadFinancialYears();
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    // Load Settings
    if (compId) {
      this.api.get<any>(`/settings?companyId=${compId}`).subscribe({
        next: (res) => {
          if (res) {
            this.settings = { ...this.settings, ...res };
            if (!this.settings.voucherConfig) this.settings.voucherConfig = {};
            if (!this.settings.salesSettings) this.settings.salesSettings = {};
            if (!this.settings.purchaseSettings) this.settings.purchaseSettings = {};
            if (!this.settings.inventorySettings) this.settings.inventorySettings = {};
          }
          this.ensureVoucherConfig();
        },
        error: () => {
          this.ensureVoucherConfig();
        },
      });
    } else {
      this.ensureVoucherConfig();
    }

    // Load Roles
    this.api.get<any[]>('/rbac/roles').subscribe({
      next: (res) => {
        this.roles = res || [];
        if (!this.selectedRole && this.roles.length > 0) {
          this.selectedRole = this.roles[0];
        }
      },
    });

    // Load Users
    this.api.get<any[]>('/rbac/users').subscribe({
      next: (res) => {
        this.users = res || [];
      },
    });

    // Load Toggles
    if (compId) {
      this.api.get<any[]>(`/settings/toggles?companyId=${compId}`).subscribe({
        next: (res) => {
          if (res && res.length > 0) {
            this.toggles = this.toggles.map((local) => {
              const matched = res.find((r) => r.featureKey === local.featureKey);
              return matched ? { ...local, ...matched } : local;
            });
          }
        },
      });
    }

    // Load Tax Masters
    if (compId) {
      this.api.get<any[]>(`/settings/tax-masters?companyId=${compId}`).subscribe({
        next: (res) => {
          this.taxMasters = res || [];
        },
      });
    }

    // Load Ledgers for dropdowns
    if (compId) {
      this.masters.getLedgers(compId).subscribe({
        next: (res) => {
          this.ledgers = res || [];
        },
      });
    }
  }

  loadFinancialYears() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id') || '';
    if (!compId) return;
    this.accountingService.getFinancialYears(compId).subscribe({
      next: (res) => {
        this.financialYears = res || [];
      },
      error: (err) => {
        console.error('Failed to load financial years', err);
      },
    });
  }

  hasOpenFy(): boolean {
    return this.financialYears.some((fy) => !fy.isClosed);
  }

  openCreateFyModal() {
    if (this.hasOpenFy()) {
      this.toast.error('Cannot create a new Financial Year while an existing Financial Year is open. Please close the active Financial Year first.');
      return;
    }
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    this.newFyData = {
      name: `F.Y. ${currentYear}-${nextYear}`,
      startDate: `${currentYear}-04-01`,
      endDate: `${nextYear}-03-31`,
    };
    this.showCreateFyModal = true;
  }

  submitCreateFy() {
    if (!this.newFyData.name || !this.newFyData.startDate || !this.newFyData.endDate) {
      this.toast.error('Please fill all required Financial Year fields.');
      return;
    }
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id') || '';
    this.creatingFy = true;
    this.accountingService
      .createFinancialYear({
        companyId: compId,
        name: this.newFyData.name,
        startDate: this.newFyData.startDate,
        endDate: this.newFyData.endDate,
      })
      .subscribe({
        next: (created) => {
          this.creatingFy = false;
          this.showCreateFyModal = false;
          this.toast.success(`Financial Year ${created.name} created successfully.`);
          this.loadFinancialYears();
        },
        error: (err) => {
          this.creatingFy = false;
          this.toast.error(err.error?.message || 'Failed to create Financial Year.');
        },
      });
  }

  openCloseFyModal(fy?: any) {
    const target = fy || this.financialYears.find((f) => !f.isClosed);
    if (!target || target.isClosed) return;
    this.selectedFyToClose = target;
    this.fyClosingNotes = '';
    this.showCloseFyModal = true;
  }

  submitCloseFy() {
    if (!this.selectedFyToClose) return;
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id') || '';
    this.closingFy = true;
    this.accountingService
      .closeFinancialYear({
        companyId: compId,
        fyId: this.selectedFyToClose.id,
        closingNotes: this.fyClosingNotes,
      })
      .subscribe({
        next: () => {
          this.closingFy = false;
          this.showCloseFyModal = false;
          this.toast.success(
            `Financial Year ${this.selectedFyToClose.name} closed successfully. Balance Sheet head closing balances transferred as opening balances for the new Financial Year.`,
          );
          this.selectedFyToClose = null;
          this.loadFinancialYears();
        },
        error: (err) => {
          this.closingFy = false;
          this.toast.error(err.error?.message || 'Failed to close Financial Year.');
        },
      });
  }

  switchFy(fy: any) {
    this.accountingService.switchFinancialYear(fy.id).subscribe({
      next: () => {
        this.toast.success(`Switched active Financial Year context to ${fy.name}`);
        this.loadFinancialYears();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to switch Financial Year.');
      },
    });
  }

  getVoucherPreview(key: string): string {
    const cfg = this.getVoucherItem(key);
    if (!cfg) return '—';
    const prefix = cfg.prefix || '';
    const num = String(cfg.startingNumber || 1).padStart(cfg.padding || 4, '0');
    const suffix = cfg.suffix || '';
    return `${prefix}${num}${suffix}`;
  }

  selectRole(role: any) {
    this.selectedRole = role;
  }

  hasPermission(role: any, moduleName: string, action: string): boolean {
    if (!role || !role.permissions) return false;
    return role.permissions.some(
      (p: any) =>
        (p.moduleName === moduleName || p.module === moduleName) && p.action === action,
    );
  }

  togglePermission(role: any, moduleName: string, action: string) {
    if (!role) return;
    if (!role.permissions) role.permissions = [];

    const idx = role.permissions.findIndex(
      (p: any) =>
        (p.moduleName === moduleName || p.module === moduleName) && p.action === action,
    );

    if (idx > -1) {
      role.permissions.splice(idx, 1);
    } else {
      role.permissions.push({ moduleName, module: moduleName, action });
    }
  }

  toggleAllModulePermissions(role: any, moduleName: string) {
    if (!role) return;
    if (!role.permissions) role.permissions = [];

    const currentCount = this.permissionActions.filter((act) =>
      this.hasPermission(role, moduleName, act.key),
    ).length;

    if (currentCount === this.permissionActions.length) {
      // Uncheck all for this module
      role.permissions = role.permissions.filter(
        (p: any) => p.moduleName !== moduleName && p.module !== moduleName,
      );
    } else {
      // Check all for this module
      this.permissionActions.forEach((act) => {
        if (!this.hasPermission(role, moduleName, act.key)) {
          role.permissions.push({ moduleName, module: moduleName, action: act.key });
        }
      });
    }
  }

  saveRolePermissions(role: any) {
    if (!role) return;
    this.savingRole = true;

    // Deduplicate permissions
    const seen = new Set<string>();
    const permsPayload: any[] = [];
    for (const p of role.permissions || []) {
      const mod = p.moduleName || p.module;
      const act = p.action;
      if (!mod || !act) continue;
      const k = `${mod}_${act}`;
      if (!seen.has(k)) {
        seen.add(k);
        permsPayload.push({
          module: mod,
          moduleName: mod,
          action: act,
        });
      }
    }

    this.api.put(`/rbac/roles/${role.id}`, {
      name: role.name,
      description: role.description || '',
      permissions: permsPayload,
    }).subscribe({
      next: (res: any) => {
        this.savingRole = false;
        if (res) {
          if (res.name) role.name = res.name;
          if (res.description !== undefined) role.description = res.description;
          if (res.permissions) role.permissions = res.permissions;
        }
        this.saveSuccess = true;
        this.saveMessage = `Role "${role.name}" and privileges saved successfully!`;
        this.toast.success(this.saveMessage, 'Privileges Saved');
        setTimeout(() => (this.saveSuccess = false), 3500);
      },
      error: (err: any) => {
        console.error('Failed to save role permissions', err);
        this.savingRole = false;
        const msg = err?.error?.message || 'Failed to save role. Please check network/permission.';
        this.toast.error(msg, 'Save Failed');
        alert(msg);
      },
    });
  }

  // Roles View Helpers & Filters
  getSystemRolesCount(): number {
    return (this.roles || []).filter((r) => r.isSystem).length;
  }

  getCustomRolesCount(): number {
    return (this.roles || []).filter((r) => !r.isSystem).length;
  }

  getUserCountForRole(roleId: string): number {
    if (!roleId || !this.users) return 0;
    return this.users.filter((u) => u.roleId === roleId || (u.role && u.role.id === roleId)).length;
  }

  filteredRoles(): any[] {
    let list = this.roles || [];
    if (this.roleTypeFilter === 'system') {
      list = list.filter((r) => r.isSystem);
    } else if (this.roleTypeFilter === 'custom') {
      list = list.filter((r) => !r.isSystem);
    }
    if (this.roleSearchQuery && this.roleSearchQuery.trim()) {
      const q = this.roleSearchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q)),
      );
    }
    return list;
  }

  getPrivilegeCount(role: any): number {
    if (!role?.permissions) return 0;
    const activeKeys = new Set(this.activePermissionModules.map((m) => m.key));
    return role.permissions.filter((p: any) => activeKeys.has(p.moduleName || p.module)).length;
  }

  getPrivilegePercentage(role: any): number {
    const total = this.totalPrivilegesCount;
    if (!total || !role) return 0;
    const count = this.getPrivilegeCount(role);
    return Math.min(100, Math.round((count / total) * 100));
  }

  getRoleCategoryBreakdown(role: any): string[] {
    if (!role || !role.permissions || role.permissions.length === 0) return [];
    const activeMods = new Set(
      role.permissions.map((p: any) => p.moduleName || p.module),
    );
    const cats = new Set<string>();
    for (const mod of this.activePermissionModules) {
      if (activeMods.has(mod.key)) {
        cats.add(mod.category);
      }
    }
    return Array.from(cats);
  }

  getUniqueCategories(): string[] {
    const cats: string[] = [];
    for (const mod of this.activePermissionModules) {
      if (mod.category && !cats.includes(mod.category)) {
        cats.push(mod.category);
      }
    }
    return cats;
  }

  getCategoryModuleCount(category: string): number {
    return this.activePermissionModules.filter((m) => m.category === category).length;
  }

  filteredPermissionModules(): any[] {
    let list = this.activePermissionModules || [];
    if (this.selectedCategoryFilter && this.selectedCategoryFilter !== 'ALL') {
      list = list.filter((m) => m.category.toLowerCase() === this.selectedCategoryFilter.toLowerCase());
    }
    if (this.moduleSearchQuery && this.moduleSearchQuery.trim()) {
      const q = this.moduleSearchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.key.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q),
      );
    }
    return list;
  }

  isModuleActive(role: any, moduleKey: string): boolean {
    if (!role || !role.permissions) return false;
    return role.permissions.some(
      (p: any) => p.moduleName === moduleKey || p.module === moduleKey,
    );
  }

  isModuleFullyGranted(role: any, moduleKey: string): boolean {
    if (!role || !role.permissions) return false;
    return this.permissionActions.every((act) =>
      this.hasPermission(role, moduleKey, act.key),
    );
  }

  // Navigation and mode switching
  startCreateRole() {
    this.newRole = {
      name: '',
      description: '',
      permissions: [],
    };
    this.createBaseRoleId = '';
    this.moduleSearchQuery = '';
    this.selectedCategoryFilter = 'ALL';
    this.roleViewMode = 'create';
  }

  onBaseRoleChanged() {
    if (!this.createBaseRoleId) {
      this.newRole.permissions = [];
      return;
    }
    const base = this.roles.find((r) => r.id === this.createBaseRoleId);
    if (base && base.permissions) {
      this.newRole.permissions = base.permissions.map((p: any) => ({
        moduleName: p.moduleName || p.module,
        module: p.moduleName || p.module,
        action: p.action,
      }));
    } else {
      this.newRole.permissions = [];
    }
  }

  startConfigurePermissions(role: any) {
    this.selectedRole = role;
    this.moduleSearchQuery = '';
    this.selectedCategoryFilter = 'ALL';
    this.roleViewMode = 'permissions';
  }

  backToRoleList() {
    this.roleViewMode = 'list';
  }

  cloneRole(role: any) {
    this.newRole = {
      name: `${role.name} Copy`,
      description: `Cloned from ${role.name}. ${role.description || ''}`.trim(),
      permissions: (role.permissions || []).map((p: any) => ({
        moduleName: p.moduleName || p.module,
        module: p.moduleName || p.module,
        action: p.action,
      })),
    };
    this.createBaseRoleId = role.id;
    this.moduleSearchQuery = '';
    this.selectedCategoryFilter = 'ALL';
    this.roleViewMode = 'create';
  }

  submitCreateRole() {
    if (!this.newRole.name || !this.newRole.name.trim()) return;

    this.savingRole = true;
    const permsPayload = (this.newRole.permissions || []).map((p: any) => ({
      module: p.moduleName || p.module,
      action: p.action,
    }));

    this.api
      .post('/rbac/roles', {
        name: this.newRole.name.trim(),
        description: (this.newRole.description || '').trim(),
        permissions: permsPayload,
      })
      .subscribe({
        next: (created: any) => {
          this.savingRole = false;
          this.roles.push(created);
          this.selectedRole = created;
          this.roleViewMode = 'list';
          this.saveSuccess = true;
          this.saveMessage = `New role "${created.name}" created with ${permsPayload.length} privileges!`;
          this.toast.success(this.saveMessage, 'Role Created');
          setTimeout(() => (this.saveSuccess = false), 3500);
        },
        error: (err: any) => {
          this.savingRole = false;
          const msg = err?.error?.message || 'Failed to create role. Ensure role name is unique.';
          this.toast.error(msg, 'Role Creation Failed');
          alert(msg);
        },
      });
  }

  openEditRoleModal(role: any) {
    this.editingRole = {
      id: role.id,
      name: role.name,
      description: role.description || '',
      isSystem: role.isSystem,
    };
    this.editRoleModalVisible = true;
  }

  submitEditRole() {
    if (!this.editingRole.name.trim()) return;
    this.savingRole = true;

    this.api
      .put(`/rbac/roles/${this.editingRole.id}`, {
        name: this.editingRole.name.trim(),
        description: (this.editingRole.description || '').trim(),
      })
      .subscribe({
        next: (updated: any) => {
          this.savingRole = false;
          this.editRoleModalVisible = false;
          const target = this.roles.find((r) => r.id === this.editingRole.id);
          if (target) {
            target.name = updated.name || this.editingRole.name.trim();
            target.description = updated.description !== undefined ? updated.description : this.editingRole.description;
          }
          this.saveSuccess = true;
          this.saveMessage = `Role details updated successfully!`;
          this.toast.success(this.saveMessage, 'Role Updated');
          setTimeout(() => (this.saveSuccess = false), 3000);
        },
        error: (err: any) => {
          this.savingRole = false;
          const msg = err?.error?.message || 'Failed to update role details.';
          this.toast.error(msg, 'Update Failed');
          alert(msg);
        },
      });
  }

  confirmDeleteRole(role: any) {
    if (role.isSystem) return;
    this.roleToDelete = role;
    this.deleteRoleModalVisible = true;
  }

  deleteRoleConfirmed() {
    if (!this.roleToDelete) return;
    this.deletingRole = true;

    this.api.delete(`/rbac/roles/${this.roleToDelete.id}`).subscribe({
      next: () => {
        this.deletingRole = false;
        this.roles = this.roles.filter((r) => r.id !== this.roleToDelete.id);
        if (this.selectedRole?.id === this.roleToDelete.id) {
          this.selectedRole = this.roles.length > 0 ? this.roles[0] : null;
        }
        this.deleteRoleModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Role "${this.roleToDelete.name}" deleted successfully.`;
        this.toast.success(this.saveMessage, 'Role Deleted');
        this.roleToDelete = null;
        setTimeout(() => (this.saveSuccess = false), 3000);
      },
      error: (err: any) => {
        this.deletingRole = false;
        const msg = err?.error?.message || 'Failed to delete role. It may still be in use.';
        this.toast.error(msg, 'Delete Failed');
        alert(msg);
      },
    });
  }

  // Bulk actions on permission matrix
  toggleColumnAll(role: any, actionKey: string) {
    if (!role) return;
    if (!role.permissions) role.permissions = [];

    const visibleMods = this.filteredPermissionModules();
    const allHaveIt = visibleMods.every((mod) =>
      this.hasPermission(role, mod.key, actionKey),
    );

    if (allHaveIt) {
      // Remove this action for all visible modules
      const modKeys = new Set(visibleMods.map((m) => m.key));
      role.permissions = role.permissions.filter(
        (p: any) => !(modKeys.has(p.moduleName || p.module) && p.action === actionKey),
      );
    } else {
      // Add this action for all visible modules
      visibleMods.forEach((mod) => {
        if (!this.hasPermission(role, mod.key, actionKey)) {
          role.permissions.push({
            moduleName: mod.key,
            module: mod.key,
            action: actionKey,
          });
        }
      });
    }
  }

  grantAllViewOnly(role: any) {
    if (!role) return;
    if (!role.permissions) role.permissions = [];
    const visibleMods = this.filteredPermissionModules();
    visibleMods.forEach((mod) => {
      if (!this.hasPermission(role, mod.key, 'VIEW')) {
        role.permissions.push({
          moduleName: mod.key,
          module: mod.key,
          action: 'VIEW',
        });
      }
    });
  }

  grantFullAccess(role: any) {
    if (!role) return;
    if (!role.permissions) role.permissions = [];
    const visibleMods = this.filteredPermissionModules();
    visibleMods.forEach((mod) => {
      this.permissionActions.forEach((act) => {
        if (!this.hasPermission(role, mod.key, act.key)) {
          role.permissions.push({
            moduleName: mod.key,
            module: mod.key,
            action: act.key,
          });
        }
      });
    });
  }

  revokeAllPermissions(role: any) {
    if (!role) return;
    if (this.selectedCategoryFilter === 'ALL' && !this.moduleSearchQuery) {
      role.permissions = [];
    } else {
      const visibleModKeys = new Set(this.filteredPermissionModules().map((m) => m.key));
      role.permissions = (role.permissions || []).filter(
        (p: any) => !visibleModKeys.has(p.moduleName || p.module),
      );
    }
  }

  openNewRoleModal() {
    this.startCreateRole();
  }

  submitNewRole() {
    this.submitCreateRole();
  }

  openNewUserModal() {
    this.newUser = { fullName: '', email: '', phone: '', roleId: '' };
    this.showNewUserModal = true;
  }

  submitNewUser() {
    if (!this.newUser.fullName.trim() || !this.newUser.email.trim()) return;

    this.api.post('/rbac/users', {
      fullName: this.newUser.fullName.trim(),
      email: this.newUser.email.trim(),
      phone: this.newUser.phone.trim(),
      roleId: this.newUser.roleId || null,
    }).subscribe({
      next: (created: any) => {
        this.showNewUserModal = false;
        this.users.push(created);
        this.saveSuccess = true;
        this.saveMessage = `User "${created.fullName}" registered successfully!`;
        this.toast.success(this.saveMessage, 'User Registered');
        setTimeout(() => (this.saveSuccess = false), 3500);
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to create user. Ensure email is unique.';
        this.toast.error(msg, 'Registration Failed');
        alert(msg);
      },
    });
  }

  changeUserRole(user: any, event: any) {
    const newRoleId = event && event.target ? event.target.value : user.roleId;
    user.roleId = (newRoleId && newRoleId !== 'null' && newRoleId !== '') ? newRoleId : null;
    this.api.put(`/rbac/users/${user.id}`, { roleId: user.roleId }).subscribe({
      next: (res: any) => {
        if (res && res.role) {
          user.role = res.role;
        }
        this.saveSuccess = true;
        this.saveMessage = `Role assignment updated for ${user.fullName}.`;
        this.toast.success(this.saveMessage, 'Role Assigned');
        setTimeout(() => (this.saveSuccess = false), 2500);
      },
      error: (err: any) => {
        console.error('Failed to update user role', err);
        this.toast.error('Failed to update user role.', 'Update Failed');
      },
    });
  }

  saveAllUsers() {
    this.saving = true;
    const reqs = this.users.map((u) =>
      this.api.put(`/rbac/users/${u.id}`, {
        roleId: (u.roleId && u.roleId !== 'null' && u.roleId !== '') ? u.roleId : null,
        isActive: u.isActive,
      })
    );
    if (reqs.length === 0) {
      this.saving = false;
      return;
    }
    forkJoin(reqs).subscribe({
      next: () => {
        this.saving = false;
        this.saveSuccess = true;
        this.saveMessage = 'All user role assignments saved successfully!';
        this.toast.success(this.saveMessage, 'Users Updated');
        setTimeout(() => (this.saveSuccess = false), 3500);
      },
      error: () => {
        this.saving = false;
        this.toast.error('Failed to save user role assignments.', 'Save Failed');
      },
    });
  }

  toggleUserStatus(user: any) {
    user.isActive = !user.isActive;
    this.api.put(`/rbac/users/${user.id}`, { isActive: user.isActive }).subscribe({
      next: () => {
        this.saveSuccess = true;
        this.saveMessage = `User status changed to ${user.isActive ? 'Active' : 'Inactive'}.`;
        this.toast.success(this.saveMessage, 'Status Updated');
        setTimeout(() => (this.saveSuccess = false), 2500);
      },
      error: () => {
        this.toast.error('Failed to change user status.', 'Update Failed');
      },
    });
  }

  filteredUsers(): any[] {
    let list = this.users || [];
    if (this.userRoleFilter && this.userRoleFilter !== 'ALL') {
      list = list.filter((u) => u.roleId === this.userRoleFilter);
    }
    if (this.userSearchQuery.trim()) {
      const q = this.userSearchQuery.toLowerCase().trim();
      list = list.filter((u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    }
    return list;
  }

  saveSettings() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;

    if (this.activeTab === 'toggles') {
      this.saving = true;
      const requests = this.toggles.map((t) =>
        this.api.post('/settings/toggles', {
          companyId: compId,
          featureKey: t.featureKey,
          isEnabled: t.isEnabled,
        }),
      );
      forkJoin(requests).subscribe({
        next: () => {
          this.saving = false;
          this.saveSuccess = true;
          this.saveMessage = 'All modular system capabilities saved successfully!';
          this.toast.success(this.saveMessage, 'Features Saved');
          setTimeout(() => (this.saveSuccess = false), 3500);
        },
        error: (err: any) => {
          this.saving = false;
          this.loadAll(); // Reload actual feature states from server
          const errorMsg = err.error?.message || 'Failed to save modular system capabilities.';
          this.toast.error(errorMsg, 'Save Blocked');
        },
      });
      return;
    }

    if (this.activeTab === 'roles') {
      if (this.selectedRole) {
        this.saveRolePermissions(this.selectedRole);
      }
      return;
    }

    if (this.activeTab === 'users') {
      this.saveAllUsers();
      return;
    }

    this.saving = true;
    this.api.put(`/settings?companyId=${compId}`, this.settings).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.tenant.companySettings.set({ ...this.settings, ...(res || {}) });
        this.saveSuccess = true;
        this.saveMessage = 'Configuration saved successfully! All transactional engines and parameters refreshed.';
        this.toast.success(this.saveMessage, 'Settings Saved');
        setTimeout(() => (this.saveSuccess = false), 3500);
      },
      error: (err: any) => {
        this.saving = false;
        const errorMsg = err.error?.message || 'Failed to save configuration settings.';
        this.toast.error(errorMsg, 'Save Failed');
      },
    });
  }

  setGstLevel(level: string) {
    this.settings.gstActiveLevel = level;
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.api.put(`/settings?companyId=${compId}`, this.settings).subscribe({
      next: (res: any) => {
        this.tenant.companySettings.set({ ...this.settings, ...(res || {}) });
        this.toast.success(`GST resolution level switched to ${this.formatGstLevelName(level)}`, 'Hierarchy Updated');
      },
      error: () => {
        this.toast.error('Failed to update GST resolution hierarchy', 'Error');
      },
    });
  }

  formatGstLevelName(level: string): string {
    switch (level) {
      case 'COMPANY': return 'Company Level';
      case 'ITEM_GROUP': return 'Item Group Level';
      case 'ITEM_CATEGORY': return 'Item Category Level';
      case 'ITEM': return 'Item Master Level';
      default: return level;
    }
  }

  toggleFeature(toggle: any, event: any) {
    const isChecked = event.target ? event.target.checked : !toggle.isEnabled;
    toggle.isEnabled = isChecked;

    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;

    this.api.post('/settings/toggles', {
      companyId: compId,
      featureKey: toggle.featureKey,
      isEnabled: isChecked,
    }).subscribe({
      next: () => {
        this.saveSuccess = true;
        this.saveMessage = `Module "${this.formatFeatureName(toggle.featureKey)}" set to ${isChecked ? 'Active' : 'Disabled'}.`;
        this.toast.success(this.saveMessage, 'Feature Saved');
        setTimeout(() => (this.saveSuccess = false), 2500);
      },
      error: (err: any) => {
        console.error('Failed to update toggle', err);
        // Rollback switch state in UI if update/disable was blocked
        toggle.isEnabled = !isChecked;
        if (event.target) {
          event.target.checked = !isChecked;
        }
        const errorMsg = err.error?.message || 'Failed to update feature setting.';
        this.toast.error(errorMsg, 'Action Blocked');
      },
    });
  }

  formatFeatureName(key: string): string {
    switch (key) {
      case 'GST': return 'Goods & Services Tax (GST)';
      case 'PURCHASE_ORDER': return 'Purchase Orders (PO)';
      case 'GRN': return 'Goods Receipt Notes (GRN)';
      case 'SALES_ORDER': return 'Sales Orders (SO)';
      case 'DELIVERY_CHALLAN': return 'Delivery Challans (DC)';
      case 'VARIANTS': return 'Item Variants & Attributes';
      case 'RACK_BIN': return 'Godown & Rack/Bin Storage';
      case 'MANUFACTURING': return 'BOM & Assembly Manufacturing';
      case 'STOCK_TRANSFER': return 'Stock Transfers (Warehouse Transfer)';
      case 'STOCK_ADJUSTMENT': return 'Stock Adjustments & Reconciliation';
      case 'PRICE_LIST': return 'Price Lists & Tiered Pricing';
      default: return key;
    }
  }

  getFeatureDescription(key: string): string {
    switch (key) {
      case 'GST': return 'Enables statutory GSTIN calculations, HSN resolution, and balanced tax accounting ledgers.';
      case 'PURCHASE_ORDER': return 'Enables formal procurement workflow, tracking ordered vs pending quantities.';
      case 'GRN': return 'Gatekeeper warehouse stock-in step before finance invoice posting.';
      case 'SALES_ORDER': return 'Enables booking of customer sales orders with fulfillment and backlog tracking.';
      case 'DELIVERY_CHALLAN': return 'Enables delivery challans (DC) and gate-pass dispatch notes prior to sales billing.';
      case 'VARIANTS': return 'Manage matrix items with sizes, colors, and SKU-level variance.';
      case 'RACK_BIN': return 'Granular inventory location tracking within godowns and warehouses.';
      case 'MANUFACTURING': return 'Bill of Materials composition, component consumption, and finished goods assembly.';
      case 'STOCK_TRANSFER': return 'Inter-warehouse and godown-to-godown stock transfer manifests with receipt verification.';
      case 'STOCK_ADJUSTMENT': return 'Inventory physical audits, shrinkage write-offs, and stock reconciliation vouchers.';
      case 'PRICE_LIST': return 'Custom price lists, wholesale trade tiers, and customer-specific rate structures.';
      default: return 'Core system functionality module.';
    }
  }

  getFeatureIcon(key: string): string {
    switch (key) {
      case 'GST': return 'pi pi-percentage';
      case 'PURCHASE_ORDER': return 'pi pi-shopping-cart';
      case 'GRN': return 'pi pi-box';
      case 'SALES_ORDER': return 'pi pi-file';
      case 'DELIVERY_CHALLAN': return 'pi pi-truck';
      case 'VARIANTS': return 'pi pi-tags';
      case 'RACK_BIN': return 'pi pi-warehouse';
      case 'MANUFACTURING': return 'pi pi-cog';
      case 'STOCK_TRANSFER': return 'pi pi-arrows-h';
      case 'STOCK_ADJUSTMENT': return 'pi pi-sliders-h';
      case 'PRICE_LIST': return 'pi pi-percentage';
      default: return 'pi pi-sliders-h';
    }
  }

  // COMPANY PROFILE METHODS
  loadCompanyProfile() {
    const comp = this.tenant.currentCompany();
    if (comp) {
      this.initCompanyForm(comp);
    }
    // Always fetch fresh company profile from API
    this.api.get<any[]>('/tenancy/companies').subscribe({
      next: (companies) => {
        if (companies && companies.length > 0) {
          const savedCompId = localStorage.getItem('zeno_company_id');
          const found = (savedCompId ? companies.find((c) => c.id === savedCompId) : null) || companies[0];
          this.tenant.setCompany(found);
          this.initCompanyForm(found);
        }
      },
      error: (err) => console.error('Failed to load company profile from API', err),
    });
  }

  initCompanyForm(comp: any) {
    if (!comp) return;
    this.companyForm = {
      id: comp.id,
      legalName: comp.legalName !== undefined && comp.legalName !== null ? comp.legalName : (comp.tradeName || 'Apex Technologies Private Limited'),
      tradeName: comp.tradeName !== undefined && comp.tradeName !== null ? comp.tradeName : (comp.legalName || 'Apex Tech'),
      code: comp.code || 'APEX-01',
      businessType: comp.businessType || 'Private Limited Company',
      financialYearStart: comp.financialYearStart ? String(comp.financialYearStart).split('T')[0] : '2025-04-01',
      financialYearEnd: comp.financialYearEnd ? String(comp.financialYearEnd).split('T')[0] : '2026-03-31',
      booksBeginFrom: comp.booksBeginFrom ? String(comp.booksBeginFrom).split('T')[0] : '2025-04-01',
      currencyCode: comp.currencyCode || 'INR',
      gstRegistrationType: comp.gstRegistrationType || 'Regular',
      gstin: comp.gstin || '',
      pan: comp.pan || '',
      stateName: comp.stateName || comp.extraDetails?.stateName || 'Maharashtra (27)',
      filingFrequency: comp.filingFrequency || comp.extraDetails?.filingFrequency || 'Monthly',
      tanNumber: comp.tanNumber || comp.arnNumber || comp.extraDetails?.tanNumber || comp.extraDetails?.arnNumber || '',
      arnNumber: comp.tanNumber || comp.arnNumber || comp.extraDetails?.tanNumber || comp.extraDetails?.arnNumber || '',
      billingAddress: comp.billingAddress || {
        addressLine1: this.currentBranch?.addressLine1 || '',
        addressLine2: this.currentBranch?.addressLine2 || '',
        city: this.currentBranch?.city || '',
        state: this.currentBranch?.stateName || 'Maharashtra',
        pincode: this.currentBranch?.pincode || '',
        country: 'India',
      },
      shippingAddress: comp.shippingAddress || {
        addressLine1: this.currentBranch?.addressLine1 || '',
        addressLine2: this.currentBranch?.addressLine2 || '',
        city: this.currentBranch?.city || '',
        state: this.currentBranch?.stateName || 'Maharashtra',
        pincode: this.currentBranch?.pincode || '',
        country: 'India',
      },
      contactDetails: comp.contactDetails || {
        contactPerson: '',
        email: '',
        phone: '',
        alternatePhone: '',
        website: '',
      },
      logoUrl: comp.logoUrl || '/zeno-books-logo.png',
      extraDetails: comp.extraDetails || {
        tagline: 'Precision Accounting & Financial ERP',
        invoiceHeaderNote: '',
        invoiceFooterNote: '',
      },
    };
  }

  copyBillingToShipping() {
    this.companyForm.shippingAddress = {
      ...this.companyForm.billingAddress,
    };
    this.saveSuccess = true;
    this.saveMessage = 'Billing address copied to shipping address!';
    setTimeout(() => (this.saveSuccess = false), 2000);
  }

  onLogoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processLogoFile(input.files[0]);
    }
  }

  onLogoDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      this.processLogoFile(event.dataTransfer.files[0]);
    }
  }

  processLogoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.companyForm.logoUrl = (e.target?.result as string) || '';
    };
    reader.readAsDataURL(file);
  }

  onCompanyBillingStateChange() {
    const found = this.indianStates.find(
      (s) => s.name.toLowerCase() === (this.companyForm.billingAddress.state || '').trim().toLowerCase(),
    );
    if (found) {
      if (!this.companyForm.shippingAddress.state) {
        this.companyForm.shippingAddress.state = found.name;
      }
      this.companyForm.stateName = `${found.name} (${found.code})`;
    }
  }

  saveCompanyProfile() {
    const compId = this.companyForm.id || this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id') || this.tenant.companies()?.[0]?.id;
    if (!compId) {
      alert('Unable to identify current company record. Please refresh and try again.');
      return;
    }

    // Sanitize dates for PostgreSQL date column
    const payload = { ...this.companyForm };
    if (!payload.financialYearEnd) {
      payload.financialYearEnd = null;
    }
    if (!payload.financialYearStart) {
      payload.financialYearStart = '2025-04-01';
    }
    if (!payload.booksBeginFrom) {
      payload.booksBeginFrom = '2025-04-01';
    }

    payload.arnNumber = payload.tanNumber;
    if (!payload.extraDetails) {
      payload.extraDetails = {};
    }
    payload.extraDetails.tanNumber = payload.tanNumber;
    payload.extraDetails.arnNumber = payload.arnNumber;
    payload.extraDetails.stateName = payload.stateName;
    payload.extraDetails.filingFrequency = payload.filingFrequency;

    this.savingCompany = true;
    this.api.put(`/tenancy/companies/${compId}`, payload).subscribe({
      next: (res: any) => {
        this.savingCompany = false;
        this.saveSuccess = true;
        this.saveMessage = 'Company profile and branding saved successfully!';
        this.toast.success(this.saveMessage, 'Company Profile Saved');
        setTimeout(() => (this.saveSuccess = false), 3500);

        if (res) {
          this.tenant.setCompany(res);
          this.initCompanyForm(res);
        }
        this.tenant.loadHierarchy().subscribe({
          next: (companies) => {
            const updated = (companies && companies.find((c: any) => c.id === compId)) || res;
            if (updated) {
              this.tenant.setCompany(updated);
              this.initCompanyForm(updated);
            }
          },
        });
      },
      error: (err) => {
        this.savingCompany = false;
        console.error('Failed to update company profile', err);
        const msg = err?.error?.message || 'Failed to update company profile. Please check the network/console and try again.';
        this.toast.error(msg, 'Save Failed');
        alert(msg);
      },
    });
  }

  // BRANCH MASTER METHODS
  loadBranches() {
    this.api.get<any[]>('/tenancy/branches').subscribe({
      next: (res) => {
        this.branches = res || [];
      },
    });
  }

  get filteredBranches(): any[] {
    let list = this.branches || [];
    if (this.branchSearchQuery.trim()) {
      const q = this.branchSearchQuery.toLowerCase().trim();
      list = list.filter((b) =>
        (b.branchName && b.branchName.toLowerCase().includes(q)) ||
        (b.branchCode && b.branchCode.toLowerCase().includes(q)) ||
        (b.stateName && b.stateName.toLowerCase().includes(q)) ||
        (b.addressLine1 && b.addressLine1.toLowerCase().includes(q)) ||
        (b.pincode && b.pincode.toLowerCase().includes(q))
      );
    }
    return list;
  }

  getHeadOfficeBranch(): any {
    return this.branches.find((b) => b.isHeadOffice) || this.branches[0] || null;
  }

  getGodownsCountForBranch(branchId: string): number {
    return this.warehouses.filter((w) => w.branchId === branchId).length;
  }

  onNewBranchStateChange() {
    const s = this.indianStates.find((st) => st.name === this.newBranch.stateName);
    if (s) {
      this.newBranch.stateCode = s.code;
    }
  }

  onEditBranchStateChange() {
    if (!this.branchToEdit) return;
    const s = this.indianStates.find((st) => st.name === this.branchToEdit.stateName);
    if (s) {
      this.branchToEdit.stateCode = s.code;
    }
  }

  openCreateBranchModal() {
    this.newBranch = {
      branchName: '',
      branchCode: `BR-0${this.branches.length + 1}`,
      stateCode: '27',
      stateName: 'Maharashtra',
      addressLine1: '',
      pincode: '',
      isHeadOffice: this.branches.length === 0,
    };
    this.createBranchModalVisible = true;
  }

  submitCreateBranch() {
    if (!this.newBranch.branchName.trim() || !this.newBranch.branchCode.trim()) return;

    this.savingBranch = true;
    const compId = this.companyForm?.id || this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    this.api.post('/tenancy/branches', {
      ...this.newBranch,
      companyId: compId,
    }).subscribe({
      next: () => {
        this.savingBranch = false;
        this.createBranchModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Branch "${this.newBranch.branchName}" created successfully!`;
        this.toast.success(this.saveMessage, 'Branch Created');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadBranches();
        this.tenant.loadHierarchy().subscribe();
      },
      error: (err) => {
        this.savingBranch = false;
        const msg = err?.error?.message || 'Failed to create branch. Please check inputs.';
        this.toast.error(msg, 'Branch Creation Failed');
        alert(msg);
      },
    });
  }

  openEditBranchModal(b: any) {
    this.branchToEdit = { ...b };
    this.editBranchModalVisible = true;
  }

  submitEditBranch() {
    if (!this.branchToEdit || !this.branchToEdit.id) return;
    if (!this.branchToEdit.branchName.trim() || !this.branchToEdit.branchCode.trim()) return;

    this.savingBranch = true;
    this.api.put(`/tenancy/branches/${this.branchToEdit.id}`, this.branchToEdit).subscribe({
      next: () => {
        this.savingBranch = false;
        this.editBranchModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Branch "${this.branchToEdit.branchName}" updated successfully!`;
        this.toast.success(this.saveMessage, 'Branch Updated');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadBranches();
        this.tenant.loadHierarchy().subscribe();
      },
      error: (err) => {
        this.savingBranch = false;
        const msg = err?.error?.message || 'Failed to update branch.';
        this.toast.error(msg, 'Update Failed');
        alert(msg);
      },
    });
  }

  openDeleteBranchModal(b: any) {
    this.branchToDelete = b;
    this.deleteBranchModalVisible = true;
  }

  confirmDeleteBranch() {
    if (!this.branchToDelete || !this.branchToDelete.id) return;

    this.savingBranch = true;
    this.api.delete(`/tenancy/branches/${this.branchToDelete.id}`).subscribe({
      next: () => {
        this.savingBranch = false;
        this.deleteBranchModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Branch "${this.branchToDelete.branchName}" deleted successfully.`;
        this.toast.success(this.saveMessage, 'Branch Deleted');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadBranches();
        this.tenant.loadHierarchy().subscribe();
      },
      error: (err) => {
        this.savingBranch = false;
        const msg = err?.error?.message || 'Failed to delete branch. Ensure linked godowns are reassigned first.';
        this.toast.error(msg, 'Deletion Failed');
        alert(msg);
      },
    });
  }

  // WAREHOUSE MASTER METHODS
  loadWarehouses() {
    this.api.get<any[]>('/tenancy/godowns').subscribe({
      next: (res) => {
        this.warehouses = res || [];
      },
    });
  }

  get filteredWarehouses(): any[] {
    let list = this.warehouses;
    if (this.warehouseBranchFilter && this.warehouseBranchFilter !== 'ALL') {
      list = list.filter((w) => w.branchId === this.warehouseBranchFilter);
    }
    if (this.warehouseSearchQuery.trim()) {
      const q = this.warehouseSearchQuery.toLowerCase().trim();
      list = list.filter((w) =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.code && w.code.toLowerCase().includes(q)) ||
        (w.city && w.city.toLowerCase().includes(q)) ||
        (w.contactPerson && w.contactPerson.toLowerCase().includes(q))
      );
    }
    return list;
  }

  getActiveWarehousesCount(): number {
    return this.warehouses.filter((w) => w.isActive !== false).length;
  }

  getUniqueBranchesCount(): number {
    const branchIds = new Set(this.warehouses.map((w) => w.branchId).filter(Boolean));
    return branchIds.size || (this.tenant.branches().length || 1);
  }

  openCreateWarehouseModal() {
    const branches = this.tenant.branches();
    this.newWarehouse = {
      name: '',
      code: `WH-0${this.warehouses.length + 1}`,
      branchId: branches && branches.length > 0 ? branches[0].id : '',
      address: '',
      city: '',
      state: 'Maharashtra',
      pincode: '',
      contactPerson: '',
      contactPhone: '',
      isActive: true,
    };
    this.createWarehouseModalVisible = true;
  }

  submitCreateWarehouse() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!this.newWarehouse.name.trim() || !this.newWarehouse.code.trim()) return;

    this.savingWarehouse = true;
    this.api.post('/tenancy/godowns', {
      ...this.newWarehouse,
      companyId: compId,
    }).subscribe({
      next: () => {
        this.savingWarehouse = false;
        this.createWarehouseModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Warehouse "${this.newWarehouse.name}" created successfully!`;
        this.toast.success(this.saveMessage, 'Warehouse Created');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadWarehouses();
        this.tenant.reloadGodowns();
      },
      error: (err) => {
        this.savingWarehouse = false;
        console.error('Failed to create warehouse', err);
        const msg = err?.error?.message || 'Failed to create warehouse.';
        this.toast.error(msg, 'Creation Failed');
      },
    });
  }

  openEditWarehouseModal(wh: any) {
    this.warehouseToEdit = { ...wh };
    this.editWarehouseModalVisible = true;
  }

  submitEditWarehouse() {
    if (!this.warehouseToEdit || !this.warehouseToEdit.id) return;

    this.savingWarehouse = true;
    this.api.put(`/tenancy/godowns/${this.warehouseToEdit.id}`, this.warehouseToEdit).subscribe({
      next: () => {
        this.savingWarehouse = false;
        this.editWarehouseModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Warehouse "${this.warehouseToEdit.name}" updated successfully!`;
        this.toast.success(this.saveMessage, 'Warehouse Updated');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadWarehouses();
        this.tenant.reloadGodowns();
      },
      error: (err) => {
        this.savingWarehouse = false;
        console.error('Failed to update warehouse', err);
        const msg = err?.error?.message || 'Failed to update warehouse.';
        this.toast.error(msg, 'Update Failed');
      },
    });
  }

  openDeleteWarehouseModal(wh: any) {
    this.warehouseToDelete = wh;
    this.deleteWarehouseModalVisible = true;
  }

  confirmDeleteWarehouse() {
    if (!this.warehouseToDelete || !this.warehouseToDelete.id) return;

    this.savingWarehouse = true;
    this.api.delete(`/tenancy/godowns/${this.warehouseToDelete.id}`).subscribe({
      next: () => {
        this.savingWarehouse = false;
        this.deleteWarehouseModalVisible = false;
        this.saveSuccess = true;
        this.saveMessage = `Warehouse "${this.warehouseToDelete.name}" deleted successfully.`;
        this.toast.success(this.saveMessage, 'Warehouse Deleted');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadWarehouses();
        this.tenant.reloadGodowns();
      },
      error: (err) => {
        this.savingWarehouse = false;
        console.error('Failed to delete warehouse', err);
        const msg = err?.error?.message || 'Failed to delete warehouse.';
        this.toast.error(msg, 'Delete Failed');
      },
    });
  }

  openTaxModal() {
    this.newTax = {
      taxName: '',
      rate: 18,
      cessRate: 0,
      description: '',
    };
    this.showTaxModal = true;
  }

  submitTaxMaster() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId || !this.newTax.taxName) return;

    this.api.post('/settings/tax-masters', {
      ...this.newTax,
      companyId: compId,
    }).subscribe({
      next: () => {
        this.showTaxModal = false;
        this.saveSuccess = true;
        this.saveMessage = `New tax slab "${this.newTax.taxName}" added successfully!`;
        this.toast.success(this.saveMessage, 'Tax Slab Added');
        setTimeout(() => (this.saveSuccess = false), 3500);
        this.loadAll();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to create tax slab.';
        this.toast.error(msg, 'Creation Failed');
      },
    });
  }
}
