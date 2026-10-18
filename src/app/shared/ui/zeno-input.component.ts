import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zeno-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenoInputComponent),
      multi: true
    }
  ],
  templateUrl: './zeno-input.component.html',
})
export class ZenoInputComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'number' | 'email' | 'password' | 'date' | 'tel' | 'time' | 'url' | 'search' = 'text';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() uppercase = false;
  @Input() mono = false;
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: string;
  @Input() icon?: string;
  @Input() iconRight?: string;
  @Input() error = false;
  @Input() placeholder?: string;
  /** HTML autocomplete attribute value (e.g. 'off', 'email', 'name') */
  @Input() autocomplete?: string;
  @Input() maxlength?: number;
  @Input() rows?: number;
  /** textarea mode */
  @Input() textarea = false;

  @Output() inputChange = new EventEmitter<any>();
  @Output() inputBlur = new EventEmitter<FocusEvent>();
  @Output() inputFocus = new EventEmitter<FocusEvent>();
  @Output() inputEnter = new EventEmitter<KeyboardEvent>();

  value: any = '';

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: any): void {
    this.value = val !== undefined && val !== null ? val : '';
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

  onValueChange(val: any) {
    this.value = val;
    this.onChange(val);
    this.inputChange.emit(val);
  }

  onBlur(event: FocusEvent) {
    this.onTouched();
    this.inputBlur.emit(event);
  }

  onFocus(event: FocusEvent) {
    this.inputFocus.emit(event);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.inputEnter.emit(event);
    }
  }
}
