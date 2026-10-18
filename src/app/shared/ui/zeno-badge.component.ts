import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zeno-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-badge.component.html',
})
export class ZenoBadgeComponent {
  @Input() type: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' = 'neutral';
  @Input() icon?: string;
  @Input() pill = true;

  getBadgeClasses(): string {
    const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase whitespace-nowrap leading-tight border';
    const types = {
      success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
      danger: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-sky-100 text-sky-800 border-sky-200',
      primary: 'bg-blue-100 text-blue-800 border-blue-200',
      neutral: 'bg-surface-100 text-surface-700 border-surface-200',
    };
    const t = types[this.type] || types.neutral;
    const r = this.pill ? 'rounded-full' : 'rounded-sm';
    return `${base} ${t} ${r}`;
  }
}
