import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface Tenant {
  id: string;
  nome: string;
}

interface LeituraGas {
  id: string;
  inquilino: string;
  tenantId: string;
  dataInicial: string;
  dataFinal: string;
  leituraInicial: number;
  leituraFinal: number;
  consumo: number;
  consumoKg: number;
  status: 'ok' | 'alerta' | 'atrasado';
  observacao: string;
}

@Component({
  selector: 'app-leitura-gas',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">// OPERAÇÃO</span>
      <h1 style="margin: 0; font-size: 2rem;">{{ tituloPagina() }}</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">{{ modoAbastecimento() ? 'Lançar abastecimento no sistema de gás' : modoControle() ? 'Consumo geral de gás' : 'Registrar nova medição' }}</h2>

        @if (modoAbastecimento() || modoControle()) {
          <div style="margin-bottom: var(--space-4); padding: var(--space-4); border: var(--hairline); border-radius: 10px; background: rgba(255,255,255,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); flex-wrap: wrap;">
              <strong style="font-size: 1rem;">Consumo geral do período</strong>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Inquilino
                <select class="c81-input" [(ngModel)]="form.tenantId" name="tenantSistema" (ngModelChange)="aoAlterarInquilino($event)">
                  <option value="">Todos</option>
                  @for (tenant of tenants(); track tenant.id) {
                    <option [value]="tenant.id">{{ tenant.nome }}</option>
                  }
                </select>
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data inicial
                <input class="c81-input" type="date" [(ngModel)]="periodoInicio" name="periodoInicio" />
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data final
                <input class="c81-input" type="date" [(ngModel)]="periodoFim" name="periodoFim" />
              </label>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: var(--space-3);">
              <button type="button" class="c81-btn c81-btn--primary" (click)="atualizarPeriodo()">Atualizar</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4);">
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Consumo geral</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ totalConsumoPeriodo.toFixed(2) }} m³</div>
            </div>
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Consumo geral / Kg</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ totalConsumoPeriodoKg.toFixed(2) }} kg</div>
            </div>
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Registros do período</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ leiturasDoPeriodo().length }}</div>
            </div>
          </div>
        }

        @if (modoAbastecimento() || modoControle()) {
          <p style="margin: 0 0 var(--space-4); color: var(--text-secondary);">Use este painel para acompanhar o consumo geral do período e registrar o abastecimento realizado.</p>
        }

        @if (!modoAbastecimento() && !modoControle()) {
          <div style="margin-bottom: var(--space-4); padding: var(--space-4); border: var(--hairline); border-radius: 10px; background: rgba(255,255,255,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); flex-wrap: wrap;">
              <strong style="font-size: 1rem;">Filtrar histórico por período</strong>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data inicial
                <input class="c81-input" type="date" [(ngModel)]="periodoInicio" name="periodoInicioLeitura" />
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data final
                <input class="c81-input" type="date" [(ngModel)]="periodoFim" name="periodoFimLeitura" />
              </label>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-3); flex-wrap: wrap;">
              <button type="button" class="c81-btn c81-btn--secondary" (click)="limparFiltrosSistema()">Limpar filtros</button>
              <button type="button" class="c81-btn c81-btn--secondary" (click)="aplicarPeriodoAtual()">Este mês</button>
              <button type="button" class="c81-btn c81-btn--secondary" (click)="aplicarPeriodoUltimos30Dias()">Últimos 30 dias</button>
              <button type="button" class="c81-btn c81-btn--primary" (click)="atualizarPeriodo()">Atualizar</button>
            </div>
          </div>

          <form (submit)="salvar($event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
            @if (!modoAbastecimento()) {
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Inquilino
                <select class="c81-input" [(ngModel)]="form.tenantId" name="tenantId" required (ngModelChange)="aoAlterarInquilino($event)">
                  <option value="">Selecione o inquilino</option>
                  @for (tenant of tenants(); track tenant.id) {
                    <option [value]="tenant.id">{{ tenant.nome }}</option>
                  }
                </select>
              </label>
            }

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              {{ modoAbastecimento() ? 'Data do abastecimento' : 'Data da leitura inicial' }}
              <input class="c81-input" type="date" [(ngModel)]="form.dataInicial" name="dataInicial" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              {{ modoAbastecimento() ? 'Leitura antes' : 'Leitura inicial (m³)' }}
              <input class="c81-input" type="number" step="0.01" [(ngModel)]="form.leituraInicial" name="leituraInicial" required />
            </label>

            @if (!modoAbastecimento()) {
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data da leitura final
                <input class="c81-input" type="date" [(ngModel)]="form.dataFinal" name="dataFinal" required />
              </label>

              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Leitura final (m³)
                <input class="c81-input" type="number" step="0.01" [(ngModel)]="form.leituraFinal" name="leituraFinal" required />
              </label>
            } @else {
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Leitura depois
                <input class="c81-input" type="number" step="0.01" [(ngModel)]="form.leituraFinal" name="leituraFinal" required />
              </label>

              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Quantidade abastecida
                <input class="c81-input" type="text" [value]="quantidadeAbastecida.toFixed(2) + ' m³'" readonly />
              </label>
            }

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; grid-column: 1 / -1;">
              Observação
              <textarea class="c81-input" rows="3" [(ngModel)]="form.observacao" name="observacao" placeholder="Observações da medição, ajuste de equipamento, etc."></textarea>
            </label>

            <div style="grid-column: 1 / -1; display: flex; gap: var(--space-3);">
              <c81-button type="submit" variant="primary">{{ modoAbastecimento() ? 'Lançar abastecimento' : 'Salvar medição' }}</c81-button>
              <c81-button type="button" variant="ghost" (click)="limparFormulario()">Limpar</c81-button>
            </div>
          </form>
        }

        @if (modoAbastecimento()) {
          <form (submit)="salvar($event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
            @if (!modoAbastecimento()) {
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Inquilino
                <select class="c81-input" [(ngModel)]="form.tenantId" name="tenantId" required (ngModelChange)="aoAlterarInquilino($event)">
                  <option value="">Selecione o inquilino</option>
                  @for (tenant of tenants(); track tenant.id) {
                    <option [value]="tenant.id">{{ tenant.nome }}</option>
                  }
                </select>
              </label>
            }

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Data do abastecimento
              <input class="c81-input" type="date" [(ngModel)]="form.dataInicial" name="dataInicial" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Leitura antes
              <input class="c81-input" type="number" step="0.01" [(ngModel)]="form.leituraInicial" name="leituraInicial" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Leitura depois
              <input class="c81-input" type="number" step="0.01" [(ngModel)]="form.leituraFinal" name="leituraFinal" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Quantidade abastecida
              <input class="c81-input" type="text" [value]="quantidadeAbastecida.toFixed(2) + ' m³'" readonly />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; grid-column: 1 / -1;">
              Observação
              <textarea class="c81-input" rows="3" [(ngModel)]="form.observacao" name="observacao" placeholder="Observações da medição, ajuste de equipamento, etc."></textarea>
            </label>

            <div style="grid-column: 1 / -1; display: flex; gap: var(--space-3);">
              <c81-button type="submit" variant="primary">Lançar abastecimento</c81-button>
              <c81-button type="button" variant="ghost" (click)="limparFormulario()">Limpar</c81-button>
            </div>
          </form>
        }
      </c81-card>

      <c81-card [pad]="true">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap;">
          <h2 style="margin: 0;">Histórico por inquilino</h2>
          <span style="color: var(--text-secondary); font-size: 0.9rem;">{{ leiturasDoPeriodo().length }} registros</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4);">
          <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Total do período</div>
            <div style="font-size: 1.4rem; font-weight: 700; margin-top: var(--space-1);">{{ totalConsumoPeriodo.toFixed(2) }} m³</div>
          </div>
          <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Consumo em kg</div>
            <div style="font-size: 1.4rem; font-weight: 700; margin-top: var(--space-1);">{{ totalConsumoPeriodoKg.toFixed(2) }} kg</div>
          </div>
          <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Registros</div>
            <div style="font-size: 1.4rem; font-weight: 700; margin-top: var(--space-1);">{{ leiturasDoPeriodo().length }}</div>
          </div>
        </div>

        @if (leiturasDoPeriodo().length === 0) {
          <p style="margin: 0; color: var(--text-secondary);">Nenhuma medição registrada.</p>
        } @else {
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr auto; gap: var(--space-3); align-items: center; padding: 0 var(--space-3) var(--space-2); color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; border-bottom: var(--hairline);">
              <div>Nome do inquilino</div>
              <div>Data da leitura</div>
              <div>Leitura inicial</div>
              <div>Leitura final</div>
              <div>Consumo kg</div>
              <div>Ação</div>
            </div>
            @for (item of leiturasDoPeriodo(); track item.id) {
              <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr auto; gap: var(--space-3); align-items: center; padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div><strong>{{ item.inquilino }}</strong></div>
                <div>{{ formatarData(item.dataFinal) }}</div>
                <div>{{ item.leituraInicial.toFixed(2) }} m³</div>
                <div>{{ item.leituraFinal.toFixed(2) }} m³</div>
                <div>{{ item.consumoKg.toFixed(2) }} kg</div>
                <div>
                  <c81-button size="sm" variant="danger" type="button" (click)="excluirLeitura(item.tenantId, item.id)">Excluir</c81-button>
                </div>
              </div>
            }
          </div>
        }
      </c81-card>
    </div>
  `,
})
export class LeituraGasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly fatorConversaoKgPorM3 = 0.75;

  protected readonly tituloPagina = signal('Leitura de Gás por Inquilino');
  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly leituras = signal<LeituraGas[]>([]);
  protected readonly leiturasDoPeriodo = signal<LeituraGas[]>([]);
  protected readonly modoAbastecimento = signal(false);
  protected readonly modoControle = signal(false);

  protected form = {
    tenantId: '',
    dataInicial: '',
    leituraInicial: '',
    dataFinal: '',
    leituraFinal: '',
    observacao: '',
  };

  protected periodoInicio = '';
  protected periodoFim = '';
  protected periodoAplicadoInicio = '';
  protected periodoAplicadoFim = '';

  ngOnInit(): void {
    const modo = this.route.snapshot.data['gasMode'] ?? 'leitura';
    const ehAbastecimento = modo === 'abastecimento';
    const ehControle = modo === 'controle';
    this.modoAbastecimento.set(ehAbastecimento);
    this.modoControle.set(ehControle);
    this.tituloPagina.set(this.getTituloPorModo(modo));
    this.definirPeriodoPadrao();
    this.carregarInquilinos();
    this.carregarLeituras();
  }

  private definirPeriodoPadrao(): void {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    this.periodoInicio = inicio.toISOString().slice(0, 10);
    this.periodoFim = fim.toISOString().slice(0, 10);
    this.periodoAplicadoInicio = this.periodoInicio;
    this.periodoAplicadoFim = this.periodoFim;
  }

  private getTituloPorModo(modo: string): string {
    switch (modo) {
      case 'controle':
        return 'Consumo geral de Gás';
      case 'abastecimento':
        return 'Abastecimento de Gás';
      default:
        return 'Leitura de Gás por Inquilino';
    }
  }

  protected carregarInquilinos(): void {
    this.http.get<Tenant[] | null>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (response) => this.tenants.set(Array.isArray(response) ? response : []),
      error: () => this.tenants.set([]),
    });
  }

  protected aoAlterarInquilino(tenantId: string): void {
    this.form.tenantId = tenantId;
    this.form.dataInicial = '';
    this.form.leituraInicial = '';
    this.form.dataFinal = '';
    this.form.leituraFinal = '';
    this.form.observacao = '';
    if (this.modoAbastecimento()) {
      this.definirPeriodoPadrao();
    }
    this.carregarLeituras();
  }

  protected carregarLeituras(): void {
    if (this.modoAbastecimento() || this.modoControle()) {
      this.carregarLeiturasSistema();
      return;
    }

    if (!this.form.tenantId) {
      this.leituras.set([]);
      this.leiturasDoPeriodo.set([]);
      return;
    }

    this.http.get<Array<{ id: string; tenant_id: string; data_inicial: string; leitura_inicial: number; data_final: string; leitura_final: number; consumo_m3: number; observacao: string | null }> | null>(
      `${API_BASE}/backoffice/gas/tenant/${this.form.tenantId}`,
    ).subscribe({
      next: (dados) => {
        const lista = Array.isArray(dados) ? dados : [];
        const items = lista.map((item) => ({
          id: item.id,
          inquilino: this.obterNomeInquilino(item.tenant_id),
          tenantId: item.tenant_id,
          dataInicial: item.data_inicial,
          dataFinal: item.data_final,
          leituraInicial: Number(item.leitura_inicial),
          leituraFinal: Number(item.leitura_final),
          consumo: Number(item.consumo_m3),
          consumoKg: this.converterM3ParaKg(Number(item.consumo_m3)),
          status: this.avaliarStatus(Number(item.consumo_m3)),
          observacao: item.observacao ?? '',
        }));
        this.leituras.set(items);
        this.atualizarLeiturasDoPeriodo();
      },
      error: () => {
        this.leituras.set([]);
        this.leiturasDoPeriodo.set([]);
      },
    });
  }

  private carregarLeiturasSistema(): void {
    const params: Record<string, string> = {};

    if (this.form.tenantId) {
      params['tenantId'] = this.form.tenantId;
    }
    if (this.periodoAplicadoInicio) {
      params['dataInicio'] = this.periodoAplicadoInicio;
    }
    if (this.periodoAplicadoFim) {
      params['dataFim'] = this.periodoAplicadoFim;
    }

    this.http.get<Array<{ id: string; tenantId: string; nomeInquilino: string; dataLeitura: string; leituraInicial: number; leituraFinal: number; consumoKg: number }> | null>(
      `${API_BASE}/backoffice/gas/dashboard`,
      { params },
    ).subscribe({
      next: (dados) => {
        const lista = Array.isArray(dados) ? dados : [];
        const items = lista.map((item) => ({
          id: item.id,
          inquilino: item.nomeInquilino,
          tenantId: item.tenantId,
          dataInicial: item.dataLeitura,
          dataFinal: item.dataLeitura,
          leituraInicial: Number(item.leituraInicial),
          leituraFinal: Number(item.leituraFinal),
          consumo: Number((item.leituraFinal - item.leituraInicial) * 0.75),
          consumoKg: Number(item.consumoKg),
          status: this.avaliarStatus(Number(item.consumoKg)),
          observacao: '',
        }));
        this.leituras.set(items);
        this.atualizarLeiturasDoPeriodo();
      },
      error: () => {
        this.leituras.set([]);
        this.atualizarLeiturasDoPeriodo();
      },
    });
  }

  protected salvar(event: Event): void {
    event.preventDefault();

    if (!this.form.dataInicial || this.form.leituraInicial === '' || this.form.leituraFinal === '') {
      return;
    }

    const tenantIdParaSalvar = this.modoAbastecimento() ? (this.form.tenantId || this.tenants()[0]?.id || '') : this.form.tenantId;

    if (!tenantIdParaSalvar) {
      return;
    }

    const leituraInicialNumero = Number(this.form.leituraInicial);
    const leituraFinalNumero = Number(this.form.leituraFinal);
    const consumo = Number((leituraFinalNumero - leituraInicialNumero).toFixed(2));

    const payload = {
      tenantId: tenantIdParaSalvar,
      dataInicial: this.form.dataInicial,
      leituraInicial: leituraInicialNumero,
      dataFinal: this.modoAbastecimento() ? this.form.dataInicial : this.form.dataFinal,
      leituraFinal: leituraFinalNumero,
      observacao: this.form.observacao.trim(),
    };

    this.http.post(`${API_BASE}/backoffice/gas/leituras`, payload).subscribe({
      next: () => {
        const tenantIdAtual = this.form.tenantId;
        this.form = {
          tenantId: tenantIdAtual,
          dataInicial: '',
          leituraInicial: '',
          dataFinal: '',
          leituraFinal: '',
          observacao: '',
        };
        this.carregarLeituras();
      },
      error: () => {
        // sem bloqueio no frontend; apenas mantém o formulário consistente
      },
    });
  }

  protected limparFormulario(): void {
    this.form = {
      tenantId: this.form.tenantId,
      dataInicial: '',
      leituraInicial: '',
      dataFinal: '',
      leituraFinal: '',
      observacao: '',
    };
    if (this.modoAbastecimento()) {
      this.periodoInicio = '';
      this.periodoFim = '';
      this.atualizarLeiturasDoPeriodo();
    }
    if (this.form.tenantId) {
      this.carregarLeituras();
    }
  }

  protected atualizarPeriodo(): void {
    if (this.periodoInicio && this.periodoFim && this.periodoInicio > this.periodoFim) {
      const temp = this.periodoInicio;
      this.periodoInicio = this.periodoFim;
      this.periodoFim = temp;
    }

    this.periodoAplicadoInicio = this.periodoInicio;
    this.periodoAplicadoFim = this.periodoFim;
    this.atualizarLeiturasDoPeriodo();
    if (this.modoAbastecimento() || this.modoControle()) {
      this.carregarLeiturasSistema();
    }
  }

  protected limparFiltrosSistema(): void {
    this.form.tenantId = '';
    this.periodoInicio = '';
    this.periodoFim = '';
    this.periodoAplicadoInicio = '';
    this.periodoAplicadoFim = '';
    this.carregarLeituras();
  }

  protected aplicarPeriodoAtual(): void {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    this.periodoInicio = inicio.toISOString().slice(0, 10);
    this.periodoFim = fim.toISOString().slice(0, 10);
    this.periodoAplicadoInicio = this.periodoInicio;
    this.periodoAplicadoFim = this.periodoFim;
    this.atualizarLeiturasDoPeriodo();
    if (this.modoAbastecimento() || this.modoControle()) {
      this.carregarLeiturasSistema();
    }
  }

  protected aplicarPeriodoUltimos30Dias(): void {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 29);

    this.periodoInicio = inicio.toISOString().slice(0, 10);
    this.periodoFim = fim.toISOString().slice(0, 10);
    this.periodoAplicadoInicio = this.periodoInicio;
    this.periodoAplicadoFim = this.periodoFim;
    this.atualizarLeiturasDoPeriodo();
    if (this.modoAbastecimento() || this.modoControle()) {
      this.carregarLeiturasSistema();
    }
  }

  private atualizarLeiturasDoPeriodo(): void {
    const dados = this.leituras();
    const inicio = this.periodoAplicadoInicio ? new Date(`${this.periodoAplicadoInicio}T00:00:00`) : null;
    const fim = this.periodoAplicadoFim ? new Date(`${this.periodoAplicadoFim}T23:59:59.999`) : null;

    if (!inicio && !fim) {
      this.leiturasDoPeriodo.set(dados);
      return;
    }

    const filtradas = dados.filter((item) => {
      const dataInicial = new Date(`${item.dataInicial}T00:00:00`);
      const dataFinal = new Date(`${item.dataFinal}T23:59:59.999`);

      const dentroDoInicio = !inicio || dataFinal >= inicio;
      const dentroDoFim = !fim || dataInicial <= fim;
      return dentroDoInicio && dentroDoFim;
    });

    this.leiturasDoPeriodo.set(filtradas);
  }

  protected excluirLeitura(tenantId: string, id: string): void {
    if (!tenantId || !id) {
      return;
    }

    const confirmado = window.confirm('Deseja excluir esta leitura de gás?');
    if (!confirmado) {
      return;
    }

    this.http.delete(`${API_BASE}/backoffice/gas/tenant/${tenantId}/${id}`).subscribe({
      next: () => this.carregarLeituras(),
      error: () => this.carregarLeituras(),
    });
  }

  protected converterM3ParaKg(metrosCubicos: number): number {
    return Number((metrosCubicos * this.fatorConversaoKgPorM3).toFixed(2));
  }

  protected get totalConsumoPeriodo(): number {
    return this.leiturasDoPeriodo().reduce((total, item) => total + item.consumo, 0);
  }

  private obterLeiturasSistema(): LeituraGas[] {
    return this.leituras().filter((item) => item.tenantId === 'sistema' || item.inquilino === 'Sistema');
  }

  protected get totalConsumoPeriodoKg(): number {
    return this.leiturasDoPeriodo().reduce((total, item) => total + item.consumoKg, 0);
  }

  protected get quantidadeAbastecida(): number {
    if (this.form.leituraInicial === '' || this.form.leituraFinal === '') {
      return 0;
    }
    return Math.max(0, Number(this.form.leituraFinal) - Number(this.form.leituraInicial));
  }

  protected obterNomeInquilino(tenantId: string): string {
    return this.tenants().find((tenant) => tenant.id === tenantId)?.nome ?? 'Inquilino';
  }

  protected avaliarStatus(consumo: number): LeituraGas['status'] {
    if (consumo > 80) return 'alerta';
    if (consumo > 0) return 'ok';
    return 'atrasado';
  }

  protected statusLabel(status: LeituraGas['status']): string {
    switch (status) {
      case 'ok':
        return 'Normal';
      case 'alerta':
        return 'Alerta';
      case 'atrasado':
        return 'Atrasado';
      default:
        return 'Normal';
    }
  }

  protected statusCor(status: LeituraGas['status']): string {
    switch (status) {
      case 'ok':
        return 'var(--status-go)';
      case 'alerta':
        return 'var(--status-warn)';
      case 'atrasado':
        return 'var(--status-stop)';
      default:
        return 'var(--text-primary)';
    }
  }

  protected formatarData(dataIso: string): string {
    const data = new Date(dataIso);
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  }
}
