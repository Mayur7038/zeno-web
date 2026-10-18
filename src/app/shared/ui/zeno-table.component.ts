import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ZenoTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

@Component({
  selector: 'zeno-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-table.component.html',
})
export class ZenoTableComponent {
  @Input() hasToolbar = true;
  @Input() loading = false;
  @Input() empty = false;
  @Input() loadingMessage = 'Loading data...';
  @Input() emptyMessage = 'No records found.';
  @Input() emptyIcon = 'pi pi-folder-open';
  @Input() emptyActionText?: string;
  /** Optional: columns definition for sortable headers */
  @Input() columns: ZenoTableColumn[] = [];
  /** Current sort column key */
  @Input() sortKey?: string;
  /** Sort direction */
  @Input() sortDir: 'asc' | 'desc' = 'asc';

  @Output() emptyAction = new EventEmitter<void>();
  /** Emits { key, dir } when a sortable column header is clicked */
  @Output() sortChange = new EventEmitter<{ key: string; dir: 'asc' | 'desc' }>();

  onSortClick(col: ZenoTableColumn) {
    if (!col.sortable) return;
    const newDir = this.sortKey === col.key && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortKey = col.key;
    this.sortDir = newDir;
    this.sortChange.emit({ key: col.key, dir: newDir });
  }

  getSortIcon(col: ZenoTableColumn): string {
    if (!col.sortable) return '';
    if (this.sortKey !== col.key) return 'pi pi-sort text-surface-300';
    return this.sortDir === 'asc' ? 'pi pi-sort-amount-up text-primary-600' : 'pi pi-sort-amount-down text-primary-600';
  }
}
