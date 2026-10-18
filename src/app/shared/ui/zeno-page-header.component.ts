import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zeno-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-page-header.component.html',
})
export class ZenoPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() badge?: string;
  @Input() badgeType: 'neutral' | 'primary' | 'success' | 'warning' = 'neutral';
}
