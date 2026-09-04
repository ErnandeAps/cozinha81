import { Component, Input, Output, EventEmitter, model } from '@angular/core';
import { CommonModule } from '@angular/common';

// 1. ButtonComponent
@Component({
  selector: 'c81-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="'c81-btn c81-btn--' + variant + ' c81-btn--' + size + (block ? ' c81-btn--block' : '')"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'ink' | 'secondary' | 'ghost' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() block = false;
  @Input() disabled = false;
}

// 2. IconButtonComponent
@Component({
  selector: 'c81-icon-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="'c81-iconbtn' + (solid ? ' c81-iconbtn--solid' : '') + (size === 'sm' ? ' c81-iconbtn--sm' : '')"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class IconButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() solid = false;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() disabled = false;
}

// 3. BadgeComponent
@Component({
  selector: 'c81-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="'c81-badge c81-badge--' + variant">
      @if (hasDot) {
        <span class="c81-badge__dot"></span>
      }
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  @Input() variant: 'neutral' | 'accent' | 'ready' | 'warn' | 'stop' | 'solid' = 'neutral';
  @Input() hasDot = false;
}

// 4. TagComponent
@Component({
  selector: 'c81-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      [class]="'c81-tag' + (selectable ? ' c81-tag--selectable' : '') + (active ? ' c81-tag--active' : '')"
      [attr.tabindex]="selectable ? 0 : null"
      (click)="selectable && onSelect($event)"
      (keydown.enter)="selectable && onSelect($event)"
      (keydown.space)="selectable && onSpace($event)"
    >
      <ng-content></ng-content>
    </span>
  `
})
export class TagComponent {
  @Input() selectable = false;
  @Input() active = false;
  @Output() clicked = new EventEmitter<Event>();

  onSelect(event: Event) {
    this.clicked.emit(event);
  }

  onSpace(event: Event) {
    event.preventDefault();
    this.clicked.emit(event);
  }
}

// 5. CardComponent
@Component({
  selector: 'c81-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="'c81-card' + (pad ? ' c81-card--pad' : '') + (raised ? ' c81-card--raised' : '') + (interactive ? ' c81-card--interactive' : '')"
    >
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() pad = true;
  @Input() raised = false;
  @Input() interactive = false;
}

// 6. InputComponent
@Component({
  selector: 'c81-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="c81-field">
      @if (label) {
        <label [for]="id" class="c81-label">{{ label }}</label>
      }
      <input
        [id]="id"
        [type]="type"
        [placeholder]="placeholder"
        [value]="value"
        [disabled]="disabled"
        [class]="'c81-input' + (invalid ? ' c81-input--invalid' : '')"
        (input)="onNativeInput($event)"
        (change)="onNativeChange($event)"
      />
      @if (hint) {
        <span class="c81-hint">{{ hint }}</span>
      }
    </div>
  `
})
export class InputComponent {
  private static nextId = 0;

  @Input() id = `c81-input-${InputComponent.nextId++}`;
  @Input() label = '';
  @Input() hint = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() type = 'text';
  @Input() disabled = false;
  @Input() invalid = false;

  @Output() input = new EventEmitter<Event>();
  @Output() change = new EventEmitter<Event>();

  onInput(event: Event): void {
    this.input.emit(event);
  }

  onChange(event: Event): void {
    this.change.emit(event);
  }

  onNativeInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.input.emit(event);
  }

  onNativeChange(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.change.emit(event);
  }
}

// 7. SelectComponent
@Component({
  selector: 'c81-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="c81-field">
      @if (label) {
        <label [for]="id" class="c81-label">{{ label }}</label>
      }
      <select [id]="id" [disabled]="disabled" class="c81-select">
        <ng-content></ng-content>
      </select>
      @if (hint) {
        <span class="c81-hint">{{ hint }}</span>
      }
    </div>
  `
})
export class SelectComponent {
  private static nextId = 0;
  @Input() id = `c81-select-${SelectComponent.nextId++}`;
  @Input() label = '';
  @Input() hint = '';
  @Input() disabled = false;
}

// 8. SwitchComponent
@Component({
  selector: 'c81-switch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="c81-switch"
      [attr.data-on]="checked()"
      [disabled]="disabled"
      (click)="toggle()"
    >
      <span class="c81-switch__track">
        <span class="c81-switch__thumb"></span>
      </span>
      @if (label) {
        <span class="c81-switch__label">{{ label }}</span>
      }
    </button>
  `
})
export class SwitchComponent {
  @Input() label = '';
  checked = model(false);
  @Input() disabled = false;

  toggle() {
    if (!this.disabled) {
      this.checked.set(!this.checked());
    }
  }
}

// 9. CheckboxComponent
@Component({
  selector: 'c81-checkbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="c81-check"
      [attr.data-on]="checked()"
      [disabled]="disabled"
      (click)="toggle()"
    >
      <span class="c81-check__box">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      @if (label) {
        <span>{{ label }}</span>
      }
    </button>
  `
})
export class CheckboxComponent {
  @Input() label = '';
  checked = model(false);
  @Input() disabled = false;

  toggle() {
    if (!this.disabled) {
      this.checked.set(!this.checked());
    }
  }
}

// 10. AvatarComponent
@Component({
  selector: 'c81-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'c81-avatar' + (accent ? ' c81-avatar--accent' : '') + ' c81-avatar--' + size">
      @if (src) {
        <img [src]="src" [alt]="alt" />
      } @else {
        <span>{{ initials }}</span>
      }
    </div>
  `
})
export class AvatarComponent {
  @Input() src = '';
  @Input() alt = '';
  @Input() initials = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() accent = false;
}

// 11. StatusPillComponent
@Component({
  selector: 'c81-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="'c81-status c81-status--' + status">
      <span class="c81-status__dot"></span>
      <span>{{ label }}</span>
    </span>
  `
})
export class StatusPillComponent {
  @Input() status: 'ready' | 'warn' | 'stop' = 'ready';
  @Input() label = '';
}

// 12. BurnerLoaderComponent
@Component({
  selector: 'c81-burner-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="c81-burner">
      <i></i>
      <i></i>
      <i></i>
      <i></i>
    </div>
  `
})
export class BurnerLoaderComponent {}
