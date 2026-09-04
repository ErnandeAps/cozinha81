import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewOrderPayload } from '@cozinha81/domain-models';

@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card flame-highlight">
      <div class="header">
        <span class="origin">{{ order.origin }}</span>
        <span class="number">#{{ order.number }}</span>
      </div>
      <div class="body">
        <div>{{ order.items }} itens</div>
        <div class="time">{{ order.time | date:'shortTime' }}</div>
      </div>
      <div class="actions">
        <button (click)="action.emit(order.orderId)" class="btn-primary">Avançar</button>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      border-left: 4px solid #ff9800;
      animation: highlight 2s ease-out;
    }
    .header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 0.5rem; }
    .btn-primary { width: 100%; padding: 0.75rem; background: #ff9800; border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 1rem; margin-top: 1rem; min-height: 48px; }
    @keyframes highlight {
      0% { box-shadow: 0 0 15px #ff9800; background: #3a2a1a; }
      100% { box-shadow: none; background: #2a2a2a; }
    }
  `]
})
export class OrderCardComponent {
  @Input({ required: true }) order!: NewOrderPayload;
  @Output() action = new EventEmitter<string>();
}
