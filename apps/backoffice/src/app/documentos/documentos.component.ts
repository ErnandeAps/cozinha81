import { Component } from '@angular/core';
import { CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CardComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">// DOCUMENTOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Documentos e conformidade</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">REGULAR</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-go);">08</h2>
        </c81-card>
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">VENCE EM BREVE</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-warn);">03</h2>
        </c81-card>
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">VENCIDO</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-stop);">02</h2>
        </c81-card>
      </div>

      <c81-card [pad]="true">
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (doc of documentos; track doc.id) {
            <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
              <div>
                <strong>{{ doc.restaurante }}</strong>
                <div style="color: var(--text-secondary); font-size: 0.85rem;">{{ doc.tipo }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Vencimento</div>
                <div>{{ doc.vencimento }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Status</div>
                <span [style.color]="statusCor(doc.status)">{{ doc.status }}</span>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Ação</div>
                <div>{{ doc.acao }}</div>
              </div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class DocumentosComponent {
  protected readonly documentos = [
    { id: 'd1', restaurante: 'Burger House', tipo: 'Seguro', vencimento: '22/09/2026', status: 'Regular', acao: 'Em dia' },
    { id: 'd2', restaurante: 'Espoleto', tipo: 'Alvará', vencimento: '03/10/2026', status: 'Vence em breve', acao: 'Solicitar renovação' },
    { id: 'd3', restaurante: 'Fatias Pizzas', tipo: 'Contrato', vencimento: '14/08/2026', status: 'Vencido', acao: 'Revisar com jurídico' },
  ];

  protected statusCor(status: string): string {
    switch (status) {
      case 'Regular':
        return 'var(--status-go)';
      case 'Vence em breve':
        return 'var(--status-warn)';
      case 'Vencido':
        return 'var(--status-stop)';
      default:
        return 'var(--text-primary)';
    }
  }
}
