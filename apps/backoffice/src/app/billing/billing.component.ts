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
      <span class="c81-eyebrow">// FATURAMENTO</span>
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
          <h2 style="margin-bottom: var(--space-4);">Faturas Emitidas</h2>

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
