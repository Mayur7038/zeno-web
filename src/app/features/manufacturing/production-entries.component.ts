import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManufacturingService } from '../../core/services/manufacturing.service';
import { MastersService } from '../../core/services/masters.service';
import { TenantService } from '../../core/services/tenant.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { exportToCsv } from '../../core/utils/export.util';

interface ProductionLine {
  itemId: string;
  variantId?: string | null;
  consumedQty: number;
  unitRate: number;
  amount: number;
  notes?: string;
}

@Component({
  selector: 'app-production-entries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production-entries.component.html',
})
export class ProductionEntriesComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  entries: any[] = [];
  filteredEntries: any[] = [];
  boms: any[] = [];
  items: any[] = [];
  godowns: any[] = [];

  loading = false;
  saving = false;
  searchQuery = '';
  statusFilter = 'ALL';

  selectedEntry: any | null = null;
  selectedBomId = '';
  errorMessage = '';

  formData = {
    voucherNo: '',
    entryDate: new Date().toISOString().split('T')[0],
    finishedItemId: '',
    assembledQty: 1,
    sourceGodownId: '',
    targetGodownId: '',
    additionalLaborCost: 0,
    additionalOverheadCost: 0,
    notes: '',
  };

  lines: ProductionLine[] = [];

  constructor(
    private manufacturingService: ManufacturingService,
    private mastersService: MastersService,
    private tenantService: TenantService,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  get totalUnitsProduced(): number {
    return this.entries
      .filter((e) => e.status === 'COMPLETED')
      .reduce((acc, e) => acc + (Number(e.assembledQty) || 0), 0);
  }

  get totalProductionValue(): number {
    return this.entries
      .filter((e) => e.status === 'COMPLETED')
      .reduce((acc, e) => acc + (Number(e.totalCost) || 0), 0);
  }

  get rawMaterialTotal(): number {
    return this.lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  }

  get grandTotalCost(): number {
    return (
      this.rawMaterialTotal +
      (Number(this.formData.additionalLaborCost) || 0) +
      (Number(this.formData.additionalOverheadCost) || 0)
    );
  }

  loadData() {
    this.loading = true;
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!companyId) {
      this.loading = false;
      return;
    }

    // Load Items, Godowns, BOMs, and Production Entries
    this.mastersService.getItems(companyId).subscribe({
      next: (items) => {
        this.items = items || [];
      },
    });

    this.api.get<any[]>('/tenancy/godowns').subscribe({
      next: (godowns) => {
        this.godowns = (godowns && godowns.length > 0) ? godowns : this.tenantService.godowns();
      },
      error: () => {
        this.godowns = this.tenantService.godowns() || [];
      },
    });

    this.manufacturingService.getBoms(companyId).subscribe({
      next: (boms) => {
        this.boms = (boms || []).filter((b) => b.isActive);
      },
    });

    this.manufacturingService.getProductionEntries(companyId).subscribe({
      next: (entries) => {
        this.entries = entries || [];
        this.filterEntries();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterEntries() {
    let result = [...this.entries];

    if (this.statusFilter !== 'ALL') {
      result = result.filter((e) => e.status === this.statusFilter);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.voucherNo?.toLowerCase().includes(q) ||
          e.finishedItem?.name?.toLowerCase().includes(q) ||
          e.bom?.name?.toLowerCase().includes(q),
      );
    }

    this.filteredEntries = result;
  }

  exportEntries() {
    if (!this.filteredEntries || this.filteredEntries.length === 0) return;
    const headers = ['Voucher No', 'Date', 'Finished Product', 'BOM Recipe', 'Qty Assembled', 'Source Warehouse', 'Target Warehouse', 'Total Cost', 'Status'];
    const rows = this.filteredEntries.map((e) => [
      e.voucherNo || '',
      e.entryDate || '',
      e.finishedItem?.name || '',
      e.bom?.name || '',
      e.assembledQty || 0,
      e.sourceGodown?.name || '',
      e.targetGodown?.name || '',
      e.totalCost || 0,
      e.status || ''
    ]);
    exportToCsv('Production_Entries', headers, rows);
    this.toast.success('Production entries exported successfully!', 'Export Complete');
  }

  openCreatePage() {
    this.selectedBomId = '';
    const defaultGodownId = this.godowns.length > 0 ? this.godowns[0].id : '';
    const defaultTargetId = this.godowns.length > 1 ? this.godowns[1].id : defaultGodownId;

    this.formData = {
      voucherNo: '',
      entryDate: new Date().toISOString().split('T')[0],
      finishedItemId: this.items.length > 0 ? this.items[0].id : '',
      assembledQty: 1,
      sourceGodownId: defaultGodownId,
      targetGodownId: defaultTargetId,
      additionalLaborCost: 0,
      additionalOverheadCost: 0,
      notes: '',
    };

    this.lines = [];
    this.addComponentLine();
    this.errorMessage = '';
    this.viewMode = 'create';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedEntry = null;
    this.errorMessage = '';
  }

  onBomSelected() {
    if (!this.selectedBomId) {
      return;
    }

    const bom = this.boms.find((b) => b.id === this.selectedBomId);
    if (!bom) return;

    this.formData.finishedItemId = bom.finishedItemId;
    this.formData.assembledQty = Number(bom.producedQty) || 1;
    this.formData.additionalLaborCost = Number(bom.estimatedLaborCost) || 0;
    this.formData.additionalOverheadCost = Number(bom.estimatedOverheadCost) || 0;

    // Fetch full BOM details if items are not present
    if (!bom.items || bom.items.length === 0) {
      this.manufacturingService.getBomById(bom.id).subscribe({
        next: (fullBom) => {
          this.populateLinesFromBom(fullBom);
        },
      });
    } else {
      this.populateLinesFromBom(bom);
    }
  }

  populateLinesFromBom(bom: any) {
    const scaleFactor = (Number(this.formData.assembledQty) || 1) / (Number(bom.producedQty) || 1);
    this.lines = (bom.items || []).map((it: any) => {
      const consumedQty = Number(it.consumedQty) * scaleFactor;
      const unitRate = Number(it.unitRate) || 0;
      return {
        itemId: it.itemId,
        variantId: it.variantId || null,
        consumedQty,
        unitRate,
        amount: consumedQty * unitRate,
        notes: it.notes,
      };
    });
  }

  onAssembledQtyChange() {
    if (this.selectedBomId) {
      const bom = this.boms.find((b) => b.id === this.selectedBomId);
      if (bom) {
        this.populateLinesFromBom(bom);
      }
    }
  }

  addComponentLine() {
    this.lines.push({
      itemId: '',
      consumedQty: 1,
      unitRate: 0,
      amount: 0,
    });
  }

  removeComponentLine(idx: number) {
    this.lines.splice(idx, 1);
  }

  onItemSelect(line: ProductionLine) {
    const it = this.items.find((i) => i.id === line.itemId);
    if (it) {
      line.unitRate = Number(it.purchaseRate) || Number(it.saleRate) || 0;
      this.updateLineTotal(line);
    }
  }

  updateLineTotal(line: ProductionLine) {
    const qty = Number(line.consumedQty) || 0;
    const rate = Number(line.unitRate) || 0;
    line.amount = qty * rate;
  }

  recalculateTotals() {
    // updates getter calculation
  }

  saveProductionEntry() {
    if (!this.formData.finishedItemId) {
      this.errorMessage = 'Please select a finished product to produce.';
      return;
    }
    if (!this.formData.assembledQty || Number(this.formData.assembledQty) <= 0) {
      this.errorMessage = 'Quantity to assemble must be greater than zero.';
      return;
    }
    if (!this.formData.sourceGodownId) {
      this.errorMessage = 'Please select a source warehouse for raw material deduction.';
      return;
    }
    if (!this.formData.targetGodownId) {
      this.errorMessage = 'Please select a target warehouse for finished product deposit.';
      return;
    }
    if (this.lines.length === 0 || !this.lines.some((l) => l.itemId)) {
      this.errorMessage = 'Please specify at least one consumed raw material item.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const companyId = this.tenantService.currentCompany()?.id || localStorage.getItem('zeno_company_id');

    const payload = {
      ...this.formData,
      companyId,
      bomId: this.selectedBomId || null,
      items: this.lines.filter((l) => l.itemId),
    };

    this.manufacturingService.createProductionEntry(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toast.success(
          `Production Assembly Run ${res?.voucherNo || ''} recorded successfully! Produced ${this.formData.assembledQty} units.`,
          'Production Recorded',
        );
        this.backToList();
        this.loadData();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to record assembly run';
        this.toast.error(this.errorMessage, 'Recording Failed');
      },
    });
  }

  viewEntryDetails(entry: any) {
    this.manufacturingService.getProductionEntryById(entry.id).subscribe({
      next: (fullEntry) => {
        this.selectedEntry = fullEntry;
        this.viewMode = 'view';
      },
      error: () => {
        this.selectedEntry = entry;
        this.viewMode = 'view';
      },
    });
  }

  reverseEntry(entry: any) {
    if (
      !confirm(
        `Are you sure you want to reverse Assembly Run "${entry.voucherNo}"? This will return all consumed raw materials to stock and remove finished goods from inventory.`,
      )
    ) {
      return;
    }

    this.manufacturingService.cancelProductionEntry(entry.id).subscribe({
      next: () => {
        this.toast.success(`Assembly Run "${entry.voucherNo}" reversed and inventory balanced.`, 'Production Reversed');
        if (this.selectedEntry && this.selectedEntry.id === entry.id) {
          this.backToList();
        }
        this.loadData();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to reverse assembly run';
        this.toast.error(msg, 'Reversal Failed');
        alert(msg);
      },
    });
  }
}
