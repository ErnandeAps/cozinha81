import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';

/**
 * Estado "Módulo bloqueado" do Portal (Story 1.6 AC-4, UX-DR9).
 *
 * Exibe cadeado + CTA "Falar com a Cozinha81" para um Módulo não habilitado.
 * É **só reflexo** — a fronteira é o gating server-side (ModuloGuard). Este
 * componente não renderiza nem navega para o conteúdo do módulo.
 */
@Component({
  selector: 'app-modulo-bloqueado',
  standalone: true,
  imports: [CardComponent, ButtonComponent],
  template: `
    <c81-card class="modulo-bloqueado" data-test="modulo-bloqueado">
      <div class="modulo-bloqueado__cadeado" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 class="modulo-bloqueado__titulo">{{ nome }}</h3>
      <p class="modulo-bloqueado__msg">
        Este módulo não está incluído no seu plano. Fale com a gente para ativar.
      </p>
      <c81-button variant="primary" data-test="cta" (click)="contato.emit()">
        Falar com a Cozinha81
      </c81-button>
    </c81-card>
  `,
})
export class ModuloBloqueadoComponent {
  /** Nome de exibição do Módulo (ex.: "Pedidos e KDS"). */
  @Input() nome = 'Módulo';
  /** Chave do Módulo (ex.: "pedidos_kds"). */
  @Input() modulo = '';
  /** Disparado ao acionar o CTA de upsell. */
  @Output() contato = new EventEmitter<void>();
}
