import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { MastersService } from '../../../core/services/masters.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';

interface PriceListLineItem {
  id?: string;
  itemId: string;
  itemName?: string;
  sku?: string;
  purchasePrice: number;
  standardRate: number;
  pricingMode: 'MARKUP' | 'MARKDOWN' | 'DIRECT';
  adjustmentPercentage: number;
  customRate: number;
  discountPercentage?: number;
  minSellingPrice?: number;
  notes?: string;
}

@Component({
  selector: 'app-price-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './price-list.component.html',
})
export class PriceListComponent implements OnInit {
  viewMode: 'list' | 'form' = 'list';
  editId: string | null = null;
  selectedTab: 'ALL' | 'STOCK_GROUP_WISE' | 'CUSTOMER_WISE' | 'PRODUCT_WISE' | 'SIMULATOR' = 'ALL';

  priceLists: any[] = [];
  filteredPriceLists: any[] = [];
  stockGroupsList: any[] = [];
  customersList: any[] = [];
  itemsList: any[] = [];

  loading = false;
  submitting = false;
  searchQuery = '';
  activeFilter = 'ALL';
  errorMessage = '';

  itemSearchQuery = '';
  globalMode: 'MARKUP' | 'MARKDOWN' = 'MARKUP';
  globalPercentage: number = 10;

  groupRulesCount = 0;
  customerRulesCount = 0;
  productRulesCount = 0;

  // Simulator
  simItemId = '';
  simCustomerId = '';
  simDate = new Date().toISOString().split('T')[0];
  simResult: any = null;

  formData = {
    name: '',
    pricingType: 'STOCK_GROUP_WISE',
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true,
    notes: '',
    items: [] as PriceListLineItem[],
  };

