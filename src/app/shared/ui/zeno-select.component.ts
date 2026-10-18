import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zeno-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenoSelectComponent),
      multi: true
    }
  ],
  templateUrl: './zeno-select.component.html',
})
export class ZenoSelectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() labelKey?: string;
  @Input() valueKey?: string;
  @Input() disabled = false;
  @Input() allowEmpty = true;
  @Input() emptyLabel?: string;
  @Input() error = false;
  @Input() placeholder?: string;

  @Output() selectChange = new EventEmitter<any>();
  @Output() selectBlur = new EventEmitter<FocusEvent>();

  value: any = null;

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: any): void {
    this.value = val;
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

  getOptionLabel(opt: any): string {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    if (this.labelKey && opt[this.labelKey] !== undefined) return String(opt[this.labelKey]);
    return opt.label || opt.name || opt.title || String(opt);
  }

  getOptionValue(opt: any): any {
    if (opt === null || opt === undefined) return null;
    if (typeof opt === 'string' || typeof opt === 'number') return opt;
    if (this.valueKey && opt[this.valueKey] !== undefined) return opt[this.valueKey];
    return opt.value !== undefined ? opt.value : opt.id !== undefined ? opt.id : opt;
  }

  onValueChange(val: any) {
    this.value = val;
    this.onChange(val);
    this.selectChange.emit(val);
  }

  onBlur(event: FocusEvent) {
    this.onTouched();
    this.selectBlur.emit(event);
  }
}
