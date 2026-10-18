import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { P2pService } from '../../../core/services/p2p.service';
import { TenantService } from '../../../core/services/tenant.service';
import { MastersService } from '../../../core/services/masters.service';
import { ToastService } from '../../../core/services/toast.service';
import { exportToCsv } from '../../../core/utils/export.util';
import { ZenoSearchableSelectComponent } from '../../../shared/ui/zeno-searchable-select.component';
import { ZenoItemFastEntryComponent } from '../../../shared/ui/zeno-item-fast-entry.component';

@Component({
  selector: 'app-goods-receipt-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent, ZenoItemFastEntryComponent],
  templateUrl: './goods-receipt-notes.component.html',
})
export class GoodsReceiptNotesComponent implements OnInit {
  viewMode: 'list' | 'create' | 'view' = 'list';
  grns: any[] = [];
  vendors: any[] = [];
  itemsList: any[] = [];
  pendingPos: any[] = [];
  selectedPoIds: string[] = [];

  selectedStatus = '';
  searchQuery = '';
  showPoModal = false;
  submitting = false;
  createError = '';
  viewingGrn: any = null;

  get pendingInvoicingCount(): number {
    return this.grns.filter(g => g.status === 'PENDING' || g.status === 'PARTIALLY_CLEARED').length;
  }

  get fullyInvoicedCount(): number {
    return this.grns.filter(g => g.status === 'CLEARED').length;
  }

  get activeIntakesCount(): number {
    return this.grns.filter(g => g.status !== 'CANCELLED').length;
  }

  form: any = {
    grnDate: new Date().toISOString().split('T')[0],
    vendorLedgerId: '',
    vendorChallanNo: '',
    godownId: '',
    notes: '',
    items: [],
  };

  get grnTotalValue(): number {
    return (this.form?.items || []).reduce((sum: number, line: any) => sum + Number(line.totalAmount || 0), 0);
  }

  getItemName(itemId: string): string {
    if (!itemId) return '';
    const item = this.itemsList.find(i => i.id === itemId);
    return item ? (item.name || item.itemName) : 'Selected Item';
  }

  constructor(
    private p2p: P2pService,
    public tenant: TenantService,
    private masters: MastersService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.tenant.loadHierarchy().subscribe({
      next: () => {
        this.loadGrns();
        this.loadMasters();
      },
    });
  }

