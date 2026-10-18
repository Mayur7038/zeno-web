import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zeno-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-modal.component.html',
})
export class ZenoModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  @Input() closable = true;
  @Input() closeOnBackdrop = true;

  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen && this.closable) {
      this.handleClose();
    }
  }

  getDialogClasses(): string {
    const base = 'bg-surface-0 rounded-md shadow-lg max-h-[90vh] flex flex-col overflow-hidden w-full';
    const sizes = {
      sm: 'max-w-[440px]',
      md: 'max-w-[600px]',
      lg: 'max-w-[860px]',
      xl: 'max-w-[1100px]',
      full: 'max-w-[96vw] h-[94vh]',
    };
    return `${base} ${sizes[this.size] || sizes.md}`;
  }

  onBackdropClick(event: MouseEvent) {
    if (this.closeOnBackdrop && this.closable) {
      this.handleClose();
    }
  }

  handleClose() {
    this.close.emit();
  }
}
