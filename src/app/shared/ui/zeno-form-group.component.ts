import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zeno-form-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-form-group.component.html',
})
export class ZenoFormGroupComponent {
  @Input() label?: string;
  @Input() required = false;
  @Input() hint?: string;
  @Input() error?: string;
  @Input() layout: 'vertical' | 'horizontal' = 'vertical';
  @Input() span: 1 | 2 | 3 = 1;
}
