import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManufacturingService } from '../../core/services/manufacturing.service';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ToastService } from '../../core/services/toast.service';
import { exportToCsv } from '../../core/utils/export.util';

interface BomLine {
  itemId: string;
  variantId?: string | null;
  consumedQty: number;
  unitRate: number;
  scrapPercentage: number;
  totalAmount: number;
  notes?: string;
}

@Component({
  selector: 'app-boms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boms.component.html',
})
export class BomsComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  boms: any[] = [];
  filteredBoms: any[] = [];
  items: any[] = [];
  loading = false;
  saving = false;
  searchQuery = '';
  statusFilter = 'ALL';

  editingBom: any | null = null;
  selectedBom: any | null = null;
  errorMessage = '';

  formData = {
    name: '',
    bomNo: '',
    finishedItemId: '',
    producedQty: 1,
    estimatedLaborCost: 0,
    estimatedOverheadCost: 0,
    isActive: true,
  };

  lines: BomLine[] = [];

  constructor(
    private manufacturingService: ManufacturingService,
    private mastersService: MastersService,
    private tenantService: TenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  get uniqueFinishedProductsCount() {
    const ids = new Set(this.boms.map((b) => b.finishedItemId));
    return ids.size;
  }

  get averageCost() {
    if (this.boms.length === 0) return 0;
    const sum = this.boms.reduce((acc, b) => acc + (Number(b.totalCost) || 0), 0);
    return sum / this.boms.length;
  }

  get rawMaterialTotal(): number {
    return this.lines.reduce((acc, l) => acc + (Number(l.totalAmount) || 0), 0);
  }

  get grandTotalCost(): number {
    return (
      this.rawMaterialTotal +
      (Number(this.formData.estimatedLaborCost) || 0) +
      (Number(this.formData.estimatedOverheadCost) || 0)
    );
  }

  loadData() {
    this.loading = true;
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!companyId) {
      this.loading = false;
      return;
    }

    this.mastersService.getItems(companyId).subscribe({
      next: (items) => {
        this.items = items || [];
        this.manufacturingService.getBoms(companyId).subscribe({
          next: (boms) => {
            this.boms = boms || [];
            this.filterBoms();
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

  filterBoms() {
    let result = [...this.boms];
    if (this.statusFilter === 'ACTIVE') {
      result = result.filter((b) => b.isActive);
    } else if (this.statusFilter === 'INACTIVE') {
      result = result.filter((b) => !b.isActive);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.bomNo?.toLowerCase().includes(q) ||
          b.finishedItem?.name?.toLowerCase().includes(q),
      );
    }
    this.filteredBoms = result;
  }

  exportBoms() {
    if (!this.filteredBoms || this.filteredBoms.length === 0) return;
    const headers = ['BOM Code', 'Recipe Name', 'Finished Product', 'Produced Qty', 'Components Count', 'Total Est Cost', 'Status'];
    const rows = this.filteredBoms.map((b) => [
      b.bomNo || '',
      b.name || '',
      b.finishedItem?.name || '',
      b.outputQty || 1,
      b.items?.length || 0,
      b.totalEstimatedCost || 0,
      b.isActive ? 'Active' : 'Inactive'
    ]);
    exportToCsv('BOM_Recipes', headers, rows);
    this.toast.success('BOM recipes exported successfully!', 'Export Complete');
  }

  addComponentLine() {
    this.lines.push({
      itemId: '',
      consumedQty: 1,
      unitRate: 0,
      scrapPercentage: 0,
      totalAmount: 0,
    });
  }

  removeComponentLine(idx: number) {
    this.lines.splice(idx, 1);
  }

  onItemSelect(line: BomLine) {
    const it = this.items.find((i) => i.id === line.itemId);
    if (it) {
      line.unitRate = Number(it.purchaseRate) || Number(it.saleRate) || 0;
      this.updateLineTotal(line);
    }
  }

  updateLineTotal(line: BomLine) {
    const qty = Number(line.consumedQty) || 0;
    const rate = Number(line.unitRate) || 0;
    const scrapPct = Number(line.scrapPercentage) || 0;
    const gross = qty * rate;
    line.totalAmount = gross + gross * (scrapPct / 100);
  }

  recalculateTotals() {
    // triggers getter update
  }

  openCreatePage() {
    this.editingBom = null;
    this.formData = {
      name: '',
      bomNo: '',
      finishedItemId: this.items.length > 0 ? this.items[0].id : '',
      producedQty: 1,
      estimatedLaborCost: 0,
      estimatedOverheadCost: 0,
      isActive: true,
    };
    this.lines = [];
    this.addComponentLine();
    this.errorMessage = '';
    this.viewMode = 'create';
  }

  openEditPage(bom: any) {
    this.editingBom = bom;
    this.formData = {
      name: bom.name,
      bomNo: bom.bomNo,
      finishedItemId: bom.finishedItemId,
      producedQty: Number(bom.producedQty) || 1,
      estimatedLaborCost: Number(bom.estimatedLaborCost) || 0,
      estimatedOverheadCost: Number(bom.estimatedOverheadCost) || 0,
      isActive: bom.isActive,
    };
    this.lines = (bom.items || []).map((it: any) => ({
      itemId: it.itemId,
      variantId: it.variantId,
      consumedQty: Number(it.consumedQty) || 1,
      unitRate: Number(it.unitRate) || 0,
      scrapPercentage: Number(it.scrapPercentage) || 0,
      totalAmount: Number(it.totalAmount) || 0,
      notes: it.notes,
    }));
    this.errorMessage = '';
    this.viewMode = 'create';
  }

  viewBomDetails(bom: any) {
    this.manufacturingService.getBomById(bom.id).subscribe({
      next: (res) => {
        this.selectedBom = res;
        this.viewMode = 'view';
      },
      error: () => {
        this.selectedBom = bom;
        this.viewMode = 'view';
      },
    });
  }

  backToList() {
    this.viewMode = 'list';
    this.editingBom = null;
    this.selectedBom = null;
    this.errorMessage = '';
  }

  saveBom() {
    if (!this.formData.finishedItemId) {
      this.errorMessage = 'Please select a finished product.';
      return;
    }
    if (!this.formData.name.trim()) {
      this.errorMessage = 'Please enter a recipe name.';
      return;
    }
    if (this.lines.length === 0 || !this.lines.some((l) => l.itemId)) {
      this.errorMessage = 'Please add at least one component raw material.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    const payload = {
      ...this.formData,
      companyId,
      items: this.lines.filter((l) => l.itemId),
    };

    if (this.editingBom) {
      this.manufacturingService.updateBom(this.editingBom.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.toast.success(`BOM Recipe "${this.formData.name}" updated successfully!`, 'BOM Updated');
          this.backToList();
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update BOM';
          this.toast.error(this.errorMessage, 'Update Failed');
        },
      });
    } else {
      this.manufacturingService.createBom(payload).subscribe({
        next: () => {
          this.saving = false;
          this.toast.success(`BOM Recipe "${this.formData.name}" created successfully!`, 'BOM Created');
          this.backToList();
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create BOM';
          this.toast.error(this.errorMessage, 'Creation Failed');
        },
      });
    }
  }

  deleteBom(bom: any) {
    if (!confirm(`Are you sure you want to delete BOM "${bom.name}"?`)) {
      return;
    }

    this.manufacturingService.deleteBom(bom.id).subscribe({
      next: () => {
        this.toast.success(`BOM Recipe "${bom.name}" deleted successfully.`, 'BOM Deleted');
        this.loadData();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to delete BOM';
        this.toast.error(msg, 'Deletion Failed');
        alert(msg);
      },
    });
  }
}
