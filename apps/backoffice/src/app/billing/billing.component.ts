import { Component, inject, type OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface Tenant {
  id: string;
  nome: string;
}

interface FaturaItem {
  id: string;
  fatura_id: string;
  tipo: 'aluguel' | 'modulo' | 'consumo_material' | 'hora_extra' | 'multa';
  descricao: string;
  valor: number;
  origem_id: string | null;
  criado_em: string;
}

interface Fatura {
  id: string;
  tenant_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: 'aberta' | 'paga' | 'vencida' | 'cancelada';
  valor_total: number;
  criado_em: string;
  itens?: FaturaItem[];
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header" style="padding: var(--space-6);">
      <span class="c81-eyebrow">FATURAMENTO</span>
      <h1 class="c81-page-title" style="margin: 0; font-size: 2rem;">Cobranças e Faturas</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" class="c81-alert-danger" data-test="erro">{{ erro() }}</p>
      }
      @if (sucesso()) {
        <p role="status" class="c81-alert-success" data-test="sucesso">{{ sucesso() }}</p>
      }

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-6); align-items: start;">

        <!-- Gerador de Fatura -->
        <c81-card [raised]="true" [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">Gerar Fatura</h2>
          <form (submit)="gerar($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Inquilino
                <select class="c81-input" [(ngModel)]="form.tenantId" name="tenantId" required data-test="f-tenant">
                  <option value="">-- Selecione --</option>
                  @for (t of tenants(); track t.id) {
                    <option [value]="t.id">{{ t.nome }}</option>
                  }
                </select>
              </label>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Período início
                <input class="c81-input" type="date" [(ngModel)]="form.inicio" name="inicio" required data-test="f-inicio" />
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Período fim
                <input class="c81-input" type="date" [(ngModel)]="form.fim" name="fim" required data-test="f-fim" />
              </label>
            </div>

            <c81-button type="submit" variant="primary" [disabled]="processando()" data-test="f-gerar">
              {{ processando() ? 'Gerando...' : 'Gerar Fatura Consolidada' }}
            </c81-button>

          </form>
        </c81-card>

        <!-- Lista de Faturas -->
        <c81-card [pad]="true">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
            <h2 style="margin: 0;">Faturas Emitidas</h2>
            <c81-button type="button" variant="secondary" size="sm" (click)="gerarRelatorioImpressao()" data-test="btn-relatorio">
              Gerar relatório para impressão
            </c81-button>
          </div>

          <!-- Status Filter -->
          <div style="margin-bottom: var(--space-4); display: flex; gap: var(--space-2); align-items: center;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Filtrar por status:</span>
            <select class="c81-input" style="width: auto; padding: 4px var(--space-3);" [ngModel]="filtroStatus()" (ngModelChange)="filtroStatus.set($event)" data-test="filtro-status">
              <option value="todos">Todos</option>
              <option value="aberta">Aberta</option>
              <option value="paga">Paga</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          @if (carregando()) {
            <p>Carregando faturas...</p>
          } @else if (faturasFiltradas().length === 0) {
            <p style="color: var(--text-secondary);">Nenhuma fatura encontrada.</p>
          } @else {
            <div style="display: flex; flex-direction: column; gap: var(--space-3); max-height: 600px; overflow-y: auto;">
              @for (f of faturasFiltradas(); track f.id) {
                <div style="padding: var(--space-4); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02); cursor: pointer;"
                     (click)="expandirFatura(f)" data-test="fatura-row">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                    <strong>{{ obterTenantNome(f.tenant_id) }}</strong>
                    <span style="font-size: 0.8rem; padding: 2px 10px; border-radius: 4px; font-weight: 600;"
                          [style.background]="statusCor(f.status).bg"
                          [style.color]="statusCor(f.status).fg">
                      {{ f.status | uppercase }}
                    </span>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    {{ formatarData(f.periodo_inicio) }} → {{ formatarData(f.periodo_fim) }}
                  </div>
                  <div style="font-size: 1.2rem; font-weight: 700; margin-top: var(--space-2);">
                    {{ formatarReais(f.valor_total) }}
                  </div>

                  <!-- Detalhes expandidos -->
                  @if (faturaExpandida() === f.id && faturaDetalhe()) {
                    <div style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px dashed var(--border-subtle);" (click)="$event.stopPropagation()">
                      <h4 style="margin-top: 0; margin-bottom: var(--space-2);">Itens da Fatura</h4>
                      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        <thead>
                          <tr style="text-align: left; border-bottom: var(--hairline);">
                            <th style="padding: var(--space-1);">Tipo</th>
                            <th style="padding: var(--space-1);">Descrição</th>
                            <th style="padding: var(--space-1); text-align: right;">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of faturaDetalhe()!.itens; track item.id) {
                            <tr style="border-bottom: 1px dashed var(--border-subtle);">
                              <td style="padding: var(--space-1);">
                                <span style="font-size: 0.75rem; padding: 1px 6px; border-radius: 3px; background: rgba(99,102,241,0.15); color: #818cf8;">
                                  {{ item.tipo }}
                                </span>
                              </td>
                              <td style="padding: var(--space-1);">{{ item.descricao }}</td>
                              <td style="padding: var(--space-1); text-align: right; font-weight: 600;">{{ formatarReais(item.valor) }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>

                      @if (f.status === 'aberta') {
                        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-3);">
                          <c81-button variant="primary" size="sm" (click)="pagar(f.id)" data-test="btn-pagar">
                            Registrar Pagamento
                          </c81-button>
                          <c81-button variant="ghost" size="sm" (click)="cancelar(f.id)" data-test="btn-cancelar">
                            Cancelar
                          </c81-button>
                          <c81-button variant="ghost" size="sm" (click)="excluir(f.id)" data-test="btn-excluir">
                            Excluir
                          </c81-button>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </c81-card>

      </div>
    </div>
  `,
})
export class BillingComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly faturas = signal<Fatura[]>([]);
  protected readonly filtroStatus = signal<string>('todos');

  // Filtro computado reativo
  protected readonly faturasFiltradas = computed(() => {
    const status = this.filtroStatus();
    const lista = this.faturas();
    if (status === 'todos') return lista;
    return lista.filter((f) => f.status === status);
  });

  protected readonly faturaExpandida = signal<string | null>(null);
  protected readonly faturaDetalhe = signal<Fatura | null>(null);
  protected readonly carregando = signal(false);
  protected readonly processando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sucesso = signal<string | null>(null);

  protected form = {
    tenantId: '',
    inicio: '',
    fim: '',
  };

  ngOnInit(): void {
    this.carregarDados();
  }

  protected carregarDados(): void {
    this.carregando.set(true);

    this.http.get<Tenant[]>(`${API_BASE}/backoffice/inquilinos`).subscribe((tenants) => {
      this.tenants.set(tenants);
    });

    this.http.get<Fatura[]>(`${API_BASE}/backoffice/billing`).subscribe({
      next: (faturas) => {
        this.faturas.set(faturas);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Falha ao carregar faturas.');
        this.carregando.set(false);
      },
    });
  }

  protected gerar(event: Event): void {
    event.preventDefault();
    this.erro.set(null);
    this.sucesso.set(null);

    // Validações client-side estritas
    if (!this.form.tenantId || !this.form.inicio || !this.form.fim) {
      this.erro.set('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (new Date(this.form.inicio) > new Date(this.form.fim)) {
      this.erro.set('A data de início não pode ser posterior à data de fim.');
      return;
    }

    this.processando.set(true);

    const payload = {
      tenantId: this.form.tenantId,
      inicio: new Date(this.form.inicio).toISOString(),
      fim: new Date(this.form.fim).toISOString(),
    };

    this.http.post<Fatura>(`${API_BASE}/backoffice/billing/gerar`, payload).subscribe({
      next: (f) => {
        this.processando.set(false);
        this.sucesso.set(`Fatura gerada com sucesso: ${this.formatarReais(f.valor_total)}`);
        this.carregarDados();
      },
      error: (e) => {
        this.processando.set(false);
        this.erro.set(e?.error?.message ?? 'Falha ao gerar fatura.');
      },
    });
  }

  protected expandirFatura(f: Fatura): void {
    if (this.faturaExpandida() === f.id) {
      this.faturaExpandida.set(null);
      this.faturaDetalhe.set(null);
      return;
    }
    this.faturaExpandida.set(f.id);
    this.http.get<Fatura>(`${API_BASE}/backoffice/billing/${f.id}`).subscribe({
      next: (detalhe) => this.faturaDetalhe.set(detalhe),
      error: () => this.erro.set('Falha ao carregar detalhes da fatura.'),
    });
  }

  protected pagar(faturaId: string): void {
    this.http.post<Fatura>(`${API_BASE}/backoffice/billing/${faturaId}/pagar`, {}).subscribe({
      next: () => {
        this.sucesso.set('Pagamento registrado com sucesso.');
        this.carregarDados();
        this.faturaExpandida.set(null);
        this.faturaDetalhe.set(null);
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao registrar pagamento.'),
    });
  }

  protected cancelar(faturaId: string): void {
    this.http.post<Fatura>(`${API_BASE}/backoffice/billing/${faturaId}/cancelar`, {}).subscribe({
      next: () => {
        this.sucesso.set('Fatura cancelada.');
        this.carregarDados();
        this.faturaExpandida.set(null);
        this.faturaDetalhe.set(null);
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao cancelar fatura.'),
    });
  }

  protected excluir(faturaId: string): void {
    this.http.delete<Fatura>(`${API_BASE}/backoffice/billing/${faturaId}`).subscribe({
      next: () => {
        this.sucesso.set('Fatura excluída.');
        this.carregarDados();
        this.faturaExpandida.set(null);
        this.faturaDetalhe.set(null);
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao excluir fatura.'),
    });
  }

  protected async gerarRelatorioImpressao(): Promise<void> {
    const relatorio = this.faturasFiltradas();

    if (relatorio.length === 0) {
      this.erro.set('Não há faturas para gerar o relatório de impressão.');
      return;
    }

    const relatorioDetalhado = await Promise.all(
      relatorio.map(async (fatura) => {
        try {
          const detalhe = await this.http.get<Fatura>(`${API_BASE}/backoffice/billing/${fatura.id}`).toPromise();
          return detalhe ?? fatura;
        } catch {
          return fatura;
        }
      }),
    );

    const total = relatorioDetalhado.reduce((soma, fatura) => soma + Number(fatura.valor_total || 0), 0);
    const linhas = relatorioDetalhado
      .map((fatura) => {
        const itens = (fatura.itens ?? [])
          .map(
            (item) => `
              <tr>
                <td>${item.tipo}</td>
                <td>${item.descricao}</td>
                <td>${this.formatarReais(item.valor)}</td>
              </tr>`,
          )
          .join('');

        return `
          <section class="fatura">
            <div class="cabecalho">
              <div>
                <strong>${this.obterTenantNome(fatura.tenant_id)}</strong>
                <div class="codigo">Fatura #${fatura.id.slice(0, 8)}</div>
              </div>
              <span class="status">${fatura.status.toUpperCase()}</span>
            </div>
            <div class="periodo">${this.formatarData(fatura.periodo_inicio)} → ${this.formatarData(fatura.periodo_fim)}</div>
            <div class="valor">${this.formatarReais(fatura.valor_total)}</div>
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>${itens || '<tr><td colspan="3">Sem itens detalhados.</td></tr>'}</tbody>
            </table>
          </section>`;
      })
      .join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      this.erro.set('O navegador bloqueou a abertura da janela de impressão.');
      return;
    }

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de faturamento</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            .topo-relatorio { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #f3f4f6; }
            .marca { display: flex; align-items: center; gap: 12px; }
            .logo-wrap { display: flex; align-items: center; justify-content: center; }
            .logo-wrap svg { width: 300px; height: auto; display: block; }
            .marca-subtexto { font-size: 11px; color: #6b7280; letter-spacing: 0.14em; text-transform: uppercase; }
            h1 { margin: 0; font-size: 1.8rem; }
            .resumo { display: flex; justify-content: space-between; padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 24px; }
            .codigo { font-size: 11px; color: #6b7280; margin-top: 2px; }
            .fatura { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
            .cabecalho { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
            .status { font-size: 12px; font-weight: 700; padding: 4px 8px; background: #eef2ff; border-radius: 999px; }
            .periodo { color: #6b7280; font-size: 12px; margin-bottom: 8px; }
            .valor { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
            th { background: #f9fafb; }
            .rodape { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; display: flex; justify-content: flex-end; }
            @media print { body { margin: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="topo-relatorio">
            <div class="marca">
              <div class="logo-wrap" aria-label="Cozinha81 logo">
                <svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cozinha81">
                  <path fill-rule="evenodd" fill="#1A1A1A" d="M 31 25 A 11 11 0 1 1 9 25 A 11 11 0 1 1 31 25 Z M 25 25 A  5  5 0 1 1 15 25 A  5  5 0 1 1 25 25 Z M 31 55 A 11 11 0 1 1 9 55 A 11 11 0 1 1 31 55 Z M 25 55 A  5  5 0 1 1 15 55 A  5  5 0 1 1 25 55 Z M 59 55 A 11 11 0 1 1 37 55 A 11 11 0 1 1 59 55 Z M 53 55 A  5  5 0 1 1 43 55 A  5  5 0 1 1 53 55 Z"></path>
                  <circle cx="20" cy="25" r="2.5" fill="#1A1A1A"></circle>
                  <circle cx="20" cy="55" r="2.5" fill="#1A1A1A"></circle>
                  <circle cx="48" cy="55" r="2.5" fill="#1A1A1A"></circle>
                  <path fill-rule="evenodd" fill="#C4520A" d="M 59 25 A 11 11 0 1 1 37 25 A 11 11 0 1 1 59 25 Z M 53 25 A  5  5 0 1 1 43 25 A  5  5 0 1 1 53 25 Z"></path>
                  <circle cx="48" cy="25" r="2.5" fill="#C4520A"></circle>
                  <line x1="73" y1="14" x2="73" y2="66" stroke="#E0E0E0" stroke-width="1"></line>
                  <text x="85" y="43" font-family="'Archivo','Arial Black',sans-serif" font-size="22" font-weight="900" letter-spacing="0.5"><tspan fill="#1A1A1A">COZINHA</tspan><tspan fill="#C4520A">81</tspan></text>
                  <text x="85" y="60" font-family="'Archivo',Arial,sans-serif" font-size="8" font-weight="400" fill="#9B968C" letter-spacing="3.5">COZINHAS PROFISSIONAIS</text>
                </svg>
              </div>
            </div>
            <h1>Relatório de faturamento</h1>
          </div>
          <div class="resumo">
            <span>Faturas no relatório</span>
            <strong>${relatorioDetalhado.length}</strong>
          </div>
          <div class="resumo">
            <span>Total consolidado</span>
            <strong>${this.formatarReais(total)}</strong>
          </div>
          ${linhas}
          <div class="rodape">Emitido em: ${new Date().toLocaleString('pt-BR')}</div>
        </body>
      </html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  protected obterTenantNome(tenantId: string): string {
    const t = this.tenants().find((x) => x.id === tenantId);
    return t ? t.nome : 'Inquilino';
  }

  protected formatarData(iso: string): string {
    const d = new Date(iso);
    const zero = (n: number) => String(n).padStart(2, '0');
    return `${zero(d.getDate())}/${zero(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  protected formatarReais(centavos: number): string {
    const valor = Number(centavos) / 100;
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  protected statusCor(status: string): { bg: string; fg: string } {
    switch (status) {
      case 'aberta':    return { bg: 'rgba(251,191,36,0.2)', fg: '#f59e0b' };
      case 'paga':      return { bg: 'rgba(16,185,129,0.2)', fg: '#10b981' };
      case 'vencida':   return { bg: 'rgba(239,68,68,0.2)', fg: '#ef4444' };
      case 'cancelada': return { bg: 'rgba(107,114,128,0.2)', fg: '#6b7280' };
      default:          return { bg: 'rgba(107,114,128,0.1)', fg: '#9ca3af' };
    }
  }
}
