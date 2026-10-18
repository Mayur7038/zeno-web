import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZenoSearchableSelectComponent } from './zeno-searchable-select.component';

@Component({
  selector: 'zeno-item-fast-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenoSearchableSelectComponent],
  templateUrl: './zeno-item-fast-entry.component.html',
})
export class ZenoItemFastEntryComponent {
  @Input() itemsList: any[] = [];
  @Input() showFreeQty = false;
  @Input() showDiscount = true;
  @Input() showGst = true;
  @Input() isPurchase = false;

  @Input() set editData(data: { item: any, index: number } | null) {
    if (data && data.item) {
      this.editIndex = data.index;
      const it = data.item;
      const uVal = it.unit || it.unitCode;
      const uStr = typeof uVal === 'object' ? (uVal.code || uVal.name || 'PCS') : (uVal || 'PCS');
      this.newItem = {
        itemId: it.itemId || '',
        itemName: it.itemName || '',
        unit: uStr,
        qty: it.billedQty || it.orderedQty || it.dispatchedQty || it.receivedQty || it.returnedQty || 1,
        rate: it.unitPrice || it.rate || 0,
        discount: it.discountAmount || it.discount || 0,
        freeQty: it.freeQty || 0,
        gstRate: it.taxRate !== undefined ? it.taxRate : (it.gstRate !== undefined ? it.gstRate : 18),
        selectedItemObj: this.itemsList.find(i => i.id === it.itemId) || null
      };
    } else {
      this.editIndex = null;
    }
  }

  @Output() itemAdded = new EventEmitter<any>();
  @Output() itemUpdated = new EventEmitter<any>();

  editIndex: number | null = null;

  newItem: any = {
    itemId: '',
    itemName: '',
    unit: 'PCS',
    qty: 1,
    rate: 0,
    discount: 0,
    freeQty: 0,
    gstRate: 18,
    selectedItemObj: null
  };

  getUnitDisplay(): string {
    const val = this.newItem.unit;
    if (!val) return 'PCS';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.code || val.name || val.unitCode || 'PCS';
    return String(val);
  }

  onItemSelect(opt: any): void {
    if (!opt) {
      this.newItem.selectedItemObj = null;
      this.newItem.itemName = '';
      this.newItem.unit = 'PCS';
      this.newItem.rate = 0;
      this.newItem.gstRate = 18;
      return;
    }
    this.newItem.selectedItemObj = opt;
    this.newItem.itemName = opt.name || opt.itemName || '';
    const uVal = opt.primaryUnit || opt.unitCode || opt.unit;
    this.newItem.unit = typeof uVal === 'object' ? (uVal.code || uVal.name || 'PCS') : (uVal || 'PCS');
    const pRate = opt.purchaseRate ?? opt.purchasePrice ?? opt.rate ?? 0;
    const sRate = opt.salesRate ?? opt.salePrice ?? opt.rate ?? 0;
    this.newItem.rate = Number(this.isPurchase ? (pRate || sRate) : (sRate || pRate));
    this.newItem.gstRate = opt.gstRate !== undefined ? Number(opt.gstRate) : (opt.gstPercent !== undefined ? Number(opt.gstPercent) : 18);
  }

  getCalculatedAmount(): number {
    const qty = Math.max(0, Number(this.newItem.qty) || 0);
    const rate = Math.max(0, Number(this.newItem.rate) || 0);
    const disc = Math.max(0, Number(this.newItem.discount) || 0);
    return Math.max(0, (qty * rate) - disc);
  }

  addItem(): void {
    if (!this.newItem.itemId || this.newItem.qty <= 0) return;

    const payload = {
      index: this.editIndex,
      itemId: this.newItem.itemId,
      itemName: this.newItem.itemName || (this.newItem.selectedItemObj ? this.newItem.selectedItemObj.name : ''),
      itemObj: this.newItem.selectedItemObj,
      unit: this.newItem.unit,
      qty: Number(this.newItem.qty) || 1,
      rate: Number(this.newItem.rate) || 0,
      discount: Number(this.newItem.discount) || 0,
      freeQty: Number(this.newItem.freeQty) || 0,
      gstRate: Number(this.newItem.gstRate) || 0,
      amount: this.getCalculatedAmount()
    };

    if (this.editIndex !== null) {
      this.itemUpdated.emit(payload);
    } else {
      this.itemAdded.emit(payload);
    }

    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editIndex = null;
    this.newItem = {
      itemId: '',
      itemName: '',
      unit: 'PCS',
      qty: 1,
      rate: 0,
      discount: 0,
      freeQty: 0,
      gstRate: 18,
      selectedItemObj: null
    };
  }
}
