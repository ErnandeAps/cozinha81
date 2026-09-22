import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface Tenant {
  id: string;
  nome: string;
}

interface Fatura {
  id: string;
  tenant_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: 'aberta' | 'paga' | 'vencida' | 'cancelada';
  valor_total: number;
  criado_em: string;
}

interface MovimentoCaixa {
  id: string;
  tenant_id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data_lancamento: string;
  origem: 'fatura' | 'manual';
  fatura_id?: string | null;
  criado_em: string;
}

@Component({
  selector: 'app-fluxo-caixa',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, CardComponent],
  template: `
    <header style="padding: var(--space-6); display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
      <div>
        <span class="c81-eyebrow">FINANCEIRO</span>
        <h1 style="margin: 0; font-size: 2rem;">Fluxo de caixa</h1>
      </div>

      <c81-button type="button" variant="secondary" size="sm" (click)="gerarRelatorio()">Relatório</c81-button>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" class="c81-alert-danger">{{ erro() }}</p>
      }
      @if (sucesso()) {
        <p role="status" class="c81-alert-success">{{ sucesso() }}</p>
      }

      <c81-card [pad]="true">
        <div style="display: flex; justify-content: space-between; align-items: end; gap: var(--space-3); flex-wrap: wrap;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">Período</div>
            <h3 style="margin: var(--space-2) 0 0;">Resumo do caixa</h3>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: var(--space-2); font-size: 0.8rem; color: var(--text-secondary);">
              Início
              <input class="c81-input" type="date" [ngModel]="filtroInicio()" (ngModelChange)="filtroInicio.set($event)" name="filtroInicio" />
            </label>
            <label style="display: flex; align-items: center; gap: var(--space-2); font-size: 0.8rem; color: var(--text-secondary);">
              Fim
              <input class="c81-input" type="date" [ngModel]="filtroFim()" (ngModelChange)="filtroFim.set($event)" name="filtroFim" />
            </label>
            <c81-button type="button" variant="secondary" size="sm" (click)="aplicarFiltro()">Aplicar</c81-button>
            <c81-button type="button" variant="ghost" size="sm" (click)="limparFiltro()">Limpar</c81-button>
          </div>
        </div>
      </c81-card>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4);">
        <c81-card [pad]="true">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">Saldo atual</div>
          <div style="font-size: 2rem; font-weight: 800; margin-top: var(--space-2);">{{ formatarMoeda(saldo()) }}</div>
        </c81-card>

        <c81-card [pad]="true">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">Entradas</div>
          <div style="font-size: 1.8rem; font-weight: 700; margin-top: var(--space-2); color: #22c55e;">{{ formatarMoeda(totalEntradas()) }}</div>
        </c81-card>

        <c81-card [pad]="true">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">Saídas</div>
          <div style="font-size: 1.8rem; font-weight: 700; margin-top: var(--space-2); color: #ef4444;">{{ formatarMoeda(totalSaidas()) }}</div>
        </c81-card>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); align-items: start;">
        <c81-card [pad]="true">
          <h2 style="margin: 0 0 var(--space-4);">Receber faturas</h2>

          @if (carregando()) {
            <p>Carregando faturas...</p>
          } @else if (faturasAbertas().length === 0) {
            <p style="color: var(--text-secondary);">Nenhuma fatura aberta para recebimento.</p>
          } @else {
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              @for (fatura of faturasAbertas(); track fatura.id) {
                <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);">
                  <div>
                    <div style="font-weight: 700;">{{ formatarTenant(fatura.tenant_id) }}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">{{ formatarData(fatura.periodo_inicio) }} → {{ formatarData(fatura.periodo_fim) }}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: var(--space-3);">
                    <strong>{{ formatarMoeda(fatura.valor_total) }}</strong>
                    <c81-button type="button" variant="primary" size="sm" (click)="receberFatura(fatura)">Receber</c81-button>
                  </div>
                </div>
              }
            </div>
          }
        </c81-card>

        <c81-card [pad]="true">
          <h2 style="margin: 0 0 var(--space-4);">Lançamentos manuais</h2>

          <form (submit)="adicionarLancamento($event)" style="display: flex; flex-direction: column; gap: var(--space-3);">
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Tipo
              <select class="c81-input" [(ngModel)]="form.tipo" name="tipo">
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Descrição
              <input class="c81-input" type="text" [(ngModel)]="form.descricao" name="descricao" placeholder="Ex.: venda, pagamento, manutenção..." required />
            </label>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Valor
                <input
                  class="c81-input"
                  type="text"
                  inputmode="decimal"
                  [ngModel]="form.valor"
                  (ngModelChange)="form.valor = formatarValorInput($event)"
                  name="valor"
                  placeholder="R$ 2.000,00"
                  required
                />
              </label>

              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data
                <input class="c81-input" type="date" [(ngModel)]="form.data" name="data" required />
              </label>
            </div>

            <c81-button type="submit" variant="primary">Lançar</c81-button>
          </form>

          <div style="margin-top: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-3);">Últimos lançamentos</h3>
            @if (movimentos().length === 0) {
              <p style="color: var(--text-secondary);">Nenhum lançamento registrado.</p>
            } @else {
              <div style="display: flex; flex-direction: column; gap: var(--space-2); max-height: 330px; overflow-y: auto;">
                @for (movimento of movimentosFiltrados(); track movimento.id) {
                  <div style="padding: var(--space-2) var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; gap: var(--space-2);">
                    <div>
                      <div style="font-weight: 600;">{{ movimento.descricao }}</div>
                      <div style="font-size: 0.75rem; color: var(--text-secondary);">{{ movimento.tipo | uppercase }} • {{ formatarData(movimento.data_lancamento) }}</div>
                    </div>
                    <strong [style.color]="movimento.tipo === 'entrada' ? '#22c55e' : '#ef4444'">{{ movimento.tipo === 'entrada' ? '+' : '-' }}{{ formatarMoeda(movimento.valor) }}</strong>
                  </div>
                }
              </div>
            }
          </div>
        </c81-card>
      </div>
    </div>
  `,
})
export class FluxoCaixaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'cozinha81-fluxo-caixa';

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly faturas = signal<Fatura[]>([]);
  protected readonly movimentos = signal<MovimentoCaixa[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sucesso = signal<string | null>(null);
  protected readonly filtroInicio = signal('');
  protected readonly filtroFim = signal('');

  protected form = {
    tenantId: '',
    tipo: 'entrada',
    descricao: '',
    valor: '',
    data: new Date().toISOString().slice(0, 10),
  };

  protected readonly faturasAbertas = computed(() =>
    this.faturas().filter((fatura) => fatura.status === 'aberta' || fatura.status === 'vencida'),
  );

  protected readonly movimentosFiltrados = computed(() => {
    const inicio = this.filtroInicio();
    const fim = this.filtroFim();

    return this.movimentos().filter((movimento) => {
      const data = new Date(movimento.data_lancamento);
      const inicioTs = inicio ? new Date(`${inicio}T00:00:00Z`).getTime() : Number.NEGATIVE_INFINITY;
      const fimTs = fim ? new Date(`${fim}T23:59:59Z`).getTime() : Number.POSITIVE_INFINITY;

      return data.getTime() >= inicioTs && data.getTime() <= fimTs;
    });
  });

  protected readonly totalEntradas = computed(() =>
    this.movimentosFiltrados()
      .filter((m) => m.tipo === 'entrada')
      .reduce((soma, m) => soma + Number(m.valor || 0), 0),
  );

  protected readonly totalSaidas = computed(() =>
    this.movimentosFiltrados()
      .filter((m) => m.tipo === 'saida')
      .reduce((soma, m) => soma + Number(m.valor || 0), 0),
  );

  protected readonly saldo = computed(() => this.totalEntradas() - this.totalSaidas());

  ngOnInit(): void {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    this.filtroInicio.set(inicioMes.toISOString().slice(0, 10));
    this.filtroFim.set(fimMes.toISOString().slice(0, 10));

    this.carregarInquilinos();
    this.carregarFaturas();
    this.carregarMovimentos();
  }

  protected aplicarFiltro(): void {
    this.carregarMovimentos();
  }

  protected limparFiltro(): void {
    this.filtroInicio.set('');
    this.filtroFim.set('');
    this.carregarMovimentos();
  }

  protected gerarRelatorio(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const movimentos = this.movimentosFiltrados();
    const inicio = this.filtroInicio() || '—';
    const fim = this.filtroFim() || '—';
    const entradas = movimentos.filter((m) => m.tipo === 'entrada').reduce((soma, m) => soma + Number(m.valor || 0), 0);
    const saidas = movimentos.filter((m) => m.tipo === 'saida').reduce((soma, m) => soma + Number(m.valor || 0), 0);
    const saldo = entradas - saidas;

    const linhas = movimentos.length === 0
      ? '<tr><td colspan="4" style="padding:12px; text-align:center;">Nenhum lançamento no período.</td></tr>'
      : movimentos
          .map((movimento) => {
            const tipo = movimento.tipo === 'entrada' ? 'Entrada' : 'Saída';
            const valor = this.formatarMoeda(movimento.valor);
            return `
              <tr>
                <td style="padding: 10px 12px; border-bottom:1px solid #e5e7eb;">${this.formatarData(movimento.data_lancamento)}</td>
                <td style="padding: 10px 12px; border-bottom:1px solid #e5e7eb;">${tipo}</td>
                <td style="padding: 10px 12px; border-bottom:1px solid #e5e7eb;">${movimento.descricao}</td>
                <td style="padding: 10px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">${valor}</td>
              </tr>
            `;
          })
          .join('');

    const html = `
      <html>
        <head>
          <title>Relatório de Fluxo de Caixa</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .meta { margin-bottom: 24px; color: #374151; }
            .resumo { display: grid; grid-template-columns: repeat(3, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
            .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; }
            .value { font-size: 18px; font-weight: 700; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; background: #f3f4f6; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
            td { vertical-align: top; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Relatório de fluxo de caixa</h1>
          <div class="meta">Período: ${inicio} até ${fim}</div>

          <div class="resumo">
            <div class="box">
              <div class="label">Entradas</div>
              <div class="value">${this.formatarMoeda(entradas)}</div>
            </div>
            <div class="box">
              <div class="label">Saídas</div>
              <div class="value">${this.formatarMoeda(saidas)}</div>
            </div>
            <div class="box">
              <div class="label">Saldo</div>
              <div class="value">${this.formatarMoeda(saldo)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th style="text-align:right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) {
      return;
    }

    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 200);
  }

  protected carregarInquilinos(): void {
    this.http.get<Tenant[]>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (tenants) => {
        this.tenants.set(tenants);
        if (!this.form.tenantId && tenants[0]?.id) {
          this.form.tenantId = tenants[0].id;
        }
      },
      error: () => {
        this.erro.set('Falha ao carregar inquilinos.');
      },
    });
  }

  protected carregarFaturas(): void {
    this.carregando.set(true);
    this.http.get<Fatura[]>(`${API_BASE}/backoffice/billing`).subscribe({
      next: (faturas) => {
        this.faturas.set(faturas);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Falha ao carregar faturas para recebimento.');
        this.carregando.set(false);
      },
    });
  }

  protected carregarMovimentos(): void {
    const params: Record<string, string> = {};

    if (this.filtroInicio()) {
      params['inicio'] = this.filtroInicio();
    }

    if (this.filtroFim()) {
      params['fim'] = this.filtroFim();
    }

    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE}/backoffice/billing/fluxo-caixa?${query}` : `${API_BASE}/backoffice/billing/fluxo-caixa`;

    this.http.get<MovimentoCaixa[]>(url).subscribe({
      next: (movimentos) => {
        this.movimentos.set(Array.isArray(movimentos) ? movimentos : []);
      },
      error: () => {
        this.movimentos.set([]);
      },
    });
  }

  protected receberFatura(fatura: Fatura): void {
    this.http.post<Fatura>(`${API_BASE}/backoffice/billing/${fatura.id}/pagar`, {}).subscribe({
      next: () => {
        this.sucesso.set(`Recebimento registrado: ${this.formatarMoeda(fatura.valor_total)}`);
        this.erro.set(null);
        this.carregarFaturas();
        this.carregarMovimentos();
      },
      error: () => {
        this.erro.set('Não foi possível registrar o recebimento da fatura.');
        this.sucesso.set(null);
      },
    });
  }

  protected adicionarLancamento(event: SubmitEvent): void {
    event.preventDefault();

    const dados = this.form;
    const valor = this.parseValorReais(String(dados.valor ?? '0'));

    if (!dados.descricao?.trim() || !Number.isFinite(valor) || valor <= 0) {
      this.erro.set('Informe descrição e valor válidos para o lançamento.');
      this.sucesso.set(null);
      return;
    }

    const payload = {
      tenantId: this.form.tenantId || this.tenants()[0]?.id || undefined,
      tipo: dados.tipo === 'saida' ? 'saida' : 'entrada',
      descricao: dados.descricao.trim(),
      valor,
      dataLancamento: dados.data || new Date().toISOString().slice(0, 10),
    };

    this.http.post<MovimentoCaixa>(`${API_BASE}/backoffice/billing/fluxo-caixa`, payload).subscribe({
      next: () => {
        this.form = {
          tenantId: payload.tenantId ?? '',
          tipo: 'entrada',
          descricao: '',
          valor: '',
          data: new Date().toISOString().slice(0, 10),
        };
        this.sucesso.set(`Lançamento ${payload.tipo} registrado com sucesso.`);
        this.erro.set(null);
        this.carregarMovimentos();
      },
      error: (e) => {
        this.erro.set(e?.error?.message ?? 'Não foi possível registrar o lançamento.');
        this.sucesso.set(null);
      },
    });
  }

  protected formatarValorInput(valor: string): string {
    const texto = String(valor ?? '').replace(/[^\d,]/g, '');
    if (!texto) return '';

    const [parteInteira, parteDecimal] = texto.split(',');
    const inteiro = (parteInteira ?? '').replace(/\D/g, '');
    const inteiroFormatado = inteiro ? Number(inteiro).toLocaleString('pt-BR') : '';

    if (!parteDecimal && !inteiro) return '';
    if (!parteDecimal) return inteiroFormatado;

    return `${inteiroFormatado},${parteDecimal.slice(0, 2)}`;
  }

  protected parseValorReais(valor: string): number {
    const numeric = String(valor ?? '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '');

    const numero = Number(numeric || 0);
    if (!Number.isFinite(numero)) {
      return 0;
    }

    return Math.round(numero * 100);
  }

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number.isFinite(valor) ? valor / 100 : 0);
  }

  protected formatarTenant(tenantId: string): string {
    return tenantId ? `Inquilino ${tenantId.slice(0, 8)}` : 'Inquilino';
  }

  protected formatarData(data: string): string {
    if (!data) {
      return '—';
    }
    const valor = new Date(data);
    if (Number.isNaN(valor.getTime())) {
      return data;
    }
    return valor.toLocaleDateString('pt-BR');
  }
}
