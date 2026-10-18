import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zeno-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-card.component.html',
})
export class ZenoCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() padded = false;
  @Input() overflowHidden = false;
  @Input() hasHeaderActions = false;
}