  constructor(
    private inventoryService: InventoryService,
    private mastersService: MastersService,
    private tenantService: TenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.loading = true;
    this.inventoryService.getPriceLists(comp.id).subscribe({
      next: (res) => {
        this.priceLists = res;
        this.filterPriceLists();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.mastersService.getItemGroups(comp.id).subscribe({
      next: (res) => {
        this.stockGroupsList = res;
      },
    });

    this.mastersService.getLedgers(comp.id, false, true).subscribe({
      next: (res) => {
        this.customersList = res;
      },
    });

    this.mastersService.getItems(comp.id).subscribe({
      next: (res) => {
        this.itemsList = res;
        if (this.viewMode === 'form' && (!this.formData.items || this.formData.items.length === 0)) {
          this.loadItemsForDimension();
        }
      },
    });
  }

  setTab(tab: any) {
    this.selectedTab = tab;
    this.filterPriceLists();
  }

  filterPriceLists() {
    let list = this.priceLists;

    if (this.selectedTab !== 'ALL' && this.selectedTab !== 'SIMULATOR') {
      list = list.filter((pl) => pl.pricingType === this.selectedTab);
    }

    if (this.activeFilter === 'ACTIVE') {
      list = list.filter((pl) => pl.isActive);
    } else if (this.activeFilter === 'INACTIVE') {
      list = list.filter((pl) => !pl.isActive);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((pl) => pl.name?.toLowerCase().includes(q));
    }

    this.filteredPriceLists = list;

    this.groupRulesCount = this.priceLists.filter(
      (pl) => pl.pricingType === 'STOCK_GROUP_WISE',
    ).length;
    this.customerRulesCount = this.priceLists.filter(
      (pl) => pl.pricingType === 'CUSTOMER_WISE',
    ).length;
    this.productRulesCount = this.priceLists.filter(
      (pl) => pl.pricingType === 'PRODUCT_WISE',
    ).length;
  }

  formatDimension(type: string): string {
    switch (type) {
      case 'STOCK_GROUP_WISE':
        return 'Stock Group Wise';
      case 'CUSTOMER_WISE':
        return 'Customer Wise';
      case 'PRODUCT_WISE':
        return 'Product Wise';
      default:
        return type;
    }
  }

  exportPriceLists() {
    if (!this.filteredPriceLists || this.filteredPriceLists.length === 0) return;
    const headers = ['Price List Name', 'Dimension', 'Effective From', 'Items Count', 'Status'];
    const rows = this.filteredPriceLists.map((pl) => [
      pl.name || '',
      this.formatDimension(pl.pricingType) || '',
      pl.effectiveFrom || '',
      pl.items?.length || 0,
      pl.isActive ? 'Active' : 'Inactive',
    ]);
    exportToCsv('Price_Lists', headers, rows);
    this.toast.success('Price lists exported successfully!', 'Export Complete');
  }

  openCreatePage() {
    this.editId = null;
    this.errorMessage = '';
    this.itemSearchQuery = '';
    this.formData = {
      name: '',
      pricingType:
        this.selectedTab !== 'ALL' && this.selectedTab !== 'SIMULATOR'
          ? this.selectedTab
          : 'STOCK_GROUP_WISE',
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: '',
      items: [],
    };
    this.viewMode = 'form';
    this.loadItemsForDimension();
  }

  openEditPage(pl: any) {
    this.editId = pl.id;
    this.errorMessage = '';
    this.itemSearchQuery = '';
    this.formData = {
      name: pl.name,
      pricingType: pl.pricingType,
      effectiveFrom: pl.effectiveFrom,
      isActive: Boolean(pl.isActive),
      notes: pl.notes || '',
      items: (pl.items || []).map((it: any) => {
        const matchingItem = this.itemsList.find((i) => i.id === it.itemId);
        const pPrice = Number(it.purchasePrice || matchingItem?.purchaseRate || matchingItem?.costRate || 0);
        const cRate = Number(it.customRate || it.standardRate || 0);
        let mode: 'MARKUP' | 'MARKDOWN' | 'DIRECT' = it.pricingMode || 'MARKUP';
        let adjPct = Number(it.adjustmentPercentage || 0);
        if (!it.pricingMode && pPrice > 0) {
          if (cRate >= pPrice) {
            mode = 'MARKUP';
            adjPct = Number((((cRate - pPrice) / pPrice) * 100).toFixed(2));
          } else {
            mode = 'MARKDOWN';
            adjPct = Number((((pPrice - cRate) / pPrice) * 100).toFixed(2));
          }
        }
        return {
          id: it.id,
          itemId: it.itemId,
          itemName: matchingItem?.name || it.itemName || '',
          sku: matchingItem?.sku || it.sku || '',
          purchasePrice: pPrice,
          standardRate: Number(it.standardRate || matchingItem?.saleRate || 0),
          pricingMode: mode,
          adjustmentPercentage: adjPct,
          customRate: cRate,
        };
      }),
    };
    if (this.formData.items.length === 0) {
      this.loadItemsForDimension();
    }
    this.viewMode = 'form';
  }

  onDimensionChange() {
    this.loadItemsForDimension();
  }

  loadItemsForDimension() {
    if (!this.itemsList || this.itemsList.length === 0) return;

    this.formData.items = this.itemsList.map((item) => {
      const pPrice = Number(item.purchaseRate || item.costRate || item.saleRate || 0);
      const sRate = Number(item.saleRate || pPrice || 0);
      return {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku || '',
        purchasePrice: pPrice,
        standardRate: sRate,
        pricingMode: 'MARKUP',
        adjustmentPercentage: 0,
        customRate: sRate > 0 ? sRate : pPrice,
      };
    });
  }

  getFilteredLineItems(): PriceListLineItem[] {
    if (!this.itemSearchQuery.trim()) {
      return this.formData.items;
    }
    const q = this.itemSearchQuery.toLowerCase();
    return this.formData.items.filter(
      (line) =>
        this.getItemName(line).toLowerCase().includes(q) ||
        this.getItemSku(line).toLowerCase().includes(q),
    );
  }

  getItemName(line: PriceListLineItem): string {
    if (line.itemName) return line.itemName;
    const it = this.itemsList.find((i) => i.id === line.itemId);
    return it ? it.name : 'Product Item';
  }

  getItemSku(line: PriceListLineItem): string {
    if (line.sku) return line.sku;
    const it = this.itemsList.find((i) => i.id === line.itemId);
    return it?.sku || '';
  }

  applyGlobalAdjustment() {
    const pct = Number(this.globalPercentage || 0);
    this.formData.items.forEach((line) => {
      line.pricingMode = this.globalMode;
      line.adjustmentPercentage = pct;
      this.onAdjustmentChange(line);
    });
    this.toast.success(
      `Applied ${pct}% ${this.globalMode} to all loaded items!`,
      'Bulk Update Applied',
    );
  }

  onAdjustmentChange(line: PriceListLineItem) {
    const base = Number(line.purchasePrice || line.standardRate || 0);
    const pct = Number(line.adjustmentPercentage || 0);
    if (line.pricingMode === 'MARKUP') {
      line.customRate = Number((base + (base * pct) / 100).toFixed(2));
    } else if (line.pricingMode === 'MARKDOWN') {
      line.customRate = Number((base - (base * pct) / 100).toFixed(2));
    }
  }

  onSellingPriceChange(line: PriceListLineItem) {
    const base = Number(line.purchasePrice || line.standardRate || 0);
    const custom = Number(line.customRate || 0);
    if (base > 0) {
      if (custom >= base) {
        line.pricingMode = 'MARKUP';
        line.adjustmentPercentage = Number((((custom - base) / base) * 100).toFixed(2));
      } else {
        line.pricingMode = 'MARKDOWN';
        line.adjustmentPercentage = Number((((base - custom) / base) * 100).toFixed(2));
      }
    }
  }

  addLineItem() {
    this.formData.items.unshift({
      itemId: '',
      purchasePrice: 0,
      standardRate: 0,
      pricingMode: 'MARKUP',
      adjustmentPercentage: 0,
      customRate: 0,
    });
  }

  removeLineItem(line: PriceListLineItem) {
    const idx = this.formData.items.indexOf(line);
    if (idx !== -1) {
      this.formData.items.splice(idx, 1);
    }
  }

  savePriceList() {
    this.errorMessage = '';
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Please provide a Price List Name.';
      return;
    }
    if (!this.formData.effectiveFrom) {
      this.errorMessage = 'Please set an Effective From date.';
      return;
    }
    if (!this.formData.items || this.formData.items.length === 0) {
      this.errorMessage = 'No product items loaded in this price list.';
      return;
    }

    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.submitting = true;
    const payload = {
      ...this.formData,
      companyId: comp.id,
    };

    const request$ = this.editId
      ? this.inventoryService.updatePriceList(this.editId, payload)
      : this.inventoryService.createPriceList(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(
          `Price List "${this.formData.name}" ${this.editId ? 'updated' : 'created'} successfully!`,
          'Price List Saved',
        );
        this.viewMode = 'list';
        this.loadData();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to save price list.';
        this.toast.error(this.errorMessage, 'Save Failed');
      },
    });
  }

  deletePriceList(pl: any) {
    if (!confirm(`Are you sure you want to delete price list "${pl.name}"?`)) {
      return;
    }

    this.inventoryService.deletePriceList(pl.id).subscribe({
      next: () => {
        this.toast.success(`Price list "${pl.name}" deleted successfully.`, 'Price List Deleted');
        this.loadData();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to delete price list';
        this.toast.error(msg, 'Deletion Failed');
        alert(msg);
      },
    });
  }

  runSimulation() {
    if (!this.simItemId) {
      this.simResult = null;
      return;
    }

    const comp = this.tenantService.currentCompany();
    if (!comp) return;

    this.inventoryService
      .getEffectivePrice(comp.id, this.simItemId, this.simCustomerId || undefined, this.simDate)
      .subscribe({
        next: (res: any) => {
          this.simResult = res;
        },
      });
  }
}
