import { HttpClient } from '@angular/common/http';
import { Component, inject, type OnInit, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { API_BASE } from '../core/api.config';

interface CozinhaRow {
  id: string;
  nome: string;
  equipada: boolean;
  status?: 'liberada' | 'interditada';
  area_m2?: number | null;
}

interface InquilinoRow {
  id: string;
  nome: string;
  cozinhaId?: string | null;
}

interface ReservaRow {
  id: string;
  cozinha_id: string;
  tenant_id?: string;
  inicio?: string;
  fim?: string;
  modalidade?: string;
}

interface FaturaRow {
  id: string;
  tenant_id: string;
  status?: 'aberta' | 'paga' | 'vencida' | 'cancelada';
  valor_total?: number | string;
}

interface MetricCard {
  label: string;
  value: string;
  positive?: boolean;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  template: `
    <section class="hub-dashboard">
      <div class="eyebrow">dashboard do hub</div>
      <h1>Dashboard Cozinha81</h1>

      @if (isLoading()) {
        <div class="status-card">Carregando dados do banco...</div>
      } @else {
        <div class="stats-grid">
          @for (card of cards(); track card.label) {
            <article class="metric-card" [class.metric-card--positive]="card.positive">
              <span class="label">{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </article>
          }
        </div>

        <section class="panel-block">
          <div class="panel-heading">Resumo operacional</div>

          <div class="info-grid">
            <div class="info-card">
              <h3>Financeiro</h3>
              <ul>
                <li><span>Receita total</span><strong>{{ formatMoney(summary().receita) }}</strong></li>
                <li><span>Faturas em aberto</span><strong>{{ formatMoney(summary().custos) }}</strong></li>
                <li><span>Resultado</span><strong>{{ formatMoney(summary().resultado) }}</strong></li>
              </ul>
            </div>

            <div class="info-card">
              <h3>Operação</h3>
              <ul>
                <li><span>Inquilinos ativos</span><strong>{{ summary().inquilinosAtivos }}</strong></li>
                <li><span>Cozinhas liberadas</span><strong>{{ summary().cozinhasLiberadas }}</strong></li>
                <li><span>Ocupação atual</span><strong>{{ summary().ocupacao }}%</strong></li>
              </ul>
            </div>
          </div>
        </section>

        <section class="panel-block panel-block--compact">
          <div class="panel-heading">Alertas e pendências</div>
          <div class="alert-list">
            @for (item of alertItems(); track item) {
              <span>{{ item }}</span>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      color: var(--text-primary);
      font-family: var(--font-body);
      background: var(--bg-base);
    }

    .hub-dashboard {
      width: min(1480px, 100%);
      margin: 0 auto;
      padding: var(--space-5) var(--space-5) var(--space-6);
      background: transparent;
    }

    .eyebrow {
      color: var(--flame-500);
      font-family: var(--font-mono);
      font-size: 9px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin: 0 0 var(--space-2);
    }

    h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 1.5vw, 1.9rem);
      line-height: 1.08;
      letter-spacing: -0.04em;
      color: var(--text-primary);
    }

    .status-card {
      margin-top: var(--space-4);
      padding: var(--space-4) var(--space-5);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      background: var(--surface-card);
      color: var(--text-secondary);
      font-size: 0.92rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(180px, 1fr));
      gap: 0;
      margin-top: var(--space-4);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-card);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .metric-card {
      min-height: 108px;
      padding: var(--space-3) var(--space-3);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: var(--surface-card);
      border-right: 1px solid var(--border-default);
    }

    .metric-card:last-child {
      border-right: none;
    }

    .label {
      display: block;
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 8px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-bottom: var(--space-1);
    }

    .metric-card strong {
      font-family: var(--font-display);
      font-size: clamp(0.95rem, 1.1vw, 1.35rem);
      line-height: 1.1;
      letter-spacing: -0.04em;
      color: var(--text-primary);
    }

    .metric-card--positive strong {
      color: var(--status-ready);
    }

    .panel-block {
      margin-top: var(--space-5);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-card);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .panel-heading {
      padding: var(--space-2) var(--space-4);
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-default);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 8px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-height: 220px;
    }

    .info-card {
      padding: var(--space-4) var(--space-5);
      border-right: 1px solid var(--border-default);
      background: var(--surface-card);
    }

    .info-card:last-child {
      border-right: none;
    }

    .info-card h3 {
      margin: 0 0 var(--space-3);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .info-card ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .info-card li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-size: 0.82rem;
    }

    .info-card li:last-child {
      border-bottom: none;
    }

    .info-card li span {
      color: var(--text-secondary);
    }

    .info-card li strong {
      color: var(--text-primary);
      font-weight: var(--fw-semibold);
      font-size: 0.9rem;
    }

    .panel-block--compact {
      margin-top: var(--space-6);
    }

    @media (min-width: 1400px) {
      .hub-dashboard {
        width: min(1500px, 100%);
      }
    }

    .alert-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
    }

    .alert-list span {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-pill);
      background: var(--bg-subtle);
      color: var(--text-primary);
      font-size: 9px;
      line-height: 1;
    }

    @media (max-width: 920px) {
      .stats-grid {
        grid-template-columns: repeat(2, minmax(180px, 1fr));
      }

      .metric-card:nth-child(2n) {
        border-right: none;
      }
    }

    @media (max-width: 640px) {
      .info-grid {
        grid-template-columns: 1fr;
      }

      .info-card {
        border-right: none;
        border-bottom: 1px solid var(--border-default);
      }

      .info-card:last-child {
        border-bottom: none;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .metric-card {
        border-right: none;
        border-bottom: 1px solid var(--border-default);
      }

      .metric-card:last-child {
        border-bottom: none;
      }
    }
  `]
})
export class InicioComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly isLoading = signal(true);
  protected readonly cards = signal<MetricCard[]>([]);
  protected readonly summary = signal({
    receita: 0,
    custos: 0,
    resultado: 0,
    ocupacao: 0,
    inquilinosAtivos: 0,
    cozinhasLiberadas: 0,
  });
  protected readonly alertItems = signal<string[]>([]);

  ngOnInit(): void {
    this.carregarDados();
  }

  private carregarDados(): void {
    this.isLoading.set(true);

    forkJoin({
      cozinhas: this.http.get<CozinhaRow[]>(`${API_BASE}/backoffice/cozinhas`).pipe(catchError(() => of([]))),
      inquilinos: this.http.get<InquilinoRow[]>(`${API_BASE}/backoffice/inquilinos`).pipe(catchError(() => of([]))),
      reservas: this.http.get<ReservaRow[]>(`${API_BASE}/backoffice/reservas`).pipe(catchError(() => of([]))),
      faturas: this.http.get<FaturaRow[]>(`${API_BASE}/backoffice/billing`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ cozinhas, inquilinos, reservas, faturas }) => {
        const cozinhasNormalizadas = Array.from(new Map(
          cozinhas.map((cozinha) => [cozinha.id, {
            ...cozinha,
            status: cozinha.status ?? (cozinha.equipada ? 'liberada' : 'interditada'),
          }])
        ).values());

        const totalCozinhas = cozinhasNormalizadas.length;
        const cozinhasLiberadas = cozinhasNormalizadas.filter((cozinha) => this.isCozinhaLiberada(cozinha)).length;
        const reservasAtivas = reservas.filter((reserva) => {
          if (!reserva.inicio || !reserva.fim) return false;
          const inicio = new Date(reserva.inicio);
          const fim = new Date(reserva.fim);
          const agora = new Date();
          return inicio <= agora && fim >= agora;
        }).length;

        const receita = faturas.reduce((soma, fatura) => {
          const valorEmCentavos = Number(fatura.valor_total ?? 0);
          return soma + valorEmCentavos / 100;
        }, 0);

        const faturasEmAberto = faturas
          .filter((fatura) => !fatura.status || fatura.status === 'aberta' || fatura.status === 'vencida')
          .reduce((soma, fatura) => soma + (Number(fatura.valor_total ?? 0) / 100), 0);

        const resultado = receita - faturasEmAberto;
        const ocupacao = totalCozinhas > 0 ? Math.min(100, Math.max(0, Math.round((cozinhasLiberadas / totalCozinhas) * 100))) : 0;

        const summary = {
          receita,
          custos: faturasEmAberto,
          resultado,
          ocupacao,
          inquilinosAtivos: inquilinos.length,
          cozinhasLiberadas,
        };

        const alertItems = [
          `${totalCozinhas} cozinhas cadastradas`,
          `${cozinhasLiberadas} liberadas`,
          `${reservasAtivas} reservas ativas`,
          `${inquilinos.length} inquilinos ativos`,
        ];

        this.summary.set(summary);
        this.alertItems.set(alertItems);
        this.cards.set([
          { label: 'Cozinhas', value: String(totalCozinhas) },
          { label: 'Ocupação', value: `${ocupacao}%` },
          { label: 'Receita', value: this.formatMoney(receita), positive: true },
          { label: 'Em aberto', value: this.formatMoney(faturasEmAberto) },
          { label: 'Resultado', value: this.formatMoney(resultado), positive: resultado >= 0 },
        ]);
        this.isLoading.set(false);
      },
      error: () => {
        this.summary.set({ receita: 0, custos: 0, resultado: 0, ocupacao: 0, inquilinosAtivos: 0, cozinhasLiberadas: 0 });
        this.alertItems.set(['Sem dados disponíveis no momento']);
        this.cards.set([
          { label: 'Cozinhas', value: '0' },
          { label: 'Ocupação', value: '0%' },
          { label: 'Receita', value: 'R$ 0', positive: true },
          { label: 'Custos', value: 'R$ 0' },
          { label: 'Resultado', value: 'R$ 0', positive: true },
        ]);
        this.isLoading.set(false);
      },
    });
  }

  private isCozinhaLiberada(cozinha: CozinhaRow): boolean {
    const status = (cozinha.status ?? '').toString().trim().toLowerCase();
    if (status === 'liberada') return true;
    if (status === 'interditada') return false;
    return Boolean(cozinha.equipada);
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
}

