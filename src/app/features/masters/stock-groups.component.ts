import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ZENO_UI_COMPONENTS } from '../../shared/ui';

interface StockGroupItem {
  id: string;
  name: string;
  code?: string;
  hsnSac?: string;
  gstRate: number;
  categories?: any[];
  items?: any[];
  createdAt: string;
}

@Component({
  selector: 'app-stock-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZENO_UI_COMPONENTS],
  templateUrl: './stock-groups.component.html',
})
export class StockGroupsComponent implements OnInit {
  groups: StockGroupItem[] = [];
  filteredGroups: StockGroupItem[] = [];
  loading = false;
  saving = false;
  searchQuery = '';

  showModal = false;
  editingGroup: StockGroupItem | null = null;
  errorMessage = '';

  formData = {
    name: '',
    code: '',
    hsnSac: '',
    gstRate: 18,
  };

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
    this.loadGroups();
  }

  get gstActiveLevel(): string {
    return this.tenantService.getGstActiveLevel();
  }

  get isGstAtGroupLevel(): boolean {
    return this.gstActiveLevel === 'ITEM_GROUP';
  }

  getGstLevelLabel(): string {
    switch (this.gstActiveLevel) {
      case 'COMPANY':
        return `Company Level (${this.tenantService.getCompanyFlatGstRate()}% Global Flat Rate)`;
      case 'ITEM_CATEGORY':
        return 'Item Category Level';
      case 'ITEM':
        return 'Item Master Level';
      default:
        return 'Stock Group Level';
    }
  }

  getGroupGstDisplay(g: StockGroupItem): string {
    if (this.gstActiveLevel === 'ITEM_GROUP') {
      return `${g.gstRate || 0}%`;
    }
    if (this.gstActiveLevel === 'COMPANY') {
      return `${this.tenantService.getCompanyFlatGstRate()}% (Company)`;
    }
    if (this.gstActiveLevel === 'ITEM_CATEGORY') {
      return 'At Category';
    }
    return 'At Item Master';
  }

  get taxedGroupsCount() {
    return this.groups.filter((g) => Number(g.gstRate) > 0).length;
  }

  get totalSubCategories() {
    return this.groups.reduce((acc, g) => acc + (g.categories?.length || 0), 0);
  }

  loadGroups() {
    this.loading = true;
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!companyId) {
      this.loading = false;
      return;
    }

    this.mastersService.getItemGroups(companyId).subscribe({
      next: (res) => {
        this.groups = res || [];
        this.filterGroups();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterGroups() {
    let result = [...this.groups];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.code && g.code.toLowerCase().includes(q)) ||
          (g.hsnSac && g.hsnSac.toLowerCase().includes(q)),
      );
    }
    this.filteredGroups = result;
  }

  openCreateModal() {
    this.editingGroup = null;
    this.formData = {
      name: '',
      code: '',
      hsnSac: '',
      gstRate: 18,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(group: StockGroupItem) {
    this.editingGroup = group;
    this.formData = {
      name: group.name,
      code: group.code || '',
      hsnSac: group.hsnSac || '',
      gstRate: Number(group.gstRate) || 0,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingGroup = null;
    this.errorMessage = '';
  }

  saveGroup() {
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Please enter a stock group name.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    const payload = {
      ...this.formData,
      companyId,
    };

    if (this.editingGroup) {
      this.mastersService.updateItemGroup(this.editingGroup.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadGroups();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update stock group';
        },
      });
    } else {
      this.mastersService.createItemGroup(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadGroups();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create stock group';
        },
      });
    }
  }

  deleteGroup(group: StockGroupItem) {
    if (!confirm(`Are you sure you want to delete stock group "${group.name}"?`)) {
      return;
    }

    this.mastersService.deleteItemGroup(group.id).subscribe({
      next: () => {
        this.loadGroups();
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to delete stock group');
      },
    });
  }
}
