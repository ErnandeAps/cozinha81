import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { CusteioApiService, type CusteioConfig, type MetodoCusteio } from './custeio-api.service';

/**
 * Configuração do Método de Custeio (Story 3.1). Sem default silencioso: se não
 * houver método, exige escolha explícita antes de usar Fichas/custo.
 */
@Component({
  selector: 'app-custeio-config',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header>
      <span class="c81-eyebrow">GESTÃO DE COZINHA</span>
      <h1 style="margin-top: var(--space-1);">Método de Custeio</h1>
    </header>

    <c81-card [pad]="true" style="max-width: 560px;">
      @if (config(); as cfg) {
        <p data-test="atual">Método atual: <strong>{{ rotulo(cfg.metodo) }}</strong> (versão {{ cfg.versao }})</p>
      } @else {
        <p role="alert" style="color: var(--status-stop);" data-test="nao-definido">
          Você ainda não escolheu um método de custeio. Escolha um para liberar o cálculo de custo das Fichas.
        </p>
      }

      <form (submit)="salvar($event)" style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4);">
        <label style="display: flex; gap: var(--space-2);">
          <input type="radio" name="m" value="ultimo_preco" [(ngModel)]="escolha" data-test="op-ultimo" />
          Último preço de compra
        </label>
        <label style="display: flex; gap: var(--space-2);">
          <input type="radio" name="m" value="medio_ponderado" [(ngModel)]="escolha" data-test="op-medio" />
          Custo médio ponderado
        </label>
        @if (erro()) { <p role="alert" style="color: var(--status-stop);">{{ erro() }}</p> }
        <c81-button type="submit" variant="primary" [disabled]="!escolha" data-test="salvar">Salvar método</c81-button>
      </form>
    </c81-card>
  `,
})
export class CusteioConfigComponent implements OnInit {
  private readonly api = inject(CusteioApiService);

  protected readonly config = signal<CusteioConfig | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected escolha: MetodoCusteio | '' = '';

  ngOnInit(): void {
    this.api.obter().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        if (cfg) this.escolha = cfg.metodo;
      },
      error: () => this.config.set(null),
    });
  }

  protected rotulo(m: MetodoCusteio): string {
    return m === 'ultimo_preco' ? 'Último preço de compra' : 'Custo médio ponderado';
  }

  protected salvar(event: Event): void {
    event.preventDefault();
    if (!this.escolha) return;
    this.erro.set(null);
    this.api.definir(this.escolha).subscribe({
      next: (cfg) => this.config.set(cfg),
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao salvar.'),
    });
  }
}
