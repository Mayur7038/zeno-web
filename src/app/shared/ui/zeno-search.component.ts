import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zeno-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenoSearchComponent),
      multi: true
    }
  ],
  templateUrl: './zeno-search.component.html',
})
export class ZenoSearchComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Output() searchChange = new EventEmitter<string>();

  value = '';

  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string): void {
    this.value = val || '';
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(val: string) {
    this.value = val;
    this.onChange(val);
    this.searchChange.emit(val);
  }

  clearSearch() {
    this.value = '';
    this.onChange('');
    this.searchChange.emit('');
  }
}
