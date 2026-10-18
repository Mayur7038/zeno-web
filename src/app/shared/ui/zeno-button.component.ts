import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zeno-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-button.component.html',
})
export class ZenoButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'icon' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() icon?: string;
  @Input() iconPos: 'left' | 'right' = 'left';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() block = false;
  @Input() title = '';

  @Output() btnClick = new EventEmitter<MouseEvent>();

  getBtnClasses(): string {
    const base = 'inline-flex items-center justify-center font-semibold rounded-sm cursor-pointer transition-all border border-transparent whitespace-nowrap select-none leading-none disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none active:not-disabled:translate-y-px';
    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-[38px] px-4 text-sm gap-2',
      lg: 'h-11 px-5 text-base gap-2.5',
    };
    const variants = {
      primary: 'bg-primary-600 text-white shadow-xs hover:not-disabled:bg-primary-700 hover:not-disabled:shadow-sm',
      secondary: 'bg-surface-0 text-surface-700 border-surface-300 hover:not-disabled:bg-surface-50 hover:not-disabled:border-surface-400 hover:not-disabled:text-surface-900',
      success: 'bg-emerald-600 text-white shadow-xs hover:not-disabled:bg-emerald-700',
      danger: 'bg-red-500 text-white shadow-xs hover:not-disabled:bg-red-600',
      warning: 'bg-amber-500 text-white hover:not-disabled:bg-amber-600',
      ghost: 'bg-transparent text-surface-600 border-transparent hover:not-disabled:bg-surface-100 hover:not-disabled:text-surface-900',
      icon: 'bg-transparent text-surface-500 border-transparent px-2 py-1.5 hover:not-disabled:bg-surface-100 hover:not-disabled:text-surface-800',
    };
    const v = variants[this.variant] || variants.primary;
    const s = sizes[this.size] || sizes.md;
    return `${base} ${s} ${v} ${this.block ? 'w-full' : ''}`;
  }

  handleClick(event: MouseEvent) {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit(event);
    }
  }
}
