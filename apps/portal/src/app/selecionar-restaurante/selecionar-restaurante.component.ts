import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CardComponent } from '@cozinha81/design-system';
import { AuthService, type RestauranteContexto } from '../core/auth.service';

@Component({
  selector: 'app-selecionar-restaurante',
  standalone: true,
  imports: [CommonModule, CardComponent],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: var(--space-6);">
      <c81-card [raised]="true" [pad]="true" style="width: 100%; max-width: 760px;">
        <span class="c81-eyebrow">COZINHA81 · ACESSO POR RESTAURANTE</span>
        <h1 style="margin-top: var(--space-2); margin-bottom: var(--space-4);">Selecione o restaurante e a cozinha</h1>

        <p style="margin: 0 0 var(--space-5); color: var(--steel-700);">
          Este usuário pode operar em mais de um ponto. Defina o ambiente ativo para continuar com as permissões corretas.
        </p>

        <div style="display: grid; gap: var(--space-4);">
          @for (restaurante of restaurantes(); track restaurante.restauranteId) {
            <button
              type="button"
              (click)="selecionar(restaurante)"
              style="border: 1px solid var(--steel-400); border-radius: 12px; background: white; text-align: left; padding: var(--space-4); cursor: pointer; display: flex; flex-direction: column; gap: var(--space-2);"
            >
              <strong style="font-size: 1.05rem;">{{ restaurante.nomeRestaurante }}</strong>
              <span style="color: var(--steel-700);">Cozinha: {{ restaurante.nomeCozinha }}</span>
              <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-1);">
                @for (permissao of restaurante.permissoes; track permissao) {
                  <span class="c81-badge" style="display: inline-flex; padding: 0.25rem 0.6rem; border-radius: 999px; background: rgba(18, 98, 70, 0.08); color: var(--flame-600); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em;">
                    {{ permissao }}
                  </span>
                }
              </div>
            </button>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class SelecionarRestauranteComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly restaurantes = signal<RestauranteContexto[]>([
    {
      restauranteId: 'rest-01',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-01',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['inicio', 'estoque', 'fichas', 'producao', 'pedidos', 'entregadores', 'custeio', 'dashboard_operacional', 'dashboard_gerencial'],
    },
    {
      restauranteId: 'rest-02',
      nomeRestaurante: 'Burger House',
      cozinhaId: 'coz-02',
      nomeCozinha: 'Linha de churrasco',
      permissoes: ['inicio', 'pedidos', 'entregadores', 'dashboard_operacional'],
    },
    {
      restauranteId: 'rest-03',
      nomeRestaurante: 'Mamma Mia',
      cozinhaId: 'coz-03',
      nomeCozinha: 'Cozinha de produção',
      permissoes: ['inicio', 'estoque', 'fichas', 'producao', 'dashboard_gerencial'],
    },
  ]);

  protected selecionar(restaurante: RestauranteContexto): void {
    this.auth.selecionarRestaurante(restaurante);
    void this.router.navigate(['/inicio']);
  }
}
