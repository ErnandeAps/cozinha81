import { Component } from '@angular/core';
import { CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [CardComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">RECURSOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Reserva de recursos compartilhados</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">TOTAL</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2);">18</h2>
        </c81-card>
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">OCUPADOS</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-warn);">07</h2>
        </c81-card>
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">DISPONÍVEIS</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-go);">11</h2>
        </c81-card>
      </div>

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Reservas no horizonte atual</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (reserva of reservas; track reserva.id) {
            <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
              <div>
                <strong>{{ reserva.recurso }}</strong>
                <div style="color: var(--text-secondary); font-size: 0.85rem;">{{ reserva.restaurante }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Período</div>
                <div>{{ reserva.periodo }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Status</div>
                <span [style.color]="statusCor(reserva.status)">{{ reserva.status }}</span>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Observação</div>
                <div>{{ reserva.observacao }}</div>
              </div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class RecursosComponent {
  protected readonly reservas = [
    { id: 'r1', recurso: 'Câmara fria - P1', restaurante: 'Burger House', periodo: '12/09 · 08h-12h', status: 'Confirmada', observacao: 'Uso para recebimento' },
    { id: 'r2', recurso: 'Área de carga', restaurante: 'Espoleto', periodo: '13/09 · 10h-13h', status: 'Pendente', observacao: 'Aguardando liberação' },
    { id: 'r3', recurso: 'Equipamento compartilhado', restaurante: 'Fatias Pizzas', periodo: '14/09 · 09h-11h', status: 'Confirmada', observacao: 'Uso de freezer' },
  ];

  protected statusCor(status: string): string {
    switch (status) {
      case 'Confirmada':
        return 'var(--status-go)';
      case 'Pendente':
        return 'var(--status-warn)';
      default:
        return 'var(--text-primary)';
    }
  }
}