  loadGrns() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.p2p.getGoodsReceiptNotes(compId, this.selectedStatus, this.searchQuery).subscribe({
      next: (res) => (this.grns = res),
    });
  }

  loadMasters() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId) return;
    this.masters.getLedgers(compId, true).subscribe({ next: (v) => (this.vendors = v) });
    this.masters.getItems(compId).subscribe({ next: (it) => (this.itemsList = it) });
  }

  filterStatus(status: string) {
    this.selectedStatus = status;
    this.loadGrns();
  }

  openCreateModal() {
    this.form = {
      grnDate: new Date().toISOString().split('T')[0],
      vendorLedgerId: this.vendors[0]?.id || '',
      vendorChallanNo: '',
      godownId: this.tenant.currentGodown()?.id || '',
      notes: '',
      items: [],
    };
    this.pendingPos = [];
    this.selectedPoIds = [];
    this.createError = '';
    this.viewMode = 'create';
    if (this.form.vendorLedgerId) {
      this.onVendorChange();
    }
  }

  backToList() {
    this.viewMode = 'list';
    this.viewingGrn = null;
    this.createError = '';
    this.loadGrns();
  }

  onVendorChange() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    if (!compId || !this.form.vendorLedgerId) return;

    this.p2p.getVendorPendingOrders(this.form.vendorLedgerId, compId).subscribe({
      next: (pos) => (this.pendingPos = pos),
    });
  }

  openPoModal() {
    this.showPoModal = true;
  }

  togglePoSelect(poId: string) {
    if (this.selectedPoIds.includes(poId)) {
      this.selectedPoIds = this.selectedPoIds.filter((id) => id !== poId);
    } else {
      this.selectedPoIds.push(poId);
    }
  }

  confirmPullPOs() {
    const selected = this.pendingPos.filter((po) => this.selectedPoIds.includes(po.id));
    this.form.items = [];

    for (const po of selected) {
      for (const item of po.items || []) {
        const remaining = Math.max(0, Number(item.orderedQty) - Number(item.receivedQty || 0));
        if (remaining > 0) {
          this.form.items.push({
            poItemId: item.id,
            itemId: item.itemId,
            itemName: item.item?.name,
            unitId: item.unitId,
            unitCode: item.unit?.code || 'NOS',
            orderedQty: item.orderedQty,
            receivedQty: remaining,
            rate: Number(item.rate),
            totalAmount: Number((remaining * Number(item.rate)).toFixed(2)),
          });
        }
      }
    }
    this.showPoModal = false;
  }

  addManualLine() {
    const firstItem = this.itemsList[0];
    const line = {
      itemId: firstItem?.id || '',
      itemName: firstItem?.name || '',
      unitId: firstItem?.unitId || '',
      unitCode: firstItem?.unit?.code || 'NOS',
      orderedQty: 1,
      receivedQty: 1,
      rate: Number(firstItem?.purchaseRate || firstItem?.standardCost || 0),
      totalAmount: Number(firstItem?.purchaseRate || firstItem?.standardCost || 0),
    };
    this.form.items.push(line);
  }

  editingItemData: { item: any, index: number } | null = null;

  onFastItemAdded(itemData: any) {
    const line = {
      itemId: itemData.itemId,
      itemName: itemData.itemName,
      unitId: itemData.itemObj?.unitId || '',
      unitCode: itemData.unit || 'NOS',
      orderedQty: itemData.qty,
      receivedQty: itemData.qty,
      rate: itemData.rate,
      totalAmount: itemData.amount
    };
    this.form.items.push(line);
    this.calculateLine(line);
  }

  editItemRow(index: number) {
    const row = this.form.items[index];
    if (row) {
      this.editingItemData = {
        item: {
          itemId: row.itemId,
          qty: row.receivedQty,
          rate: row.rate,
          discount: 0,
          gstRate: 0
        },
        index
      };
    }
  }

  onFastItemUpdated(itemData: any) {
    if (this.editingItemData !== null && this.editingItemData.index >= 0) {
      const idx = this.editingItemData.index;
      const line = this.form.items[idx];
      if (line) {
        line.itemId = itemData.itemId;
        line.itemName = itemData.itemName;
        line.receivedQty = itemData.qty;
        line.orderedQty = itemData.qty;
        line.rate = itemData.rate;
        this.calculateLine(line);
      }
      this.editingItemData = null;
    }
  }

  onManualItemSelect(line: any) {
    const selected = this.itemsList.find((it) => it.id === line.itemId);
    if (selected) {
      line.itemName = selected.name;
      line.unitId = selected.unitId;
      line.unitCode = selected.unit?.code || 'NOS';
      line.rate = Number(selected.purchaseRate || selected.standardCost || 0);
      this.calculateLine(line);
    }
  }

  removeLine(index: number) {
    if (this.editingItemData?.index === index) {
      this.editingItemData = null;
    }
    this.form.items.splice(index, 1);
  }

  calculateLine(line: any) {
    const qty = Number(line.receivedQty || 0);
    const rate = Number(line.rate || 0);
    line.totalAmount = Number((qty * rate).toFixed(2));
  }

  submitCreateGRN() {
    const compId = this.tenant.currentCompany()?.id || localStorage.getItem('zeno_company_id');
    const branchId = this.tenant.currentBranch()?.id;

    if (!this.form.godownId) {
      this.createError = 'Please select a destination warehouse/godown';
      return;
    }

    this.submitting = true;
    this.createError = '';

    const payload = {
      companyId: compId,
      branchId,
      godownId: this.form.godownId,
      vendorLedgerId: this.form.vendorLedgerId,
      vendorChallanNo: this.form.vendorChallanNo,
      grnDate: this.form.grnDate,
      purchaseOrderIds: this.selectedPoIds,
      notes: this.form.notes,
      items: this.form.items.map((i: any) => ({
        poItemId: i.poItemId || null,
        itemId: i.itemId,
        unitId: i.unitId,
        receivedQty: i.receivedQty,
        rate: i.rate,
      })),
    };

    this.p2p.createGoodsReceiptNote(payload).subscribe({
      next: (grn: any) => {
        this.submitting = false;
        this.toast.success(
          `Goods Receipt Note ${grn?.voucherNo || ''} recorded successfully! Items added to inventory.`,
          'GRN Generated',
        );
        this.viewMode = 'list';
        this.loadGrns();
      },
      error: (err) => {
        this.submitting = false;
        this.createError = err.error?.message || 'Failed to record GRN';
        this.toast.error(this.createError, 'GRN Failed');
      },
    });
  }

  viewGrn(id: string) {
    this.p2p.getGoodsReceiptNoteById(id).subscribe({
      next: (grn) => {
        this.viewingGrn = grn;
        this.viewMode = 'view';
      },
    });
  }

  exportGrns() {
    if (!this.grns || this.grns.length === 0) return;
    const headers = ['GRN No', 'Date', 'Vendor', 'Godown / Warehouse', 'Status'];
    const rows = this.grns.map((g: any) => [
      g.voucherNo || '',
      g.grnDate || '',
      g.vendorLedger?.name || '',
      g.godown?.name || '',
      g.status || ''
    ]);
    exportToCsv('Goods_Receipt_Notes', headers, rows);
    this.toast.success('Goods Receipt Notes exported successfully!', 'Export Complete');
  }
}
