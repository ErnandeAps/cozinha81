import { Component } from '@angular/core';
import { CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-manutencao',
  standalone: true,
  imports: [CardComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">// MANUTENÇÃO</span>
      <h1 style="margin: 0; font-size: 2rem;">Manutenção preventiva da infraestrutura</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Calendário de manutenção</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (item of manutencoes; track item.id) {
            <div style="display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
              <div>
                <strong>{{ item.equipamento }}</strong>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Próxima</div>
                <div>{{ item.proxima }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Status</div>
                <span [style.color]="statusCor(item.status)">{{ item.status }}</span>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Responsável</div>
                <div>{{ item.responsavel }}</div>
              </div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class ManutencaoComponent {
  protected readonly manutencoes = [
    { id: 'm1', equipamento: 'Câmara fria', proxima: '12/09/2026', status: 'Agendada', responsavel: 'Operação Hub' },
    { id: 'm2', equipamento: 'Sistema de gás', proxima: '18/09/2026', status: 'Programada', responsavel: 'Técnico externo' },
    { id: 'm3', equipamento: 'Coifa principal', proxima: '25/09/2026', status: 'Agendada', responsavel: 'Equipe técnica' },
    { id: 'm4', equipamento: 'Exaustão', proxima: '02/10/2026', status: 'Em revisão', responsavel: 'Manutenção interna' },
  ];

  protected statusCor(status: string): string {
    switch (status) {
      case 'Em revisão':
        return 'var(--status-warn)';
      case 'Programada':
        return 'var(--status-go)';
      default:
        return 'var(--text-primary)';
    }
  }
}
