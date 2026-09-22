import { Component, inject, type OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface Cozinha {
  id: string;
  nome: string;
}

interface Tenant {
  id: string;
  nome: string;
}

type ModalidadeReserva = 'turno' | 'cafe' | 'almoco' | 'jantar' | 'personalizado' | 'dia';

interface Reserva {
  id: string;
  tenant_id: string;
  cozinha_id: string;
  inicio: string;
  fim: string;
  modalidade: ModalidadeReserva;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header" style="padding: var(--space-6);">
      <span class="c81-eyebrow">AGENDA E RESERVAS</span>
      <h1 class="c81-page-title" style="margin: 0; font-size: 2rem;">Reservas</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" class="c81-alert-danger" data-test="erro">{{ erro() }}</p>
      }

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: var(--space-6); align-items: start;">
        
        <!-- Reservations List & Grid -->
        <c81-card [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">Agenda de Ocupação por Cozinha</h2>
          
          @if (carregando()) {
            <p>Carregando agenda...</p>
          } @else {
            @for (coz of cozinhas(); track coz.id) {
              <div style="margin-bottom: var(--space-6); padding: var(--space-4); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <h3 style="margin-top: 0; border-bottom: var(--hairline); padding-bottom: var(--space-2); display: flex; justify-content: space-between;">
                  <span>{{ coz.nome }}</span>
                  <span style="font-size: 0.85rem; color: var(--text-secondary);">
                    {{ obterReservasDaCozinha(coz.id).length }} reserva(s)
                  </span>
                </h3>

                @if (obterReservasDaCozinha(coz.id).length === 0) {
                  <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Disponível (sem reservas).</p>
                } @else {
                  <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                    <div style="display: grid; grid-template-columns: 1.5fr 1fr 0.7fr 2fr auto; gap: var(--space-3); padding: 0 var(--space-3) var(--space-1); font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;">
                      <span>Inquilino</span>
                      <span>Modalidade</span>
                      <span>Qtd H.</span>
                      <span>Permanência</span>
                      <span style="text-align: right;">Ações</span>
                    </div>

                    @for (res of obterReservasDaCozinha(coz.id); track res.id) {
                      <div style="display: grid; grid-template-columns: 1.5fr 1fr 0.7fr 2fr auto; gap: var(--space-3); align-items: center; padding: var(--space-2) var(--space-3); background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 0.9rem;">
                        <strong>{{ obterTenantNome(res.tenant_id) }}</strong>
                        <span style="color: var(--text-secondary);">{{ res.modalidade | titlecase }}</span>
                        <span style="font-weight: 600;">{{ obterDuracaoHoras(res.inicio, res.fim) }}</span>
                        <span style="font-size: 0.85rem;">{{ formatarIntervalo(res.inicio, res.fim) }}</span>
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2);">
                          <c81-button size="sm" variant="secondary" (click)="abrirEdicao(res)">Editar</c81-button>
                          <c81-button size="sm" variant="danger" (click)="removerReserva(res.id)">Excluir</c81-button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        </c81-card>

        <!-- New Booking Form with Overbooking check -->
        <c81-card [raised]="true" [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">{{ reservaEditandoId() ? 'Editar Reserva / Contrato' : 'Nova Reserva / Contrato' }}</h2>
          <form (submit)="salvarReserva($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
            
            <!-- Cozinha Selection -->
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Selecione a Cozinha
                <select class="c81-input" [(ngModel)]="form.cozinhaId" name="cozinhaId" required (change)="verificarConflitos()" data-test="f-cozinha">
                  <option value="">-- Escolha uma cozinha --</option>
                  @for (coz of cozinhas(); track coz.id) {
                    <option [value]="coz.id">{{ coz.nome }}</option>
                  }
                </select>
              </label>
            </div>

            <!-- Inquilino Selection -->
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Selecione o Inquilino
                <select class="c81-input" [(ngModel)]="form.tenantId" name="tenantId" required data-test="f-inquilino">
                  <option value="">-- Escolha um inquilino --</option>
                  @for (t of tenants(); track t.id) {
                    <option [value]="t.id">{{ t.nome }}</option>
                  }
                </select>
              </label>
            </div>

            <!-- Modality selection -->
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Modalidade de Reserva
                <select class="c81-input" [(ngModel)]="form.modalidade" name="modalidade" required (change)="verificarConflitos()" data-test="f-modalidade">
                  <option value="turno">Turno (Manhã / Tarde / Noite)</option>
                  <option value="cafe">Janela Café da manhã (06:00 às 10:00)</option>
                  <option value="almoco">Almoço (10:00 às 15:00)</option>
                  <option value="jantar">Jantar (16:00 às 23:00)</option>
                  <option value="personalizado">Período personalizado</option>
                  <option value="dia">Dia Completo</option>
                </select>
              </label>
            </div>

            <!-- Date selection -->
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data de Início
                <input class="c81-input" type="date" [(ngModel)]="form.data" name="data" required (change)="verificarConflitos()" data-test="f-data" />
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data Final
                <input class="c81-input" type="date" [(ngModel)]="form.dataFim" name="dataFim" required (change)="verificarConflitos()" data-test="f-data-fim" />
              </label>
            </div>

            <!-- Turno Selection (if modalidade is turno) -->
            @if (form.modalidade === 'turno') {
              <div>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Turno
                  <select class="c81-input" [(ngModel)]="form.turno" name="turno" required (change)="verificarConflitos()" data-test="f-turno">
                    <option value="manha">Manhã (08:00 - 12:00)</option>
                    <option value="tarde">Tarde (13:00 - 17:00)</option>
                    <option value="noite">Noite (18:00 - 22:00)</option>
                  </select>
                </label>
              </div>
            }

            @if (form.modalidade === 'personalizado') {
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Início
                  <input class="c81-input" type="time" [(ngModel)]="form.inicioManual" name="inicioManual" required (change)="verificarConflitos()" />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Fim
                  <input class="c81-input" type="time" [(ngModel)]="form.fimManual" name="fimManual" required (change)="verificarConflitos()" />
                </label>
              </div>
            }

            <div style="margin-top: var(--space-2); display: flex; gap: var(--space-3); align-items: center;">
              <c81-button type="submit" variant="primary" [disabled]="enviando()" data-test="f-salvar">
                {{ enviando() ? 'Processando...' : (reservaEditandoId() ? 'Salvar Alterações' : 'Confirmar Reserva') }}
              </c81-button>
              @if (reservaEditandoId()) {
                <c81-button type="button" variant="ghost" (click)="cancelarEdicao()">
                  Cancelar
                </c81-button>
              }
            </div>

          </form>
        </c81-card>
      </div>
    </div>
  `,
})
export class AgendaComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly cozinhas = signal<Cozinha[]>([]);
  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly reservaEditandoId = signal<string | null>(null);

  protected form: {
    cozinhaId: string;
    tenantId: string;
    modalidade: ModalidadeReserva;
    data: string;
    dataFim: string;
    turno: 'manha' | 'tarde' | 'noite';
    inicioManual: string;
    fimManual: string;
  } = {
    cozinhaId: '',
    tenantId: '',
    modalidade: 'turno',
    data: '',
    dataFim: '',
    turno: 'manha',
    inicioManual: '06:00',
    fimManual: '10:00',
  };

  protected readonly temConflito = signal(false);

  ngOnInit(): void {
    this.carregarDados();
  }

  protected carregarDados(): void {
    this.carregando.set(true);
    this.reservas.set([]);

    // Cozinhas
    this.http.get<Cozinha[]>(`${API_BASE}/backoffice/cozinhas`).subscribe((cozinhas) => {
      const cozinhasUnicas = Array.from(new Map(cozinhas.map((coz) => [coz.id, coz])).values());
      this.cozinhas.set(cozinhasUnicas);

      // Load reservations for all kitchens
      const promessas = cozinhasUnicas.map((coz) =>
        this.http.get<Reserva[]>(`${API_BASE}/backoffice/reservas/cozinha/${coz.id}`).toPromise()
      );

      Promise.all(promessas).then((valores) => {
        const todas: Reserva[] = [];
        valores.forEach((v) => {
          if (v) todas.push(...v);
        });
        const reservasUnicas = Array.from(new Map(todas.map((reserva) => [reserva.id, reserva])).values());
        this.reservas.set(reservasUnicas);
        this.carregando.set(false);
      });
    });

    // Tenants
    this.http.get<Tenant[]>(`${API_BASE}/backoffice/inquilinos`).subscribe((tenants) => {
      this.tenants.set(tenants);
    });
  }

  protected obterReservasDaCozinha(cozinhaId: string): Reserva[] {
    return this.reservas().filter((r) => r.cozinha_id === cozinhaId);
  }

  protected obterTenantNome(tenantId: string): string {
    const t = this.tenants().find((x) => x.id === tenantId);
    return t ? t.nome : 'Inquilino Desconhecido';
  }

  protected formatarIntervalo(inicioStr: string, fimStr: string): string {
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);
    const df = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const hf = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return `${df(inicio)} ${hf(inicio)} às ${df(fim)} ${hf(fim)}`;
  }

  protected obterDuracaoHoras(inicioStr: string, fimStr: string): string {
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);
    const diferencaMs = fim.getTime() - inicio.getTime();

    if (!Number.isFinite(diferencaMs) || diferencaMs <= 0) {
      return '0H';
    }

    const horasPorDia = ((fim.getUTCHours() + fim.getUTCMinutes() / 60 + fim.getUTCSeconds() / 3600)
      - (inicio.getUTCHours() + inicio.getUTCMinutes() / 60 + inicio.getUTCSeconds() / 3600));

    const dias = Math.max(
      1,
      Math.round(diferencaMs / (24 * 60 * 60 * 1000)) + 1
    );

    const totalHoras = horasPorDia * dias;
    const valor = Number.isInteger(totalHoras) ? totalHoras : totalHoras.toFixed(1);
    return `${valor}H`;
  }

  protected verificarConflitos(): void {
    this.temConflito.set(false);
  }

  private calcularHorarios(): { inicio: string; fim: string } {
    const dataInicio = this.form.data || this.form.dataFim || new Date().toISOString().slice(0, 10);
    const dataFimSelecionada = this.form.dataFim || this.form.data || dataInicio;
    const dataFimUtilizada = this.form.modalidade === 'personalizado' || this.form.modalidade === 'dia'
      ? dataFimSelecionada
      : dataFimSelecionada;

    let inicio = '';
    let fim = '';

    if (this.form.modalidade === 'turno') {
      if (this.form.turno === 'manha') {
        inicio = `${dataInicio}T08:00:00Z`;
        fim = `${dataFimUtilizada}T12:00:00Z`;
      } else if (this.form.turno === 'tarde') {
        inicio = `${dataInicio}T13:00:00Z`;
        fim = `${dataFimUtilizada}T17:00:00Z`;
      } else {
        inicio = `${dataInicio}T18:00:00Z`;
        fim = `${dataFimUtilizada}T22:00:00Z`;
      }
    } else if (this.form.modalidade === 'cafe') {
      inicio = `${dataInicio}T06:00:00Z`;
      fim = `${dataFimUtilizada}T10:00:00Z`;
    } else if (this.form.modalidade === 'almoco') {
      inicio = `${dataInicio}T10:00:00Z`;
      fim = `${dataFimUtilizada}T15:00:00Z`;
    } else if (this.form.modalidade === 'jantar') {
      inicio = `${dataInicio}T16:00:00Z`;
      fim = `${dataFimUtilizada}T23:00:00Z`;
    } else if (this.form.modalidade === 'personalizado') {
      const inicioManual = this.form.inicioManual || '06:00';
      const fimManual = this.form.fimManual || '10:00';
      inicio = `${dataInicio}T${inicioManual}:00Z`;
      fim = `${dataFimUtilizada}T${fimManual}:00Z`;
    } else if (this.form.modalidade === 'dia') {
      inicio = `${dataInicio}T00:00:00Z`;
      fim = `${dataFimUtilizada}T23:59:59Z`;
    } else {
      inicio = `${dataInicio}T00:00:00Z`;
      fim = `${dataFimUtilizada}T23:59:59Z`;
    }

    return { inicio, fim };
  }

  protected abrirEdicao(reserva: Reserva): void {
    this.reservaEditandoId.set(reserva.id);
    const inicio = new Date(reserva.inicio);
    const fim = new Date(reserva.fim);
    this.form = {
      cozinhaId: reserva.cozinha_id,
      tenantId: reserva.tenant_id,
      modalidade: reserva.modalidade,
      data: inicio.toISOString().split('T')[0],
      dataFim: fim.toISOString().split('T')[0],
      turno: this.obterTurnoDeData(reserva.inicio, reserva.fim),
      inicioManual: `${String(inicio.getUTCHours()).padStart(2, '0')}:${String(inicio.getUTCMinutes()).padStart(2, '0')}`,
      fimManual: `${String(fim.getUTCHours()).padStart(2, '0')}:${String(fim.getUTCMinutes()).padStart(2, '0')}`,
    };
    this.verificarConflitos();
  }

  protected cancelarEdicao(): void {
    this.reservaEditandoId.set(null);
    this.form = {
      cozinhaId: '',
      tenantId: '',
      modalidade: 'turno',
      data: '',
      dataFim: '',
      turno: 'manha',
      inicioManual: '06:00',
      fimManual: '10:00',
    };
    this.temConflito.set(false);
  }

  protected salvarReserva(event: Event): void {
    event.preventDefault();
    this.erro.set(null);

    if (!this.form.data || !this.form.dataFim) {
      this.erro.set('Informe a data de início e a data final.');
      return;
    }

    if (new Date(this.form.data) > new Date(this.form.dataFim)) {
      this.erro.set('A data final deve ser maior ou igual à data de início.');
      return;
    }

    this.enviando.set(true);
    const { inicio, fim } = this.calcularHorarios();

    const payload = {
      cozinhaId: this.form.cozinhaId,
      tenantId: this.form.tenantId,
      modalidade: this.form.modalidade,
      inicio,
      fim,
    };

    const operacao = this.reservaEditandoId()
      ? this.http.put(`${API_BASE}/backoffice/reservas/${this.reservaEditandoId()}`, payload)
      : this.http.post(`${API_BASE}/backoffice/reservas`, payload);

    operacao.subscribe({
      next: () => {
        this.enviando.set(false);
        this.cancelarEdicao();
        this.carregarDados();
      },
      error: (e) => {
        this.enviando.set(false);
        this.erro.set(e?.error?.message ?? 'Falha ao salvar a reserva.');
      },
    });
  }

  protected removerReserva(resId: string): void {
    if (confirm('Tem certeza que deseja excluir esta reserva?')) {
      this.http.delete(`${API_BASE}/backoffice/reservas/${resId}`).subscribe(() => {
        this.carregarDados();
      });
    }
  }

  private obterTurnoDeData(inicio: string, fim: string): 'manha' | 'tarde' | 'noite' {
    const inicioHora = new Date(inicio).getUTCHours();
    const fimHora = new Date(fim).getUTCHours();

    if (inicioHora === 6 && fimHora === 10) return 'manha';
    if (inicioHora === 10 && fimHora === 15) return 'tarde';
    if (inicioHora === 16 && fimHora === 23) return 'noite';
    if (inicioHora === 8 && fimHora === 12) return 'manha';
    if (inicioHora === 13 && fimHora === 17) return 'tarde';
    return 'noite';
  }
}
