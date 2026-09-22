import { Component } from '@angular/core';
import { CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-chamados',
  standalone: true,
  imports: [CardComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">CHAMADOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Chamados e manutenção</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">ABERTOS</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2);">12</h2>
        </c81-card>
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">CRÍTICOS</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-stop);">03</h2>
        </c81-card>
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">ENCERRADOS</span>
          <h2 style="font-size: 2.2rem; margin-top: var(--space-2); color: var(--status-go);">48</h2>
        </c81-card>
      </div>

      <c81-card [pad]="true">
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (chamado of chamados; track chamado.id) {
            <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr; gap: var(--space-2); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
              <div>
                <strong>{{ chamado.titulo }}</strong>
                <div style="color: var(--text-secondary); font-size: 0.85rem;">{{ chamado.restaurante }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Prioridade</div>
                <span [style.color]="prioridadeCor(chamado.prioridade)">{{ chamado.prioridade }}</span>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Tipo</div>
                <div>{{ chamado.tipo }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Responsável</div>
                <div>{{ chamado.responsavel }}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Status</div>
                <div>{{ chamado.status }}</div>
              </div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class ChamadosComponent {
  protected readonly chamados = [
    { id: 'ch1', restaurante: 'Burger House', titulo: 'Vazamento na linha de água', tipo: 'Hidráulica', prioridade: 'Crítica', responsavel: 'Manutenção Hub', status: 'Em atendimento' },
    { id: 'ch2', restaurante: 'Espoleto', titulo: 'Exaustão com falha no motor', tipo: 'Exaustão', prioridade: 'Alta', responsavel: 'Técnico externo', status: 'Em diagnóstico' },
    { id: 'ch3', restaurante: 'Fatias Pizzas', titulo: 'Câmara fria fora da temperatura', tipo: 'Infraestrutura', prioridade: 'Alta', responsavel: 'Operação', status: 'Aguardando confirmação' },
  ];

  protected prioridadeCor(prioridade: string): string {
    switch (prioridade) {
      case 'Crítica':
        return 'var(--status-stop)';
      case 'Alta':
        return 'var(--status-warn)';
      default:
        return 'var(--text-primary)';
    }
  }
}
