import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ZENO_UI_COMPONENTS } from '../../shared/ui';

interface StockCategoryItem {
  id: string;
  name: string;
  itemGroupId: string;
  itemGroup?: { id: string; name: string; gstRate?: number };
  gstRate: number;
  items?: any[];
  createdAt: string;
}

@Component({
  selector: 'app-stock-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZENO_UI_COMPONENTS],
  templateUrl: './stock-categories.component.html',
})
export class StockCategoriesComponent implements OnInit {
  categories: StockCategoryItem[] = [];
  filteredCategories: StockCategoryItem[] = [];
  stockGroups: any[] = [];
  loading = false;
  saving = false;
  searchQuery = '';
  groupFilter = 'ALL';

  showModal = false;
  editingCategory: StockCategoryItem | null = null;
  errorMessage = '';

  formData = {
    name: '',
    itemGroupId: '',
    gstRate: 18,
  };

  get groupFilterOptions() {
    return [
      { label: 'All Stock Groups', value: 'ALL' },
      ...this.stockGroups.map((sg) => ({ label: sg.name, value: sg.id })),
    ];
  }

  get stockGroupOptions() {
    return this.stockGroups.map((sg) => ({
      label: `${sg.name} (GST ${sg.gstRate || 0}%)`,
      value: sg.id,
    }));
  }

  readonly gstRateOptions = [
    { label: '0% (Exempt / Nil)', value: 0 },
    { label: '5%', value: 5 },
    { label: '12%', value: 12 },
    { label: '18%', value: 18 },
    { label: '28%', value: 28 },
  ];

  constructor(
    private mastersService: MastersService,
    private tenantService: TenantService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  get gstActiveLevel(): string {
    return this.tenantService.getGstActiveLevel();
  }

  get isGstAtCategoryLevel(): boolean {
    return this.gstActiveLevel === 'ITEM_CATEGORY';
  }

  getGstLevelLabel(): string {
    switch (this.gstActiveLevel) {
      case 'COMPANY':
        return `Company Level (${this.tenantService.getCompanyFlatGstRate()}% Global Flat Rate)`;
      case 'ITEM_GROUP':
        return `Inherited from Parent Stock Group (${this.getParentGroupGst()}%)`;
      case 'ITEM':
        return 'Item Master Level';
      default:
        return 'Item Category Level';
    }
  }

  getParentGroupGst(): number {
    const group = this.stockGroups.find((g) => g.id === this.formData.itemGroupId);
    return group?.gstRate || 0;
  }

  getCategoryGstDisplay(c: StockCategoryItem): string {
    if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      return `${c.gstRate || 0}%`;
    }
    if (this.gstActiveLevel === 'ITEM_GROUP') {
      const grpRate = c.itemGroup?.gstRate ?? this.stockGroups.find((g) => g.id === c.itemGroupId)?.gstRate ?? 0;
      return `${grpRate}% (Group)`;
    }
    if (this.gstActiveLevel === 'COMPANY') {
      return `${this.tenantService.getCompanyFlatGstRate()}% (Company)`;
    }
    return 'At Item Master';
  }

  get totalItemsClassified() {
    return this.categories.reduce((acc, c) => acc + (c.items?.length || 0), 0);
  }

  loadData() {
    this.loading = true;
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!companyId) {
      this.loading = false;
      return;
    }

    this.mastersService.getItemGroups(companyId).subscribe({
      next: (groups) => {
        this.stockGroups = groups || [];
        this.mastersService.getItemCategories(companyId).subscribe({
          next: (cats) => {
            this.categories = cats || [];
            this.filterCategories();
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterCategories() {
    let result = [...this.categories];

    if (this.groupFilter !== 'ALL') {
      result = result.filter((c) => c.itemGroupId === this.groupFilter);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.itemGroup && c.itemGroup.name.toLowerCase().includes(q)),
      );
    }

    this.filteredCategories = result;
  }

  openCreateModal() {
    this.editingCategory = null;
    this.formData = {
      name: '',
      itemGroupId: this.stockGroups.length > 0 ? this.stockGroups[0].id : '',
      gstRate: 18,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(cat: StockCategoryItem) {
    this.editingCategory = cat;
    this.formData = {
      name: cat.name,
      itemGroupId: cat.itemGroupId,
      gstRate: Number(cat.gstRate) || 0,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCategory = null;
    this.errorMessage = '';
  }

  saveCategory() {
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Please enter a category name.';
      return;
    }
    if (!this.formData.itemGroupId) {
      this.errorMessage = 'Please select a parent stock group.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    const payload = {
      ...this.formData,
      companyId,
    };

    if (this.editingCategory) {
      this.mastersService.updateItemCategory(this.editingCategory.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update stock category';
        },
      });
    } else {
      this.mastersService.createItemCategory(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create stock category';
        },
      });
    }
  }

  deleteCategory(cat: StockCategoryItem) {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    this.mastersService.deleteItemCategory(cat.id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to delete stock category');
      },
    });
  }
}
