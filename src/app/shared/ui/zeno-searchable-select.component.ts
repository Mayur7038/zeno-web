import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zeno-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenoSearchableSelectComponent),
      multi: true
    }
  ],
  templateUrl: './zeno-searchable-select.component.html',
})
export class ZenoSearchableSelectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() labelKey: string = 'name';
  @Input() valueKey: string = 'id';
  @Input() secondaryKey?: string;
  @Input() placeholder: string = 'Search & select...';
  @Input() disabled = false;
  @Input() allowClear = true;
  @Input() emptyLabel?: string;

  @Output() selectChange = new EventEmitter<any>();
  @Output() optionSelected = new EventEmitter<any>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  value: any = null;
  isOpen = false;
  openUpwards = false;
  searchQuery = '';
  filteredOptions: any[] = [];
  activeIndex = 0;
  selectedOption: any = null;

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  constructor(private elementRef: ElementRef) {}

  writeValue(val: any): void {
    this.value = val;
    this.updateSelectedOption();
  }

  registerOnChange(fn: (val: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  ngOnChanges(): void {
    this.filterOptions();
    this.updateSelectedOption();
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    this.isOpen = true;
    this.searchQuery = '';
    this.filterOptions();
    this.activeIndex = 0;

    try {
      const rect = this.elementRef.nativeElement.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      this.openUpwards = spaceBelow < 260 && spaceAbove > spaceBelow;
    } catch {
      this.openUpwards = false;
    }

    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 50);
  }

  closeDropdown(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.searchQuery = '';
      this.onTouched();
    }
  }

  onSearchInput(): void {
    this.filterOptions();
    this.activeIndex = 0;
  }

  filterOptions(): void {
    if (!this.options) {
      this.filteredOptions = [];
      return;
    }
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.filteredOptions = [...this.options];
      return;
    }
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredOptions = this.options.filter(opt => {
      const label = this.getOptionLabel(opt).toLowerCase();
      const sec = this.getSecondaryLabel(opt).toLowerCase();
      return label.includes(q) || sec.includes(q);
    });
  }

  updateSelectedOption(): void {
    if (!this.options || this.value === null || this.value === undefined || this.value === '') {
      this.selectedOption = null;
      return;
    }
    this.selectedOption = this.options.find(opt => this.getOptionValue(opt) === this.value) || null;
  }

  selectOption(opt: any, event?: Event): void {
    if (event) event.stopPropagation();
    const val = this.getOptionValue(opt);
    this.value = val;
    this.selectedOption = opt;
    this.onChange(val);
    this.selectChange.emit(val);
    this.optionSelected.emit(opt);
    this.closeDropdown();
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.value = null;
    this.selectedOption = null;
    this.onChange(null);
    this.selectChange.emit(null);
    this.optionSelected.emit(null);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.activeIndex < this.filteredOptions.length - 1) {
        this.activeIndex++;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.activeIndex > 0) {
        this.activeIndex--;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filteredOptions[this.activeIndex]) {
        this.selectOption(this.filteredOptions[this.activeIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  getOptionLabel(opt: any): string {
    if (!opt) return '';
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    if (this.labelKey && opt[this.labelKey] !== undefined) return String(opt[this.labelKey]);
    return opt.name || opt.label || opt.title || String(opt);
  }

  getSecondaryLabel(opt: any): string {
    if (!opt || typeof opt !== 'object') return '';
    if (this.secondaryKey && opt[this.secondaryKey] !== undefined) {
      const val = opt[this.secondaryKey];
      return val ? String(val) : '';
    }
    if (opt.ledgerGroup?.name) return opt.ledgerGroup.name;
    if (opt.group?.name) return opt.group.name;
    if (opt.groupName) return String(opt.groupName);
    if (opt.sku) return `SKU: ${opt.sku}`;
    if (opt.gstin) return `GSTIN: ${opt.gstin}`;
    if (opt.code) return `Code: ${opt.code}`;
    return '';
  }

  getDisplayLabel(opt: any): string {
    const main = this.getOptionLabel(opt);
    const sec = this.getSecondaryLabel(opt);
    return sec ? `${main} (${sec})` : main;
  }

  getOptionValue(opt: any): any {
    if (opt === null || opt === undefined) return null;
    if (typeof opt === 'string' || typeof opt === 'number') return opt;
    if (this.valueKey && opt[this.valueKey] !== undefined) return opt[this.valueKey];
    return opt.id !== undefined ? opt.id : opt.value !== undefined ? opt.value : opt;
  }
}
