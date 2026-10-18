import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ToastService } from '../../core/services/toast.service';
import { exportToCsv } from '../../core/utils/export.util';
import { ZENO_UI_COMPONENTS } from '../../shared/ui';

export interface VariantDefinition {
  id: string;
  name: string;
  code: string;
  type: 'DROPDOWN' | 'TEXT' | 'NUMBER' | 'DATE';
  options: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-variants',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZENO_UI_COMPONENTS],
  templateUrl: './variants.component.html',
})
export class VariantsComponent implements OnInit {
  variants: VariantDefinition[] = [];
  filteredVariants: VariantDefinition[] = [];
  loading = false;
  saving = false;
  searchQuery = '';
  typeFilter = 'ALL';
  statusFilter = 'ALL';
  showModal = false;
  editingVariant: VariantDefinition | null = null;
  errorMessage = '';

  readonly typeFilterOptions = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Dropdown', value: 'DROPDOWN' },
    { label: 'Text', value: 'TEXT' },
    { label: 'Number', value: 'NUMBER' },
    { label: 'Date', value: 'DATE' },
  ];

  readonly statusFilterOptions = [
    { label: 'All Status', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly typeOptions = [
    { label: 'Dropdown', value: 'DROPDOWN' },
    { label: 'Text', value: 'TEXT' },
    { label: 'Number', value: 'NUMBER' },
    { label: 'Date', value: 'DATE' },
  ];

  formData: {
    name: string;
    code: string;
    type: 'DROPDOWN' | 'TEXT' | 'NUMBER' | 'DATE';
    options: string[];
    isActive: boolean;
  } = {
    name: '',
    code: '',
    type: 'DROPDOWN',
    options: [],
    isActive: true,
  };

  newOptionValue = '';

  constructor(
    private mastersService: MastersService,
    private tenantService: TenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.tenantService.loadHierarchy().subscribe({
      next: () => {
        this.loadVariants();
      },
    });
  }

  loadVariants() {
    const compId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    this.loading = true;
    this.mastersService.getVariantDefinitions(compId || undefined).subscribe({
      next: (res) => {
        this.variants = Array.isArray(res) ? res : [];
        this.filterVariants();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterVariants() {
    let result = [...this.variants];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.name?.toLowerCase().includes(q) ||
          v.code?.toLowerCase().includes(q) ||
          (v.options && v.options.some((o) => o.toLowerCase().includes(q))),
      );
    }

    if (this.typeFilter !== 'ALL') {
      result = result.filter((v) => v.type === this.typeFilter);
    }

    if (this.statusFilter === 'ACTIVE') {
      result = result.filter((v) => v.isActive);
    } else if (this.statusFilter === 'INACTIVE') {
      result = result.filter((v) => !v.isActive);
    }

    this.filteredVariants = result;
  }

  openCreateModal() {
    this.editingVariant = null;
    this.errorMessage = '';
    this.newOptionValue = '';
    this.formData = {
      name: '',
      code: '',
      type: 'DROPDOWN',
      options: [],
      isActive: true,
    };
    this.showModal = true;
  }

  openEditModal(variant: VariantDefinition) {
    this.editingVariant = variant;
    this.errorMessage = '';
    this.newOptionValue = '';
    this.formData = {
      name: variant.name,
      code: variant.code,
      type: variant.type,
      options: Array.isArray(variant.options) ? [...variant.options] : [],
      isActive: variant.isActive !== false,
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingVariant = null;
    this.errorMessage = '';
    this.newOptionValue = '';
  }

  onNameChanged() {
    if (!this.editingVariant && this.formData.name && (!this.formData.code || this.formData.code.length <= 4)) {
      this.formData.code = this.formData.name
        .substring(0, 4)
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
    }
  }

  onTypeChanged() {
    if (this.formData.type !== 'DROPDOWN') {
      // Clear options if switched away
    }
  }

  addOptionValue() {
    const val = this.newOptionValue.trim();
    if (!val) return;
    if (this.formData.options.some((o) => o.toLowerCase() === val.toLowerCase())) {
      this.toast.show('warning', `Value "${val}" is already added`, 'Duplicate Value');
      this.newOptionValue = '';
      return;
    }
    this.formData.options.push(val);
    this.newOptionValue = '';
  }

  removeOptionValue(index: number) {
    this.formData.options.splice(index, 1);
  }


  saveVariant() {
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Variant name is required.';
      return;
    }

    if (!this.formData.code || !this.formData.code.trim()) {
      this.formData.code = this.formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10) || 'VAR';
    }

    if (this.formData.type === 'DROPDOWN' && this.formData.options.length === 0) {
      this.errorMessage = 'Please add at least one fixed dropdown value (e.g. Red, Blue, Green).';
      return;
    }

    const compId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    this.saving = true;
    this.errorMessage = '';

    const payload = {
      ...this.formData,
      code: this.formData.code.toUpperCase().trim(),
      companyId: compId,
    };

    if (this.editingVariant) {
      this.mastersService.updateVariantDefinition(this.editingVariant.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadVariants();
          this.toast.show('success', `Variant "${payload.name}" updated successfully!`, 'Variant Updated');
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update variant';
          this.toast.show('error', this.errorMessage, 'Error');
        },
      });
    } else {
      this.mastersService.createVariantDefinition(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadVariants();
          this.toast.show('success', `Variant "${payload.name}" created successfully!`, 'Variant Created');
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create variant';
          this.toast.show('error', this.errorMessage, 'Error');
        },
      });
    }
  }

  deleteVariant(variant: VariantDefinition) {
    if (!confirm(`Are you sure you want to delete the variant "${variant.name}"?`)) return;

    this.mastersService.deleteVariantDefinition(variant.id).subscribe({
      next: () => {
        this.loadVariants();
        this.toast.show('success', `Variant "${variant.name}" deleted successfully.`, 'Variant Deleted');
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to delete variant';
        this.toast.show('error', msg, 'Error');
      },
    });
  }


  getTypeIcon(type: string): string {
    switch (type) {
      case 'DROPDOWN':
        return 'pi pi-list';
      case 'TEXT':
        return 'pi pi-align-left';
      case 'NUMBER':
        return 'pi pi-hashtag';
      case 'DATE':
        return 'pi pi-calendar';
      default:
        return 'pi pi-sliders-v';
    }
  }

  getTypeIconBoxClass(type: string): string {
    switch (type) {
      case 'DROPDOWN': return 'bg-indigo-50 text-indigo-600';
      case 'TEXT': return 'bg-emerald-50 text-emerald-600';
      case 'NUMBER': return 'bg-amber-50 text-amber-600';
      case 'DATE': return 'bg-pink-50 text-pink-600';
      default: return 'bg-surface-100 text-surface-600';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'DROPDOWN': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'TEXT': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'NUMBER': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DATE': return 'bg-pink-50 text-pink-700 border-pink-200';
      default: return 'bg-surface-100 text-surface-700 border-surface-200';
    }
  }

  formatTypeName(type: string): string {
    switch (type) {
      case 'DROPDOWN':
        return 'Dropdown';
      case 'TEXT':
        return 'Text';
      case 'NUMBER':
        return 'Number';
      case 'DATE':
        return 'Date';
      default:
        return type;
    }
  }

  exportVariants() {
    if (!this.filteredVariants || this.filteredVariants.length === 0) return;
    const headers = ['Variant Name', 'Code', 'Data Type', 'Status'];
    const rows = this.filteredVariants.map((v) => [
      v.name || '',
      v.code || '',
      v.type || '',
      v.isActive ? 'Active' : 'Inactive',
    ]);
    exportToCsv('Variant_Master', headers, rows);
    this.toast.show('success', 'Variant Master exported successfully!', 'Export Complete');
  }
}
