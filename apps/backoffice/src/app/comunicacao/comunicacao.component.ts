import { Component } from '@angular/core';
import { CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-comunicacao',
  standalone: true,
  imports: [CardComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">// COMUNICAÇÃO</span>
      <h1 style="margin: 0; font-size: 2rem;">Comunicação Hub × restaurantes</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Avisos e comunicados</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (aviso of avisos; track aviso.id) {
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                <strong>{{ aviso.titulo }}</strong>
                <span [style.color]="tipoCor(aviso.tipo)">{{ aviso.tipo }}</span>
              </div>
              <div style="color: var(--text-secondary); margin-bottom: var(--space-2);">{{ aviso.descricao }}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Enviado para: {{ aviso.destino }}</div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class ComunicacaoComponent {
  protected readonly avisos = [
    { id: 'a1', titulo: 'Manutenção do sistema de exaustão', descricao: 'A manutenção ocorrerá amanhã, das 08h às 10h.', tipo: 'Urgente', destino: 'Burger House · Espoleto' },
    { id: 'a2', titulo: 'Atualização de regras da Hub', descricao: 'Novas regras de segurança e acesso entrarão em vigor no próximo ciclo.', tipo: 'Informativo', destino: 'Todos os restaurantes' },
  ];

  protected tipoCor(tipo: string): string {
    return tipo === 'Urgente' ? 'var(--status-stop)' : 'var(--status-warn)';
  }
}
