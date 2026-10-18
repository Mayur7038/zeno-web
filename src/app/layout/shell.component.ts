import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { TenantService } from '../core/services/tenant.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  isQuickActionOpen = false;
  purchaseOpen = true;
  salesOpen = false;
  accountingOpen = false;
  accountMasterOpen = false;
  inventoryMasterOpen = false;
  inventoryOpen = false;
  manufacturingOpen = false;
  settingsOrganizationOpen = true;
  settingsConfigurationOpen = true;

  isSidebarCollapsed = false;
  isSettingsMode = false;

  toggleSidebarCollapse() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  currentSettingsTab = 'company';

  toggleQuickActionMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isQuickActionOpen = !this.isQuickActionOpen;
  }

  closeQuickAction() {
    this.isQuickActionOpen = false;
  }

  @HostListener('document:click')
  onGlobalClick() {
    this.isQuickActionOpen = false;
  }

  constructor(
    public auth: AuthService,
    public tenant: TenantService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe();
    if (this.isAccountingActive()) {
      this.accountingOpen = true;
    }
    if (this.isAccountMasterActive()) {
      this.accountMasterOpen = true;
    }
    if (this.isInventoryMasterActive()) {
      this.inventoryMasterOpen = true;
    }
    if (this.isInventoryActive()) {
      this.inventoryOpen = true;
    }
    if (this.isManufacturingActive()) {
      this.manufacturingOpen = true;
    }

    this.updateSettingsModeFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateSettingsModeFromUrl(event.urlAfterRedirects || event.url);
        this.isQuickActionOpen = false;
      });
  }

  updateSettingsModeFromUrl(url: string) {
    this.isSettingsMode = url.startsWith('/settings');
    if (this.isSettingsMode) {
      const qIndex = url.indexOf('?');
      if (qIndex !== -1) {
        const params = new URLSearchParams(url.substring(qIndex + 1));
        this.currentSettingsTab = params.get('tab') || 'company';
      } else {
        this.currentSettingsTab = 'company';
      }
    }
  }

  toggleSettingsMode() {
    if (this.isSettingsMode) {
      this.goToHome();
    } else {
      this.openSettingsMode();
    }
  }

  openSettingsMode() {
    this.isSettingsMode = true;
    this.router.navigate(['/settings'], {
      queryParams: { tab: this.currentSettingsTab || 'company' },
    });
  }

  goToHome() {
    this.isSettingsMode = false;
    this.router.navigate(['/dashboard']);
  }

  toggleManufacturing() {
    this.manufacturingOpen = !this.manufacturingOpen;
  }

  isManufacturingActive(): boolean {
    return this.router.url.includes('/manufacturing');
  }

  togglePurchase() {
    this.purchaseOpen = !this.purchaseOpen;
  }

  isPurchaseActive(): boolean {
    return this.router.url.includes('/procure-to-pay');
  }

  toggleSales() {
    this.salesOpen = !this.salesOpen;
  }

  isSalesActive(): boolean {
    return this.router.url.includes('/sales');
  }

  toggleAccounting() {
    this.accountingOpen = !this.accountingOpen;
  }

  isAccountingActive(): boolean {
    return this.router.url.includes('/accounting');
  }

  toggleAccountMaster() {
    this.accountMasterOpen = !this.accountMasterOpen;
  }

  isAccountMasterActive(): boolean {
    return this.router.url.includes('/masters/ledger');
  }

  toggleInventoryMaster() {
    this.inventoryMasterOpen = !this.inventoryMasterOpen;
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
  }

  isInventoryActive(): boolean {
    return this.router.url.includes('/inventory/');
  }

  isInventoryMasterActive(): boolean {
    return (
      this.router.url.includes('/masters/items') ||
      this.router.url.includes('/masters/stock') ||
      this.router.url.includes('/masters/units') ||
      this.router.url.includes('/masters/variants')
    );
  }

  onCompanyChange(event: any) {
    const companyId = event.target.value;
    const comp = this.tenant.companies().find((c) => c.id === companyId);
    if (comp) {
      this.tenant.setCompany(comp);
    }
  }

  onBranchChange(event: any) {
    const branchId = event.target.value;
    const branch = this.tenant.branches().find((b) => b.id === branchId);
    if (branch) {
      this.tenant.setBranch(branch);
    }
  }

  toggleSettingsOrganization() {
    this.settingsOrganizationOpen = !this.settingsOrganizationOpen;
  }

  isSettingsOrganizationActive(): boolean {
    return ['company', 'branches', 'warehouses', 'financial-years'].includes(this.currentSettingsTab);
  }

  toggleSettingsConfiguration() {
    this.settingsConfigurationOpen = !this.settingsConfigurationOpen;
  }

  isSettingsConfigurationActive(): boolean {
    return ['sales', 'purchase', 'inventory'].includes(this.currentSettingsTab);
  }
}
