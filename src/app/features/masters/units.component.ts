import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ToastService } from '../../core/services/toast.service';
import { exportToCsv } from '../../core/utils/export.util';
import { ZENO_UI_COMPONENTS } from '../../shared/ui';

interface UnitItem {
  id: string;
  name: string;
  code: string;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZENO_UI_COMPONENTS],
  templateUrl: './units.component.html',
})
export class UnitsComponent implements OnInit {
  units: UnitItem[] = [];
  filteredUnits: UnitItem[] = [];
  loading = false;
  saving = false;
  searchQuery = '';

  showModal = false;
  editingUnit: UnitItem | null = null;
  errorMessage = '';
  readonly decimalOptions = [
    { label: '0 (Whole numbers e.g. Nos, Pcs)', value: 0 },
    { label: '1 decimal (e.g. 1.5)', value: 1 },
    { label: '2 decimals (e.g. 1.25 mtrs)', value: 2 },
    { label: '3 decimals (e.g. 1.250 kg)', value: 3 },
    { label: '4 decimals (high precision)', value: 4 },
  ];

  formData = {
    name: '',
    code: '',
    decimalPlaces: 0,
    isActive: true,
  };

  constructor(
    private mastersService: MastersService,
    private tenantService: TenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadUnits();
  }

  get activeUnitsCount() {
    return this.units.filter((u) => u.isActive).length;
  }

  get fractionalUnitsCount() {
    return this.units.filter((u) => u.decimalPlaces > 0).length;
  }

  loadUnits() {
    this.loading = true;
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!companyId) {
      this.loading = false;
      return;
    }

    this.mastersService.getUnits(companyId).subscribe({
      next: (res) => {
        this.units = res || [];
        this.filterUnits();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterUnits() {
    let result = [...this.units];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q),
      );
    }
    this.filteredUnits = result;
  }

  openCreateModal() {
    this.editingUnit = null;
    this.formData = {
      name: '',
      code: '',
      decimalPlaces: 0,
      isActive: true,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(unit: UnitItem) {
    this.editingUnit = unit;
    this.formData = {
      name: unit.name,
      code: unit.code,
      decimalPlaces: unit.decimalPlaces,
      isActive: unit.isActive,
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingUnit = null;
    this.errorMessage = '';
  }

  saveUnit() {
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Please enter a unit name.';
      return;
    }
    if (!this.formData.code.trim()) {
      this.errorMessage = 'Please enter a unit symbol / code.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    const payload = {
      ...this.formData,
      code: this.formData.code.toUpperCase().trim(),
      companyId,
    };

    if (this.editingUnit) {
      this.mastersService.updateUnit(this.editingUnit.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadUnits();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update unit';
        },
      });
    } else {
      this.mastersService.createUnit(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadUnits();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create unit';
        },
      });
    }
  }

  deleteUnit(unit: UnitItem) {
    if (!confirm(`Are you sure you want to delete unit "${unit.name}" (${unit.code})?`)) {
      return;
    }

    this.mastersService.deleteUnit(unit.id).subscribe({
      next: () => {
        this.loadUnits();
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to delete unit');
      },
    });
  }

  exportUnits() {
    if (!this.filteredUnits || this.filteredUnits.length === 0) return;
    const headers = ['Unit Name', 'Symbol / Code', 'Allowed Decimal Places', 'Status'];
    const rows = this.filteredUnits.map((u) => [
      u.name || '',
      u.code || '',
      u.decimalPlaces ?? 0,
      u.isActive ? 'Active' : 'Inactive'
    ]);
    exportToCsv('Units_of_Measure', headers, rows);
    this.toast.success('Units exported successfully!', 'Export Complete');
  }
}
