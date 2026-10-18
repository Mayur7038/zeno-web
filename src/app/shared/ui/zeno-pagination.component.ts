import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'zeno-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zeno-pagination.component.html',
})
export class ZenoPaginationComponent implements OnChanges {
  /** Total number of records */
  @Input({ required: true }) total = 0;

  /** Current page (1-indexed) */
  @Input({ required: true }) page = 1;

  /** Records per page */
  @Input() pageSize = 25;

  /** Page-size options for the dropdown */
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];

  /** Show the "rows per page" selector */
  @Input() showPageSize = true;

  /** Show record range label e.g. "Showing 1–25 of 182" */
  @Input() showInfo = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  totalPages = 1;
  pages: (number | '...')[] = [];

  ngOnChanges(_changes: SimpleChanges): void {
    this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
    this.pages = this.buildPageNumbers();
  }

  get startRecord(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  goTo(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.pageChange.emit(p);
  }

  prev() { this.goTo(this.page - 1); }
  next() { this.goTo(this.page + 1); }
  first() { this.goTo(1); }
  last() { this.goTo(this.totalPages); }

  onPageSizeChange(newSize: number) {
    this.pageSize = +newSize;
    this.pageSizeChange.emit(this.pageSize);
    // Reset to page 1 on size change
    this.pageChange.emit(1);
  }

  private buildPageNumbers(): (number | '...')[] {
    const total = this.totalPages;
    const current = this.page;
    const delta = 2; // pages on each side of current

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    pages.push(1);
    if (left > 2) pages.push('...');

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  }

  isNumber(p: number | '...'): p is number { return typeof p === 'number'; }
}
