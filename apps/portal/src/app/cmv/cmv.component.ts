import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { type FichaResumo, FichaApiService } from '../fichas/ficha-api.service';
import { type CmvValorPeriodo, CmvApiService } from './cmv-api.service';

function reais(centavos?: string): string {
  if (centavos === undefined) return '—';
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Painel CMV (Épico 5) — só Dono/Admin (a rota/menu não aparecem ao Operador). */
@Component({
  selector: 'app-cmv',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header>
      <span class="c81-eyebrow">GESTÃO DE COZINHA</span>
      <h1 style="margin-top: var(--space-1);">CMV</h1>
    </header>

    <c81-card [pad]="true">
      <div style="display: flex; gap: var(--space-3); align-items: end;">
        <label>Competência
          <input class="c81-input" type="month" [(ngModel)]="competencia" name="competencia" (change)="carregarPeriodo()" data-test="competencia" />
        </label>
      </div>
      <div style="display: flex; gap: var(--space-6); margin-top: var(--space-3); flex-wrap: wrap;">
        <div>
          <span class="c81-eyebrow">CMV EM VALOR</span>
          <p data-test="cmv-valor" style="font-size: var(--text-2xl); font-variant-numeric: tabular-nums; margin: var(--space-1) 0 0;">
            {{ reais(periodo()?.cmvValorCentavos) }}
          </p>
        </div>
        <label>Faturamento bruto do período
          <input class="c81-input" type="number" [(ngModel)]="faturamento" name="fat" placeholder="centavos" data-test="faturamento" />
          <c81-button type="button" size="sm" variant="secondary" (click)="salvarFaturamento()" data-test="salvar-fat">Salvar</c81-button>
        </label>
      </div>

      <!-- Métrica-herói CMV% — accent ink+flame (UX-DR7) com tokens reais do DS -->
      <div data-test="cmv-percentual" data-accent="ink-flame"
           style="margin-top: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md, 8px); background: var(--ink); color: var(--text-inverse); border-left: 3px solid var(--flame-500);">
        <span class="c81-eyebrow" style="color: var(--text-inverse);">CMV%</span>
        <p style="font-size: var(--text-3xl); font-variant-numeric: tabular-nums; margin: var(--space-1) 0 0; color: var(--flame-500);">
          {{ periodo()?.cmvPercentual ? periodo()!.cmvPercentual + '%' : '—' }}
        </p>
        @if (periodo()?.faturamentoOrigem === 'pedidos') {
          <span class="c81-badge c81-badge--neutral">FATURAMENTO AUTOMÁTICO (PEDIDOS)</span>
        }
      </div>
    </c81-card>

    <c81-card [pad]="true">
      <h2>CMV unitário por ficha</h2>
      @if (fichas().length === 0) {
        <p>Nenhuma ficha cadastrada.</p>
      } @else {
        <table style="width: 100%; border-collapse: collapse;" data-test="tabela">
          <thead>
            <tr style="text-align: left; border-bottom: var(--hairline);">
              <th style="padding: var(--space-2);">Ficha</th>
              <th>CMV unitário</th>
            </tr>
          </thead>
          <tbody>
            @for (f of fichas(); track f.id) {
              <tr style="border-bottom: var(--hairline);" data-test="linha-cmv">
                <td style="padding: var(--space-2);">{{ f.nome }}</td>
                <td data-test="cmv-unitario" style="font-variant-numeric: tabular-nums;">{{ reais(cmv()[f.id]) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </c81-card>
  `,
})
export class CmvComponent implements OnInit {
  private readonly fichaApi = inject(FichaApiService);
  private readonly api = inject(CmvApiService);

  protected readonly fichas = signal<FichaResumo[]>([]);
  protected readonly cmv = signal<Record<string, string | undefined>>({});
  protected readonly periodo = signal<CmvValorPeriodo | null>(null);
  protected competencia = new Date().toISOString().slice(0, 7);
  protected faturamento: number | null = null;
  protected reais = reais;

  ngOnInit(): void {
    this.fichaApi.listar().subscribe({
      next: (fs) => {
        this.fichas.set(fs);
        for (const f of fs) {
          this.api.unitario(f.id).subscribe({
            next: (u) => this.cmv.update((m) => ({ ...m, [f.id]: u.cmvUnitarioCentavos })),
            error: () => undefined,
          });
        }
      },
      error: () => undefined,
    });
    this.carregarPeriodo();
  }

  protected carregarPeriodo(): void {
    if (!this.competencia) return;
    this.api.valorPeriodo(this.competencia).subscribe({
      next: (p) => {
        this.periodo.set(p);
        this.faturamento = p.faturamentoCentavos ? Number(p.faturamentoCentavos) : null;
      },
      error: () => this.periodo.set(null),
    });
  }

  protected salvarFaturamento(): void {
    if (this.faturamento === null || this.faturamento < 0) return;
    this.api.definirFaturamento(this.competencia, Number(this.faturamento)).subscribe({
      next: () => this.carregarPeriodo(),
      error: () => undefined,
    });
  }
}
