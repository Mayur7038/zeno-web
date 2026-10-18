import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ZenoTabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
}

@Component({
  selector: 'zeno-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeno-tabs.component.html',
})
export class ZenoTabsComponent {
  @Input({ required: true }) tabs: ZenoTabItem[] = [];
  @Input({ required: true }) activeTab = '';
  @Input() variant: 'underline' | 'pill' = 'underline';

  @Output() tabChange = new EventEmitter<string>();

  selectTab(id: string) {
    if (this.activeTab !== id) {
      this.activeTab = id;
      this.tabChange.emit(id);
    }
  }
}
