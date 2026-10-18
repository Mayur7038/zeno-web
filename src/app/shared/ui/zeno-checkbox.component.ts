import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zeno-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenoCheckboxComponent),
      multi: true
    }
  ],
  templateUrl: './zeno-checkbox.component.html',
})
export class ZenoCheckboxComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() disabled = false;

  @Output() change = new EventEmitter<boolean>();

  checked = false;

  onChange: (val: boolean) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: boolean): void {
    this.checked = !!val;
  }

  registerOnChange(fn: (val: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.change.emit(this.checked);
  }
}
