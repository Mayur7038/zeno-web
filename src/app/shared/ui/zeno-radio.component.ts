import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zeno-radio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenoRadioComponent),
      multi: true
    }
  ],
  templateUrl: './zeno-radio.component.html',
})
export class ZenoRadioComponent implements ControlValueAccessor {
  @Input({ required: true }) value: any;
  @Input() name = 'zeno-radio';
  @Input() label?: string;
  @Input() disabled = false;

  @Output() change = new EventEmitter<any>();

  modelValue: any;

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: any): void {
    this.modelValue = val;
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

  onSelect() {
    this.modelValue = this.value;
    this.onChange(this.value);
    this.onTouched();
    this.change.emit(this.value);
  }
}
