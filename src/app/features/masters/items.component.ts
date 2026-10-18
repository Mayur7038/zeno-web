import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ToastService } from '../../core/services/toast.service';
import { exportToCsv } from '../../core/utils/export.util';
import { VariantDefinition } from './variants.component';

export interface SkuVariantRow {
  name: string;
  sku: string;
  barcode: string;
  attributes: Record<string, string>;
  openingQty: number;
  purchaseRate: number;
  mrp: number;
  saleRate: number;
}

export interface SelectedVariantConfig {
  definitionId: string;
  definitionName: string;
  definitionCode: string;
  definitionType: string;
  availableOptions: string[];
  selectedValues: string[];
  customValueInput?: string;
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './items.component.html',
})
export class ItemsComponent implements OnInit {
  items: any[] = [];
  filteredItems: any[] = [];
  units: any[] = [];
  itemGroups: any[] = [];
  itemCategories: any[] = [];
  filteredCategories: any[] = [];
  variantDefinitions: VariantDefinition[] = [];

  loading = false;
  submitting = false;

  // VIEW MODE: 'list' | 'create' | 'edit'
  viewMode: 'list' | 'create' | 'edit' = 'list';
  editingItem: any = null;
  activeTab = 'pricing';
  imageFileName = '';

  searchQuery = '';
  typeFilter = 'ALL';
  trackingFilter = 'ALL';

  get gstActiveLevel(): string {
    return this.tenant.getGstActiveLevel();
  }

  get isGstAtItemLevel(): boolean {
    return this.gstActiveLevel === 'ITEM';
  }

  getGstResolutionBadgeLabel(): string {
    switch (this.gstActiveLevel) {
      case 'COMPANY': return 'Company Level';
      case 'ITEM_GROUP': return 'Group Level';
      case 'ITEM_CATEGORY': return 'Category Level';
      default: return 'Item Level';
    }
  }

  getGstResolutionIcon(): string {
    switch (this.gstActiveLevel) {
      case 'COMPANY': return 'pi-building text-primary';
      case 'ITEM_GROUP': return 'pi-folder text-primary';
      case 'ITEM_CATEGORY': return 'pi-tag text-primary';
      default: return 'pi-check-circle text-success';
    }
  }

