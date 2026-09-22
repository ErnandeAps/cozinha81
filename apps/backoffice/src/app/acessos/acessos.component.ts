import { Component } from '@angular/core';
import { CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-acessos',
  standalone: true,
  imports: [CardComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">ACESSOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Controle de acesso</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Autorizados por restaurante</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (acesso of acessos; track acesso.id) {
            <div style="display: grid; grid-template-columns: 1.2fr 1fr 1.2fr 1fr; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
              <div>
                <strong>{{ acesso.nome }}</strong>
                <div style="color: var(--text-secondary); font-size: 0.85rem;">{{ acesso.tipo }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Restaurante</div>
                <div>{{ acesso.restaurante }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Horário</div>
                <div>{{ acesso.horario }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Status</div>
                <span [style.color]="statusCor(acesso.status)">{{ acesso.status }}</span>
              </div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class AcessosComponent {
  protected readonly acessos = [
    { id: 'a1', nome: 'João Costa', tipo: 'Funcionário', restaurante: 'Burger House', horario: '08h-18h', status: 'Autorizado' },
    { id: 'a2', nome: 'Ana Marques', tipo: 'Prestador', restaurante: 'Espoleto', horario: '09h-17h', status: 'Autorizado' },
    { id: 'a3', nome: 'Carlos Mota', tipo: 'Visitante', restaurante: 'Fatias Pizzas', horario: '12h-14h', status: 'Pendente' },
  ];

  protected statusCor(status: string): string {
    switch (status) {
      case 'Autorizado':
        return 'var(--status-go)';
      case 'Pendente':
        return 'var(--status-warn)';
      default:
        return 'var(--text-primary)';
    }
  }
}
