import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '@cozinha81/design-system';
import { AuthService } from '../core/auth.service';
import { type AlertaAtivo, InsumoApiService } from '../estoque/insumo-api.service';

function formatar(valor: string | null): string {
  if (valor === null) return '—';
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

/** Painel "cozinha acesa": saudação + alertas de estoque mínimo (Story 2.4 AC-3). */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent],
  template: `
    <header>
      <span class="c81-eyebrow">VISÃO GERAL</span>
      <h1 style="margin-top: var(--space-1);">Início</h1>
    </header>

    <c81-card [pad]="true">
      <h2 style="margin-bottom: var(--space-3);">Alertas de estoque</h2>
      @if (alertas().length === 0) {
        <p data-test="sem-alertas">Nenhum insumo abaixo do mínimo. 🔥</p>
      } @else {
        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-2);">
          @for (a of alertas(); track a.id) {
            <li style="display: flex; align-items: center; gap: var(--space-3);" data-test="alerta-inicio">
              <span class="c81-badge c81-badge--stop"><span class="c81-badge__dot"></span> MÍNIMO</span>
              <span><strong>{{ a.nome }}</strong> abaixo do mínimo —
                <span style="font-variant-numeric: tabular-nums;">{{ fmt(a.quantidade_atual) }} {{ a.unidade_base }}</span>
              </span>
            </li>
          }
        </ul>
        <a routerLink="/estoque" style="display: inline-block; margin-top: var(--space-3);">Ver estoque →</a>
      }
    </c81-card>
  `,
})
export class InicioComponent implements OnInit {
  private readonly api = inject(InsumoApiService);
  private readonly auth = inject(AuthService);

  protected readonly alertas = signal<AlertaAtivo[]>([]);
  protected fmt = formatar;

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) return;
    this.api.alertasAtivos().subscribe({
      next: (a) => this.alertas.set(a),
      error: () => this.alertas.set([]),
    });
  }
}