  getResolvedItemFormGstRate(): number {
    if (this.gstActiveLevel === 'COMPANY') {
      return this.tenant.getCompanyFlatGstRate();
    }
    if (this.gstActiveLevel === 'ITEM_GROUP') {
      const g = this.itemGroups.find((grp) => grp.id === this.form.itemGroupId);
      return Number(g?.gstRate) || 0;
    }
    if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      const c = this.itemCategories.find((cat) => cat.id === this.form.itemCategoryId);
      return Number(c?.gstRate) || 0;
    }
    return Number(this.form.gstRate) || 0;
  }

  getGstResolutionSourceText(): string {
    if (this.gstActiveLevel === 'COMPANY') {
      return 'Company Level Flat Rate';
    }
    if (this.gstActiveLevel === 'ITEM_GROUP') {
      const g = this.itemGroups.find((grp) => grp.id === this.form.itemGroupId);
      return g ? `Group: ${g.name}` : 'Item Group';
    }
    if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      const c = this.itemCategories.find((cat) => cat.id === this.form.itemCategoryId);
      return c ? `Category: ${c.name}` : 'Item Category';
    }
    return 'Item Master';
  }

  onCategoryChanged() {
    if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      this.syncInheritedGstRate();
    }
  }

  syncInheritedGstRate() {
    if (this.gstActiveLevel === 'COMPANY') {
      this.form.gstRate = this.tenant.getCompanyFlatGstRate();
    } else if (this.gstActiveLevel === 'ITEM_GROUP') {
      const g = this.itemGroups.find((grp) => grp.id === this.form.itemGroupId);
      if (g) {
        this.form.gstRate = Number(g.gstRate) || 0;
        if (!this.form.hsnSac && g.hsnSac) {
          this.form.hsnSac = g.hsnSac;
        }
      }
    } else if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      const c = this.itemCategories.find((cat) => cat.id === this.form.itemCategoryId);
      if (c) {
        this.form.gstRate = Number(c.gstRate) || 0;
      }
    }
  }

  getItemGstDisplayRate(item: any): number {
    if (item.isGstApplicable === false) return 0;
    if (this.gstActiveLevel === 'COMPANY') {
      return this.tenant.getCompanyFlatGstRate();
    }
    if (this.gstActiveLevel === 'ITEM_GROUP') {
      return Number(item.itemGroup?.gstRate ?? item.gstRate ?? 0);
    }
    if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      return Number(item.category?.gstRate ?? item.gstRate ?? 0);
    }
    return Number(item.gstRate ?? 0);
  }

  getItemGstLevelTag(item: any): string {
    switch (this.gstActiveLevel) {
      case 'COMPANY': return 'Company';
      case 'ITEM_GROUP': return 'Group';
      case 'ITEM_CATEGORY': return 'Category';
      default: return 'Item';
    }
  }

  // Form State
  form: any = {
    productType: 'GOODS',
    name: '',
    sku: '',
    unitId: '',
    itemGroupId: '',
    itemCategoryId: '',
    isGstApplicable: true,
    hsnSac: '8401',
    gstRate: 18,
    inventoryTracking: 'ITEM_WISE',
    purchaseRate: 100,
    saleRate: 150,
    mrp: 199,
    reorderLevel: 5,
    openingQty: 0,
    openingRate: 100,
    imageUrl: '',
    description: '',
  };

  // Variant Configuration
  selectedVariants: SelectedVariantConfig[] = [];
  skuRows: SkuVariantRow[] = [];

  constructor(
    private masters: MastersService,
    public tenant: TenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadItems();
        this.loadUnits();
        this.loadGroups();
        this.loadCategories();
        this.loadVariantDefinitions();
      },
    });
  }

  get availableVariantDefinitions(): VariantDefinition[] {
    const selectedIds = this.selectedVariants.map((sv) => sv.definitionId);
    return this.variantDefinitions.filter((vd) => vd.isActive && !selectedIds.includes(vd.id));
  }

  loadItems() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.loading = true;
    this.masters.getItems(compId).subscribe({
      next: (res) => {
        this.items = Array.isArray(res) ? res : [];
        this.filterItems();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  loadUnits() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getUnits(compId).subscribe({
      next: (res) => {
        this.units = res || [];
        if (!this.form.unitId && this.units.length > 0) {
          this.form.unitId = this.units[0].id;
        }
      },
    });
  }

  loadGroups() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getItemGroups(compId).subscribe({
      next: (res) => (this.itemGroups = res || []),
    });
  }

  loadCategories() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getItemCategories(compId).subscribe({
      next: (res) => {
        this.itemCategories = res || [];
        this.filterCategoryList();
      },
    });
  }

  loadVariantDefinitions() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    this.masters.getVariantDefinitions(compId || undefined).subscribe({
      next: (res) => (this.variantDefinitions = Array.isArray(res) ? res : []),
    });
  }

  filterCategoryList() {
    if (this.form.itemGroupId) {
      this.filteredCategories = this.itemCategories.filter(
        (c) => c.itemGroupId === this.form.itemGroupId || !c.itemGroupId,
      );
    } else {
      this.filteredCategories = [...this.itemCategories];
    }
  }

  onGroupChanged() {
    this.filterCategoryList();
    if (this.gstActiveLevel === 'ITEM_GROUP') {
      this.syncInheritedGstRate();
    }
  }

  filterItems() {
    let result = [...this.items];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q) ||
          i.hsnSac?.toLowerCase().includes(q),
      );
    }

    if (this.typeFilter !== 'ALL') {
      result = result.filter((i) => i.productType === this.typeFilter);
    }

    if (this.trackingFilter !== 'ALL') {
      result = result.filter((i) => i.inventoryTracking === this.trackingFilter);
    }

    this.filteredItems = result;
  }

  onProductTypeChanged() {
    if (this.form.productType === 'SERVICE') {
      this.form.inventoryTracking = 'ITEM_WISE';
    }
  }

  setProductType(type: 'GOODS' | 'SERVICE') {
    this.form.productType = type;
    this.onProductTypeChanged();
  }

  onProductNameChanged() {
    if (this.viewMode === 'create' && this.form.name && !this.form.sku) {
      this.form.sku = this.form.name
        .substring(0, 8)
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
    }
  }

  onBaseSkuChanged() {
    // Keeps custom base SKU
  }

  onGstToggleChanged() {
    if (!this.form.isGstApplicable) {
      this.form.gstRate = 0;
    } else if (this.form.gstRate === 0) {
      this.form.gstRate = 18;
    }
  }

  onTrackingChanged() {
    if (this.form.inventoryTracking === 'VARIANT_WISE') {
      this.activeTab = 'variants';
      if (this.selectedVariants.length === 0 && this.variantDefinitions.length > 0) {
        const firstDef = this.variantDefinitions[0];
        this.addSelectedVariant(firstDef.id);
      }
    }
  }

  onDefaultRatesChanged() {
    if (this.skuRows.length > 0) {
      for (const row of this.skuRows) {
        if (!row.purchaseRate) row.purchaseRate = Number(this.form.purchaseRate || 0);
        if (!row.mrp) row.mrp = Number(this.form.mrp || 0);
        if (!row.saleRate) row.saleRate = Number(this.form.saleRate || 0);
      }
    }
  }

  // --- VARIANT CONFIGURATION METHODS ---

  addSelectedVariant(definitionId: string) {
    if (!definitionId) return;
    const def = this.variantDefinitions.find((d) => d.id === definitionId);
    if (!def) return;

    const availableOpts = Array.isArray(def.options) ? [...def.options] : [];
    const initialSelected = def.type === 'DROPDOWN' && availableOpts.length > 0 ? availableOpts.slice(0, 2) : [];

    this.selectedVariants.push({
      definitionId: def.id,
      definitionName: def.name,
      definitionCode: def.code || def.name.substring(0, 3).toUpperCase(),
      definitionType: def.type,
      availableOptions: availableOpts,
      selectedValues: initialSelected,
      customValueInput: '',
    });
  }

  removeSelectedVariant(index: number) {
    this.selectedVariants.splice(index, 1);
  }

  toggleVariantValue(sv: SelectedVariantConfig, val: string) {
    const idx = sv.selectedValues.indexOf(val);
    if (idx >= 0) {
      sv.selectedValues.splice(idx, 1);
    } else {
      sv.selectedValues.push(val);
    }
  }

  addCustomValueToVariant(sv: SelectedVariantConfig) {
    const val = sv.customValueInput?.trim();
    if (!val) return;
    if (!sv.availableOptions.includes(val)) {
      sv.availableOptions.push(val);
    }
    if (!sv.selectedValues.includes(val)) {
      sv.selectedValues.push(val);
    }
    sv.customValueInput = '';
  }

  removeActiveValue(sv: SelectedVariantConfig, index: number) {
    sv.selectedValues.splice(index, 1);
  }

  generateSkuMatrix() {
    const validVariants = this.selectedVariants.filter((sv) => sv.selectedValues.length > 0);
    if (validVariants.length === 0) {
      this.toast.show('warning', 'Please select at least one value for your variants.', 'No Values Selected');
      return;
    }

    const valueLists = validVariants.map((sv) => sv.selectedValues);
    const cartesian = this.cartesianProduct(valueLists);

    const baseSku = (this.form.sku || this.form.name || 'SKU')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();

    const newRows: SkuVariantRow[] = cartesian.map((combination) => {
      const attributes: Record<string, string> = {};
      const codeParts: string[] = [];
      const nameParts: string[] = [];

      combination.forEach((val: string, idx: number) => {
        const dim = validVariants[idx];
        attributes[dim.definitionName] = val;
        nameParts.push(val);
        codeParts.push(val.substring(0, 4).replace(/[^A-Za-z0-9]/g, '').toUpperCase());
      });

      const variantName = nameParts.join(' / ');
      const skuCode = `${baseSku}-${codeParts.join('-')}`;
      const barcode = '890' + Math.floor(100000000 + Math.random() * 900000000);

      const existing = this.skuRows.find((r) => r.name === variantName || r.sku === skuCode);

      return {
        name: variantName,
        sku: existing?.sku || skuCode,
        barcode: existing?.barcode || barcode,
        attributes,
        openingQty: existing?.openingQty !== undefined ? existing.openingQty : 0,
        purchaseRate: existing?.purchaseRate !== undefined ? existing.purchaseRate : Number(this.form.purchaseRate || 0),
        mrp: existing?.mrp !== undefined ? existing.mrp : Number(this.form.mrp || 0),
        saleRate: existing?.saleRate !== undefined ? existing.saleRate : Number(this.form.saleRate || 0),
      };
    });

    this.skuRows = newRows;
    this.toast.show('success', `Generated ${this.skuRows.length} SKU combinations!`, 'SKUs Generated');
  }

  cartesianProduct(arrays: any[][]): any[][] {
    return arrays.reduce((acc, curr) => {
      return acc.flatMap((a) => curr.map((c) => [...a, c]));
    }, [[]] as any[][]);
  }

  removeSkuRow(index: number) {
    this.skuRows.splice(index, 1);
  }

  // --- EXCEL TEMPLATE DOWNLOAD & UPLOAD ---

  downloadVariantTemplate() {
    const headers = ['SKU Code', 'Variant Name', 'Opening Qty', 'Rate', 'MRP', 'Sale Rate', 'Barcode'];
    let rows: any[][] = [];

    if (this.skuRows.length > 0) {
      rows = this.skuRows.map((r) => [
        r.sku,
        r.name,
        r.openingQty,
        r.purchaseRate,
        r.mrp,
        r.saleRate,
        r.barcode,
      ]);
    } else {
      const baseSku = (this.form.sku || 'SAMPLE-SKU').toUpperCase();
      rows = [
        [`${baseSku}-RED-M`, 'Red / M', 10, Number(this.form.purchaseRate || 100), Number(this.form.mrp || 199), Number(this.form.saleRate || 150), '890123456701'],
        [`${baseSku}-RED-L`, 'Red / L', 15, Number(this.form.purchaseRate || 100), Number(this.form.mrp || 199), Number(this.form.saleRate || 150), '890123456702'],
        [`${baseSku}-BLUE-M`, 'Blue / M', 12, Number(this.form.purchaseRate || 100), Number(this.form.mrp || 199), Number(this.form.saleRate || 150), '890123456703'],
      ];
    }

    const filename = `${(this.form.sku || this.form.name || 'Product').replace(/\s+/g, '_')}_Variant_Template`;
    exportToCsv(filename, headers, rows);
    this.toast.show('success', 'Excel template downloaded. Fill rates and upload back anytime!', 'Template Downloaded');
  }

  onCsvFileUploaded(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const text = e.target.result;
        const parsed = this.parseCsv(text);
        if (parsed.length === 0) {
          this.toast.show('error', 'CSV file contains no valid rows.', 'Import Error');
          return;
        }

        const importedRows: SkuVariantRow[] = parsed.map((item) => {
          const sku = item['SKU Code'] || item['sku'] || item['SKU'] || '';
          const name = item['Variant Name'] || item['variant_name'] || item['Name'] || sku;
          const openingQty = Number(item['Opening Qty'] || item['qty'] || item['Quantity'] || 0);
          const purchaseRate = Number(item['Rate'] || item['Purchase Rate'] || item['rate'] || this.form.purchaseRate || 0);
          const mrp = Number(item['MRP'] || item['mrp'] || this.form.mrp || 0);
          const saleRate = Number(item['Sale Rate'] || item['sale_rate'] || this.form.saleRate || 0);
          const barcode = item['Barcode'] || item['barcode'] || '';

          return {
            name,
            sku,
            barcode,
            attributes: {},
            openingQty,
            purchaseRate,
            mrp,
            saleRate,
          };
        });

        this.skuRows = importedRows;
        this.toast.show('success', `Imported ${importedRows.length} variant SKUs from Excel successfully!`, 'Import Complete');
      } catch (err: any) {
        this.toast.show('error', 'Failed to parse CSV file: ' + err.message, 'Import Error');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  parseCsv(text: string): any[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values: string[] = [];
      let inQuotes = false;
      let curVal = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(curVal.trim().replace(/^["']|["']$/g, ''));
          curVal = '';
        } else {
          curVal += char;
        }
      }
      values.push(curVal.trim().replace(/^["']|["']$/g, ''));

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      result.push(rowObj);
    }
    return result;
  }

  // --- VIEW MODE & FULL PAGE OPERATIONS ---

  openCreateProduct() {
    this.editingItem = null;
    this.imageFileName = '';
    this.form = {
      productType: 'GOODS',
      name: '',
      sku: '',
      unitId: this.units[0]?.id || '',
      itemGroupId: '',
      itemCategoryId: '',
      isGstApplicable: true,
      hsnSac: '8401',
      gstRate: 18,
      inventoryTracking: 'ITEM_WISE',
      purchaseRate: 100,
      saleRate: 150,
      mrp: 199,
      reorderLevel: 5,
      openingQty: 0,
      openingRate: 100,
      imageUrl: '',
      description: '',
    };
    this.selectedVariants = [];
    this.skuRows = [];
    this.activeTab = 'pricing';
    this.filterCategoryList();
    this.syncInheritedGstRate();
    this.viewMode = 'create';
  }

  openEditProduct(item: any) {
    this.editingItem = item;
    this.imageFileName = item.imageUrl ? 'Product Image' : '';
    this.form = {
      productType: item.productType || 'GOODS',
      name: item.name,
      sku: item.sku || '',
      unitId: item.unitId || this.units[0]?.id || '',
      itemGroupId: item.itemGroupId || '',
      itemCategoryId: item.itemCategoryId || '',
      isGstApplicable: item.isGstApplicable !== false,
      hsnSac: item.hsnSac || '',
      gstRate: item.gstRate || 0,
      inventoryTracking: item.inventoryTracking || (item.hasVariants ? 'VARIANT_WISE' : 'ITEM_WISE'),
      purchaseRate: item.purchaseRate || 0,
      saleRate: item.saleRate || 0,
      mrp: item.mrp || 0,
      reorderLevel: item.reorderLevel || 5,
      openingQty: item.openingQty || 0,
      openingRate: item.openingRate || item.purchaseRate || 0,
      imageUrl: item.imageUrl || '',
      description: item.description || '',
    };

    this.selectedVariants = [];
    this.skuRows = [];

    if (item.variants && Array.isArray(item.variants) && item.variants.length > 0) {
      this.skuRows = item.variants.map((v: any) => ({
        name: v.name,
        sku: v.sku || '',
        barcode: v.barcode || '',
        attributes: v.attributes || {},
        openingQty: v.openingQty || 0,
        purchaseRate: v.purchaseRate || item.purchaseRate || 0,
        mrp: v.mrp || item.mrp || 0,
        saleRate: v.saleRate || item.saleRate || 0,
      }));
    }

    this.activeTab = 'pricing';
    this.filterCategoryList();
    if (this.gstActiveLevel !== 'ITEM') {
      this.syncInheritedGstRate();
    }
    this.viewMode = 'edit';
  }

  backToList() {
    this.viewMode = 'list';
    this.editingItem = null;
  }

  deleteItem(item: any) {
    if (!confirm(`Are you sure you want to delete the product "${item.name}"?`)) return;

    this.masters.deleteItem(item.id).subscribe({
      next: () => {
        this.loadItems();
        this.toast.show('success', `Product "${item.name}" deleted successfully.`, 'Product Deleted');
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to delete product';
        this.toast.show('error', msg, 'Error');
      },
    });
  }

  saveItem() {
    if (!this.form.name.trim()) {
      this.toast.show('error', 'Product name is required.', 'Validation Error');
      return;
    }

    if (this.gstActiveLevel !== 'ITEM') {
      this.syncInheritedGstRate();
    }

    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    this.submitting = true;

    const payload: any = {
      ...this.form,
      companyId: compId,
      hasVariants: this.form.inventoryTracking === 'VARIANT_WISE',
    };

    if (this.form.inventoryTracking === 'VARIANT_WISE') {
      payload.variants = this.skuRows.map((r) => ({
        name: r.name,
        sku: r.sku,
        barcode: r.barcode,
        attributes: r.attributes,
        purchaseRate: Number(r.purchaseRate || 0),
        saleRate: Number(r.saleRate || 0),
        mrp: Number(r.mrp || 0),
        openingQty: Number(r.openingQty || 0),
        openingRate: Number(r.purchaseRate || 0),
        isActive: true,
      }));
    }

    if (this.viewMode === 'edit' && this.editingItem) {
      this.masters.updateItem(this.editingItem.id, payload).subscribe({
        next: () => {
          this.submitting = false;
          this.viewMode = 'list';
          this.loadItems();
          this.toast.show('success', `Product "${this.form.name}" updated successfully!`, 'Product Updated');
        },
        error: (err) => {
          this.submitting = false;
          const msg = err?.error?.message || 'Failed to update product';
          this.toast.show('error', msg, 'Error');
        },
      });
    } else {
      this.masters.createItem(payload).subscribe({
        next: () => {
          this.submitting = false;
          this.viewMode = 'list';
          this.loadItems();
          this.toast.show('success', `Product "${this.form.name}" created successfully!`, 'Product Created');
        },
        error: (err) => {
          this.submitting = false;
          const msg = err?.error?.message || 'Failed to create product';
          this.toast.show('error', msg, 'Error');
        },
      });
    }
  }

  formatTracking(tracking: string): string {
    switch (tracking) {
      case 'VARIANT_WISE':
        return 'Variant Wise';
      case 'BATCH_WISE':
        return 'Batch Wise';
      case 'SERIAL_WISE':
        return 'Serial Wise';
      case 'ITEM_WISE':
      default:
        return 'Item Wise';
    }
  }

  onImageFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.show('error', 'Please select a valid image file (PNG, JPG, WEBP).', 'Invalid File');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.show('error', 'Image size must be less than 5 MB.', 'File Too Large');
      return;
    }
    this.imageFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.form.imageUrl = reader.result as string;
      this.toast.show('success', `Image "${file.name}" uploaded successfully.`, 'Image Ready');
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.form.imageUrl = '';
    this.imageFileName = '';
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
  }

  exportItems() {
    if (!this.filteredItems || this.filteredItems.length === 0) return;
    const headers = [
      'Product Name',
      'Type',
      'SKU Code',
      'Group',
      'Category',
      'Unit',
      'Tracking Rule',
      'Variants Count',
      'Purchase Rate',
      'Sale Rate',
      'GST Rate',
    ];
    const rows = this.filteredItems.map((i: any) => [
      i.name || '',
      i.productType || 'GOODS',
      i.sku || '',
      i.itemGroup?.name || '',
      i.category?.name || '',
      i.unit?.code || 'NOS',
      this.formatTracking(i.inventoryTracking),
      i.variants ? i.variants.length : 0,
      i.purchaseRate || 0,
      i.saleRate || 0,
      i.gstRate || 0,
    ]);
    exportToCsv('Products_Master', headers, rows);
    this.toast.show('success', 'Products exported successfully!', 'Export Complete');
  }
}
